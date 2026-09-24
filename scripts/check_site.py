#!/usr/bin/env python3
"""Comprueba el sitio en un navegador real: consola, carga de datos, vista por defecto y capturas."""
import asyncio, sys, time
from playwright.async_api import async_playwright

URL = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8099/"
OUT = "/tmp/medios-site"
MAPOUT = "/tmp/polarizacion-maptest"      # capturas de los tres modos del mapa
import os
os.makedirs(OUT, exist_ok=True)
os.makedirs(MAPOUT, exist_ok=True)


# --- invariantes de la lectura en decimos (no caducan si cambian los datos) ---
def decimos_js(m):
    """Misma lectura que app.js: decimos del lado dominante sobre izq+der."""
    claro = m["izq"] + m["der"]
    if not claro:
        return None
    izq_lado = m["izq"] >= m["der"]
    menor = min(m["izq"], m["der"])
    n_menor = 0 if menor == 0 else max(1, min(9, int(10 * menor / claro + 0.5)))
    n_mayor = 10 - n_menor
    return f"{n_mayor} {'izq' if izq_lado else 'der'} · {n_menor} {'der' if izq_lado else 'izq'}"


def num_es(n):
    """Como Intl.NumberFormat('es-ES'): sin separador de millar por debajo de 10.000."""
    return f"{n:,}".replace(",", ".") if n >= 10000 else str(n)


