#!/usr/bin/env python3
"""Comprueba el sitio en un navegador real: consola, carga de datos, vista por defecto y capturas."""
import asyncio, sys, time
from playwright.async_api import async_playwright

URL = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8099/"
OUT = "/tmp/medios-site"
import os
os.makedirs(OUT, exist_ok=True)


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
