#!/usr/bin/env python3
"""Construye ``site/data/contenidos.json``: los tuits que la sección Contenidos
busca sin tener que descargar la muestra entera.

Lee el detalle por medio y año que ya publica ``build_legislatura_data.py``
(``site/data/medios/<slug>/<año>.json``), así que no necesita el taller y se
puede repetir en cualquier máquina con el repositorio. Hay que ejecutarlo
después de ``build_legislatura_data.py`` cada vez que se regeneren los datos.

Guarda todos los tuits con 100 retuits o más de todos los medios, con y sin
lectura política, con los mismos campos que los ficheros por año más ``h``, la
cuenta. El enlace ``u`` se guarda solo como identificador ``id``, porque siempre
es ``https://x.com/<cuenta>/status/<id>`` y así el fichero pesa un 10 % menos.

Cuando el lector elige un medio, la web carga su muestra completa desde los
ficheros por año; este fichero solo cubre la búsqueda entre todos.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "site" / "data"
CORTE_VIRAL = 100


def main():
    index = json.loads((DATA / "index.json").read_text())
    filas = []
    for medio in index["medios"]:
        manifiesto_ruta = DATA / medio["archivo"]
        manifiesto = json.loads(manifiesto_ruta.read_text())
        for parte in manifiesto.get("particiones", []):
            trozo = json.loads((manifiesto_ruta.parent / parte["archivo"]).read_text())
            for tuit in trozo["tweets"]:
                if tuit["rt"] < CORTE_VIRAL:
                    continue
                prefijo = f"https://x.com/{medio['handle'].lstrip('@')}/status/"
                if not tuit["u"].startswith(prefijo):
                    raise SystemExit(f"enlace inesperado en {medio['handle']}: {tuit['u']}")
                fila = {"h": medio["handle"], **tuit, "id": tuit["u"][len(prefijo):]}
                del fila["u"]
                filas.append(fila)
    filas.sort(key=lambda f: (-f["rt"], f["f"], f["id"]))
    salida = {"corte": CORTE_VIRAL, "ver": index.get("ver", ""), "tweets": filas}
    (DATA / "contenidos.json").write_text(json.dumps(salida, ensure_ascii=False, separators=(",", ":")))
    print(json.dumps({"tuits": len(filas), "politicos": sum(1 for f in filas if f.get("p"))}))


if __name__ == "__main__":
    main()
