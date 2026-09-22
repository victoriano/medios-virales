#!/usr/bin/env python3
"""Comprueba el sitio en un navegador real: consola, carga de datos, vista por defecto y capturas."""
import asyncio, sys, time
from playwright.async_api import async_playwright

URL = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8099/"
OUT = "/tmp/medios-site"
import os
os.makedirs(OUT, exist_ok=True)


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
        t0 = time.perf_counter()
        await pg.click('#mapa .burbuja[data-h="@eldiarioes"]')
        await pg.wait_for_selector("#mlist article.tweet", state="visible", timeout=15000)
        ms = round((time.perf_counter() - t0) * 1000)
        titulo_mapa = await pg.locator("#medio-panel h2").inner_text()
        print(f"clic en la burbuja de eldiarioes -> {titulo_mapa} en {ms} ms")
        if "elDiario" not in titulo_mapa:
            errores.append(f"[check] la burbuja del mapa abrio otro medio: {titulo_mapa}")
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
        texto_filas = await pg.eval_on_selector_all(
            "#tabla-ranking tbody tr",
            "e => e.map(r => [r.dataset.h, r.children[1].innerText.replace(/\\s+/g, ' ').trim()])")
        problemas = []
        for h, celda in texto_filas:
            m = next(x for x in idx["medios"] if x["handle"] == h)
            claro = m["izq"] + m["der"]
            p_izq = round(100 * m["izq"] / m["politicos"]) if m["politicos"] else 0
            p_der = round(100 * m["der"] / m["politicos"]) if m["politicos"] else 0
            trozos = [decimos_js(m) or "sin tuits con lado claro",
                      f"{p_izq} % izq · {p_der} % der · {max(0, 100 - p_izq - p_der)} % sin lado",
                      f"({num_es(claro)} con lado claro)"]
            if not all(t in celda for t in trozos) or celda.rstrip().endswith("*") != (claro < 15):
                problemas.append(f"{h}: {celda!r} no cuadra con {trozos}")
        print(f"columna de decimos: {len(texto_filas)} filas cotejadas con index.json | problemas: {len(problemas)}")
        if problemas:
            errores.append("[check] la columna de decimos no cuadra: " + "; ".join(problemas[:3]))
        estrellas = await pg.evaluate("document.querySelectorAll('#tabla-ranking tbody .star').length")
        esperadas_estrellas = sum(1 for m in idx["medios"] if (m["izq"] + m["der"]) < 15)
        print(f"marcas de muestra corta (menos de 15 con lado claro): {estrellas} (esperadas {esperadas_estrellas})")
        if estrellas != esperadas_estrellas:
            errores.append(f"[check] marcas de muestra corta: {estrellas} != {esperadas_estrellas}")
        aviso = " ".join((await pg.locator("#rank-aviso").inner_text()).split())
        for trozo in ["Solo se cuentan los tuits que señalan a un partido",
                      "La parte gris son los que informan sin tomar partido y quedan fuera del cálculo",
                      "El índice de −1 a +1 es esa misma cifra con signo"]:
            if trozo not in aviso:
                errores.append("[check] falta en la nota del ranking: " + trozo)
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

        # mapa
        await pg.goto(URL + "#/mapa", wait_until="networkidle")
        await pg.wait_for_timeout(1200)
        print("burbujas en el mapa:", await pg.locator("#mapa .burbuja").count())
        logos = await pg.evaluate("Array.from(document.querySelectorAll('#mapa image')).filter(i => i.getBoundingClientRect().width > 0).length")
        print("logos cargados:", logos)
        await pg.hover('#mapa .burbuja[data-h="@eldiarioes"]')
        await pg.wait_for_timeout(350)
        print("tooltip:", " ".join((await pg.locator("#mapa-tip").inner_text()).split())[:120])
        await pg.screenshot(path=f"{OUT}/8-mapa.png", full_page=True)
        await pg.select_option("#mapa-filtro", "100")
        await pg.wait_for_timeout(500)
        print("burbujas con el filtro de 100:", await pg.locator("#mapa .burbuja").count())
        await pg.select_option("#mapa-filtro", "0")
        await pg.wait_for_timeout(300)

        # el eje X va de 0 a 100 con los tics leidos en decimos y las bandas de zona
        tics = await pg.eval_on_selector_all(
            "#mapa .grid text",
            "e => e.map(x => [Number(x.getAttribute('x')), x.textContent, Number(x.getAttribute('y'))])")
        eje_x = [(t[0], t[1]) for t in tics if abs(t[2] - (620 - 66 + 21)) < 1]   # solo la fila de tics del eje X
        fila_tics = [txt for _, txt in eje_x]
        esperados_tics = ["0", "2 de cada 10", "4 de cada 10", "mitad y mitad",
                          "6 de cada 10", "8 de cada 10", "10 de cada 10"]
        print("tics del eje X:", " · ".join(fila_tics))
        if fila_tics != esperados_tics:
            errores.append(f"[check] los tics del eje X no son los pedidos: {fila_tics}")
        zonas = await pg.eval_on_selector_all("#mapa .grid rect.zona", "e => e.length")
        nombres = await pg.eval_on_selector_all("#mapa .etiquetas text", "e => e.map(x => x.textContent)")
        print("bandas de zona:", zonas, "| nombres:", " · ".join(nombres))
        if zonas != 5 or nombres != ["muy a la derecha", "a la derecha", "equilibrio", "a la izquierda", "muy a la izquierda"]:
            errores.append(f"[check] las bandas de zona no son las pedidas: {zonas} {nombres}")
        lineas_mitad = await pg.evaluate(
            "Array.from(document.querySelectorAll('#mapa .grid line.mitad')).length")
        if lineas_mitad != 1:
            errores.append(f"[check] no hay una sola linea solida en el 50: {lineas_mitad}")

        # la X de cada burbuja es 100 * izq / (izq + der), y por debajo de 15 tuits con lado claro no se dibuja
        x0 = next(x for x, txt in eje_x if txt == "0")
        x100 = next(x for x, txt in eje_x if txt == "10 de cada 10")
        medida = await pg.evaluate("""async ([x0, x100]) => {
            const d = await (await fetch('data/index.json')).json();
            const enMapa = new Set([...document.querySelectorAll('#mapa .burbuja')].map(e => e.dataset.h));
            let peor = 0;
            for (const el of document.querySelectorAll('#mapa .burbuja')) {
              const m = d.medios.find(x => x.handle === el.dataset.h);
              const x = x0 + (100 * m.izq / (m.izq + m.der)) / 100 * (x100 - x0);
              peor = Math.max(peor, Math.abs(parseFloat(el.getAttribute('transform').split('(')[1]) - x));
            }
            const sinMuestra = d.medios.filter(m => m.politicos > 0 && (m.izq + m.der) < 15 && enMapa.has(m.handle));
            return {peor, sinMuestra: sinMuestra.length, dibujados: enMapa.size};
        }""", [x0, x100])
        print(f"X de las burbujas frente a 100*izq/(izq+der): desviacion maxima {medida['peor']:.3f} px | "
              f"dibujados {medida['dibujados']} | dibujados sin muestra: {medida['sinMuestra']}")
        if medida["peor"] > 0.3 or medida["sinMuestra"]:
            errores.append(f"[check] el eje X no cuadra: {medida}")

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
