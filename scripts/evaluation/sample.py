#!/usr/bin/env python3
"""Selecciona y sella los conjuntos de evaluación sin llamar a ningún modelo.

Orden obligatorio: primero se sella el examen reservado (240), después se excluyen sus IDs y
sus duplicados de texto del desarrollo (120) y de los candidatos a control de regresión (24).

La etiqueta de referencia solo se usa para estratificar. Los ficheros de entrada del juez
llevan ``id``, ``fecha`` y ``texto``; las etiquetas, el medio y los pesos del examen viven en
un directorio aparte del taller, fuera del repositorio.

Uso:
    python3 scripts/evaluation/sample.py \
        --referencia ~/typesafe-lab/politica/medios/polarizacion/validacion_vnext/referencia_20261005 \
        --taller-out ~/typesafe-lab/politica/medios/polarizacion/validacion_vnext/muestras_20261005 \
        --repo-out experiments/direction_vnext
"""
from __future__ import annotations

import argparse
import hashlib
import json
import random
import re
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

if __package__ in (None, ""):
    import sys
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from evaluation.baseline import guard_output, load_jsonl, sha256, write_jsonl  # noqa: E402
from evaluation.contract import partido_referencia  # noqa: E402

SEED = 20261005
EPOCAS = (("2018-2019", 2018, 2019), ("2020-2022", 2020, 2022), ("2023-2026", 2023, 2026))
ESTRATOS = ("no_politico", "concreto_beneficia", "concreto_perjudica", "resto_politico")
PARTIDOS_DESARROLLO = ("PSOE", "PP", "Vox", "Sumar")
DIRECCIONES_DESARROLLO = ("beneficia", "perjudica", "neutro")
TALLER = Path("~/typesafe-lab/politica/medios/polarizacion").expanduser()
TWEET_ROOTS = (TALLER / "historico_io_100_may2018_aug2023" / "tweets",
               TALLER / "legislatura_xv_io_100" / "tweets")
_URL = re.compile(r"https?://\S+")


class SamplingError(ValueError):
    pass


def epoca(fecha: str) -> str:
    year = int(fecha[:4])
    for nombre, desde, hasta in EPOCAS:
        if desde <= year <= hasta:
            return nombre
    raise SamplingError(f"Fecha fuera de las épocas: {fecha}")


def partido(row: dict) -> str:
    return partido_referencia(row.get("partido", ""), bool(row.get("politica")))


def estrato(row: dict) -> str:
    if not row.get("politica"):
        return "no_politico"
    concreto = partido(row) not in ("varios", "ninguno", "indeterminado")
    if concreto and row.get("direccion") == "beneficia":
        return "concreto_beneficia"
    if concreto and row.get("direccion") == "perjudica":
        return "concreto_perjudica"
    return "resto_politico"


def huella(texto: str) -> str:
    """Huella de texto para detectar duplicados cercanos: sin URLs, espacios ni mayúsculas."""
    limpio = " ".join(_URL.sub(" ", texto or "").split()).casefold()
    return hashlib.sha256(limpio.encode()).hexdigest()


def unique_by_id(rows: list[dict]) -> dict[str, dict]:
    by_id = {}
    for row in rows:
        key = str(row["id"])
        if key in by_id:
            raise SamplingError(f"ID repetido en la referencia: {key}")
        by_id[key] = row
    return by_id


def check_disjoint(**conjuntos: list[str]) -> None:
    nombres = list(conjuntos)
    for nombre in nombres:
        ids = conjuntos[nombre]
        if len(ids) != len(set(ids)):
            raise SamplingError(f"IDs repetidos dentro de {nombre}")
    for i, a in enumerate(nombres):
        for b in nombres[i + 1:]:
            cruce = set(conjuntos[a]) & set(conjuntos[b])
            if cruce:
                raise SamplingError(f"{a} y {b} comparten {len(cruce)} IDs")


def stratified_holdout(rows: dict[str, dict], por_celda: int, seed: int) -> tuple[list[dict], list[dict]]:
    """Muestra aleatoria simple dentro de cada cruce época por estrato, con pesos de diseño."""
    celdas = defaultdict(list)
    for tweet_id, row in rows.items():
        celdas[(epoca(row["fecha"]), estrato(row))].append(tweet_id)
    elegidos, diseno = [], []
    for nombre_epoca, *_ in EPOCAS:
        for nombre_estrato in ESTRATOS:
            ids = sorted(celdas.get((nombre_epoca, nombre_estrato), []))
            n = min(por_celda, len(ids))
            muestra = random.Random(f"{seed}:examen:{nombre_epoca}:{nombre_estrato}").sample(ids, n)
            diseno.append({"epoca": nombre_epoca, "estrato": nombre_estrato, "N": len(ids), "n": n,
                           "probabilidad_inclusion": n / len(ids) if ids else None,
                           "peso": len(ids) / n if n else None,
                           "cuota_incompleta": n < por_celda})
            for tweet_id in sorted(muestra):
                elegidos.append({"id": tweet_id, "epoca": nombre_epoca, "estrato": nombre_estrato,
                                 "peso": len(ids) / n})
    return elegidos, diseno


