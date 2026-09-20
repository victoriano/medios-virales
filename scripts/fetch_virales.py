#!/usr/bin/env python3
"""Censo de tuits virales (>100 RT) de la lista 'Spanish Generalist Media' durante el ultimo ano.

Estrategia: por cada medio y cada ventana mensual, una consulta
`from:<handle> min_retweets:100 -filter:retweets since:.. until:..` contra el actor
apidojo/twitter-scraper-lite. Se lanza una ejecucion por medio, con 4 en paralelo.
Reanudable: si virales/<handle>.json ya existe, se salta.
"""
import json, os, sys, time, urllib.request, urllib.error
from concurrent.futures import ThreadPoolExecutor

KEY = open(os.path.expanduser("~/.config/apify/api_key")).read().strip()
ACTOR = "apidojo~twitter-scraper-lite"
BASE = os.path.expanduser(os.environ.get("MEDIOS_DIR", "~/typesafe-lab/politica/medios"))
OUT = os.path.join(BASE, "virales")
os.makedirs(OUT, exist_ok=True)
LOG = os.path.join(BASE, "fetch_virales.log")
MAX_ITEMS_PER_RUN = int(os.environ.get("MAX_RUN", "3000"))
WORKERS = int(os.environ.get("WORKERS", "4"))
TODAY = os.environ.get("TODAY", "2026-09-19")
START = os.environ.get("START", "2025-09-19")


def log(msg):
    line = f"{time.strftime('%H:%M:%S')} {msg}"
    print(line, flush=True)
    with open(LOG, "a") as f:
        f.write(line + "\n")


def api(method, path, body=None, timeout=60):
    url = f"https://api.apify.com/v2{path}"
    url += ("&" if "?" in url else "?") + f"token={KEY}"
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"}, method=method)
    for a in range(4):
        try:
            with urllib.request.urlopen(req, timeout=timeout) as r:
                raw = r.read()
                try:
                    return json.loads(raw)
                except json.JSONDecodeError:
                    return {"__raw__": raw.decode("utf-8", "replace")}
        except urllib.error.HTTPError as e:
            if e.code in (429, 500, 502, 503) and a < 3:
                time.sleep(5 * (a + 1)); continue
            try:
                return {"__error__": e.code, "body": e.read().decode()[:300]}
            except Exception:
                return {"__error__": e.code}
        except Exception as ex:
            if a < 3:
                time.sleep(5 * (a + 1)); continue
            return {"__error__": f"{type(ex).__name__}: {ex}"}
    return {"__error__": "retries"}


def windows():
    """Ventanas mensuales entre START y TODAY."""
    import datetime as dt
    s = dt.date.fromisoformat(START)
    t = dt.date.fromisoformat(TODAY)
    out = []
    if s.day != 1:
        first = (s.replace(day=1) + dt.timedelta(days=32)).replace(day=1)
        out.append((s.isoformat(), first.isoformat()))
        s = first
    while s < t:
        nxt = (s.replace(day=28) + dt.timedelta(days=4)).replace(day=1)
        out.append((s.isoformat(), min(nxt, t).isoformat()))
        s = nxt
    return out


WINDOWS = windows()


def run_actor(payload, timeout_s=2400):
    r = api("POST", f"/acts/{ACTOR}/runs", payload)
    if "__error__" in r:
        return None, None, r
    run = r["data"]
    rid, ds = run["id"], run.get("defaultDatasetId")
    t0 = time.time()
    while time.time() - t0 < timeout_s:
        time.sleep(12)
        d = api("GET", f"/actor-runs/{rid}")
        if "__error__" in d:
            continue
        st = d["data"]["status"]
        if st in ("SUCCEEDED", "FAILED", "ABORTED", "TIMED-OUT"):
            break
    items = api("GET", f"/datasets/{ds}/items?limit=100000&clean=true", timeout=120)
    if isinstance(items, dict):
        items = items.get("__raw__") and json.loads(items["__raw__"]) or []
    cost = (d.get("data") or {}).get("usageTotalUsd") if isinstance(d, dict) else None
    return items, cost, {"status": st, "run": rid}


def process(handle):
    path = os.path.join(OUT, f"{handle}.json")
    if os.path.exists(path):
        return handle, "ya", 0
    terms = [f"from:{handle} min_retweets:100 -filter:retweets since:{a} until:{b}" for a, b in WINDOWS]
    items, cost, meta = run_actor({"searchTerms": terms, "maxItems": MAX_ITEMS_PER_RUN, "sort": "Top"})
    if items is None:
        return handle, f"error {meta}", 0
    clean = [x for x in items if isinstance(x, dict) and x.get("id") and not x.get("noResults")]
    json.dump(clean, open(path, "w"), ensure_ascii=False)
    log(f"  {handle}: {len(clean)} virales | run {meta.get('status')} | {cost} $")
    return handle, meta.get("status"), len(clean)


if __name__ == "__main__":
    members = json.load(open(os.path.join(BASE, "members.json")))
    handles = [m["handle"].lstrip("@") for m in members]
    pending = [h for h in handles if not os.path.exists(os.path.join(OUT, f"{h}.json"))]
    log(f"=== censo: {len(handles)} medios, {len(pending)} pendientes, {len(WINDOWS)} ventanas, "
        f"{MAX_ITEMS_PER_RUN} items max por run, {WORKERS} en paralelo ===")
    t0 = time.time()
    total = 0
    with ThreadPoolExecutor(max_workers=WORKERS) as ex:
        for h, st, n in ex.map(process, pending):
            total += n
            log(f"[{h}] {st} | acumulado {total} virales")
    log(f"=== fin en {(time.time()-t0)/60:.1f} min | {total} virales descargados ===")
