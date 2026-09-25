#!/usr/bin/env python3
"""Construye los JSON estáticos con la serie completa (2018–2026).

Combina dos muestras contiguas y completamente clasificadas:
- histórico: 2018-05-02 a 2023-08-16
- XV Legislatura: 2023-08-17 a 2026-09-24

El arranque de la web solo necesita ``index.json`` y ``polarizacion.json``.
El detalle se publica por medio y año bajo ``medios/<slug>/``.
"""
import json
import os
import re
import shutil
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

HISTORICAL_ROOT = Path(os.environ.get(
    "HISTORICAL_ROOT",
    "~/typesafe-lab/politica/medios/polarizacion/historico_io_100_may2018_aug2023",
)).expanduser()
XV_ROOT = Path(os.environ.get(
    "LEGISLATURA_ROOT",
    "~/typesafe-lab/politica/medios/polarizacion/legislatura_xv_io_100",
)).expanduser()
SITE = Path(os.environ.get("SITE_DIR", "~/Code/medios-virales/site")).expanduser()
DATA = SITE / "data"
DETAIL = DATA / "medios"
MEMBERS = Path(os.environ.get(
    "MEMBERS_FILE", "~/typesafe-lab/politica/medios/members.json"
)).expanduser()
VER = os.environ.get("SITE_VER") or datetime.now(timezone.utc).strftime("%Y%m%d%H%M")
YEARS = tuple(str(year) for year in range(2018, 2027))
XV_START = "2023-08-17"
LEFT = {"PSOE", "Sumar"}
RIGHT = {"PP", "Vox"}
CANON = {"psoe": "PSOE", "pp": "PP", "vox": "Vox", "sumar": "Sumar", "podemos": "Sumar"}
DOWNLOAD_COSTS = {"historico": 57.85245, "xv": 33.0213}
CLASSIFIED_BASENAME = os.environ.get("CLASSIFIED_BASENAME", "clasificado_contextual.jsonl")
CONTEXT_REVIEW_COST_USD = 1.16287
CONTEXT_REVIEW_CANDIDATES = 3813
CONTEXT_REVIEW_CHANGES = 601


def slug(handle):
    return handle.lstrip("@").lower()


def canonical_party(value):
    return CANON.get((value or "").strip().lower(), "")


def detail_party(value):
    canonical = canonical_party(value)
    if canonical:
        return canonical
    raw = (value or "").strip().lower()
    return raw if raw in {"varios", "ninguno"} else ""


def side(row):
    party = canonical_party(row.get("partido"))
    direction = (row.get("direccion") or "").strip().lower()
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
    index = None if not clear else round((counts["der"] - counts["izq"]) / clear, 6)
    position = None if not clear else round(100 * counts["der"] / clear, 6)
    result = {
        "indice": index,
        "izq": counts["izq"],
        "der": counts["der"],
        "con_lado": clear,
        "posicion": position,
        "tuits": len(selected),
        "porcentaje_con_lado": round(100 * clear / len(selected), 6) if selected else 0,
    }
    if viral:
        result.update({
            "juicios": len(political),
            "por_ciento_izq": None if not clear else round(100 * counts["izq"] / clear, 6),
        })
    else:
        result.update({"politicos": len(political), "neutro": counts["neutro"]})
    return result


def map_row(handle, rows):
    published = metric(rows)
    viral = metric(rows, viral=True)
    pub_idx, vir_idx = published["indice"], viral["indice"]
    gap = None if pub_idx is None or vir_idx is None else round(vir_idx - pub_idx, 6)
    exaggerates = None if pub_idx is None or vir_idx is None else round(abs(vir_idx) - abs(pub_idx), 6)
    by_month = defaultdict(list)
    for row in rows:
        by_month[row["fecha"][:7]].append(row)
    monthly = {}
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
            metadata[slug(handle)] = {
                "handle": handle,
                "nombre": member.get("name") or handle.lstrip("@"),
                "seguidores": member.get("followers", 0),
                "descripcion": member.get("description", ""),
            }
    old_index = DATA / "index.json"
    if old_index.exists():
        for medium in json.loads(old_index.read_text()).get("medios", []):
            key = slug(medium["handle"])
            metadata[key] = {
                **metadata.get(key, {}),
                **{k: medium[k] for k in ("handle", "nombre", "seguidores", "descripcion", "logo") if k in medium},
            }
    return metadata


