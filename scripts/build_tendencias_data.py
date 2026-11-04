#!/usr/bin/env python3
"""Construye los datos de la sección Tendencias: cada medio, año a año y mes a mes.

Lee el detalle por medio y año que ya publica ``build_legislatura_data.py``
(``site/data/medios/<slug>/<año>.json``), así que no necesita el taller. Hay que
repetirlo cada vez que se regeneren los datos, igual que ``build_partidos_data.py``.

Escribe dos ficheros con el mismo formato: ``tendencias.json`` por año y
``tendencias_meses.json`` por mes, que la web solo pide si se elige ver por mes.
Para cada medio y periodo guarda, por cada subconjunto de tuits que tenga alguno,

    [tuits, mediana de retuits, media de retuits, mediana de me gusta, media de me gusta]

y bajo ``n`` el total de tuits muestreados del medio en ese periodo, para poder
expresar cada subconjunto como porcentaje. Los subconjuntos son todos los tuits,
los políticos, los que van a la izquierda o a la derecha y los que benefician o
perjudican a cada partido. Podemos ya llega agrupado en Sumar, como en el resto
del sitio. Las medianas no se pueden sumar de mes a año, por eso van los dos.
"""
import json
import statistics
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "site" / "data"
PARTIDOS = ["PSOE", "PP", "Vox", "Sumar"]
IZQUIERDA = {"PSOE", "Sumar"}
SUBCONJUNTOS = ["todos", "politicos", "izq", "der"] + [f"{p}{s}" for p in PARTIDOS for s in "+-"]


def subconjuntos_de(tuit):
    claves = ["todos"]
    if tuit["p"]:
        claves.append("politicos")
    if tuit["p"] in PARTIDOS and tuit["d"] in ("beneficia", "perjudica"):
        beneficia = tuit["d"] == "beneficia"
        claves.append("izq" if (tuit["p"] in IZQUIERDA) == beneficia else "der")
        claves.append(tuit["p"] + ("+" if beneficia else "-"))
    return claves


def resumen(filas):
    rt = [f["rt"] for f in filas]
    lk = [f["lk"] for f in filas]
    r = lambda v: round(v, 1)
    return [len(filas), r(statistics.median(rt)), r(statistics.fmean(rt)), r(statistics.median(lk)), r(statistics.fmean(lk))]


def periodos(grupos):
    salida = {}
    for clave in sorted(grupos):
        por_sub = grupos[clave]
        fila = {"n": len(por_sub["todos"])}
        for sub in SUBCONJUNTOS:
            if por_sub.get(sub):
                fila[sub] = resumen(por_sub[sub])
        salida[clave] = fila
    return salida


def main():
    index = json.loads((DATA / "index.json").read_text())
    anos, meses = [], []
    for medio in sorted(index["medios"], key=lambda m: m["handle"].lower()):
        carpeta = DATA / Path(medio["archivo"]).parent
        por_ano = defaultdict(lambda: defaultdict(list))
        por_mes = defaultdict(lambda: defaultdict(list))
        for fichero in sorted(carpeta.glob("[0-9]*.json")):
            for tuit in json.loads(fichero.read_text())["tweets"]:
                for sub in subconjuntos_de(tuit):
                    por_ano[tuit["f"][:4]][sub].append(tuit)
                    por_mes[tuit["f"][:7]][sub].append(tuit)
        anos.append({"h": medio["handle"], "p": periodos(por_ano)})
        meses.append({"h": medio["handle"], "p": periodos(por_mes)})
    base = {
        "generado": index.get("generado"),
        "ventana": index.get("ventana"),
        "subconjuntos": SUBCONJUNTOS,
        "formato": "por medio y periodo: n = tuits muestreados; por subconjunto [tuits, mediana RT, media RT, mediana me gusta, media me gusta]",
    }
    for nombre, medios in (("tendencias.json", anos), ("tendencias_meses.json", meses)):
        ruta = DATA / nombre
        ruta.write_text(json.dumps({**base, "medios": medios}, ensure_ascii=False, separators=(",", ":")))
        print(f"{nombre}: {len(medios)} medios, {ruta.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
