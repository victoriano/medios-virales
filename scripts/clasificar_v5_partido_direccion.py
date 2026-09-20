#!/usr/bin/env python3
"""Quinta pasada: partido y direccion juntos, juzgados por Gemini 3.7 Flash.

Criterio elegido por Victoriano: el partido es AL QUE EL TUIT CRITICA O DEL QUE SALE EN SU DEFENSA, y la
direccion dice si el tuit lo deja peor o mejor. Al depender la direccion del partido, las dos preguntas
se resuelven en la misma llamada.

Uso:
  python3 clasificar_v5_partido_direccion.py --urls lista.txt   # solo esas urls
  python3 clasificar_v5_partido_direccion.py                   # los 12.520 politicos
"""
import argparse, csv, json, os, re, threading, time, urllib.error, urllib.request
from collections import Counter
from concurrent.futures import ThreadPoolExecutor

BASE = os.path.expanduser(os.environ.get("MEDIOS_DIR", "~/typesafe-lab/politica/medios"))
CSV_IN = os.path.join(BASE, "virales_clasificados.csv")
JSON_CTX = os.path.join(BASE, "contexto_entidades.json")
JSON_CACHE = os.path.join(BASE, "partido_direccion_gemini.json")
CSV_CAMBIOS = os.path.join(BASE, "cambios_v5.csv")

KEY = open(os.path.expanduser("~/.config/gemini/api_key")).read().strip()
MODELO = "gemini-3.7-flash"
LOTE = 10
HILOS = 6
CONF = {"alta": 0.9, "media": 0.7, "baja": 0.5}
PARTIDOS = ("PP", "PSOE", "Vox", "Sumar", "varios", "ninguno")