def load_classified(root):
    path = root / CLASSIFIED_BASENAME
    if not path.exists():
        raise SystemExit(f"No existe {path}")
    latest = {}
    with path.open() as fh:
        for line_number, line in enumerate(fh, 1):
            try:
                row = json.loads(line)
            except json.JSONDecodeError as exc:
                raise SystemExit(f"JSON inválido en {path}:{line_number}: {exc}") from exc
            if "error" not in row:
                latest[str(row["id"])] = row
    return latest


def load_source(name, root):
    classified = load_classified(root)
    rows = []
    raw_ids = set()
    for path in sorted((root / "tweets").glob("*/*.json")):
        for tweet in json.loads(path.read_text()):
            tweet_id = str(tweet.get("id") or "")
            raw_ids.add(tweet_id)
            judgement = classified.get(tweet_id)
            if judgement is None:
                continue
            row = dict(tweet)
            row.update({
                "id": tweet_id,
                "politica": bool(judgement.get("politica")),
                "partido": judgement.get("partido") or "",
                "direccion": (judgement.get("direccion") or "").strip().lower(),
                "conf": float(judgement.get("conf") or 0),
                "fuente_muestra": name,
            })
            rows.append(row)
    missing = raw_ids - classified.keys()
    if missing:
        raise SystemExit(f"Clasificación incompleta en {name}: {len(missing)} de {len(raw_ids)} tuits sin resultado")
    state_path = root / "clasificar_estado.json"
    state = json.loads(state_path.read_text()) if state_path.exists() else {}
    return rows, {
        "raw": len(raw_ids),
        "classified": len(classified),
        "political": sum(bool(row.get("politica")) for row in rows),
        "cost": float(state.get("cost_usd") or 0),
    }


def period_block(label_es, label_en, rows_by_handle, predicate, start, end):
    media = []
    for key, entry in sorted(rows_by_handle.items()):
        selected = [row for row in entry["rows"] if predicate(row)]
        media.append(map_row(entry["handle"], selected))
    return {"label": label_es, "label_en": label_en, "desde": start, "hasta": end, "medios": media}


def detail_row(row):
    return {
        "f": row["fecha"][:10], "t": row["texto"],
        "rt": int(row.get("retweets") or 0), "lk": int(row.get("likes") or 0),
        "rp": int(row.get("replies") or 0), "vw": int(row.get("views") or 0),
        "p": detail_party(row.get("partido")), "pc": float(row.get("conf") or 0),
        "d": row.get("direccion") or "", "dc": float(row.get("conf") or 0),
        "ir": 0.0, "u": row["url"],
    }


