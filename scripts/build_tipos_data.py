#!/usr/bin/env python3
"""Añade a ``site/data/index.json`` el tipo de cada medio, para el filtro del mapa.

La clasificación vive a mano en ``data/tipos_medio.json``: prensa escrita, digital,
televisión (cadenas y sus informativos), programa de televisión, radio, programa de
radio y agencia de noticias. Un programa no es un medio: Malas Lenguas es un programa
de La 1 y La 2, no una cabecera. No necesita el taller y se puede repetir tantas veces
como haga falta; hay que ejecutarlo después de ``build_legislatura_data.py``.
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TIPOS = ROOT / "data" / "tipos_medio.json"
INDEX = ROOT / "site" / "data" / "index.json"


def cargar_tipos():
    datos = json.loads(TIPOS.read_text())
    por_handle = {h.lower(): tipo for h, tipo in datos["medios"].items()}
    desconocidos = set(por_handle.values()) - set(datos["tipos"])
    if desconocidos:
        sys.exit(f"Tipos sin etiqueta en {TIPOS.name}: {sorted(desconocidos)}")
    return datos["tipos"], por_handle


def main():
    etiquetas, por_handle = cargar_tipos()
    index = json.loads(INDEX.read_text())
    faltan = [m["handle"] for m in index["medios"] if m["handle"].lower() not in por_handle]
    if faltan:
        sys.exit(f"Medios sin tipo en {TIPOS.name}: {', '.join(faltan)}")
    for medio in index["medios"]:
        medio["tipo"] = por_handle[medio["handle"].lower()]
    index["tipos"] = etiquetas
    INDEX.write_text(json.dumps(index, ensure_ascii=False, separators=(",", ":")))
    print(f"{len(index['medios'])} medios con tipo en {INDEX.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
