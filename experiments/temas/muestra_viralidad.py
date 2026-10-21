#!/usr/bin/env python3
"""Muestras emparejadas para comparar virales y no virales (piloto ampliado, unos 1.000 por lado).

Virales: tuits políticos al azar del censo viral (data/virales_clasificados.csv, 100 RT o más).
No virales: para cada viral, otro tuit político con menos de 100 RT del mismo medio y el mismo
partido, de la serie histórica que publica la web (site/data/medios), en la ventana del censo.
Se quedan solo las parejas completas, así las dos muestras tienen el mismo reparto de medios y
partidos. Excluye los tuits que ya se usaron en muestra_noviral.jsonl. Semilla fija, sin API.
"""
import csv, json, random
from collections import defaultdict
from pathlib import Path

AQUI = Path(__file__).resolve().parent
RAIZ = AQUI.parents[1]
N, SEMILLA, DESDE, HASTA = 1000, 20261021, "2025-09-19", "2026-09-20"

ctx = json.load(open(RAIZ / "data/contexto_entidades.json"))
pool, nombres = defaultdict(list), {}
for d in sorted((RAIZ / "site/data/medios").iterdir()):
    i = json.load(open(d / "index.json"))
    h = i["handle"].lower()
    nombres[h] = i["nombre"]
    for f in sorted(d.glob("20*.json")):
        for t in json.load(open(f))["tweets"]:
            if DESDE <= t["f"] < HASTA and t.get("p") and t["rt"] < 100:
                pool[(h, t["p"])].append(t)
rnd = random.Random(SEMILLA)
for k in sorted(pool):
    pool[k].sort(key=lambda t: t["u"])
    rnd.shuffle(pool[k])

virales = [r for r in csv.DictReader(open(RAIZ / "data/virales_clasificados.csv"))
           if r["partido"] and r["handle"].lower() in nombres]
virales.sort(key=lambda r: r["url"])
rnd.shuffle(virales)
fila = lambda u, f, h, n, rt, x, p, d, c: {"id": u.rsplit("/", 1)[-1], "url": u, "fecha": f, "handle": h, "nombre": n,
                                           "retweets": rt, "texto": x, "partido": p, "direccion": d, "contexto": c}
sv, sn = [], []
for r in virales:
    if len(sv) == N:
        break
    k = (r["handle"].lower(), r["partido"])
    if not pool[k]:
        continue
    t = pool[k].pop()
    sv.append(fila(r["url"], r["fecha"][:10], r["handle"], r["nombre"], int(r["retweets"]), r["texto"], r["partido"],
                   r["direccion"], ctx.get(r["url"], "")))
    sn.append(fila(t["u"], t["f"], r["handle"], nombres[k[0]], t["rt"], t["t"], t["p"], t["d"], ""))
for nombre, filas in (("muestra_viralidad_v.jsonl", sv), ("muestra_viralidad_n.jsonl", sn)):
    with open(AQUI / nombre, "w") as f:
        for m in filas:
            f.write(json.dumps(m, ensure_ascii=False) + "\n")
print(f"{len(sv)} parejas de {len({m['handle'] for m in sv})} medios")
