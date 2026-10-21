#!/usr/bin/env python3
"""Horizonte (Cuatro) frente a Malas Lenguas en la misma ventana de la serie histórica. Sin API.

Horizonte no está en el censo viral; solo hay serie histórica del 12 de febrero al 23 de julio de 2026.
Se toman todos los tuits políticos de las dos cuentas en esa ventana, tengan los retuits que tengan.
"""
import json
from pathlib import Path

AQUI = Path(__file__).resolve().parent
RAIZ = AQUI.parents[1]
DESDE, HASTA = "2026-02-12", "2026-07-24"

with open(AQUI / "muestra_horizonte.jsonl", "w") as f:
    for carpeta in ("horizontecuatro", "malaslenguas_tv"):
        d = RAIZ / "site/data/medios" / carpeta
        i = json.load(open(d / "index.json"))
        n = 0
        for t in json.load(open(d / "2026.json"))["tweets"]:
            if DESDE <= t["f"] < HASTA and t.get("p"):
                n += 1
                f.write(json.dumps({"id": t["u"].rsplit("/", 1)[-1], "url": t["u"], "fecha": t["f"], "handle": i["handle"],
                                    "nombre": i["nombre"], "retweets": t["rt"], "texto": t["t"], "partido": t["p"],
                                    "direccion": t["d"], "contexto": ""}, ensure_ascii=False) + "\n")
        print(i["handle"], n)
