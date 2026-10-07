#!/usr/bin/env python3
"""Construye ``site/data/partidos.json``: la posición de cada medio respecto a un partido.

Lee el detalle por medio y año que ya publica ``build_legislatura_data.py``
(``site/data/medios/<slug>/<año>.json``), así que no necesita el taller y se
puede repetir en cualquier máquina con el repositorio. Hay que ejecutarlo
después de ``build_legislatura_data.py`` cada vez que se regeneren los datos.

Para cada periodo del mapa, medio y partido guarda dos tripletas, una para
todos los tuits y otra para los de 100 RT o más:

    [beneficia, perjudica, mediana de retuits de esos tuits]

La web calcula con ellas la posición (porcentaje que favorece al partido) y la
altura (tuits que lo benefician o perjudican). Podemos ya llega agrupado en
Sumar, igual que en el resto del sitio.
"""
import json
import statistics
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "site" / "data"
PARTIDOS = ["PSOE", "PP", "Vox", "Sumar"]
XV_START = "2023-08-17"
YEARS = [str(year) for year in range(2018, 2027)]


def periodos_de(fecha):
    claves = ["todo", fecha[:4]]
    if fecha >= XV_START:
        claves.append("xv")
    return claves


def tripleta(filas):
    ben = sum(1 for f in filas if f["d"] == "beneficia")
    perj = len(filas) - ben
    rt = round(statistics.median(f["rt"] for f in filas), 1) if filas else 0
    return [ben, perj, rt]


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
                todas = filas[clave][partido]
                fila[partido] = [tripleta(todas), tripleta([f for f in todas if f["rt"] >= 100])]
            periodos[clave]["medios"].append(fila)
    salida = {
        "generado": pol.get("generado"),
        "partidos": PARTIDOS,
        "formato": "por periodo y medio, para cada partido: [[beneficia, perjudica, mediana RT] de todos los tuits, [...] de los de 100 RT o más]",
        "periodos": periodos,
    }
    (DATA / "partidos.json").write_text(json.dumps(salida, ensure_ascii=False, separators=(",", ":")))
    print(f"partidos.json: {len(index['medios'])} medios, {len(claves)} periodos, {(DATA / 'partidos.json').stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