PROMPT = (
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


def llamar(texto, retries=4, timeout=300):
    body = {"contents": [{"parts": [{"text": texto}]}], "tools": [{"google_search": {}}]}
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{MODELO}:generateContent?key={KEY}"
    data = json.dumps(body).encode()
    for a in range(retries):
        req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
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


def parsear(linea):
    m = re.search(r"(PP|PSOE|Vox|Sumar|varios|ninguno)\s*[-–]\s*"
                  r"(beneficia|perjudica|neutro)\s*[-–]?\s*(alta|media|baja)?\s*[-–]?\s*(.*)", linea, re.I)
    if not m:
        return None
    return {"partido": m.group(1), "direccion": m.group(2).lower(),
            "conf": CONF.get((m.group(3) or "media").lower(), 0.7), "motivo": (m.group(4) or "").strip()[:120]}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--urls", help="fichero con una url por linea")
    args = ap.parse_args()

    rows = list(csv.DictReader(open(CSV_IN, encoding="utf-8")))
    ctx = json.load(open(JSON_CTX))
    sel = [r for r in rows if r["relevante"] in ("si", "dudoso")]
    if args.urls:
        urls = {l.strip() for l in open(args.urls) if l.strip()}
        sel = [r for r in sel if r["url"] in urls]
    try:
        cache = json.load(open(JSON_CACHE))
    except Exception:
        cache = {}
    pend = [r for r in sel if r["url"] not in cache]
    lotes = [pend[i:i + LOTE] for i in range(0, len(pend), LOTE)]
    print(f"a procesar: {len(sel)} | en cache: {len(sel)-len(pend)} | {len(pend)} tuits en {len(lotes)} lotes", flush=True)
    resumen = {"busquedas": 0, "in": 0, "out": 0, "fallos": 0, "hechos": 0}
    cerrojo = threading.Lock()

    def un_lote(lote):
        texto = PROMPT + "\n".join(
            f'TUIT {i+1} (@{r["handle"]}, {r["fecha"][:10]}): "{r["texto"]}"'
            + (f'\n   contexto: {ctx[r["url"]]}' if ctx.get(r["url"]) else "")
            for i, r in enumerate(lote))
        res = llamar(texto)
        if "error" in res:
            return lote, {}, res["error"], {}
        c = res["candidates"][0]
        gm = c.get("groundingMetadata", {}) or {}
        um = res.get("usageMetadata", {})
        txt = "".join(p.get("text", "") for p in c["content"]["parts"])
        out = {}
        for line in txt.splitlines():
            m = re.match(r"\s*\**TUIT\s+(\d+)", line)
            if not (m and 1 <= int(m.group(1)) <= len(lote)):
                continue
            v = parsear(line.split(":", 1)[1] if ":" in line else line)
            if v:
                out[lote[int(m.group(1)) - 1]["url"]] = v
        return lote, out, None, {"busquedas": len(gm.get("webSearchQueries") or []),
                                 "in": um.get("promptTokenCount", 0),
                                 "out": um.get("candidatesTokenCount", 0) + um.get("thoughtsTokenCount", 0)}

    t0 = time.time()
    with ThreadPoolExecutor(max_workers=HILOS) as ex:
        for lote, out, err, uso in ex.map(un_lote, lotes):
            with cerrojo:
                resumen["hechos"] += 1
                if err:
                    resumen["fallos"] += 1
                    print("  error:", err, flush=True)
                else:
                    cache.update(out)
                    for k in ("busquedas", "in", "out"):
                        resumen[k] += uso.get(k, 0)
                if resumen["hechos"] % 20 == 0 or resumen["hechos"] == len(lotes):
                    json.dump(cache, open(JSON_CACHE, "w"), ensure_ascii=False, indent=1)
                    coste = resumen["in"] / 1e6 * 0.75 + resumen["out"] / 1e6 * 3.75
                    print(f"  {resumen['hechos']}/{len(lotes)} lotes | {resumen['in']} in / {resumen['out']} out | "
                          f"{coste:.2f} $ | {resumen['busquedas']} busquedas | {time.time()-t0:.0f}s", flush=True)
    json.dump(cache, open(JSON_CACHE, "w"), ensure_ascii=False, indent=1)
    coste = resumen["in"] / 1e6 * 0.75 + resumen["out"] / 1e6 * 3.75
    print(f"terminado en {time.time()-t0:.0f}s | fallos {resumen['fallos']} | {resumen['busquedas']} busquedas | coste {coste:.2f} $", flush=True)

    if args.urls:
        print("\n--- resultado sobre las urls pedidas ---")
        for r in sel:
            v = cache.get(r["url"])
            if v:
                print(f"  antes [{r['partido'] or '-':7}/{r['direccion'] or '-':9}] ahora [{v['partido']:7}/{v['direccion']:9}] "
                      f"conf {v['conf']} | {r['texto'][:62]}")
                print(f"        motivo: {v['motivo']}")
        return

    cambios = []
    for r in rows:
        v = cache.get(r["url"])
        if not v:
            continue
        if r["partido"] != v["partido"] or r["direccion"] != v["direccion"]:
            cambios.append({"url": r["url"], "fecha": r["fecha"][:10], "handle": r["handle"],
                            "partido_antes": r["partido"], "direccion_antes": r["direccion"],
                            "partido_ahora": v["partido"], "direccion_ahora": v["direccion"],
                            "conf": v["conf"], "motivo": v["motivo"], "texto": r["texto"]})
        r["partido"], r["partido_conf"] = v["partido"], v["conf"]
        r["direccion"], r["direccion_conf"] = v["direccion"], v["conf"]
        r["direccion_motivo"] = v["motivo"]
    with open(CSV_CAMBIOS, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["url", "fecha", "handle", "partido_antes", "direccion_antes",
                                          "partido_ahora", "direccion_ahora", "conf", "motivo", "texto"])
        w.writeheader(); w.writerows(cambios)

    campos = list(rows[0].keys())
    if "direccion_motivo" not in campos:
        campos.append("direccion_motivo")
    with open(CSV_IN, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=campos, extrasaction="ignore"); w.writeheader()
        for r in rows:
            r.setdefault("direccion_motivo", "")
            w.writerow(r)

    rel = [r for r in rows if cache.get(r["url"])]
    print(f"\nreparto nuevo sobre {len(rel)}:", dict(Counter(r["partido"] for r in rel).most_common()))
    print("direccion:", dict(Counter(r["direccion"] for r in rel).most_common()))
    print("cambios:", len(cambios), "| salidas:", CSV_CAMBIOS, JSON_CACHE)


if __name__ == "__main__":
    main()
