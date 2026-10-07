#!/usr/bin/env python3
"""Construye ``site/data/partidos.json``: la posición de cada medio respecto a un partido.

Lee el detalle por medio y año que ya publica ``build_legislatura_data.py``
(``site/data/medios/<slug>/<año>.json``), así que no necesita el taller y se
puede repetir en cualquier máquina con el repositorio. Hay que ejecutarlo
después de ``build_legislatura_data.py`` cada vez que se regeneren los datos.

Para cada periodo del mapa, medio y partido guarda dos cuartetos, uno para
todos los tuits y otro para los de 100 RT o más:

    [beneficia, perjudica, mediana de retuits, media de retuits]

La web calcula con ellos la posición (porcentaje que favorece al partido) y la
altura (tuits que lo benefician o perjudican). Bajo la clave ``lados`` va lo
mismo para izquierda y derecha, [izquierda, derecha, mediana, media], porque
``polarizacion.json`` no trae la media de retuits. Podemos ya llega agrupado
en Sumar, igual que en el resto del sitio.
"""
import json
import statistics
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "site" / "data"
PARTIDOS = ["PSOE", "PP", "Vox", "Sumar"]
IZQUIERDA = {"PSOE", "Sumar"}
XV_START = "2023-08-17"
YEARS = [str(year) for year in range(2018, 2027)]


def periodos_de(fecha):
    claves = ["todo", fecha[:4]]
    if fecha >= XV_START:
        claves.append("xv")
    return claves


def a_favor_izquierda(tuit):
    return (tuit["p"] in IZQUIERDA) == (tuit["d"] == "beneficia")


def cuarteto(filas, primero):
    """[primero, resto, mediana de retuits, media de retuits] de las filas."""
    n1 = sum(1 for f in filas if primero(f))
    rt = [f["rt"] for f in filas]
    mediana = round(statistics.median(rt), 1) if rt else 0
    media = round(statistics.fmean(rt), 1) if rt else 0
    return [n1, len(filas) - n1, mediana, media]


def series(filas, primero):
    return [cuarteto(filas, primero), cuarteto([f for f in filas if f["rt"] >= 100], primero)]


def main():
    index = json.loads((DATA / "index.json").read_text())
    pol = json.loads((DATA / "polarizacion.json").read_text())
    claves = list(pol["periodos"])
    periodos = {clave: {"medios": []} for clave in claves}
    for medio in sorted(index["medios"], key=lambda m: m["handle"].lower()):
        carpeta = DATA / Path(medio["archivo"]).parent
        filas = {clave: {p: [] for p in PARTIDOS} for clave in claves}
        for fichero in sorted(carpeta.glob("[0-9]*.json")):
            for tuit in json.loads(fichero.read_text())["tweets"]:
                if tuit["p"] not in PARTIDOS or tuit["d"] not in ("beneficia", "perjudica"):
                    continue
                for clave in periodos_de(tuit["f"]):
                    filas[clave][tuit["p"]].append(tuit)
        for clave in claves:
            fila = {"h": medio["handle"]}
            for partido in PARTIDOS:
                fila[partido] = series(filas[clave][partido], lambda f: f["d"] == "beneficia")
            fila["lados"] = series([f for p in PARTIDOS for f in filas[clave][p]], a_favor_izquierda)
            periodos[clave]["medios"].append(fila)
    salida = {
        "generado": pol.get("generado"),
        "partidos": PARTIDOS,
        "formato": "por periodo y medio, para cada partido: [[beneficia, perjudica, mediana RT, media RT] de todos los tuits, [...] de los de 100 RT o más]; en lados: [izquierda, derecha, mediana RT, media RT]",
        "periodos": periodos,
    }
    (DATA / "partidos.json").write_text(json.dumps(salida, ensure_ascii=False, separators=(",", ":")))
    print(f"partidos.json: {len(index['medios'])} medios, {len(claves)} periodos, {(DATA / 'partidos.json').stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
