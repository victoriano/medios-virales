#!/usr/bin/env python3
"""Clasificacion v2 de los tuits virales de medios.

Dos cambios sobre classify_virales.py:
  1. La pregunta del objetivo pasa de "¿a que partido afecta o se refiere?" a "¿de que partido trata?",
     y los criterios llevan los nombres de los cargos conocidos.
  2. Antes de Jev se resuelven las personas, empresas y casos del tuit con Gemini 3.7 Flash y su
     herramienta de busqueda de Google, y esa ficha entra en el estado de Jev como `contexto_entidades`.

Uso:
  python3 clasificar_v2.py --set captura     # los tres tuits de la captura
  python3 clasificar_v2.py --set dudosos     # conf < 0.6 o sin ninguna marca de partido en el texto
  python3 clasificar_v2.py --set todos       # todo el bloque politico (12.520)
  python3 clasificar_v2.py --set urls --lista urls.txt

Es reanudable: el contexto de Gemini y el resultado de Jev se guardan por url en los ficheros
contexto_entidades.json y clasificacion_v2.json.
"""
import argparse, csv, json, os, re, sys, time, urllib.error, urllib.request
from concurrent.futures import ThreadPoolExecutor

BASE = os.path.expanduser(os.environ.get("MEDIOS_DIR", "~/typesafe-lab/politica/medios"))
CSV_IN = os.path.join(BASE, "virales_clasificados.csv")
CSV_OUT = os.path.join(BASE, "virales_v2.csv")
JSON_CTX = os.path.join(BASE, "contexto_entidades.json")
JSON_JEV = os.path.join(BASE, "clasificacion_v2.json")
CSV_CAMBIOS = os.path.join(BASE, "cambios_v2.csv")

MODELO_GEMINI = "gemini-3.7-flash"
LOTE_GEMINI = 10         # tuits por llamada a Gemini
HILOS = 8
PARTIDOS = ("PP", "PSOE", "Vox", "Sumar")

MARCA = (r"\bPP\b|Feij[oó]o|Ayuso|G[eé]nova|Partido Popular|\bPSOE\b|S[aá]nchez|Moncloa|socialist|Ferraz|"
         r"Gobierno|Bola[ñn]os|Marlaska|Cerd[aá]n|[AÁ]balos|Koldo|Bego[ñn]a|Barrab[eé]s|\bVox\b|Abascal|"
         r"\bSumar\b|Yolanda D[ií]az|Podemos|Iglesias|Belarra|M[oó]nica Garc|Junts|Puigdemont|\bERC\b|\bPNV\b|"
         r"Bildu|Otegi|Illa|Maz[oó]n|Moreno Bonilla|Zapatero|Ribera|Hereu|Urtasun|Puente")

CAPTURA = ["dosier secreto de decenas de periodistas", "15 veces a Cerd", 'borrado de "metadatos" en los concursos']

PROMPT_GEMINI = (
    "Eres documentalista de politica espanola. Para cada tuit, identifica las personas, empresas, casos e "
    "instituciones mencionadas y di A QUE PARTIDO ESPANOL (PP, PSOE, Vox, Sumar) o A QUE CASO conocido estan "
    "ligadas. Si una persona no es militante pero es protagonista de un caso que senala a un partido, indica el "
    "partido de ese caso (por ejemplo: Barrabes = caso Begona Gomez, PSOE). Si no conoces a alguien con "
    "seguridad, BUSCA en Google antes de responder en vez de escribir desconocido. Una linea por tuit, sin "
    "explicaciones. Formato exacto:\nTUIT n: entidad = partido/caso. | entidad = partido/caso.\n\n")

