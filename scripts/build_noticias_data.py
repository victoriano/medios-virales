#!/usr/bin/env python3
"""Saca site/data/noticias.json, las noticias políticas que la sección Tendencias
puede superponer en el gráfico.

La fuente es data/noticias_politicas.csv, copiada tal cual de
data/eventos_2018_2026.csv del proyecto de los barómetros del CIS
(github.com/victoriano/barometro-cis-viz). Si se amplía allí, se vuelve a copiar
y se repite este script. No necesita el taller.
"""
from __future__ import annotations

import csv
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CSV = ROOT / "data" / "noticias_politicas.csv"
OUT = ROOT / "site" / "data" / "noticias.json"

# «PP (-)», y también alguna forma libre como «PSOE (mixto)» o «Vox (+ a medio plazo)»
IMPACTO = re.compile(r"([^;]+?)\s*\(([+\-0]|mixto)[^)]*\)")


def impactos(texto: str) -> list[list[str]]:
    """Cada partido con su signo: +, -, 0 o ± (mixto)."""
    return [[m.group(1).strip(), "±" if m.group(2) == "mixto" else m.group(2)]
            for m in IMPACTO.finditer(texto or "")]


def main() -> None:
    with CSV.open(encoding="utf-8-sig", newline="") as f:
        filas = list(csv.DictReader(f))
    noticias = []
    for r in filas:
        noticias.append({
            "id": r["id_evento"],
            "fecha": r["fecha_evento"],
            "nombre": r["nombre_evento"].strip(),
            "categoria": r["categoria"].strip(),
            "ambito": r["ambito"].strip(),
            "descripcion": r["descripcion"].strip(),
            "explicacion": r["explicacion_impacto"].strip(),
            "impactos": impactos(r["impacto_probable"]),
            "relevancia": int(r["relevancia_1_5"]),
            "confianza": r["confianza_analitica"].strip(),
            "fuentes": [u.strip() for u in r["fuentes"].split("|") if u.strip()],
        })
    noticias.sort(key=lambda n: (n["fecha"], n["id"]))
    OUT.write_text(json.dumps({
        "fuente": "https://github.com/victoriano/barometro-cis-viz/blob/main/data/eventos_2018_2026.csv",
        "noticias": noticias,
    }, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"{len(noticias)} noticias, de {noticias[0]['fecha']} a {noticias[-1]['fecha']} -> {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