def balanced_cells(rows: dict[str, dict], excluidos: set[str], huellas_excluidas: set[str],
                   textos: dict[str, str], por_celda: int, seed: int, etiqueta: str):
    """Cuotas por partido y dirección previos, repartidas entre épocas y medios.

    Nunca rellena una cuota con duplicados: si no hay casos suficientes, la registra.
    """
    celdas = defaultdict(list)
    for tweet_id, row in rows.items():
        if tweet_id in excluidos or not row.get("politica"):
            continue
        clave = (partido(row), row.get("direccion"))
        if clave[0] in PARTIDOS_DESARROLLO and clave[1] in DIRECCIONES_DESARROLLO:
            celdas[clave].append(tweet_id)
    elegidos, cuotas = [], []
    huellas_usadas = set(huellas_excluidas)
    for p in PARTIDOS_DESARROLLO:
        for d in DIRECCIONES_DESARROLLO:
            candidatos = sorted(celdas.get((p, d), []))
            random.Random(f"{seed}:{etiqueta}:{p}:{d}").shuffle(candidatos)
            por_epoca = defaultdict(list)
            for tweet_id in candidatos:
                por_epoca[epoca(rows[tweet_id]["fecha"])].append(tweet_id)
            orden = [e for e, *_ in EPOCAS if por_epoca[e]]
            medios_usados, celda = set(), []
            # Ronda por épocas; en cada una, primero medios aún no usados en la celda.
            while len(celda) < por_celda and any(por_epoca[e] for e in orden):
                for e in orden:
                    if len(celda) >= por_celda or not por_epoca[e]:
                        continue
                    cola = por_epoca[e]
                    idx = next((i for i, t in enumerate(cola) if rows[t]["handle"] not in medios_usados), 0)
                    tweet_id = cola.pop(idx)
                    h = huella(textos.get(tweet_id, ""))
                    if not textos.get(tweet_id, "").strip() or h in huellas_usadas:
                        continue
                    huellas_usadas.add(h)
                    medios_usados.add(rows[tweet_id]["handle"])
                    celda.append(tweet_id)
            cuotas.append({"partido": p, "direccion": d, "disponibles": len(candidatos),
                           "elegidos": len(celda), "cuota_incompleta": len(celda) < por_celda,
                           "epocas": dict(Counter(epoca(rows[t]["fecha"]) for t in celda))})
            elegidos.extend({"id": t, "partido_previo": p, "direccion_previa": d} for t in celda)
    return elegidos, cuotas


def load_texts(roots=TWEET_ROOTS) -> dict[str, str]:
    textos = {}
    for root in roots:
        for path in sorted(root.glob("*/*.json")):
            for tweet in json.loads(path.read_text()):
                textos[str(tweet.get("id"))] = " ".join((tweet.get("texto") or "").split())
    return textos


def entrada(row: dict, textos: dict[str, str]) -> dict:
    return {"id": str(row["id"]), "fecha": row["fecha"], "texto": textos.get(str(row["id"]), "")}


