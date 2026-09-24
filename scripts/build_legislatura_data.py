#!/usr/bin/env python3
"""Construye los JSON del sitio con la muestra de la XV Legislatura.

Universos comparados:
  publicado: todos los tuits muestreados
  viral: subconjunto de los mismos tuits con al menos 100 retuits
"""
import json
import os
import re
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(os.environ.get(
    "LEGISLATURA_ROOT",
    "~/typesafe-lab/politica/medios/polarizacion/legislatura_xv_io_100",
)).expanduser()
SITE = Path(os.environ.get("SITE_DIR", "~/Code/medios-virales/site")).expanduser()
DATA = SITE / "data"
DETAIL = DATA / "medios"
CLASSIFIED = ROOT / "clasificado.jsonl"
MEMBERS = Path("~/typesafe-lab/politica/medios/members.json").expanduser()
VER = os.environ.get("SITE_VER") or datetime.now(timezone.utc).strftime("%Y%m%d%H%M")
YEARS = ("2023", "2024", "2025", "2026")
LEFT = {"PSOE", "Sumar"}
RIGHT = {"PP", "Vox"}
CANON = {"psoe": "PSOE", "pp": "PP", "vox": "Vox", "sumar": "Sumar", "podemos": "Sumar"}


def slug(handle):
    return handle.lstrip("@").lower()


def canonical_party(value):
    return CANON.get((value or "").strip().lower(), "")


def detail_party(value):
    """Nombre canónico compartido por tarjetas, filtros y agregados."""
    canonical = canonical_party(value)
    if canonical:
        return canonical
    raw = (value or "").strip().lower()
    return raw if raw in {"varios", "ninguno"} else ""


def side(row):
    party = canonical_party(row.get("partido"))
    direction = (row.get("direccion") or "").lower()
    if party not in LEFT | RIGHT or direction not in {"beneficia", "perjudica"}:
        return "neutro"
    helps_left = party in LEFT
    if direction == "perjudica":
        helps_left = not helps_left
    return "izq" if helps_left else "der"


def metric(rows, viral=False):
    selected = [row for row in rows if not viral or row["retweets"] >= 100]
    political = [row for row in selected if row.get("politica")]
    counts = Counter(side(row) for row in political)
    clear = counts["izq"] + counts["der"]
    index = None if not clear else round((counts["der"] - counts["izq"]) / clear, 3)
    position = None if not clear else round(100 * counts["der"] / clear, 1)
    result = {
        "indice": index,
        "izq": counts["izq"],
        "der": counts["der"],
        "con_lado": clear,
        "posicion": position,
    }
    if viral:
        result.update({
            "juicios": len(political),
            "tuits": len(selected),
            "por_ciento_izq": None if not clear else round(100 * counts["izq"] / clear, 1),
        })
    else:
        result.update({"politicos": len(political), "tuits": len(selected), "neutro": counts["neutro"]})
    return result


def map_row(handle, rows):
    published = metric(rows)
    viral = metric(rows, viral=True)
    pub_idx, vir_idx = published["indice"], viral["indice"]
    gap = None if pub_idx is None or vir_idx is None else round(float(vir_idx) - float(pub_idx), 3)
    exaggerates = None if pub_idx is None or vir_idx is None else round(abs(float(vir_idx)) - abs(float(pub_idx)), 3)
    monthly = {}
    by_month = defaultdict(list)
    for row in rows:
        by_month[row["fecha"][:7]].append(row)
    for month, month_rows in sorted(by_month.items()):
        p, v = metric(month_rows), metric(month_rows, viral=True)
        monthly[month] = {
            "publicado": p["indice"], "viral": v["indice"],
            "pub_con_lado": p["con_lado"], "vir_con_lado": v["con_lado"],
        }
    return {
        "handle": handle,
        "publicado": published,
        "viral": viral,
        "brecha": gap,
        "exagera": exaggerates,
        "muestra_suficiente": published["con_lado"] >= 15 and viral["con_lado"] >= 15,
        "meses": monthly,
    }


