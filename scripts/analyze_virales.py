#!/usr/bin/env python3
"""Analisis del censo: reparto por partido, direccion y sesgo por medio."""
import csv, json, os
from collections import Counter, defaultdict

BASE = os.path.expanduser(os.environ.get("MEDIOS_DIR", "~/typesafe-lab/politica/medios"))
rows = list(csv.DictReader(open(os.path.join(BASE, "virales_clasificados.csv"))))
print(f"filas: {len(rows)}")

rel = [r for r in rows if r.get("partido")]
print(f"con partido asignado: {len(rel)}")

print("\n=== Paso 1: gate ===")
print(Counter(r["relevante"] for r in rows).most_common())
print("\n=== Partido ===")
print(Counter(r["partido"] for r in rel).most_common())
print("\n=== Direccion ===")
print(Counter(r["direccion"] for r in rel).most_common())
print("\n=== Cruce partido/direccion ===")
print(Counter(f"{r['partido']}/{r['direccion']}" for r in rel).most_common())

IZQ, DER = {"PSOE", "Sumar"}, {"PP", "Vox"}
idx = defaultdict(lambda: {"izq": 0, "der": 0, "neutro": 0, "n": 0})
for r in rel:
    h = r["handle"]
    idx[h]["n"] += 1
    p, d = r["partido"], r["direccion"]
    if d == "beneficia" and p in IZQ:
        idx[h]["izq"] += 1
    elif d == "beneficia" and p in DER:
        idx[h]["der"] += 1
    elif d == "perjudica" and p in DER:
        idx[h]["izq"] += 1
    elif d == "perjudica" and p in IZQ:
        idx[h]["der"] += 1
    else:
        idx[h]["neutro"] += 1

tabla = []
for h, v in idx.items():
    claro = v["izq"] + v["der"]
    if v["n"] < 15:
        continue
    sesgo = (v["der"] - v["izq"]) / claro if claro else 0
    tabla.append((sesgo, h, v))
tabla.sort()
print("\n=== Sesgo por medio (indice derecha menos izquierda, solo tuits con partido claro y direccion) ===")
print("  mas a la izquierda ... mas a la derecha")
for s, h, v in tabla:
    print(f"  {h:22} indice {s:+.2f} | n={v['n']:4} izq={v['izq']:3} der={v['der']:3} neutro={v['neutro']:3}")

json.dump({"por_medio": {h: v for _, h, v in tabla}}, open(os.path.join(BASE, "sesgo_medios.json"), "w"), ensure_ascii=False, indent=1)

print("\n=== Top 15 virales politicos ===")
for r in sorted(rel, key=lambda x: -int(x["retweets"]))[:15]:
    print(f"  {r['retweets']:>6} RT {r['handle']:18} {r['partido']:7} {r['direccion']:10} | {r['texto'][:80]!r}")
