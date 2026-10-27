#!/usr/bin/env python3
"""Todos los tuits políticos del censo viral, para clasificarlos con la taxonomía v5. Sin API.

Lee data/virales_clasificados.csv y la ficha de contexto. Se puede repetir cuando el censo crezca:
clasificar.py salta los tuits que ya están en el fichero de resultados.
"""
import csv, json
from pathlib import Path

AQUI = Path(__file__).resolve().parent
RAIZ = AQUI.parents[1]

ctx = json.load(open(RAIZ / "data/contexto_entidades.json"))
filas = [r for r in csv.DictReader(open(RAIZ / "data/virales_clasificados.csv")) if r["partido"]]
with open(AQUI / "muestra_censo.jsonl", "w") as f:
    for r in filas:
        f.write(json.dumps({"id": r["url"].rsplit("/", 1)[-1], "url": r["url"], "fecha": r["fecha"][:10],
                            "handle": r["handle"], "nombre": r["nombre"], "retweets": int(r["retweets"]),
                            "texto": r["texto"], "partido": r["partido"], "direccion": r["direccion"],
                            "contexto": ctx.get(r["url"], "")}, ensure_ascii=False) + "\n")
print(f"{len(filas)} tuits")
