#!/usr/bin/env python3
"""Tercera pasada: rehace SOLO la direccion (y anade la voz) usando la ficha de contexto ya calculada.

Motivo: la pregunta anterior ("¿favorece o perjudica al partido senalado?") leia como danino cualquier
tuit con tono de conflicto, incluidos los que recogen declaraciones del propio partido o ataques a sus
rivales hechos desde su lado. Resultado: los ministros respondiendo a la oposicion salian como perjudica.
"""
import csv, json, os, time, urllib.error, urllib.request
from collections import Counter
from concurrent.futures import ThreadPoolExecutor

BASE = os.path.expanduser(os.environ.get("MEDIOS_DIR", "~/typesafe-lab/politica/medios"))
CSV_IN = os.path.join(BASE, "virales_clasificados.csv")
CSV_CAMBIOS = os.path.join(BASE, "cambios_direccion.csv")
JSON_CACHE = os.path.join(BASE, "direccion_v3.json")
JSON_CTX = os.path.join(BASE, "contexto_entidades.json")
HILOS = 10

TKEY = [l.split("=", 1)[1].strip() for l in open(os.path.expanduser("~/.config/api-keys/.env"))
        if l.startswith("TYPESAFE_API_KEY=")][0]
TURL = "https://api.typesafe.ai/v1/systemone"

PREGUNTAS = {
    "direccion": {"type": "choice",
                  "instructions": ("¿El tuit deja al partido senalado mejor o peor de cara al publico? Fijate en QUIEN habla y en el "
                                   "efecto politico, no en el tono. Beneficia: recoge declaraciones, acciones o defensas de un cargo o "
                                   "afin a ese partido (un ministro que responde con dureza a la oposicion, un cargo que desmiente un "
                                   "bulo contra el Gobierno), o recoge un informe, resolucion o revelacion que cuestiona a quienes lo "
                                   "atacan. Perjudica: denuncia algo negativo del partido o de sus cargos, o la critica viene de un rival, "
                                   "de un tribunal o de un organismo internacional. Neutro: informa sin favor ni dano claros."),
                  "criteria": {"beneficia": "Lo defiende, lo elogia, o son sus propios cargos quienes hablan, responden o atacan a sus rivales; tambien cuando recoge un informe o una revelacion que cuestiona a quienes lo atacan",
                               "perjudica": "Denuncia algo negativo del partido o de sus cargos, o la critica viene de sus rivales, de un tribunal o de un organismo internacional",
                               "neutro": "Informa de un hecho sin que quede claro a quien favorece o dana"}},
    "voz": {"type": "choice",
            "instructions": "¿Quien habla o protagoniza el tuit?",
            "criteria": {"cargo del partido": "Un cargo, dirigente o afin al partido senalado",
                         "rival": "Un rival, un tribunal, un organismo internacional o un critico del partido",
                         "tercero": "Periodistas, ciudadanos o instituciones sin adscripcion clara",
                         "sin voz": "El tuit describe un hecho sin declaraciones de nadie"}},
}


def post(body, retries=5, timeout=120):
    data = json.dumps(body).encode()
    for a in range(retries):
        req = urllib.request.Request(TURL, data=data, headers={
            "Authorization": f"Bearer {TKEY}", "Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code in (429, 529) and a < retries - 1:
                time.sleep(2 ** a); continue
            return {"error": f"HTTP {e.code}"}
        except Exception as ex:
            if a < retries - 1:
                time.sleep(2 ** a); continue
            return {"error": str(ex)}
    return {"error": "retries"}


def main():
    rows = list(csv.DictReader(open(CSV_IN, encoding="utf-8")))
    sel = [r for r in rows if r["relevante"] in ("si", "dudoso")]
    ctx = json.load(open(JSON_CTX))
    try:
        cache = json.load(open(JSON_CACHE))
    except Exception:
        cache = {}
    pend = [r for r in sel if r["url"] not in cache]
    print(f"politicos: {len(sel)} | en cache: {len(sel)-len(pend)} | por hacer: {len(pend)}", flush=True)

    import threading
    cerrojo = threading.Lock()

    def uno(r):
        st = {"medio": r["handle"], "fecha": r["fecha"][:10], "tuit": r["texto"], "partido_señalado": r["partido"]}
        if ctx.get(r["url"]):
            st["contexto_entidades"] = ctx[r["url"]]
        res = post({"state": st, "model": "jev-latest", "questions": PREGUNTAS})
        a = res.get("answers", {})
        if res.get("error"):
            return r["url"], {"error": res["error"]}
        return r["url"], {"direccion": a.get("direccion", {}).get("choice", ""),
                          "direccion_conf": round(a.get("direccion", {}).get("confidence", 0), 3),
                          "voz": a.get("voz", {}).get("choice", "")}

    t0 = time.time()
    hechos = 0
    with ThreadPoolExecutor(max_workers=HILOS) as ex:
        for url, v in ex.map(uno, pend):
            cache[url] = v
            hechos += 1
            if hechos % 1000 == 0 or hechos == len(pend):
                json.dump(cache, open(JSON_CACHE, "w"), ensure_ascii=False, indent=1)
                print(f"  {hechos}/{len(pend)} | {time.time()-t0:.0f}s", flush=True)
    json.dump(cache, open(JSON_CACHE, "w"), ensure_ascii=False, indent=1)
    print(f"direccion rehecha en {time.time()-t0:.0f}s", flush=True)

    errores = sum(1 for r in sel if (cache.get(r["url"]) or {}).get("error"))
    camb = 0
    cambios = []
    for r in rows:
        v = cache.get(r["url"])
        if not v or v.get("error"):
            continue
        if r["direccion"] != v["direccion"]:
            camb += 1
        cambios.append({"url": r["url"], "fecha": r["fecha"][:10], "handle": r["handle"], "partido": r["partido"],
                        "texto": r["texto"], "direccion_antes": r["direccion"], "conf_antes": r["direccion_conf"],
                        "direccion_despues": v["direccion"], "conf_despues": v["direccion_conf"], "voz": v["voz"],
                        "contexto": ctx.get(r["url"], "")})
        r["direccion"], r["direccion_conf"] = v["direccion"], v["direccion_conf"]
        r["voz"] = v["voz"]
    with open(CSV_CAMBIOS, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(cambios[0].keys())); w.writeheader(); w.writerows(cambios)

    campos = list(rows[0].keys())
    if "voz" not in campos:
        campos.append("voz")
    with open(CSV_IN, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=campos, extrasaction="ignore"); w.writeheader()
        for r in rows:
            r.setdefault("voz", "")
            w.writerow(r)

    antes = Counter(c["direccion_antes"] for c in cambios)
    despues = Counter(c["direccion_despues"] for c in cambios)
    print(f"\ncambian de direccion: {camb} de {len(cambios)} | errores: {errores}")
    print("antes  :", dict(antes.most_common()))
    print("despues:", dict(despues.most_common()))
    print("\nmatriz direccion antes -> despues:")
    for (a, b), n in Counter((c["direccion_antes"], c["direccion_despues"]) for c in cambios).most_common(8):
        if a != b:
            print(f"  {a:10} -> {b:10} {n:5}")
    print("\nreparto de voz:", dict(Counter(c["voz"] for c in cambios).most_common()))
    print("salidas:", CSV_CAMBIOS, JSON_CACHE)


if __name__ == "__main__":
    main()
