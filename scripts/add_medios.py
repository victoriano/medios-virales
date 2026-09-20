#!/usr/bin/env python3
"""Anade medios nuevos al censo ya clasificado, sin repetir los que ya estan.

Por cada medio nuevo:
  1. Lee los virales ya descargados en virales/<handle>.json (>100 RT, ventana del censo).
  2. Puerta con Jev (noul), igual que en el censo original.
  3. Para los que pasan: Jev con partido, direccion e ironia (para tener ironia y probabilidades)
     y ademas ficha de contexto de Gemini + partido y direccion definitivos de Gemini, que es lo
     que manda. La puerta y la ironia siguen siendo de Jev para que las filas sean homogeneas.

Uso:
  python3 add_medios.py                    # detecta solo los medios de members.json que no estan en el CSV
  python3 add_medios.py --handles @a,@b    # solo esos
  python3 add_medios.py --dry-run          # cuenta sin llamar a ninguna API
"""
import argparse, csv, json, os, re, time, urllib.error, urllib.request
from concurrent.futures import ThreadPoolExecutor

BASE = os.path.expanduser(os.environ.get("MEDIOS_DIR", "~/typesafe-lab/politica/medios"))
CSV = os.path.join(BASE, "virales_clasificados.csv")
VIRALES = os.path.join(BASE, "virales")
GKEY = open(os.path.expanduser("~/.config/gemini/api_key")).read().strip()
TKEY = [l.split("=", 1)[1].strip() for l in open(os.path.expanduser("~/.config/api-keys/.env"))
        if l.startswith("TYPESAFE_API_KEY=")][0]
GMODELO = "gemini-3.7-flash"
LOTE = 10
HILOS = 8
CONF = {"alta": 0.9, "media": 0.7, "baja": 0.5}
GATE_THRESHOLD = 0.5

GATE_Q = {"gate": {"type": "noul", "instructions": (
    "Este es un tuit de un medio de comunicacion espanol. Responde si el tuit se refiere a algo que pueda "
    "afectar a un partido politico espanol (PP, PSOE, Vox, Sumar, Podemos) o a sus dirigentes, politicas, "
    "campanas, gobierno u oposicion. Cuenta la politica espanola, sus instituciones y sus protagonistas. "
    "No cuenta la politica puramente extranjera, el deporte, la cultura, la economia sin conexion politica, "
    "la sucesos ni la tecnologia."),
    "criteria": {"true": "Trata de politica espanola o de algo que puede afectar electoralmente a un partido",
                 "false": "No tiene relacion con la politica espanola ni puede afectar a ningun partido"}}}

STAGE2_JEV = {
    "objetivo": {"type": "choice", "instructions": "¿A que partido o partidos espanoles afecta o se refiere principalmente el tuit?",
                 "criteria": {"PP": "Se refiere al PP o a sus dirigentes, sobre todo a Ayuso, Feijoo o cargos del PP",
                              "PSOE": "Se refiere al PSOE o al Gobierno de coalicion liderado por Pedro Sanchez",
                              "Vox": "Se refiere a Vox o a Santiago Abascal",
                              "Sumar": "Se refiere a Sumar, Yolanda Diaz o Podemos",
                              "varios": "Se refiere a mas de un partido a la vez, sin que uno domine claramente",
                              "ninguno": "Habla de politica general, instituciones o cargos no adscritos a un partido concreto"}},
    "direccion": {"type": "choice", "instructions": "El tuit, tal como esta escrito, ¿favorece o perjudica al partido senalado?",
                  "criteria": {"beneficia": "Presenta al partido o a sus dirigentes de forma favorable",
                               "perjudica": "Presenta al partido o a sus dirigentes de forma desfavorable, o denuncia algo negativo",
                               "neutro": "Informa sin tomar partido, o mezcla elementos favorables y desfavorables"}},
    "ironia": {"type": "noul", "instructions": "El tuit usa ironia o sarcasmo, de forma que el sentido literal es el contrario del real"},
}

PROMPT_CTX = ("Eres documentalista de politica espanola. Para cada tuit, identifica las personas, empresas, casos e "
              "instituciones mencionadas y di A QUE PARTIDO ESPANOL (PP, PSOE, Vox, Sumar) o A QUE CASO conocido estan "
              "ligadas. Si una persona no es militante pero es protagonista de un caso que senala a un partido, indica el "
              "partido de ese caso (por ejemplo: Barrabes = caso Begona Gomez, PSOE). Si no conoces a alguien con "
              "seguridad, BUSCA en Google antes de responder en vez de escribir desconocido. Una linea por tuit, sin "
              "explicaciones. Formato exacto:\nTUIT n: entidad = partido/caso. | entidad = partido/caso.\n\n")

