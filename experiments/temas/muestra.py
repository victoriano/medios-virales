#!/usr/bin/env python3
"""Saca la muestra del piloto de temas: 300 tuits políticos del censo viral.

Estratifica por partido objetivo (con un mínimo para los partidos pequeños) y reparte entre medios
con un tope por cuenta. Semilla fija. No llama a ninguna API.
"""
import csv, json, random
from collections import defaultdict
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
N, SEMILLA, TOPE_MEDIO = 300, 20261019, 10
CUOTA = {"PSOE": 120, "PP": 80, "Vox": 30, "Sumar": 25, "varios": 20, "ninguno": 25}

filas = [r for r in csv.DictReader(open(RAIZ / "data/virales_clasificados.csv")) if r["partido"]]
ctx = json.load(open(RAIZ / "data/contexto_entidades.json"))
rnd = random.Random(SEMILLA)
rnd.shuffle(filas)
por_medio, muestra = defaultdict(int), []
for partido, cuota in CUOTA.items():
    n = 0
    for r in filas:
        if n == cuota:
            break
        if r["partido"] != partido or por_medio[r["handle"]] >= TOPE_MEDIO:
            continue
        por_medio[r["handle"]] += 1
        n += 1
        muestra.append({"id": r["url"].rsplit("/", 1)[-1], "url": r["url"], "fecha": r["fecha"][:10],
                        "handle": r["handle"], "nombre": r["nombre"], "retweets": int(r["retweets"]),
                        "texto": r["texto"], "partido": partido, "direccion": r["direccion"],
                        "contexto": ctx.get(r["url"], "")})
assert len(muestra) == N, len(muestra)
with open(Path(__file__).with_name("muestra.jsonl"), "w") as f:
    for m in muestra:
        f.write(json.dumps(m, ensure_ascii=False) + "\n")
print(f"{len(muestra)} tuits de {len(por_medio)} medios")