def main():
    DATA.mkdir(parents=True, exist_ok=True)
    metadata = load_metadata()
    historical, historical_stats = load_source("historico", HISTORICAL_ROOT)
    xv, xv_stats = load_source("xv", XV_ROOT)
    rows = historical + xv
    ids = [row["id"] for row in rows]
    if len(ids) != len(set(ids)):
        raise SystemExit(f"Hay {len(ids) - len(set(ids))} ids duplicados entre las dos muestras")

    rows_by_handle = {}
    grouped = defaultdict(list)
    display_handles = {}
    for row in rows:
        key = slug(row["handle"])
        grouped[key].append(row)
        display_handles[key] = metadata.get(key, {}).get("handle") or row["handle"]
    for key in set(grouped) | set(metadata):
        rows_by_handle[key] = {"handle": display_handles.get(key) or metadata[key]["handle"], "rows": grouped.get(key, [])}

    date_min = min(row["fecha"][:10] for row in rows)
    date_max = max(row["fecha"][:10] for row in rows)
    periods = {
        "todo": period_block("Serie completa", "Full series", rows_by_handle, lambda row: True, date_min, date_max),
        "xv": period_block("XV Legislatura", "XV Legislature", rows_by_handle,
                           lambda row: row["fecha"][:10] >= XV_START, XV_START, date_max),
    }
    for year in YEARS:
        year_rows = [row["fecha"][:10] for row in rows if row["fecha"].startswith(year)]
        periods[year] = period_block(year, year, rows_by_handle,
                                     lambda row, y=year: row["fecha"].startswith(y),
                                     min(year_rows), max(year_rows))

    polarisation = {
        "generado": datetime.now(timezone.utc).date().isoformat(),
        "fuente": "TwitterAPI.io: hasta 100 tuits Latest por medio y mes, estratificados temporalmente.",
        "viral_definicion": "Subconjunto de la misma muestra con al menos 100 retuits.",
        "metrica": "índice = (derecha − izquierda) / (derecha + izquierda); posicion = 100 × derecha / (izquierda + derecha); Y = con_lado / todos los tuits de la serie",
        "periodos": periods,
        "medios": periods["todo"]["medios"],
    }
    (DATA / "polarizacion.json").write_text(json.dumps(polarisation, ensure_ascii=False, separators=(",", ":")))

    if DETAIL.exists():
        shutil.rmtree(DETAIL)
    DETAIL.mkdir(parents=True)

    index_media = []
    all_parties = Counter()
    all_directions = Counter()
    months = Counter()
    total_political = 0
    total_viral = 0
    for key, entry in sorted(rows_by_handle.items()):
        handle, handle_rows = entry["handle"], entry["rows"]
        old = metadata.get(key, {})
        published = metric(handle_rows)
        viral_rows = [row for row in handle_rows if row["retweets"] >= 100]
        political = [row for row in handle_rows if row.get("politica")]
        parties = Counter(detail_party(row.get("partido")) or "ninguno" for row in political)
        directions = Counter((row.get("direccion") or "neutro") for row in political)
        all_parties.update(parties)
        all_directions.update(directions)
        months.update(row["fecha"][:7] for row in handle_rows)
        total_political += len(political)
        total_viral += len(viral_rows)
        retweets = sorted(int(row.get("retweets") or 0) for row in handle_rows)
        clear = published["izq"] + published["der"]
        logo = old.get("logo") or f"logos/{key}.webp"
        if not (SITE / logo).exists():
            logo = "favicon.svg"
        pub = {
            "handle": handle,
            "nombre": old.get("nombre") or handle.lstrip("@"),
            "seguidores": old.get("seguidores", 0),
            "descripcion": old.get("descripcion", ""),
            "virales": len(viral_rows),
            "muestreados": len(handle_rows),
            "politicos": len(political),
            "pct_politicos": 100 * len(political) / len(handle_rows) if handle_rows else 0,
            "izq": published["izq"], "der": published["der"], "neutro": published["neutro"],
            "indice": published["indice"] or 0,
            "incluido": clear > 50,
            "partidos": dict(parties.most_common()),
            "direccion": dict(directions.most_common()),
            "meses": dict(sorted(Counter(row["fecha"][:7] for row in political).items())),
            "rt_mediana": retweets[len(retweets) // 2] if retweets else 0,
            "rt_media": int(round(sum(row["retweets"] for row in handle_rows) / len(handle_rows))) if handle_rows else 0,
            "rt_max": max(retweets, default=0),
            "logo": logo,
            "archivo": f"medios/{key}/index.json",
        }
        index_media.append(pub)

        medium_dir = DETAIL / key
        medium_dir.mkdir()
        manifest_parts = []
        by_year = defaultdict(list)
        for row in handle_rows:
            by_year[row["fecha"][:4]].append(row)
        for year, year_rows in sorted(by_year.items()):
            details = [detail_row(row) for row in sorted(year_rows, key=lambda value: -int(value["retweets"]))]
            filename = f"{year}.json"
            (medium_dir / filename).write_text(json.dumps({"tweets": details}, ensure_ascii=False, separators=(",", ":")))
            manifest_parts.append({
                "year": year, "archivo": filename, "tuits": len(details),
                "politicos": sum(bool(row.get("politica")) for row in year_rows),
                "virales": sum(int(row.get("retweets") or 0) >= 100 for row in year_rows),
            })
        manifest = {
            "handle": handle, "nombre": pub["nombre"], "indice": pub["indice"],
            "tuits": len(handle_rows), "particiones": manifest_parts,
        }
        (medium_dir / "index.json").write_text(json.dumps(manifest, ensure_ascii=False, separators=(",", ":")))

    index_media.sort(key=lambda row: row["indice"])
    class_cost = historical_stats["cost"] + xv_stats["cost"] + CONTEXT_REVIEW_COST_USD
    download_cost = sum(DOWNLOAD_COSTS.values())
    included = sum(medium["incluido"] for medium in index_media)
    index = {
        "generado": datetime.now(timezone.utc).date().isoformat(),
        "ver": VER,
        "ventana": {"desde": date_min, "hasta": date_max},
        "fuente": "TwitterAPI.io, hasta 100 tuits Latest por medio y mes, distribuidos en tramos temporales.",
        "clasificador": "Gemini 3.7 Flash, política española, partido afectado, dirección y revisión contextual selectiva.",
        "revision_contextual": {
            "candidatos": CONTEXT_REVIEW_CANDIDATES,
            "cambios": CONTEXT_REVIEW_CHANGES,
            "coste_usd": CONTEXT_REVIEW_COST_USD,
            "palabras_clave": ["Aldama", "González", "García Page", "Page", "Alfonso Guerra"],
        },
        "muestras": {
            "historico": {"desde": "2018-05-02", "hasta": "2023-08-16", **historical_stats,
                          "coste_descarga_usd": DOWNLOAD_COSTS["historico"]},
            "xv": {"desde": XV_START, "hasta": date_max, **xv_stats,
                   "coste_descarga_usd": DOWNLOAD_COSTS["xv"]},
        },
        "totales": {
            "muestreados": len(rows), "virales": total_viral,
            "medios": len(index_media), "medios_lista": len(index_media), "medios_incluidos": included,
            "clasificados": total_political,
            "gate_si": total_political, "gate_dudoso": 0, "gate_no": len(rows) - total_political,
            "por_partido": dict(all_parties.most_common()),
            "por_direccion": dict(all_directions.most_common()),
            "cruce": {}, "ironia_media": None,
            "coste_descarga_usd": download_cost, "coste_clasificacion_usd": class_cost,
        },
        "meses": dict(sorted(months.items())),
        "medios": index_media,
    }
    (DATA / "index.json").write_text(json.dumps(index, ensure_ascii=False, separators=(",", ":")))

    top = sorted((row for row in rows if row.get("politica") and row["retweets"] >= 100),
                 key=lambda row: -int(row["retweets"]))[:300]
    (DATA / "top.json").write_text(json.dumps([{
        "h": row["handle"], "f": row["fecha"][:10], "t": row["texto"], "rt": int(row["retweets"]),
        "lk": int(row.get("likes") or 0), "rp": int(row.get("replies") or 0), "vw": int(row.get("views") or 0),
        "p": detail_party(row.get("partido")), "d": row.get("direccion") or "", "pc": float(row.get("conf") or 0), "u": row["url"],
    } for row in top], ensure_ascii=False, separators=(",", ":")))

    html = SITE / "index.html"
    if html.exists():
        text = html.read_text()
        updated = re.sub(r"(app\.js|styles\.css)(\?v=[0-9A-Za-z.\-]*)?", lambda match: f"{match.group(1)}?v={VER}", text)
        html.write_text(updated)

    print(json.dumps({
        "sources": {"historico": historical_stats, "xv": xv_stats},
        "exported": len(rows), "media": len(index_media), "included": included,
        "viral": total_viral, "political": total_political, "nonpolitical": len(rows) - total_political,
        "classification_cost_usd": class_cost, "download_cost_usd": download_cost,
        "periods": list(periods), "site": str(SITE), "version": VER,
    }, ensure_ascii=False))


if __name__ == "__main__":
    main()
