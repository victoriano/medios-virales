#!/usr/bin/env python3
"""Genera los datos JSON del sitio a partir de virales_clasificados.csv."""
import csv, json, os, re
from collections import Counter, defaultdict

BASE = os.path.expanduser(os.environ.get("MEDIOS_DIR", "~/typesafe-lab/politica/medios"))
SITE = os.path.expanduser(os.environ.get("SITE_DIR", "~/Code/medios-virales/site"))
DATA = os.path.join(SITE, "data")
os.makedirs(os.path.join(DATA, "medios"), exist_ok=True)

rows = list(csv.DictReader(open(os.path.join(BASE, "virales_clasificados.csv"))))
members = {m["handle"]: m for m in json.load(open(os.path.join(BASE, "members.json")))}
sesgo = json.load(open(os.path.join(BASE, "sesgo_medios.json")))["por_medio"]
resumen = json.load(open(os.path.join(BASE, "virales_resumen.json")))


def num(v, cast=float, default=0):
    try:
        return cast(float(v or 0))
    except (TypeError, ValueError):
        return default


def slug(h):
    return h.lstrip("@").lower()


# --- agrupacion por medio ---
por_medio = defaultdict(list)
for r in rows:
    por_medio[r["handle"]].append(r)

indice_medios = []
for h, rs in por_medio.items():
    m = members.get(h, {})
    s = sesgo.get(h, {"izq": 0, "der": 0, "neutro": 0, "n": 0})
    claro = s["izq"] + s["der"]
    idx = (s["der"] - s["izq"]) / claro if claro else 0
    pol = [r for r in rs if r["partido"]]
    meses = Counter(r["fecha"][:7] for r in pol)
    pub = {
        "handle": h,
        "nombre": m.get("name") or (rs[0]["nombre"] if rs else h),
        "seguidores": m.get("followers", 0),
        "descripcion": (m.get("description") or "")[:280],
        "virales": len(rs),
        "politicos": len(pol),
        "izq": s["izq"], "der": s["der"], "neutro": s["neutro"],
        "indice": round(idx, 3),
        "partidos": dict(Counter(r["partido"] for r in pol).most_common()),
        "direccion": dict(Counter(r["direccion"] for r in pol if r["direccion"]).most_common()),
        "meses": dict(sorted(meses.items())),
        "rt_mediana": int(sorted(int(r["retweets"]) for r in rs)[len(rs) // 2]) if rs else 0,
        "rt_media": int(round(sum(int(r["retweets"]) for r in pol) / len(pol))) if pol else 0,
        "rt_max": max((int(r["retweets"]) for r in rs), default=0),
        "logo": f"logos/{slug(h)}.png",
        "archivo": f"medios/{slug(h)}.json",
    }
    indice_medios.append(pub)

    tweets = []
    for r in sorted(rs, key=lambda x: -int(x["retweets"])):
        tweets.append({
            "f": r["fecha"][:10],
            "t": r["texto"],
            "rt": int(r["retweets"]), "lk": int(num(r["likes"], int)), "rp": int(num(r["replies"], int)),
            "vw": int(num(r["views"], int)),
            "p": r["partido"] or "", "pc": num(r["partido_conf"]),
            "d": r["direccion"] or "", "dc": num(r["direccion_conf"]),
            "ir": num(r["ironia_p"]),
            "g": num(r["gate_p"]),
            "u": r["url"],
        })
    json.dump({"handle": h, "nombre": pub["nombre"], "indice": pub["indice"], "tweets": tweets},
              open(os.path.join(DATA, "medios", slug(h) + ".json"), "w"), ensure_ascii=False, separators=(",", ":"))

indice_medios.sort(key=lambda x: x["indice"])
tot_virales = sum(m["virales"] for m in indice_medios)

index = {
    "generado": "2026-09-20",
    "ventana": {"desde": rows[-1]["fecha"][:10] if rows else "", "hasta": "2026-09-19"},
    "fuente": "Apify, actor apidojo/twitter-scraper-lite, consultas from:<medio> min_retweets:100 por ventana mensual",
    "clasificador": "TypeSafe Jev (jev-latest) con ficha de contexto de Gemini 3.7 Flash y busqueda de Google: gate + partido + direccion + ironia",
    "totales": {
        "virales": tot_virales,
        "medios": len(indice_medios),
        "medios_lista": len(members),
        "clasificados": resumen["clasificados"],
        "gate_si": resumen["gate_si"], "gate_dudoso": resumen["gate_dudoso"], "gate_no": resumen["gate_no"],
        "por_partido": resumen["por_partido"],
        "por_direccion": resumen["por_direccion"],
        "cruce": resumen["cruce"],
        "ironia_media": resumen["ironia_media"],
        "coste_censo_usd": 21.41,
        "coste_clasificacion_usd": 10.02,
    },
    "meses": dict(sorted(Counter(r["fecha"][:7] for r in rows).items())),
    "medios": indice_medios,
}
json.dump(index, open(os.path.join(DATA, "index.json"), "w"), ensure_ascii=False, indent=1)

top = [r for r in rows if r["partido"]]
top.sort(key=lambda x: -int(x["retweets"]))
json.dump([{
    "h": r["handle"], "f": r["fecha"][:10], "t": r["texto"], "rt": int(r["retweets"]),
    "lk": int(num(r["likes"], int)), "vw": int(num(r["views"], int)),
    "p": r["partido"], "d": r["direccion"], "pc": num(r["partido_conf"]), "u": r["url"]
} for r in top[:300]], open(os.path.join(DATA, "top.json"), "w"), ensure_ascii=False, separators=(",", ":"))

print("medios indexados:", len(indice_medios))
print("virales totales:", tot_virales)
sizes = sorted(((os.path.getsize(os.path.join(DATA, "medios", f)), f) for f in os.listdir(os.path.join(DATA, "medios"))), reverse=True)
print("ficheros:", len(sizes), "| mayor:", sizes[0][1], round(sizes[0][0] / 1024), "KB")
print("peso total data:", round(sum(s[0] for s in sizes) / 1024 / 1024, 1), "MB")
print("index.json:", round(os.path.getsize(os.path.join(DATA, "index.json")) / 1024), "KB")
