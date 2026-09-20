#!/usr/bin/env python3
"""Clasifica los tuits virales (>100 RT) de la lista de medios con el mismo esquema que los periodistas."""
import csv, glob, json, os, statistics as st, time, urllib.error, urllib.request
from concurrent.futures import ThreadPoolExecutor

KEY = open(os.path.expanduser("~/.config/api-keys/.env")).read()
for line in KEY.splitlines():
    if line.startswith("TYPESAFE_API_KEY="):
        KEY = line.split("=", 1)[1].strip()
URL = "https://api.typesafe.ai/v1/systemone"
BASE = os.path.expanduser(os.environ.get("MEDIOS_DIR", "~/typesafe-lab/politica/medios"))
GATE_THRESHOLD = 0.5

GATE_Q = {"gate": {"type": "noul", "instructions": (
    "Este es un tuit de un medio de comunicacion espanol. Responde si el tuit se refiere a algo que pueda "
    "afectar a un partido politico espanol (PP, PSOE, Vox, Sumar, Podemos) o a sus dirigentes, politicas, "
    "campanas, gobierno u oposicion. Cuenta la politica espanola, sus instituciones y sus protagonistas. "
    "No cuenta la politica puramente extranjera, el deporte, la cultura, la economia sin conexion politica, "
    "la sucesos ni la tecnologia."),
    "criteria": {"true": "Trata de politica espanola o de algo que puede afectar electoralmente a un partido",
                 "false": "No tiene relacion con la politica espanola ni puede afectar a ningun partido"}}}

STAGE2_Q = {
    "objetivo": {"type": "choice",
                 "instructions": "¿A que partido o partidos espanoles afecta o se refiere principalmente el tuit?",
                 "criteria": {"PP": "Se refiere al PP o a sus dirigentes, sobre todo a Ayuso, Feijoo o cargos del PP",
                              "PSOE": "Se refiere al PSOE o al Gobierno de coalicion liderado por Pedro Sanchez",
                              "Vox": "Se refiere a Vox o a Santiago Abascal",
                              "Sumar": "Se refiere a Sumar, Yolanda Diaz o Podemos",
                              "varios": "Se refiere a mas de un partido a la vez, sin que uno domine claramente",
                              "ninguno": "Habla de politica general, instituciones o cargos no adscritos a un partido concreto"}},
    "direccion": {"type": "choice",
                  "instructions": "El tuit, tal como esta escrito, ¿favorece o perjudica al partido o partidos senalados?",
                  "criteria": {"beneficia": "Presenta al partido o a sus dirigentes de forma favorable, o ataca a sus rivales en su beneficio",
                               "perjudica": "Presenta al partido o a sus dirigentes de forma desfavorable, o denuncia algo negativo",
                               "neutro": "Informa sin tomar partido, o mezcla elementos favorables y desfavorables"}},
    "ironia": {"type": "noul",
               "instructions": "El tuit usa ironia o sarcasmo, de forma que el sentido literal es el contrario del real"},
}