PROMPT_FINAL = (
    "Eres analista de politica espanola. Para cada tuit decide dos cosas.\n"
    "PARTIDO: a que partido espanol (PP, PSOE, Vox, Sumar, varios o ninguno) CRITICA el tuit o del que sale en su defensa. "
    "Reglas: si critica una decision del Gobierno de Espana o de un ministerio, el partido es PSOE aunque la noticia ocurra en "
    "una ciudad o comunidad gobernada por otro partido; si el tuit defiende a un partido o a uno de sus cargos de un ataque, el "
    "partido es el defendido; si el protagonista es un cargo de un partido y el tuit lo critica, ese partido; si no hay ningun "
    "partido senalado, ninguno.\n"
    "DIRECCION: si el tuit deja a ese partido PEOR (perjudica) o MEJOR (beneficia) de cara al publico, o si solo informa "
    "(neutro). Mira quien habla y el significado politico, no solo el tono.\n"
    "Si no conoces a alguien o el caso, BUSCA en Google antes de responder. Formato exacto, una linea por tuit y nada mas:\n"
    "TUIT n: PARTIDO - beneficia|perjudica|neutro - alta|media|baja - motivo en menos de 12 palabras.\n\n")

COLS = ["fecha", "handle", "nombre", "retweets", "likes", "replies", "views", "gate_p", "relevante", "partido",
        "partido_conf", "direccion", "direccion_conf", "ironia_p", "texto", "url", "p_PP", "p_PSOE", "p_Vox",
        "p_Sumar", "p_varios", "p_ninguno", "error", "voz", "direccion_motivo"]


