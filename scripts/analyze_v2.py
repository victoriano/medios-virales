#!/usr/bin/env python3
"""Analisis del censo v2: mismo calculo que analyze_virales.py, pero sobre el CSV reclasificado,
y comparacion del indice por medio contra la version anterior."""
import argparse, csv, json, os
from collections import Counter, defaultdict

BASE = os.path.expanduser(os.environ.get("MEDIOS_DIR", "~/typesafe-lab/politica/medios"))
IZQ, DER = {"PSOE", "Sumar"}, {"PP", "Vox"}


def indice(rows):
    idx = defaultdict(lambda: {"izq": 0, "der": 0, "neutro": 0, "n": 0})
    for r in rows:
        if not r.get("partido"):
            continue
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
    out = {}
    for h, v in idx.items():
        claro = v["izq"] + v["der"]
        out[h] = {**v, "indice": round((v["der"] - v["izq"]) / claro, 4) if claro else 0.0}
    return out


def resumen(rows):
    rel = [r for r in rows if r["partido"]]
    return {
        "virales_totales": len(rows), "medios": len({r["handle"] for r in rows}),
        "gate_si": sum(1 for r in rows if r["relevante"] == "si"),
        "gate_dudoso": sum(1 for r in rows if r["relevante"] == "dudoso"),
        "gate_no": sum(1 for r in rows if r["relevante"] == "no"),
        "clasificados": len(rel),
        "por_partido": dict(Counter(r["partido"] for r in rel).most_common()),
        "por_direccion": dict(Counter(r["direccion"] for r in rel if r["direccion"]).most_common()),
        "ironia_media": round(sum(float(r["ironia_p"] or 0) for r in rel) / len(rel), 3) if rel else None,
        "errores": sum(1 for r in rows if r.get("error")),
        "cruce": dict(Counter(f"{r['partido']} / {r['direccion']}" for r in rel).most_common()),
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--csv", default=os.path.join(BASE, "virales_v2.csv"))
    ap.add_argument("--viejo", default=os.path.join(BASE, "virales_clasificados_v1.csv"))
    ap.add_argument("--min-n", type=int, default=15)
    args = ap.parse_args()

    nuevo = list(csv.DictReader(open(args.csv, encoding="utf-8")))
    viejo = list(csv.DictReader(open(args.viejo, encoding="utf-8")))
    print(f"filas: v1 {len(viejo)} | v2 {len(nuevo)}")

    r1, r2 = resumen(viejo), resumen(nuevo)
    print("\n=== resumen global: v1 -> v2 ===")
    for k in ("clasificados", "por_partido", "por_direccion", "ironia_media"):
        print(f"  {k}:\n    v1 {r1[k]}\n    v2 {r2[k]}")

    i1, i2 = indice(viejo), indice(nuevo)
    json.dump({"por_medio": {h: v for h, v in i2.items() if v["n"] >= args.min_n}},
              open(os.path.join(BASE, "sesgo_medios_v2.json"), "w"), ensure_ascii=False, indent=1)
    json.dump(r2, open(os.path.join(BASE, "virales_resumen_v2.json"), "w"), ensure_ascii=False, indent=1)

    comunes = [h for h in i2 if h in i1 and i2[h]["n"] >= args.min_n and i1[h]["n"] >= args.min_n]
    move = sorted(comunes, key=lambda h: -abs(i2[h]["indice"] - i1[h]["indice"]))
    print(f"\n=== medios con n>={args.min_n}: {len(comunes)} | indice v1 -> v2 ===")
    print("  (los 20 que mas se mueven)")
    for h in move[:20]:
        print(f"  {h:22} {i1[h]['indice']:+.2f} -> {i2[h]['indice']:+.2f}   (delta {i2[h]['indice']-i1[h]['indice']:+.2f}, n {i1[h]['n']} -> {i2[h]['n']})")
    media = sum(abs(i2[h]["indice"] - i1[h]["indice"]) for h in comunes) / len(comunes) if comunes else 0
    print(f"\n  desplazamiento medio del indice: {media:.3f}")
    print("  escritos: sesgo_medios_v2.json, virales_resumen_v2.json")


if __name__ == "__main__":
    main()