def call(state, questions, retries=4):
    data = json.dumps({"state": state, "model": "jev-latest", "questions": questions}).encode()
    for a in range(retries):
        req = urllib.request.Request(URL, data=data, headers={
            "Authorization": f"Bearer {KEY}", "Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code in (429, 529) and a < retries - 1:
                time.sleep(2 ** a); continue
            return {"error": f"HTTP {e.code}"}
        except Exception as ex:
            if a < retries - 1:
                time.sleep(2 ** a); continue
            return {"error": f"{type(ex).__name__}: {ex}"}
    return {"error": "retries"}


def iso(d):
    import datetime as dt
    try:
        from email.utils import parsedate_to_datetime
        return parsedate_to_datetime(d).isoformat()
    except Exception:
        try:
            return dt.datetime.strptime(d, "%a %b %d %H:%M:%S %z %Y").isoformat()
        except Exception:
            return d


def load():
    seen, out = set(), []
    for p in sorted(glob.glob(os.path.join(BASE, "virales", "*.json"))):
        for t in json.load(open(p)):
            if not isinstance(t, dict) or not t.get("id") or t["id"] in seen:
                continue
            seen.add(t["id"])
            a = t.get("author") or {}
            out.append({"id": t["id"], "fecha": iso(t.get("createdAt") or ""),
                        "handle": "@" + (a.get("userName") or ""), "nombre": a.get("name") or "",
                        "texto": t.get("fullText") or t.get("text") or "",
                        "retweets": t.get("retweetCount") or 0, "likes": t.get("likeCount") or 0,
                        "replies": t.get("replyCount") or 0, "views": t.get("viewCount") or 0,
                        "url": t.get("url") or f"https://x.com/{a.get('userName')}/status/{t['id']}"})
    return out


def state_for(t):
    return {"medio": t["handle"], "fecha": t["fecha"], "tuit": t["texto"],
            "nota": "El tuit puede incluir un enlace acortado o una imagen no visibles; clasifica con el texto disponible"}


def main():
    tweets = [t for t in load() if t["retweets"] > 100]
    print(f"virales unicos con >100 RT: {len(tweets)}", flush=True)
    by_handle = {}
    for t in tweets:
        by_handle[t["handle"]] = by_handle.get(t["handle"], 0) + 1
    print("medios:", len(by_handle), flush=True)

    def gate_one(t):
        r = call(state_for(t), GATE_Q)
        return t["id"], (r.get("answers") or {}).get("gate", {}).get("noul"), r.get("error")

    t0 = time.time()
    with ThreadPoolExecutor(max_workers=10) as ex:
        gates = list(ex.map(gate_one, tweets))
    gmap = {i: (p, e) for i, p, e in gates}
    print(f"gate en {time.time()-t0:.0f}s | errores {sum(1 for _,_,e in gates if e)}", flush=True)

    relevant = [t for t in tweets if (gmap.get(t["id"], (None,))[0] or 0) >= GATE_THRESHOLD]
    print(f"pasan el gate: {len(relevant)}", flush=True)

    def stage2_one(t):
        r = call(state_for(t) | {"paso_previo": "este tuit ya se considero relacionado con la politica espanola"}, STAGE2_Q)
        return t["id"], r

    t0 = time.time()
    with ThreadPoolExecutor(max_workers=10) as ex:
        s2map = dict(ex.map(stage2_one, relevant))
    print(f"paso 2 en {time.time()-t0:.0f}s", flush=True)

    rows = []
    for t in tweets:
        g, err = gmap.get(t["id"], (None, None))
        row = dict(t)
        row.update({"gate_p": g,
                    "relevante": ("si" if (g or 0) >= 0.7 else "dudoso" if (g or 0) >= 0.5 else "no") if g is not None else "error",
                    "partido": "", "partido_conf": "", "direccion": "", "direccion_conf": "", "ironia_p": "",
                    "error": err or ""})
        r = s2map.get(t["id"])
        if r:
            a = r.get("answers", {})
            ob, di, ir = a.get("objetivo", {}), a.get("direccion", {}), a.get("ironia", {})
            row.update({"partido": ob.get("choice", ""), "partido_conf": round(ob.get("confidence", 0), 3),
                        "direccion": di.get("choice", ""), "direccion_conf": round(di.get("confidence", 0), 3),
                        "ironia_p": ir.get("noul", ""), "error": r.get("error", "")})
            for k, v in (ob.get("probabilities", {}) or {}).items():
                row[f"p_{k}"] = round(v, 3)
        rows.append(row)

    cols = ["fecha", "handle", "nombre", "retweets", "likes", "replies", "views", "gate_p", "relevante",
            "partido", "partido_conf", "direccion", "direccion_conf", "ironia_p", "texto", "url",
            "p_PP", "p_PSOE", "p_Vox", "p_Sumar", "p_varios", "p_ninguno", "error"]
    with open(os.path.join(BASE, "virales_clasificados.csv"), "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=cols, extrasaction="ignore")
        w.writeheader()
        for r in sorted(rows, key=lambda x: -x["retweets"]):
            w.writerow(r)

    rel = [r for r in rows if r["partido"]]
    resumen = {
        "virales_totales": len(rows), "medios": len({r["handle"] for r in rows}),
        "gate_si": sum(1 for r in rows if r["relevante"] == "si"),
        "gate_dudoso": sum(1 for r in rows if r["relevante"] == "dudoso"),
        "gate_no": sum(1 for r in rows if r["relevante"] == "no"),
        "clasificados": len(rel),
        "por_partido": dict(sorted(((k, sum(1 for r in rel if r["partido"] == k)) for k in {r["partido"] for r in rel}), key=lambda x: -x[1])),
        "por_direccion": dict(sorted(((k, sum(1 for r in rel if r["direccion"] == k)) for k in {r["direccion"] for r in rel}), key=lambda x: -x[1])),
        "ironia_media": round(st.mean([r["ironia_p"] for r in rel if isinstance(r["ironia_p"], float)]), 3) if rel else None,
        "errores": sum(1 for r in rows if r["error"]),
    }
    for r in rel:
        k = f"{r['partido']} / {r['direccion']}"
        resumen.setdefault("cruce", {})
        resumen["cruce"][k] = resumen["cruce"].get(k, 0) + 1
    json.dump(resumen, open(os.path.join(BASE, "virales_resumen.json"), "w"), ensure_ascii=False, indent=1)
    print(json.dumps(resumen, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
