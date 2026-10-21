#!/usr/bin/env python3
"""Saca la muestra no viral para comparar con muestra_2.jsonl: tuits políticos con menos de 100 RT.

Sale de la serie histórica que ya publica la web (site/data/medios/<medio>/<año>.json), en la ventana
del censo viral (19 sep 2025 a 19 sep 2026). Para cada pareja de medio y partido de muestra_2 toma
el mismo número de tuits, así la comparación es dentro de cada medio. Semilla fija. No llama a ninguna API.
"""
import json, random
from collections import Counter, defaultdict
from pathlib import Path

AQUI = Path(__file__).resolve().parent
RAIZ = AQUI.parents[1]
SEMILLA, DESDE, HASTA = 20261021, "2025-09-19", "2026-09-20"

viral = [json.loads(l) for l in open(AQUI / "muestra_2.jsonl")]
cuota = Counter((v["handle"].lower(), v["partido"]) for v in viral)
pool, nombres = defaultdict(list), {}
for d in sorted((RAIZ / "site/data/medios").iterdir()):
    i = json.load(open(d / "index.json"))
    h = i["handle"].lower()
    nombres[h] = (i["handle"], i["nombre"])
    for f in sorted(d.glob("20*.json")):
        for t in json.load(open(f))["tweets"]:
            if DESDE <= t["f"] < HASTA and t.get("p") and t["rt"] < 100:
                pool[(h, t["p"])].append(t)
rnd = random.Random(SEMILLA)
muestra, falta = [], Counter()
for (h, p), n in sorted(cuota.items()):
    cand = sorted(pool[(h, p)], key=lambda t: t["u"])
    rnd.shuffle(cand)
    falta[(h, p)] = max(0, n - len(cand))
    for t in cand[:n]:
        muestra.append({"id": t["u"].rsplit("/", 1)[-1], "url": t["u"], "fecha": t["f"], "handle": nombres[h][0],
                        "nombre": nombres[h][1], "retweets": t["rt"], "texto": t["t"], "partido": p,
                        "direccion": t["d"], "contexto": ""})
with open(AQUI / "muestra_noviral.jsonl", "w") as f:
    for m in muestra:
        f.write(json.dumps(m, ensure_ascii=False) + "\n")
print(f"{len(muestra)} tuits; faltan {sum(falta.values())}: {[k for k, v in falta.items() if v]}")
