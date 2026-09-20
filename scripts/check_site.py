#!/usr/bin/env python3
"""Comprueba el sitio en un navegador real: consola, carga de datos y capturas."""
import asyncio, sys
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
        await pg.wait_for_timeout(600)
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