def load_metadata():
    metadata = {}
    if MEMBERS.exists():
        for member in json.loads(MEMBERS.read_text()):
            handle = "@" + member["handle"].lstrip("@")
            metadata[handle.lower()] = {
                "handle": handle,
                "nombre": member.get("name") or handle.lstrip("@"),
                "seguidores": member.get("followers", 0),
                "descripcion": member.get("description", ""),
            }
    path = DATA / "index.json"
    if not path.exists():
        return metadata
    current = json.loads(path.read_text())
    for medium in current.get("medios", []):
        metadata[medium["handle"].lower()] = {**metadata.get(medium["handle"].lower(), {}), **medium}
    return metadata


def load_classified():
    latest = {}
    if not CLASSIFIED.exists():
        raise SystemExit(f"No existe {CLASSIFIED}")
    for line in CLASSIFIED.read_text().splitlines():
        try:
            row = json.loads(line)
            if "error" not in row:
                latest[str(row["id"])] = row
        except Exception:
            pass
    return latest


def load_raw(classified):
    rows = []
    raw_ids = set()
    for path in sorted((ROOT / "tweets").glob("*/*.json")):
        for tweet in json.loads(path.read_text()):
            tweet_id = str(tweet.get("id") or "")
            raw_ids.add(tweet_id)
            judgement = classified.get(tweet_id)
            if judgement is None:
                continue
            row = dict(tweet)
            row.update({
                "politica": bool(judgement.get("politica")),
                "partido": judgement.get("partido") or "",
                "direccion": judgement.get("direccion") or "",
                "conf": float(judgement.get("conf") or 0),
            })
            rows.append(row)
    missing = raw_ids - classified.keys()
    return rows, len(raw_ids), len(missing)