Q_OBJETIVO = {"type": "choice",
              "instructions": "¿De que partido espanol trata principalmente el tuit? Senala el partido al que "
                              "pertenecen o del que tratan las personas, instituciones o casos mencionados. No "
                              "senales al partido que sale beneficiado, sino aquel del que trata la noticia.",
              "criteria": {"PP": "El PP, sus dirigentes o sus cargos (Feijoo, Ayuso, Aznar, alcaldes y presidentes del PP)",
                           "PSOE": "El PSOE o el Gobierno de Espana y sus ministerios (Sanchez, Moncloa, Begona Gomez, Abalos, Koldo, Cerdan, Marlaska, Montero)",
                           "Vox": "Vox o Santiago Abascal",
                           "Sumar": "Sumar, Yolanda Diaz, Podemos o Monica Garcia",
                           "varios": "Mas de un partido a la vez, sin que uno domine",
                           "ninguno": "Politica general, instituciones o cargos no adscritos a un partido"}}
Q_DIRECCION = {"type": "choice",
               "instructions": "El tuit, tal como esta escrito, ¿favorece o perjudica al partido senalado?",
               "criteria": {"beneficia": "Presenta al partido o a sus dirigentes de forma favorable",
                            "perjudica": "Presenta al partido o a sus dirigentes de forma desfavorable, o denuncia algo negativo",
                            "neutro": "Informa sin tomar partido"}}
Q_IRONIA = {"type": "noul",
            "instructions": "El tuit usa ironia o sarcasmo, de forma que el sentido literal es el contrario del real"}
PREGUNTAS = {"objetivo": Q_OBJETIVO, "direccion": Q_DIRECCION, "ironia": Q_IRONIA}


def claves():
    gem = open(os.path.expanduser("~/.config/gemini/api_key")).read().strip()
    ts = [l.split("=", 1)[1].strip() for l in open(os.path.expanduser("~/.config/api-keys/.env"))
          if l.startswith("TYPESAFE_API_KEY=")][0]
    return gem, ts