def post(url, body, headers, retries=4, timeout=300):
    data = json.dumps(body).encode()
    for a in range(retries):
        req = urllib.request.Request(url, data=data, headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code in (429, 503) and a < retries - 1:
                time.sleep(2 ** a); continue
            return {"error": f"HTTP {e.code}"}
        except Exception as ex:
            if a < retries - 1:
                time.sleep(2 ** a); continue
            return {"error": str(ex)}
    return {"error": "retries"}


def jev(state, questions):
    return post("https://api.typesafe.ai/v1/systemone",
                {"state": state, "model": "jev-latest", "questions": questions},
                {"Authorization": f"Bearer {TKEY}", "Content-Type": "application/json"}, timeout=120)


def gemini(texto):
    return post(f"https://generativelanguage.googleapis.com/v1beta/models/{GMODELO}:generateContent?key={GKEY}",
                {"contents": [{"parts": [{"text": texto}]}], "tools": [{"google_search": {}}]},
                {"Content-Type": "application/json"})


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


def cargar(handle):
    p = os.path.join(VIRALES, handle.lstrip("@") + ".json")
    if not os.path.exists(p):
        return []
    visto, out = set(), []
    for t in json.load(open(p)):
        if not isinstance(t, dict) or not t.get("id") or t["id"] in visto:
            continue
        visto.add(t["id"])
        a = t.get("author") or {}
        rt = t.get("retweetCount") or 0
        if rt <= 100:
            continue
        out.append({"fecha": iso(t.get("createdAt") or ""), "handle": "@" + (a.get("userName") or ""),
                    "nombre": a.get("name") or "", "texto": t.get("fullText") or t.get("text") or "",
                    "retweets": rt, "likes": t.get("likeCount") or 0, "replies": t.get("replyCount") or 0,
                    "views": t.get("viewCount") or 0,
                    "url": t.get("url") or f"https://x.com/{a.get('userName')}/status/{t['id']}"})
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--handles", help="lista separada por comas; por defecto, los de members.json que no estan en el CSV")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    rows = list(csv.DictReader(open(CSV, encoding="utf-8")))
    en_csv = {r["handle"] for r in rows}
    members = json.load(open(os.path.join(BASE, "members.json")))
    if args.handles:
        handles = [h.strip() for h in args.handles.split(",") if h.strip()]
    else:
        handles = [m["handle"] for m in members if m["handle"] not in en_csv]
    print(f"medios nuevos a anadir: {len(handles)} -> {handles}", flush=True)

    tuits = []
    for h in handles:
        t = cargar(h)
        print(f"  {h:20} {len(t):5} virales (>100 RT)", flush=True)
        tuits.extend(t)
    if not tuits:
        print("nada que anadir"); return
    if args.dry_run:
        print(f"dry-run: {len(tuits)} tuits listos para clasificar"); return

    # --- puerta (Jev) ---
    def puerta(t):
        r = jev({"medio": t["handle"], "fecha": t["fecha"][:10], "tuit": t["texto"],
                 "nota": "El tuit puede incluir un enlace acortado o una imagen no visibles"}, GATE_Q)
        return t["url"], (r.get("answers") or {}).get("gate", {}).get("noul"), r.get("error")

    t0 = time.time()
    with ThreadPoolExecutor(max_workers=10) as ex:
        gates = list(ex.map(puerta, tuits))
    gmap = {u: (p, e) for u, p, e in gates}
    pasan = [t for t in tuits if (gmap.get(t["url"], (0,))[0] or 0) >= GATE_THRESHOLD]
    print(f"puerta en {time.time()-t0:.0f}s | pasan {len(pasan)} de {len(tuits)}", flush=True)

    # --- Jev: partido, direccion e ironia (para ironia y probabilidades) ---
    def jev2(t):
        r = jev({"medio": t["handle"], "fecha": t["fecha"][:10], "tuit": t["texto"],
                 "nota": "El tuit puede incluir un enlace acortado o una imagen no visibles",
                 "paso_previo": "este tuit ya se considero relacionado con la politica espanola"}, STAGE2_JEV)
        return t["url"], r

    t0 = time.time()
    with ThreadPoolExecutor(max_workers=10) as ex:
        s2 = dict(ex.map(jev2, pasan))
    print(f"jev paso 2 en {time.time()-t0:.0f}s", flush=True)

    # --- ficha de contexto (Gemini) ---
    ctx = {}
    lotes = [pasan[i:i + LOTE] for i in range(0, len(pasan), LOTE)]

    def ctx_lote(lote):
        texto = PROMPT_CTX + "\n".join(
            f'TUIT {i+1} (@{t["handle"]}, {t["fecha"][:10]}): "{t["texto"]}"' for i, t in enumerate(lote))
        r = gemini(texto)
        if "error" in r:
            return {}
        out = {}
        txt = "".join(p.get("text", "") for p in r["candidates"][0]["content"]["parts"])
        for line in txt.splitlines():
            m = re.match(r"\s*\*{0,2}TUIT\s+(\d+)", line)
            if m and 1 <= int(m.group(1)) <= len(lote):
                out[lote[int(m.group(1)) - 1]["url"]] = re.sub(r"^\s*\*{0,2}TUIT\s+\d+\**\s*:?\s*", "", line).strip()
        return out

    t0 = time.time()
    with ThreadPoolExecutor(max_workers=HILOS) as ex:
        for out in ex.map(ctx_lote, lotes):
            ctx.update(out)
    print(f"ficha de contexto en {time.time()-t0:.0f}s | {len(ctx)} fichas", flush=True)

    # --- partido y direccion (Gemini) ---
    def final_lote(lote):
        texto = PROMPT_FINAL + "\n".join(
            f'TUIT {i+1} (@{t["handle"]}, {t["fecha"][:10]}): "{t["texto"]}"'
            + (f'\n   contexto: {ctx[t["url"]]}' if ctx.get(t["url"]) else "")
            for i, t in enumerate(lote))
        r = gemini(texto)
        if "error" in r:
            return {}
        out = {}
        txt = "".join(p.get("text", "") for p in r["candidates"][0]["content"]["parts"])
        for line in txt.splitlines():
            m = re.match(r"\s*\*{0,2}TUIT\s+(\d+)", line)
            if not (m and 1 <= int(m.group(1)) <= len(lote)):
                continue
            resto = line.split(":", 1)[1] if ":" in line else line
            d = re.search(r"(PP|PSOE|Vox|Sumar|varios|ninguno)\s*[-–]\s*(beneficia|perjudica|neutro)\s*[-–]?\s*(alta|media|baja)?\s*[-–]?\s*(.*)", resto, re.I)
            if d:
                out[lote[int(m.group(1)) - 1]["url"]] = {
                    "partido": d.group(1), "direccion": d.group(2).lower(),
                    "conf": CONF.get((d.group(3) or "media").lower(), 0.7),
                    "motivo": (d.group(4) or "").strip()[:120]}
        return out

    fin = {}
    t0 = time.time()
    with ThreadPoolExecutor(max_workers=HILOS) as ex:
        for out in ex.map(final_lote, lotes):
            fin.update(out)
    print(f"partido y direccion en {time.time()-t0:.0f}s | {len(fin)} resueltos", flush=True)

    # --- filas nuevas ---
    nuevas = []
    for t in tuits:
        g, err = gmap.get(t["url"], (None, None))
        row = {c: "" for c in COLS}
        row.update({"fecha": t["fecha"], "handle": t["handle"], "nombre": t["nombre"],
                    "retweets": t["retweets"], "likes": t["likes"], "replies": t["replies"], "views": t["views"],
                    "gate_p": g if g is not None else "",
                    "relevante": ("si" if (g or 0) >= 0.7 else "dudoso" if (g or 0) >= 0.5 else "no") if g is not None else "error",
                    "texto": t["texto"], "url": t["url"], "error": err or ""})
        a = (s2.get(t["url"]) or {}).get("answers", {})
        if a:
            row["ironia_p"] = a.get("ironia", {}).get("noul", "")
            for k, v in (a.get("objetivo", {}).get("probabilities", {}) or {}).items():
                if f"p_{k}" in row:
                    row[f"p_{k}"] = round(v, 3)
        v = fin.get(t["url"])
        if v:
            row.update({"partido": v["partido"], "partido_conf": v["conf"],
                        "direccion": v["direccion"], "direccion_conf": v["conf"],
                        "direccion_motivo": v["motivo"]})
        nuevas.append(row)

    with open(CSV, "a", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=COLS, extrasaction="ignore")
        w.writerows(nuevas)
    print(f"\nanadidas {len(nuevas)} filas a {CSV}")
    pol = [r for r in nuevas if r["partido"]]
    print(f"  con partido: {len(pol)} | relevantes: {sum(1 for r in nuevas if r['relevante']=='si')}")


if __name__ == "__main__":
    main()