def main():
    DATA.mkdir(parents=True, exist_ok=True)
    DETAIL.mkdir(parents=True, exist_ok=True)
    metadata = load_metadata()
    classified = load_classified()
    rows, raw_total, missing = load_raw(classified)
    if missing:
        raise SystemExit(f"Clasificación incompleta: {missing} de {raw_total} tuits sin resultado")

    by_handle = defaultdict(list)
    for row in rows:
        by_handle[row["handle"]].append(row)
    for medium in metadata.values():
        by_handle.setdefault(medium["handle"], [])

    periods = {"todo": {"label": "Toda la XV Legislatura", "medios": []}}
    periods.update({year: {"label": year, "medios": []} for year in YEARS})
    for handle, handle_rows in sorted(by_handle.items(), key=lambda item: item[0].lower()):
        periods["todo"]["medios"].append(map_row(handle, handle_rows))
        for year in YEARS:
            periods[year]["medios"].append(map_row(handle, [r for r in handle_rows if r["fecha"].startswith(year)]))

    polarisation = {
        "generado": datetime.now(timezone.utc).date().isoformat(),
        "fuente": "Hasta 100 tuits Latest por medio y mes de la XV Legislatura, estratificados en cinco tramos mensuales.",
        "viral_definicion": "Subconjunto de la misma muestra con al menos 100 retuits.",
        "metrica": "índice = (derecha − izquierda) / (derecha + izquierda); posicion = 100 × derecha / (izquierda + derecha)",
        "periodos": periods,
        "medios": periods["todo"]["medios"],
    }
    (DATA / "polarizacion.json").write_text(json.dumps(polarisation, ensure_ascii=False, separators=(",", ":")))

    index_media = []
    all_parties = Counter()
    all_directions = Counter()
    months = Counter()
    total_political = 0
    total_viral = 0
    for handle, handle_rows in sorted(by_handle.items(), key=lambda item: item[0].lower()):
        old = metadata.get(handle.lower(), {})
        published = metric(handle_rows)
        viral_rows = [r for r in handle_rows if r["retweets"] >= 100]
        political = [r for r in handle_rows if r.get("politica")]
        parties = Counter(canonical_party(r.get("partido")) or "ninguno" for r in political)
        directions = Counter((r.get("direccion") or "neutro") for r in political)
        all_parties.update(parties)
        all_directions.update(directions)
        months.update(r["fecha"][:7] for r in handle_rows)
        total_political += len(political)
        total_viral += len(viral_rows)
        retweets = sorted(int(r.get("retweets") or 0) for r in handle_rows)
        pub = {
            "handle": handle,
            "nombre": old.get("nombre") or handle.lstrip("@"),
            "seguidores": old.get("seguidores", 0),
            "descripcion": old.get("descripcion", ""),
            "virales": len(viral_rows),
            "muestreados": len(handle_rows),
            "politicos": len(political),
            "izq": published["izq"], "der": published["der"], "neutro": published["neutro"],
            "indice": published["indice"] or 0,
            "partidos": dict(parties.most_common()),
            "direccion": dict(directions.most_common()),
            "meses": dict(sorted(Counter(r["fecha"][:7] for r in political).items())),
            "rt_mediana": retweets[len(retweets) // 2] if retweets else 0,
            "rt_media": int(round(sum(r["retweets"] for r in handle_rows) / len(handle_rows))) if handle_rows else 0,
            "rt_max": max(retweets, default=0),
            "logo": old.get("logo") or f"logos/{slug(handle)}.webp",
            "archivo": f"medios/{slug(handle)}.json",
        }
        index_media.append(pub)
        detail_rows = []
        for row in sorted(handle_rows, key=lambda value: -int(value["retweets"])):
            detail_rows.append({
                "f": row["fecha"][:10], "t": row["texto"],
                "rt": int(row["retweets"]), "lk": int(row.get("likes") or 0),
                "rp": int(row.get("replies") or 0), "vw": int(row.get("views") or 0),
                "p": detail_party(row.get("partido")), "pc": float(row.get("conf") or 0),
                "d": row.get("direccion") or "", "dc": float(row.get("conf") or 0),
                "ir": 0.0, "u": row["url"],
            })
        (DETAIL / f"{slug(handle)}.json").write_text(json.dumps({
            "handle": handle, "nombre": pub["nombre"], "indice": pub["indice"], "tweets": detail_rows,
        }, ensure_ascii=False, separators=(",", ":")))

    index_media.sort(key=lambda row: row["indice"])
    state_path = ROOT / "clasificar_estado.json"
    class_cost = json.loads(state_path.read_text()).get("cost_usd", 0) if state_path.exists() else 0
    index = {
        "generado": datetime.now(timezone.utc).date().isoformat(),
        "ver": VER,
        "ventana": {"desde": min(r["fecha"] for r in rows), "hasta": max(r["fecha"] for r in rows)},
        "fuente": "TwitterAPI.io, hasta 100 tuits Latest por medio y mes, distribuidos en cinco tramos.",
        "clasificador": "Gemini 3.7 Flash, política española, partido afectado y dirección.",
        "totales": {
            "muestreados": len(rows), "virales": total_viral,
            "medios": len(index_media), "medios_lista": len(index_media),
            "clasificados": total_political,
            "gate_si": total_political, "gate_dudoso": 0, "gate_no": len(rows) - total_political,
            "por_partido": dict(all_parties.most_common()),
            "por_direccion": dict(all_directions.most_common()),
            "cruce": {}, "ironia_media": None,
            "coste_descarga_usd": 33.0213, "coste_clasificacion_usd": class_cost,
        },
        "meses": dict(sorted(months.items())),
        "medios": index_media,
    }
    (DATA / "index.json").write_text(json.dumps(index, ensure_ascii=False, indent=1))

    top = sorted((r for r in rows if r.get("politica")), key=lambda row: -int(row["retweets"]))[:300]
    (DATA / "top.json").write_text(json.dumps([{
        "h": r["handle"], "f": r["fecha"][:10], "t": r["texto"], "rt": int(r["retweets"]),
        "lk": int(r.get("likes") or 0), "vw": int(r.get("views") or 0),
        "p": detail_party(r.get("partido")), "d": r.get("direccion") or "", "pc": float(r.get("conf") or 0), "u": r["url"],
    } for r in top], ensure_ascii=False, separators=(",", ":")))

    html = SITE / "index.html"
    if html.exists():
        text = html.read_text()
        updated = re.sub(r"(app\.js|styles\.css)(\?v=[0-9A-Za-z.\-]*)?", lambda m: f"{m.group(1)}?v={VER}", text)
        html.write_text(updated)

    print(json.dumps({
        "classified": len(classified), "raw": raw_total, "exported": len(rows),
        "media": len(index_media), "viral": total_viral, "political": total_political,
        "periods": list(periods), "site": str(SITE), "version": VER,
    }, ensure_ascii=False))


if __name__ == "__main__":
    main()