def post(url, body, headers, retries=5, timeout=240):
    data = json.dumps(body).encode()
    for a in range(retries):
        req = urllib.request.Request(url, data=data, headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code in (429, 503) and a < retries - 1:
                time.sleep(2 ** a); continue
            return {"error": f"HTTP {e.code}: {e.read().decode()[:150]}"}
        except Exception as ex:
            if a < retries - 1:
                time.sleep(2 ** a); continue
            return {"error": f"{type(ex).__name__}: {ex}"}


def cargar_json(p, default):
    try:
        return json.load(open(p))
    except Exception:
        return default


def contexto_gemini(tuits, gem, cache):
    """Devuelve {url: ficha}. Reanudable: solo pide lo que falta y guarda por el camino."""
    pend = [t for t in tuits if t["url"] not in cache]
    print(f"contexto: {len(tuits) - len(pend)} en cache, {len(pend)} por pedir", flush=True)
    lotes = [pend[i:i + LOTE_GEMINI] for i in range(0, len(pend), LOTE_GEMINI)]
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{MODELO_GEMINI}:generateContent?key={gem}"
    resumen = {"busquedas": 0, "fuentes": 0, "in": 0, "out": 0, "lotes": len(lotes), "fallos": 0, "hechos": 0}
    import threading
    cerrojo = threading.Lock()

    def un_lote(lote):
        texto = PROMPT_GEMINI + "\n".join(
            f'TUIT {i+1} (@{t["handle"]}, {t["fecha"][:10]}): "{t["texto"]}"' for i, t in enumerate(lote))
        r = post(url, {"contents": [{"parts": [{"text": texto}]}], "tools": [{"google_search": {}}]},
                 {"Content-Type": "application/json"})
        if "error" in r:
            return lote, {}, r["error"], {}
        c = r["candidates"][0]
        gm = c.get("groundingMetadata", {}) or {}
        txt = "".join(p.get("text", "") for p in c["content"]["parts"])
        um = r.get("usageMetadata", {})
        out = {}
        for line in txt.splitlines():
            m = re.match(r"\s*\*{0,2}TUIT\s+(\d+)", line)
            if m and 1 <= int(m.group(1)) <= len(lote):
                out[lote[int(m.group(1)) - 1]["url"]] = re.sub(r"^\s*\*{0,2}TUIT\s+\d+\**\s*:?\s*", "", line).strip()
        return lote, out, None, {"busquedas": len(gm.get("webSearchQueries") or []),
                                 "fuentes": len(gm.get("groundingChunks") or []),
                                 "in": um.get("promptTokenCount", 0),
                                 "out": um.get("candidatesTokenCount", 0) + um.get("thoughtsTokenCount", 0)}

    t0 = time.time()
    with ThreadPoolExecutor(max_workers=HILOS) as ex:
        for lote, out, err, uso in ex.map(un_lote, lotes):
            with cerrojo:
                resumen["hechos"] += 1
                if err:
                    resumen["fallos"] += 1
                    print("  error Gemini:", err, flush=True)
                else:
                    cache.update(out)
                    for k in ("busquedas", "fuentes", "in", "out"):
                        resumen[k] += uso.get(k, 0)
                if resumen["hechos"] % 20 == 0 or resumen["hechos"] == len(lotes):
                    json.dump(cache, open(JSON_CTX, "w"), ensure_ascii=False, indent=1)
                    coste = resumen["in"] / 1e6 * 0.75 + resumen["out"] / 1e6 * 3.75
                    print(f"  {resumen['hechos']}/{len(lotes)} lotes | {resumen['in']} in / {resumen['out']} out | "
                          f"{coste:.3f} $ | {time.time()-t0:.0f}s", flush=True)
    json.dump(cache, open(JSON_CTX, "w"), ensure_ascii=False, indent=1)
    coste = resumen["in"] / 1e6 * 0.75 + resumen["out"] / 1e6 * 3.75
    print(f"contexto terminado en {time.time()-t0:.0f}s | lotes {resumen['lotes']} fallos {resumen['fallos']} | "
          f"busquedas {resumen['busquedas']} | fuentes {resumen['fuentes']} | coste {coste:.4f} $", flush=True)
    return cache


def clasificar_jev(tuits, ts, ctx, cache):
    url = "https://api.typesafe.ai/v1/systemone"
    hechos = []

    def uno(t):
        if t["url"] in cache:
            return t, cache[t["url"]]
        st = {"medio": t["handle"], "fecha": t["fecha"][:10], "tuit": t["texto"],
              "nota": "El tuit puede incluir un enlace acortado o una imagen no visibles"}
        ficha = ctx.get(t["url"])
        if ficha:
            st["contexto_entidades"] = ficha
        r = post(url, {"state": st, "model": "jev-latest", "questions": PREGUNTAS},
                 {"Authorization": f"Bearer {ts}", "Content-Type": "application/json"})
        a = r.get("answers", {})
        if r.get("error"):
            return t, {"error": r["error"]}
        return t, {"partido": a.get("objetivo", {}).get("choice", ""),
                   "partido_conf": round(a.get("objetivo", {}).get("confidence", 0), 3),
                   "direccion": a.get("direccion", {}).get("choice", ""),
                   "direccion_conf": round(a.get("direccion", {}).get("confidence", 0), 3),
                   "ironia_p": a.get("ironia", {}).get("noul", ""),
                   "probs": a.get("objetivo", {}).get("probabilities", {})}

    t0 = time.time()
    with ThreadPoolExecutor(max_workers=10) as ex:
        hechos = list(ex.map(uno, tuits))
    for t, v in hechos:
        cache[t["url"]] = v
    json.dump(cache, open(JSON_JEV, "w"), ensure_ascii=False, indent=1)
    print(f"Jev en {time.time()-t0:.0f}s sobre {len(tuits)} tuits", flush=True)
    return cache


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--set", default="captura", choices=["captura", "dudosos", "politicos", "todos", "urls"])
    ap.add_argument("--lista", help="fichero con una url por linea cuando --set urls")
    ap.add_argument("--entrada", default=CSV_IN)
    args = ap.parse_args()

    gem, ts = claves()
    rows = list(csv.DictReader(open(args.entrada, encoding="utf-8")))
    pol = [r for r in rows if r["partido"] in PARTIDOS]

    def conf(r):
        try:
            return float(r["partido_conf"] or 0)
        except ValueError:
            return 0

    if args.set == "captura":
        sel = []
        for c in CAPTURA:
            for r in rows:
                if c[:22].lower() in r["texto"].lower():
                    sel.append(r); break
    elif args.set == "dudosos":
        sel = [r for r in pol if conf(r) < 0.6 or not re.search(MARCA, r["texto"], re.I)]
    elif args.set in ("politicos", "todos"):
        sel = [r for r in rows if r["relevante"] in ("si", "dudoso")]
    else:
        urls = {l.strip() for l in open(args.lista) if l.strip()}
        sel = [r for r in rows if r["url"] in urls]

    print(f"seleccionados: {len(sel)} tuits ({args.set})", flush=True)
    ctx_cache = cargar_json(JSON_CTX, {})
    jev_cache = cargar_json(JSON_JEV, {})
    ctx = contexto_gemini(sel, gem, ctx_cache)
    faltan = [t for t in sel if t["url"] not in ctx]
    if faltan:
        print(f"segunda pasada para {len(faltan)} tuits sin ficha", flush=True)
        ctx = contexto_gemini(faltan, gem, ctx_cache)
    faltan = [t for t in sel if t["url"] not in ctx]
    jev = clasificar_jev(sel, ts, ctx, jev_cache)

    # --- salida ---
    campos = ["url", "fecha", "handle", "texto", "partido_antes", "partido_conf_antes",
              "partido_despues", "partido_conf_despues", "direccion_despues", "contexto"]
    cambios, cambian = [], 0
    for r in sel:
        v = jev.get(r["url"]) or {}
        antes, despues = r["partido"], v.get("partido", "")
        if antes != despues and despues:
            cambian += 1
        cambios.append({"url": r["url"], "fecha": r["fecha"][:10], "handle": r["handle"],
                        "texto": r["texto"], "partido_antes": antes, "partido_conf_antes": r["partido_conf"],
                        "partido_despues": despues, "partido_conf_despues": v.get("partido_conf", ""),
                        "direccion_despues": v.get("direccion", ""), "contexto": ctx.get(r["url"], "")})
    with open(CSV_CAMBIOS, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=campos); w.writeheader(); w.writerows(cambios)

    # CSV v2 solo con los tuits reprocesados actualizados
    for r in rows:
        v = jev.get(r["url"])
        if v and v.get("partido"):
            r["partido"], r["partido_conf"] = v["partido"], v["partido_conf"]
            r["direccion"], r["direccion_conf"] = v.get("direccion", ""), v.get("direccion_conf", "")
            r["ironia_p"] = v.get("ironia_p", "")
            for k, p in (v.get("probs") or {}).items():
                if f"p_{k}" in r:
                    r[f"p_{k}"] = round(p, 3)
    with open(CSV_OUT, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=rows[0].keys()); w.writeheader(); w.writerows(rows)

    print(f"\ncambian de partido: {cambian} de {len(sel)}")
    from collections import Counter
    antes = Counter(r["partido"] or "(vacio)" for r in sel)
    despues = Counter(((jev.get(r["url"]) or {}).get("partido") or r["partido"] or "(vacio)") for r in sel)
    da = Counter(r["direccion"] or "(vacio)" for r in sel)
    dd = Counter((((jev.get(r["url"]) or {}).get("direccion")) or r["direccion"] or "(vacio)") for r in sel)
    print("\npartido, antes -> despues")
    for k in sorted(set(antes) | set(despues), key=lambda x: -despues.get(x, 0)):
        print(f"  {k:9} {antes.get(k,0):6} -> {despues.get(k,0):6}")
    print("direccion, antes -> despues")
    for k in sorted(set(da) | set(dd), key=lambda x: -dd.get(x, 0)):
        print(f"  {k:9} {da.get(k,0):6} -> {dd.get(k,0):6}")
    sin_recl = sum(1 for r in sel if not (jev.get(r["url"]) or {}).get("partido"))
    print(f"\nsin ficha de contexto: {len(faltan)} | sin reclasificar: {sin_recl}")
    print(f"salidas: {CSV_OUT}\n         {CSV_CAMBIOS}\n         {JSON_CTX}\n         {JSON_JEV}")


if __name__ == "__main__":
    main()