async def main():
    errores, fallos = [], []
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path="/opt/google/chrome/chrome",
                                    args=["--no-sandbox", "--disable-dev-shm-usage"])
        pg = await b.new_page(viewport={"width": 1280, "height": 1000})
        pg.on("console", lambda m: errores.append(f"[{m.type}] {m.text}") if m.type in ("error", "warning") else None)
        pg.on("pageerror", lambda e: errores.append(f"[pageerror] {e}"))
        pg.on("requestfailed", lambda r: fallos.append(f"{r.url} :: {r.failure}"))

        def mirar(resp):
            if resp.status >= 400:
                fallos.append(f"HTTP {resp.status} {resp.url}")
        pg.on("response", mirar)

        await pg.goto(URL, wait_until="networkidle")
        await pg.wait_for_timeout(900)
        # el mapa es la vista por defecto
        burbujas = await pg.locator("#mapa .burbuja").count()
        ranking_oculto = await pg.locator("#view-ranking").is_hidden()
        print("vista por defecto: burbujas en el mapa:", burbujas, "| ranking oculto:", ranking_oculto)
        if not burbujas or not ranking_oculto:
            errores.append(f"[check] la vista por defecto no es el mapa: {burbujas} burbujas, ranking oculto={ranking_oculto}")

        # clic en una burbuja del mapa: tiene que abrir el medio (regresion del bucle de mouseenter)
        # y hacerlo en menos de un segundo, en el modo por defecto (las dos posiciones)
        nodos_eldiario = await pg.locator('#mapa .burbuja[data-h="@eldiarioes"]').count()
        t0 = time.perf_counter()
        await pg.locator('#mapa .burbuja[data-serie="publicado"][data-h="@eldiarioes"]').first.click()
        await pg.wait_for_selector("#mlist article.tweet", state="visible", timeout=15000)
        ms = round((time.perf_counter() - t0) * 1000)
        titulo_mapa = await pg.locator("#medio-panel h2").inner_text()
        print(f"nodos de eldiarioes en el mapa: {nodos_eldiario} | clic en el publicado -> {titulo_mapa} en {ms} ms")
        if "elDiario" not in titulo_mapa:
            errores.append(f"[check] la burbuja del mapa abrio otro medio: {titulo_mapa}")
        if ms >= 1000:
            errores.append(f"[check] el clic en la burbuja tarda {ms} ms, mas de un segundo")
        await pg.screenshot(path=f"{OUT}/0-mapa-clic-medio.png", full_page=True)

        # ranking
        await pg.goto(URL + "#/ranking", wait_until="networkidle")
        await pg.click('button[data-view="ranking"]') if await pg.locator("#view-ranking").is_hidden() else None
        await pg.wait_for_selector("#tabla-ranking tbody tr", state="visible")
        await pg.wait_for_timeout(300)
        filas = await pg.locator("#tabla-ranking tbody tr").count()
        print("filas en el ranking:", filas)
        await pg.screenshot(path=f"{OUT}/1-ranking.png", full_page=True)

        # la columna «de cada 10 con lado claro» tiene que decir lo mismo que index.json, fila a fila
        idx = await pg.evaluate("fetch('data/index.json').then(r => r.json())")
        admitidos = {m["handle"].lower() for m in idx["medios"] if m["izq"] + m["der"] > 50}
        if filas != len(admitidos):
            errores.append(f"[check] ranking: {filas} filas != {len(admitidos)} medios con más de 50 tuits significados")
        texto_filas = await pg.eval_on_selector_all(
            "#tabla-ranking tbody tr",
            "e => e.map(r => [r.dataset.h, r.children[1].innerText.replace(/\\s+/g, ' ').trim()])")
        problemas = []
        for h, celda in texto_filas:
            m = next(x for x in idx["medios"] if x["handle"] == h)
            claro = m["izq"] + m["der"]
            # JavaScript usa Math.round, que en los medios redondea hacia arriba.
            p_izq = int(100 * m["izq"] / m["politicos"] + 0.5) if m["politicos"] else 0
            p_der = int(100 * m["der"] / m["politicos"] + 0.5) if m["politicos"] else 0
            trozos = [decimos_js(m) or "sin tuits con lado claro",
                      f"{p_izq} % izq · {p_der} % der · {max(0, 100 - p_izq - p_der)} % sin lado",
                      f"({num_es(claro)} con lado claro)"]
            if not all(t in celda for t in trozos) or celda.rstrip().endswith("*") != (claro < 15):
                problemas.append(f"{h}: {celda!r} no cuadra con {trozos}")
        print(f"columna de decimos: {len(texto_filas)} filas cotejadas con index.json | problemas: {len(problemas)}")
        if problemas:
            errores.append("[check] la columna de decimos no cuadra: " + "; ".join(problemas[:3]))
        estrellas = await pg.evaluate("document.querySelectorAll('#tabla-ranking tbody .star').length")
        esperadas_estrellas = sum(1 for m in idx["medios"] if m["handle"].lower() in admitidos and (m["izq"] + m["der"]) < 15)
        print(f"marcas de muestra corta (menos de 15 con lado claro): {estrellas} (esperadas {esperadas_estrellas})")
        if estrellas != esperadas_estrellas:
            errores.append(f"[check] marcas de muestra corta: {estrellas} != {esperadas_estrellas}")
        aviso = " ".join((await pg.locator("#rank-aviso").inner_text()).split())
        for trozo in ["El corte de inclusión usa únicamente los tuits con lado claro",
                      "izquierda más derecha debe superar 50",
                      "El porcentaje político usa todos los tuits clasificados como políticos"]:
            if trozo not in aviso:
                errores.append("[check] falta en la nota del ranking: " + trozo)
        porcentajes = await pg.eval_on_selector_all(
            "#tabla-ranking tbody tr",
            "e => e.map(r => [r.dataset.h, r.children[7].textContent.trim()])")
        for h, mostrado in porcentajes:
            m = next(x for x in idx["medios"] if x["handle"] == h)
            esperado = f"{100 * m['politicos'] / m['muestreados']:.1f} %".replace('.', ',')
            if mostrado != esperado:
                errores.append(f"[check] porcentaje político de {h}: {mostrado!r} != {esperado!r}")
        print("nota al pie del ranking:", "completa" if not errores else "revisar")

        # ordenar por virales
        await pg.click('#tabla-ranking thead th[data-sort="virales"]')
        await pg.wait_for_timeout(250)
        primero = await pg.locator("#tabla-ranking tbody tr").first.inner_text()
        print("primera fila tras ordenar por virales:", " ".join(primero.split())[:90])
        await pg.screenshot(path=f"{OUT}/2-ranking-virales.png")

        # abrir un medio
        await pg.click('#tabla-ranking tbody tr:first-child')
        await pg.wait_for_timeout(1200)
        titulo = await pg.locator("#medio-panel h2").inner_text()
        tarjetas = await pg.locator("#mlist article.tweet").count()
        kpis = await pg.locator(".kpi").count()
        print("medio abierto:", titulo, "| tarjetas:", tarjetas, "| kpis:", kpis)
        print("url:", pg.url)
        await pg.screenshot(path=f"{OUT}/3-medio.png", full_page=True)

        # filtro por partido y orden por me gusta
        await pg.select_option("#mp", index=1)
        await pg.wait_for_timeout(300)
        print("tarjetas tras filtrar por partido:", await pg.locator("#mlist article.tweet").count())
        await pg.select_option("#ms", "lk")
        await pg.wait_for_timeout(300)
        await pg.screenshot(path=f"{OUT}/4-filtros.png")

        # cargar más
        if await pg.locator("#mmore").is_visible():
            await pg.click("#mmore")
            await pg.wait_for_timeout(500)
            print("tarjetas tras cargar más:", await pg.locator("#mlist article.tweet").count())

        # los indicadores y los recuentos de los desplegables tienen que seguir a los filtros
        limpio = lambda v: [x.strip() for x in v]
        await pg.select_option("#mp", "")
        await pg.select_option("#md", "")
        await pg.wait_for_timeout(300)
        kpis_limpio = limpio(await pg.eval_on_selector_all("#mkpis .kpi .v", "e => e.map(x => x.textContent)"))
        dirs_limpio = limpio(await pg.eval_on_selector_all("#md option", "e => e.map(x => x.textContent)"))
        print("kpis sin filtros:", kpis_limpio, "| nota visible:", await pg.locator("#mkpinota").is_visible())

        await pg.select_option("#md", "perjudica")
        await pg.wait_for_timeout(350)
        kpis_dir = limpio(await pg.eval_on_selector_all("#mkpis .kpi .v", "e => e.map(x => x.textContent)"))
        nota = await pg.locator("#mkpinota").is_visible()
        suma = sum(int(x) for x in kpis_dir[1:4])
        print("kpis con dirección=perjudica:", kpis_dir, "| nota visible:", nota)
        bien_dir = str(suma) == kpis_dir[0] and nota and kpis_dir != kpis_limpio
        if not bien_dir:
            errores.append(f"[check] con dirección=perjudica los indicadores no cuadran: {kpis_dir}")

        dirs_con_dir = limpio(await pg.eval_on_selector_all("#md option", "e => e.map(x => x.textContent)"))
        await pg.select_option("#mp", index=1)
        await pg.wait_for_timeout(350)
        dirs_con_party = limpio(await pg.eval_on_selector_all("#md option", "e => e.map(x => x.textContent)"))
        kpis_party_dir = limpio(await pg.eval_on_selector_all("#mkpis .kpi .v", "e => e.map(x => x.textContent)"))
        print("recuentos de dirección al filtrar por partido:", dirs_con_party)
        print("kpis con partido + dirección:", kpis_party_dir)
        if dirs_limpio == dirs_con_party:
            errores.append(f"[check] los recuentos de dirección no responden al filtro de partido: {dirs_con_party}")
        if sum(int(x) for x in kpis_party_dir[1:4]) != int(kpis_party_dir[0]):
            errores.append(f"[check] izquierda+derecha+neutro no suma lo político: {kpis_party_dir}")
        await pg.screenshot(path=f"{OUT}/9-filtros-kpis.png", full_page=True)

        # al limpiar los filtros los indicadores vuelven a los del medio entero
        await pg.select_option("#mp", "")
        await pg.select_option("#md", "")
        await pg.wait_for_timeout(350)
        kpis_vuelta = limpio(await pg.eval_on_selector_all("#mkpis .kpi .v", "e => e.map(x => x.textContent)"))
        print("kpis al limpiar los filtros:", kpis_vuelta, "| coinciden con los iniciales:", kpis_vuelta == kpis_limpio)
        if kpis_vuelta != kpis_limpio:
            errores.append(f"[check] los indicadores no vuelven al quitar los filtros: {kpis_vuelta} != {kpis_limpio}")

        # Regresión: el filtro de Onda Cero debe reconocer los cuatro partidos aunque
        # el clasificador haya devuelto Psoe/Pp con otra capitalización.
        await pg.goto(URL + "#/medio/OndaCero_es", wait_until="networkidle")
        await pg.wait_for_selector("#mp option", state="attached")
        partidos_onda = await pg.eval_on_selector_all("#mp option", "e => e.map(o => o.value).filter(Boolean)")
        print("partidos disponibles en Onda Cero:", partidos_onda)
        for partido in ["PSOE", "PP", "Vox", "Sumar"]:
            if partido not in partidos_onda:
                errores.append(f"[check] falta {partido} en el filtro de Onda Cero: {partidos_onda}")

        # ---------- mapa: eje izquierda→derecha, rojo/azul, control de series y flechas ----------
        await pg.goto(URL + "#/mapa", wait_until="networkidle")
        await pg.wait_for_timeout(1200)
        pol = await pg.evaluate("fetch('data/polarizacion.json').then(r => r.json())")

        col = await pg.evaluate("""() => { const cs = getComputedStyle(document.documentElement);
            return {izq: cs.getPropertyValue('--map-izq').trim(), der: cs.getPropertyValue('--map-der').trim(),
                    neu: cs.getPropertyValue('--map-neu').trim()}; }""")
        print("variables de color del mapa:", col)
        if col["izq"].lower() != "#c53030" or col["der"].lower() != "#1f6fb2" or col["neu"].lower() != "#8a94a6":
            errores.append(f"[check] las variables de color del mapa no son rojo/azul/gris: {col}")

        # rgb equivalente a cada variable, para comprobar el color ya pintado en el SVG
        RGB = {"izq": "rgb(197, 48, 48)", "der": "rgb(31, 111, 178)", "neu": "rgb(138, 148, 166)"}
        lado = lambda p: "izq" if p < 45 else "der" if p > 55 else "neu"

        async def leer_mapa():
            return await pg.evaluate(r"""() => {
              const svg = document.querySelector('#mapa');
              const ytics = 620 - 66 + 21;
              const tics = [...svg.querySelectorAll('.grid text')]
                .filter(t => Math.abs(+t.getAttribute('y') - ytics) < 1)
                .map(t => [+t.getAttribute('x'), t.textContent]);
              const nodos = [...svg.querySelectorAll('.burbuja')].map(el => {
                const c = el.querySelector('circle');
                const t = el.getAttribute('transform').match(/translate\(([-0-9.]+),\s*([-0-9.]+)\)/);
                return {h: el.dataset.h, serie: el.dataset.serie, pos: +el.dataset.posicion,
                        attr: c.getAttribute('stroke'), comp: getComputedStyle(c).stroke,
                        dash: getComputedStyle(c).strokeDasharray, x: +t[1], y: +t[2], r: +c.getAttribute('r')};
              });
              const flechas = [...svg.querySelectorAll('.flecha')].map(g => {
                const p = g.querySelector('polygon.punta');
                const pts = p.getAttribute('points').trim().split(/\s+/).map(s => s.split(',').map(Number));
                const cen = pts.reduce((a, q) => [a[0] + q[0] / 3, a[1] + q[1] / 3], [0, 0]);
                return {h: g.dataset.h, delta: +g.dataset.delta, pub: +g.dataset.publicado, vir: +g.dataset.viral,
                        x1: +g.dataset.x1, y1: +g.dataset.y1, x2: +g.dataset.x2, y2: +g.dataset.y2,
                        punta: pts[0], cen, color: p.getAttribute('fill'), comp: getComputedStyle(p).fill};
              });
              return {tics, nodos, flechas,
                      zonas: [...svg.querySelectorAll('.etiquetas text')].map(t => t.textContent),
                      titulos: [...svg.querySelectorAll('.grid text.tit')].map(t => t.textContent),
                      resumen: document.querySelector('#mapa-resumen').textContent,
                      pie: document.querySelector('#mapa-pie').textContent.replace(/\s+/g, ' ')};
            }""")

        est = await leer_mapa()
        # (1) el eje va de izquierda (borde izquierdo) a derecha (borde derecho)
        esperados_tics = ["0", "2 de cada 10", "4 de cada 10", "mitad y mitad",
                          "6 de cada 10", "8 de cada 10", "10 de cada 10"]
        fila_tics = [t for _, t in sorted(est["tics"])]
        print("tics del eje X, de izquierda a derecha:", " · ".join(fila_tics))
        if fila_tics != esperados_tics:
            errores.append(f"[check] los tics del eje X no son los pedidos: {fila_tics}")
        x0 = next(x for x, t in est["tics"] if t == "0")          # 0 % a la derecha: todo a la izquierda
        x100 = next(x for x, t in est["tics"] if t == "10 de cada 10")  # 100 % a la derecha: todo a la derecha
        print(f"x de 'todo a la izquierda' (0) = {x0} · x de 'todo a la derecha' (100) = {x100}")
        if not x0 < x100:
            errores.append(f"[check] el eje no va de izquierda a derecha: x(0)={x0}, x(100)={x100}")
        for trozo in ["◀ todo a la izquierda", "% de los tuits con lado que va a la derecha", "todo a la derecha ▶"]:
            if not any(trozo in t for t in est["titulos"]):
                errores.append(f"[check] falta la etiqueta del eje: {trozo} ({est['titulos']})")
        zonas = await pg.eval_on_selector_all("#mapa .grid rect.zona", "e => e.length")
        nombres = est["zonas"]
        print("bandas de zona:", zonas, "| nombres:", " · ".join(nombres))
        if zonas != 5 or nombres != ["muy a la izquierda", "a la izquierda", "equilibrio", "a la derecha", "muy a la derecha"]:
            errores.append(f"[check] las bandas de zona no van de izquierda a derecha: {zonas} {nombres}")
        if await pg.evaluate("Array.from(document.querySelectorAll('#mapa .grid line.mitad')).length") != 1:
            errores.append("[check] no hay una sola linea solida en el 50")

        # (2) la X de cada nodo es la posicion de polarizacion.json y el color, rojo a la izquierda y azul a la derecha
        por_handle = {m["handle"]: m for m in pol["medios"]}
        peor_x, mal_color, rojos, azules, grises = 0.0, [], 0, 0, 0
        for n in est["nodos"]:
            r = por_handle.get(n["h"])
            d = (r or {}).get(n["serie"]) or {}
            if d.get("posicion") is None:
                errores.append(f"[check] nodo sin datos en polarizacion.json: {n['h']} {n['serie']}")
                continue
            peor_x = max(peor_x, abs(n["x"] - (x0 + d["posicion"] / 100 * (x100 - x0))))
            esp = lado(d["posicion"])
            if n["attr"] != f"var(--map-{esp})" or n["comp"] != RGB[esp]:
                mal_color.append(f"{n['h']}/{n['serie']} posicion {d['posicion']} -> {n['attr']} / {n['comp']}")
            elif esp == "izq":
                rojos += 1
            elif esp == "der":
                azules += 1
            else:
                grises += 1
        print(f"X de los nodos frente a posicion = 100*der/(izq+der): desviacion maxima {peor_x:.3f} px")
        print(f"nodos por color: rojo (izquierda) {rojos} · azul (derecha) {azules} · gris (centro) {grises} | mal pintados: {len(mal_color)}")
        if peor_x > 0.3:
            errores.append(f"[check] el eje X no cuadra con la posicion: {peor_x:.3f} px")
        if mal_color or not rojos or not azules:
            errores.append(f"[check] colores por lado: {len(mal_color)} mal, {rojos} rojos, {azules} azules :: " + "; ".join(mal_color[:4]))
        arriba = [n for n in est["nodos"] if n["serie"] == "publicado"]
        if not arriba or not all(n["dash"] == "none" for n in arriba):
            errores.append("[check] lo publicado deberia llevar el aro continuo")

        # (3) la flecha va de la posicion publicada a la viral
        fl = est["flechas"]
        esperadas = [m for m in pol["medios"]
                     if m["handle"].lower() in admitidos
                     and m["publicado"]["con_lado"] >= 5 and m["viral"]["con_lado"] >= 5]
        print(f"flechas en el modo por defecto (las dos posiciones): {len(fl)} · medios con muestra en las dos series: {len(esperadas)}")
        if len(fl) < 6:
            errores.append(f"[check] el modo de las dos posiciones dibuja {len(fl)} flechas, menos de 6")
        # Cuando ambos puntos casi se solapan no hay espacio para una flecha legible.
        if len(fl) > len(esperadas) or len(fl) < len(esperadas) - 2:
            errores.append(f"[check] flechas {len(fl)} incompatibles con {len(esperadas)} medios comparables")
        mal_fl = []
        for f in fl:
            r = por_handle.get(f["h"]) or {}
            pub, vir = r.get("publicado") or {}, r.get("viral") or {}
            ex1 = x0 + pub.get("posicion", 0) / 100 * (x100 - x0)
            ex2 = x0 + vir.get("posicion", 0) / 100 * (x100 - x0)
            d_pub = ((f["punta"][0] - f["x1"]) ** 2 + (f["punta"][1] - f["y1"]) ** 2) ** 0.5
            d_vir = ((f["punta"][0] - f["x2"]) ** 2 + (f["punta"][1] - f["y2"]) ** 2) ** 0.5
            if (abs(f["x1"] - ex1) > 0.3 or abs(f["x2"] - ex2) > 0.3
                    or abs(f["delta"] - (vir.get("posicion", 0) - pub.get("posicion", 0))) > 0.15
                    or d_vir >= d_pub or f["comp"] != RGB[lado(pub.get("posicion", 50))]):
                mal_fl.append(f"{f['h']}: x1 {f['x1']:.1f}/{ex1:.1f} x2 {f['x2']:.1f}/{ex2:.1f} "
                              f"delta {f['delta']} punta a {d_pub:.1f} px del publicado y {d_vir:.1f} del viral, {f['comp']}")
        print("flechas mal formadas:", len(mal_fl))
        if mal_fl:
            errores.append("[check] flechas que no van de lo publicado a lo viral: " + "; ".join(mal_fl[:4]))
        desplazan = sum(1 for f in fl if (f["delta"] < 0) == (f["pub"] < 50) and f["delta"] != 0)
        print(f"flechas que apuntan hacia el lado propio del medio: {desplazan} de {len(fl)}")
        print("resumen en pantalla:", est["resumen"])

        # capturas de los tres modos, en la carpeta pedida
        for i, (valor, nombre) in enumerate([("publicado", "solo-publicado"), ("viral", "solo-viral"), ("ambas", "las-dos")], start=1):
            await pg.select_option("#mapa-serie", valor)
            await pg.wait_for_timeout(600)
            await pg.screenshot(path=f"{MAPOUT}/{i}-{nombre}.png", full_page=True)
            await pg.locator("#view-mapa .panel").screenshot(path=f"{MAPOUT}/panel-{nombre}.png")
        estados = {}
        for valor in ["publicado", "viral", "ambas"]:
            await pg.select_option("#mapa-serie", valor)
            await pg.wait_for_timeout(500)
            estados[valor] = await leer_mapa()
            print(f"modo {valor}: {len(estados[valor]['nodos'])} nodos · {len(estados[valor]['flechas'])} flechas")
        esp_pub = sum(1 for m in pol["medios"] if m["handle"].lower() in admitidos and (m.get("publicado") or {}).get("posicion") is not None and m["publicado"]["con_lado"] >= 5)
        esp_vir = sum(1 for m in pol["medios"] if m["handle"].lower() in admitidos and (m.get("viral") or {}).get("posicion") is not None and m["viral"]["con_lado"] >= 5)
        opciones = await pg.eval_on_selector_all("#mapa-serie option", "e => e.map(o => o.value)")
        print("opciones del control de series:", opciones, f"| esperados {esp_pub} publicados, {esp_vir} virales, {len(esperadas)} comparables")
        if opciones != ["ambas", "publicado", "viral"]:
            errores.append(f"[check] el control de series no tiene las tres opciones: {opciones}")
        if len(estados["publicado"]["nodos"]) != esp_pub or estados["publicado"]["flechas"]:
            errores.append(f"[check] solo lo publicado: {len(estados['publicado']['nodos'])} nodos (esperados {esp_pub}) y {len(estados['publicado']['flechas'])} flechas")
        if len(estados["viral"]["nodos"]) != esp_vir or estados["viral"]["flechas"]:
            errores.append(f"[check] solo lo viral: {len(estados['viral']['nodos'])} nodos (esperados {esp_vir}) y {len(estados['viral']['flechas'])} flechas")
        n_flechas = len(estados["ambas"]["flechas"])
        if len(estados["ambas"]["nodos"]) != 2 * len(esperadas) or n_flechas > len(esperadas) or n_flechas < len(esperadas) - 2:
            errores.append(f"[check] las dos posiciones: {len(estados['ambas']['nodos'])} nodos y {len(estados['ambas']['flechas'])} flechas")
        virales = [n for n in estados["ambas"]["nodos"] if n["serie"] == "viral"]
        if not virales or not all(n["dash"] != "none" for n in virales):
            errores.append("[check] lo viral deberia llevar el aro discontinuo")
        if "aro discontinuo" not in estados["ambas"]["pie"] or "Flecha" not in estados["ambas"]["pie"]:
            errores.append(f"[check] falta la leyenda de las flechas: {estados['ambas']['pie'][:200]}")

        # el filtro de muestra sigue moviendo el numero de nodos
        await pg.select_option("#mapa-serie", "ambas")
        await pg.select_option("#mapa-filtro", "30")
        await pg.wait_for_timeout(500)
        pocos = await pg.locator("#mapa .burbuja").count()
        await pg.select_option("#mapa-filtro", "0")
        await pg.wait_for_timeout(500)
        todos = await pg.locator("#mapa .burbuja").count()
        print(f"nodos con el filtro de 30: {pocos} · con todos los medios: {todos}")
        if not pocos < todos:
            errores.append(f"[check] el filtro de muestra no cambia nada: {pocos} vs {todos}")
        await pg.select_option("#mapa-filtro", "5")
        await pg.wait_for_timeout(400)

        # la herramienta de un nodo cuenta las dos series y el desplazamiento
        await pg.locator('#mapa .burbuja[data-h="@eldiarioes"]').first.hover()
        await pg.wait_for_timeout(350)
        tip = " ".join((await pg.locator("#mapa-tip").inner_text()).split())
        print("tooltip:", tip[:220])
        if "Publicado" not in tip or "Viral" not in tip or "se desplaza" not in tip:
            errores.append(f"[check] el tooltip no cuenta las dos posiciones: {tip[:200]}")
        logos = await pg.evaluate("Array.from(document.querySelectorAll('#mapa image')).filter(i => i.getBoundingClientRect().width > 0).length")
        print("logos cargados:", logos, "de", await pg.locator("#mapa image").count())
        await pg.screenshot(path=f"{OUT}/8-mapa.png", full_page=True)

        # ---------- mapa: selector de periodos (todo, 2023, 2024, 2025, 2026) ----------
        # El selector recorta la ventana temporal, actualiza el hash compartible y
        # conserva el modo de serie activo. Los conteos se comparan con lo que trae
        # polarizacion.json en cada bloque, no con cifras fijas de datos antiguos.
        await pg.select_option("#mapa-serie", "ambas")
        await pg.select_option("#mapa-filtro", "5")
        await pg.select_option("#mapa-periodo", "todo")
        await pg.wait_for_timeout(400)

        opts_periodo = await pg.eval_on_selector_all("#mapa-periodo option", "e => e.map(o => o.value)")
        esperadas_periodo = ["todo", "2023", "2024", "2025", "2026"]
        print("opciones del selector de periodo:", opts_periodo)
        if opts_periodo != esperadas_periodo:
            errores.append(f"[check] el selector de periodo no tiene los 5 valores: {opts_periodo}")

        def medios_del_periodo(clave):
            """medios que polarizacion.json trae para ese periodo, con fallback al conjunto completo."""
            bloque = (pol.get("periodos") or {}).get(clave)
            if bloque and isinstance(bloque.get("medios"), list):
                return bloque["medios"]
            return pol.get("medios") or []

        # Recorre los cinco periodos: comprueba hash, modo de serie conservado y burbujas dibujadas.
        observado = {}
        for clave in esperadas_periodo:
            # forzamos un cambio real seleccionando primero otro valor si coincide con el actual
            actual = await pg.eval_on_selector("#mapa-periodo", "el => el.value")
            if actual == clave:
                otro = next(k for k in esperadas_periodo if k != clave)
                await pg.select_option("#mapa-periodo", otro)
                await pg.wait_for_timeout(200)
            await pg.select_option("#mapa-periodo", clave)
            await pg.wait_for_timeout(500)
            burb = await pg.locator("#mapa .burbuja").count()
            hash_ = pg.url.split("#", 1)[-1] if "#" in pg.url else ""
            serie = await pg.eval_on_selector("#mapa-serie", "el => el.value")
            observado[clave] = burb
            esperados = medios_del_periodo(clave)
            comparables = sum(
                1 for m in esperados
                if m["handle"].lower() in admitidos
                and (m.get("publicado") or {}).get("con_lado", 0) >= 5
                and (m.get("viral") or {}).get("con_lado", 0) >= 5
            )
            # en modo "ambas" se dibujan dos burbujas por medio comparable
            esperadas_burb = 2 * comparables
            frag = "" if clave == "todo" else f"?p={clave}"
            hash_ok = hash_.endswith(f"/mapa{frag}") or hash_.endswith(f"mapa{frag}")
            print(f"periodo {clave}: burbujas {burb} (esperadas {esperadas_burb}, comparables {comparables}) · hash={hash_} · serie={serie}")
            if not hash_ok:
                errores.append(f"[check] el hash no refleja el periodo {clave}: {hash_!r} (esperado sufijo /mapa{frag})")
            if serie != "ambas":
                errores.append(f"[check] el modo de serie no se conserva al cambiar el periodo {clave}: {serie}")
            if burb != esperadas_burb:
                errores.append(f"[check] burbujas del periodo {clave}: {burb} != {esperadas_burb} (comparables en data: {comparables})")

        # Si algún periodo trae distinta muestra que 'todo', al menos dos conteos deben diferir.
        hay_diferencia = any(medios_del_periodo(k) is not medios_del_periodo("todo") for k in esperadas_periodo[1:])
        if hay_diferencia and len(set(observado.values())) < 2:
            errores.append(f"[check] cambiar el periodo no cambia el mapa: {observado}")

        # Fallback: si el bloque del periodo pedido no existe en polarizacion.json,
        # el mapa debe caer al conjunto completo (POL.medios). Vaciamos POL.periodos
        # y pedimos un año: tienen que dibujarse las burbujas del bloque 'todo'.
        await pg.evaluate("""() => {
          window.__periodos_orig__ = POL && POL.periodos
              ? JSON.parse(JSON.stringify(POL.periodos)) : null;
          if (POL) POL.periodos = {};   // ni siquiera existe la clave del periodo pedido
        }""")
        # cambiamos primero a otro periodo para forzar el 'change'
        await pg.select_option("#mapa-periodo", "todo")
        await pg.wait_for_timeout(200)
        await pg.select_option("#mapa-periodo", "2023")
        await pg.wait_for_timeout(500)
        fallback_burb = await pg.locator("#mapa .burbuja").count()
        esp_completo = 2 * sum(
            1 for m in (pol.get("medios") or [])
            if m["handle"].lower() in admitidos
            and (m.get("publicado") or {}).get("con_lado", 0) >= 5
            and (m.get("viral") or {}).get("con_lado", 0) >= 5
        )
        print(f"fallback sin POL.periodos: burbujas {fallback_burb} (esperado {esp_completo}, el conjunto completo)")
        if fallback_burb != esp_completo:
            errores.append(f"[check] el fallback no usa POL.medios cuando falta el periodo: {fallback_burb} != {esp_completo}")
        # repone el estado y vuelve a 'todo' para no ensuciar pruebas posteriores
        await pg.evaluate("""() => {
          if (POL && window.__periodos_orig__ !== null) POL.periodos = window.__periodos_orig__;
          delete window.__periodos_orig__;
        }""")
        await pg.select_option("#mapa-periodo", "todo")
        await pg.wait_for_timeout(300)

        # top
        await pg.goto(URL + "#/top", wait_until="networkidle")
        await pg.wait_for_timeout(900)
        print("tarjetas en top:", await pg.locator("#top-list article.tweet").count())
        await pg.screenshot(path=f"{OUT}/5-top.png", full_page=True)

        # metodo
        await pg.goto(URL + "#/metodo", wait_until="networkidle")
        await pg.wait_for_timeout(400)
        await pg.screenshot(path=f"{OUT}/6-metodo.png", full_page=True)

        # movil
        await pg.set_viewport_size({"width": 390, "height": 900})
        await pg.goto(URL, wait_until="networkidle")
        await pg.wait_for_timeout(600)
        await pg.screenshot(path=f"{OUT}/7-movil.png", full_page=True)

        await b.close()

    print("\n--- consola ---")
    print("\n".join(errores[:20]) if errores else "sin errores ni avisos")
    print("--- peticiones fallidas ---")
    print("\n".join(fallos[:20]) if fallos else "ninguna")
    if errores or fallos:
        sys.exit(1)


asyncio.run(main())