def referencia(row: dict) -> dict:
    return {"id": str(row["id"]), "handle": row["handle"], "url": row["url"],
            "retweets": row["retweets"], "politica": row["politica"],
            "partido_literal": row.get("partido", ""), "partido": partido(row),
            "direccion": row.get("direccion", ""), "conf_etiqueta": row.get("conf"),
            "revision_contextual": "revision_contextual" in row}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--referencia", type=Path, required=True,
                        help="Directorio congelado por baseline.py")
    parser.add_argument("--taller-out", type=Path, required=True)
    parser.add_argument("--repo-out", type=Path, required=True)
    parser.add_argument("--seed", type=int, default=SEED)
    args = parser.parse_args()

    ref_dir = args.referencia.expanduser().resolve()
    fuentes = [ref_dir / "historico_contextual" / "clasificado_contextual.jsonl",
               ref_dir / "xv_contextual" / "clasificado_contextual.jsonl"]
    taller_out = guard_output(args.taller_out, [ref_dir])
    repo_out = guard_output(args.repo_out, [ref_dir])
    if taller_out.exists():
        raise SystemExit(f"{taller_out} ya existe; las muestras selladas no se reemplazan")
    repo_files = ["development.jsonl", "regression_candidatos.jsonl", "holdout_manifest.json",
                  "sampling_manifest.json"]
    if any((repo_out / f).exists() for f in repo_files):
        raise SystemExit(f"Alguno de {repo_files} ya existe en {repo_out}")

    rows = unique_by_id([r for f in fuentes for r in load_jsonl(f)])
    textos = load_texts()
    sin_texto = sum(1 for t in rows if t not in textos)

    # 1. Examen reservado, sellado antes que nada.
    examen, diseno = stratified_holdout(rows, 20, args.seed)
    examen_ids = [e["id"] for e in examen]
    huellas_examen = {huella(textos.get(t, "")) for t in examen_ids}

    # 2. Desarrollo, sin IDs ni duplicados de texto del examen.
    desarrollo, cuotas_desarrollo = balanced_cells(rows, set(examen_ids), huellas_examen, textos,
                                                   10, args.seed, "desarrollo")
    desarrollo_ids = [d["id"] for d in desarrollo]

    # 3. Candidatos a control de regresión, sin cruzarse con los anteriores.
    huellas_usadas = huellas_examen | {huella(textos.get(t, "")) for t in desarrollo_ids}
    controles, cuotas_controles = balanced_cells(rows, set(examen_ids) | set(desarrollo_ids),
                                                 huellas_usadas, textos, 2, args.seed, "regresion")
    check_disjoint(examen=examen_ids, desarrollo=desarrollo_ids, regresion=[c["id"] for c in controles])

    taller_out.mkdir(parents=True)
    (taller_out / "examen").mkdir()
    (taller_out / "examen_referencia").mkdir()
    write_jsonl(taller_out / "examen" / "entradas.jsonl", (entrada(rows[t], textos) for t in examen_ids))
    write_jsonl(taller_out / "examen_referencia" / "referencia.jsonl",
                ({**e, **referencia(rows[e["id"]])} for e in examen))
    write_jsonl(taller_out / "desarrollo_referencia.jsonl",
                ({**d, **referencia(rows[d["id"]])} for d in desarrollo))

    repo_out.mkdir(parents=True, exist_ok=True)
    write_jsonl(repo_out / "development.jsonl", (entrada(rows[t], textos) for t in desarrollo_ids))
    write_jsonl(repo_out / "regression_candidatos.jsonl", (
        {**entrada(rows[c["id"]], textos), "url": rows[c["id"]]["url"],
         "esperado": {"partido_objetivo": c["partido_previo"], "direccion_mensaje": c["direccion_previa"]},
         "origen": "etiqueta de referencia", "estado": "candidato a control, sin revisar"}
        for c in controles))

    creado = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    manifest_ref = json.loads((ref_dir / "manifest.json").read_text())
    comun = {"creado": creado, "semilla": args.seed,
             "referencia": str(ref_dir).replace(str(Path.home()), "~"),
             "referencia_sha256_ids": manifest_ref["universo"]["sha256_ids_ordenados"],
             "ids_sin_texto_en_el_universo": sin_texto}
    holdout_manifest = {
        **comun,
        "descripcion": "Examen reservado: 3 épocas por 4 estratos de etiqueta previa, 20 por cruce. "
                       "Las IDs, etiquetas y pesos por caso están fuera del repositorio.",
        "ubicacion_entradas": str(taller_out / "examen" / "entradas.jsonl").replace(str(Path.home()), "~"),
        "ubicacion_referencia": str(taller_out / "examen_referencia").replace(str(Path.home()), "~"),
        "casos": len(examen_ids),
        "sha256_ids_ordenados": hashlib.sha256("\n".join(sorted(examen_ids)).encode()).hexdigest(),
        "sha256_entradas": sha256(taller_out / "examen" / "entradas.jsonl"),
        "sha256_referencia": sha256(taller_out / "examen_referencia" / "referencia.jsonl"),
        "diseno": diseno,
        "reglas": ["Se evalúa solo A y la variante ganadora, una vez, sin ajustar sobre el examen.",
                   "Una tasa global se pondera con N por cruce; la media simple no estima el error.",
                   "Revisar agrupación por acontecimiento antes de calcular intervalos."],
    }
    sampling_manifest = {
        **comun,
        "desarrollo": {"casos": len(desarrollo_ids), "cuotas": cuotas_desarrollo,
                       "fichero": "development.jsonl",
                       "referencia_fuera_del_repo": str(taller_out / "desarrollo_referencia.jsonl").replace(str(Path.home()), "~")},
        "regresion": {"candidatos_control": len(controles), "cuotas": cuotas_controles,
                      "fichero": "regression_candidatos.jsonl",
                      "correcciones_auditoria_antigua": "pendientes: el fichero de la auditoría de 200 no está en el VPS"},
        "exclusiones": "El desarrollo y los controles excluyen las IDs del examen y cualquier tuit con la "
                       "misma huella de texto (sin URLs, espacios ni mayúsculas). La contaminación por "
                       "acontecimiento se revisa a mano.",
    }
    (repo_out / "holdout_manifest.json").write_text(json.dumps(holdout_manifest, ensure_ascii=False, indent=2) + "\n")
    (repo_out / "sampling_manifest.json").write_text(json.dumps(sampling_manifest, ensure_ascii=False, indent=2) + "\n")
    (taller_out / "holdout_manifest.json").write_text(json.dumps(holdout_manifest, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({"examen": len(examen_ids), "desarrollo": len(desarrollo_ids),
                      "controles": len(controles), "sin_texto": sin_texto,
                      "cuotas_incompletas": [c for c in cuotas_desarrollo + cuotas_controles if c["cuota_incompleta"]]
                      + [d for d in diseno if d["cuota_incompleta"]]}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
