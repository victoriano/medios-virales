#!/usr/bin/env python3
"""Dos comprobaciones antes de dar por buena la reclasificacion:
   A) que pasa si el Gobierno y sus ministerios NO cuentan como PSOE por si solos (variante C).
   B) estabilidad de la pregunta de direccion: mismo tuit dos veces, mismo resultado?"""
import csv, json, os, random, re, time, urllib.error, urllib.request
from collections import Counter
from concurrent.futures import ThreadPoolExecutor

BASE = os.path.expanduser(os.environ.get("MEDIOS_DIR", "~/typesafe-lab/politica/medios"))
TKEY = [l.split("=", 1)[1].strip() for l in open(os.path.expanduser("~/.config/api-keys/.env"))
        if l.startswith("TYPESAFE_API_KEY=")][0]
TURL = "https://api.typesafe.ai/v1/systemone"


def post(body, retries=4):
    data = json.dumps(body).encode()
    for a in range(retries):
        req = urllib.request.Request(TURL, data=data, headers={
            "Authorization": f"Bearer {TKEY}", "Content-Type": "application/json"})
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
            return {"error": str(ex)}
    return {"error": "retries"}


# variante C: el partido solo cuenta si el tuit senala responsabilidad politica, no por mencionar un organismo
Q_C = {"objetivo": {"type": "choice",
       "instructions": ("¿De que partido espanol trata principalmente el tuit? Senala el partido al que pertenecen o del que "
                        "tratan las personas y casos mencionados, no el que sale beneficiado. Si el tuit solo informa de un suceso, "
                        "de la actuacion de un cuerpo del Estado (policia, Guardia Civil, tribunales, INE), de un servicio publico "
                        "o de un organismo, sin senalar una responsabilidad politica ni una decision del partido o del Gobierno, "
                        "responde ninguno."),
       "criteria": {"PP": "El PP, sus dirigentes o sus cargos (Feijoo, Ayuso, Aznar, alcaldes y presidentes del PP) o una polemica que les afecte",
                    "PSOE": "El PSOE, sus cargos o el Gobierno de Espana (Sanchez, Moncloa, ministros, Begona Gomez, Abalos, Koldo, Cerdan, Marlaska, Montero) cuando el tuit trate de su actuacion politica o de una polemica que les afecte",
                    "Vox": "Vox o Santiago Abascal",
                    "Sumar": "Sumar, Yolanda Diaz, Podemos o Monica Garcia",
                    "varios": "Mas de un partido a la vez, sin que uno domine",
                    "ninguno": "Politica general, instituciones, organismos, servicios publicos o cargos no adscritos a un partido"}}}
Q_DIR = {"direccion": {"type": "choice", "instructions": "El tuit, tal como esta escrito, ¿favorece o perjudica al partido senalado?",
         "criteria": {"beneficia": "Presenta al partido o a sus dirigentes de forma favorable",
                      "perjudica": "Presenta al partido o a sus dirigentes de forma desfavorable, o denuncia algo negativo",
                      "neutro": "Informa sin tomar partido"}},
         "ironia": {"type": "noul", "instructions": "El tuit usa ironia o sarcasmo, de forma que el sentido literal es el contrario del real"}}

v1 = {r["url"]: r for r in csv.DictReader(open(os.path.join(BASE, "virales_clasificados_v1.csv"), encoding="utf-8"))}
v2 = {r["url"]: r for r in csv.DictReader(open(os.path.join(BASE, "virales_v2.csv"), encoding="utf-8"))}
ctx = json.load(open(os.path.join(BASE, "contexto_entidades.json")))
PART = ("PP", "PSOE", "Vox", "Sumar")

# --- A) los que han pasado de ninguno/varios a un partido concreto ---
cand = [u for u in v2 if v2[u]["relevante"] in ("si", "dudoso")
        and (v1[u]["partido"] or "ninguno") in ("ninguno", "varios") and v2[u]["partido"] in PART]
print(f"A) tuits que pasaron de ninguno/varios a un partido concreto: {len(cand)}")


def variante_c(u):
    r = v2[u]
    st = {"medio": r["handle"], "fecha": r["fecha"][:10], "tuit": r["texto"],
          "nota": "El tuit puede incluir un enlace acortado o una imagen no visibles"}
    if ctx.get(u):
        st["contexto_entidades"] = ctx[u]
    res = post({"state": st, "model": "jev-latest", "questions": Q_C})
    a = (res.get("answers") or {}).get("objetivo", {})
    return u, a.get("choice", "ERR"), a.get("confidence", 0)


t0 = time.time()
with ThreadPoolExecutor(max_workers=10) as ex:
    vc = list(ex.map(variante_c, cand))
print(f"   en {time.time()-t0:.0f}s")
trans = Counter((v2[u]["partido"], c) for u, c, _ in vc)
for (a, b), n in trans.most_common(12):
    print(f"   v2 {a:8} -> variante C {b:8} {n:5}")
(open(os.path.join(BASE, "variante_c.json"), "w")).write(json.dumps(
    {u: {"choice": c, "conf": round(cf, 3)} for u, c, cf in vc}, ensure_ascii=False, indent=1))

# --- B) estabilidad de la direccion ---
random.seed(11)
muestra = random.sample([u for u in v2 if v2[u]["relevante"] in ("si", "dudoso")], 200)


def dir_una(u):
    r = v2[u]
    st = {"medio": r["handle"], "fecha": r["fecha"][:10], "tuit": r["texto"]}
    if ctx.get(u):
        st["contexto_entidades"] = ctx[u]
    res = post({"state": st, "model": "jev-latest", "questions": {"direccion": Q_DIR["direccion"]}})
    return (res.get("answers") or {}).get("direccion", {}).get("choice", "ERR")


with ThreadPoolExecutor(max_workers=10) as ex:
    a1 = list(ex.map(dir_una, muestra))
with ThreadPoolExecutor(max_workers=10) as ex:
    a2 = list(ex.map(dir_una, muestra))
acuerdo = sum(1 for x, y in zip(a1, a2) if x == y)
print(f"\nB) estabilidad de la direccion: mismo tuit dos veces, coinciden {acuerdo}/200 ({100*acuerdo/200:.0f}%)")
print("   reparto 1:", Counter(a1).most_common())
print("   reparto 2:", Counter(a2).most_common())
print("   v1 en la muestra:", Counter(v1[u]['direccion'] for u in muestra).most_common())
print("   v2 en la muestra:", Counter(v2[u]['direccion'] for u in muestra).most_common())
