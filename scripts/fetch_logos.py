#!/usr/bin/env python3
"""Descarga los logos de los medios desde el volcado de Apify, los deja circulares y los guarda en WebP."""
import glob, io, json, os, urllib.request
from collections import defaultdict

BASE = os.path.expanduser("~/typesafe-lab/politica/medios")
OUT = os.path.expanduser("~/Code/medios-virales/site/logos")
os.makedirs(OUT, exist_ok=True)
SIZE = 128

fotos = defaultdict(int)
for p in glob.glob(os.path.join(BASE, "virales", "*.json")):
    for t in json.load(open(p)):
        a = t.get("author") or {}
        if a.get("userName") and a.get("profilePicture"):
            fotos["@" + a["userName"]] = a["profilePicture"]

from PIL import Image, ImageDraw

ok, fail = {}, []
for handle, url in sorted(fotos.items()):
    slug = handle.lstrip("@").lower()
    dest = os.path.join(OUT, slug + ".webp")
    if os.path.exists(dest):
        ok[handle] = f"logos/{slug}.webp"
        continue
    alt = url
    for a, b in (("_normal.", "_400x400."), ("_normal.", "_200x200."), ("_normal.", "_bigger."), ("_normal.", "")):
        cand = url.replace(a, b)
        try:
            req = urllib.request.Request(cand, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=25) as r:
                raw = r.read()
            img = Image.open(io.BytesIO(raw)).convert("RGBA")
            img = img.resize((SIZE, SIZE), Image.LANCZOS)
            mascara = Image.new("L", (SIZE * 4, SIZE * 4), 0)
            ImageDraw.Draw(mascara).ellipse((0, 0, SIZE * 4 - 1, SIZE * 4 - 1), fill=255)
            mascara = mascara.resize((SIZE, SIZE), Image.LANCZOS)
            img.putalpha(mascara)
            img.save(dest, "WEBP", quality=92, method=6)
            ok[handle] = f"logos/{slug}.webp"
            break
        except Exception as e:
            last = e
            continue
    if handle not in ok:
        fail.append((handle, str(last)[:60]))

json.dump(ok, open(os.path.join(OUT, "index.json"), "w"), ensure_ascii=False, indent=1)
tot = sum(os.path.getsize(os.path.join(OUT, f)) for f in os.listdir(OUT) if f.endswith(".webp"))
print(f"logos descargados: {len(ok)} | fallos: {len(fail)} | peso: {tot/1024:.0f} KB")
for h, e in fail[:10]:
    print("  fallo:", h, e)
