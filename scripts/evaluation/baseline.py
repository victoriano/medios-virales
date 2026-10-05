#!/usr/bin/env python3
"""Congela la referencia A: etiquetas publicadas, capa contextual, scripts y JSON del sitio.

Copia cada fuente a un directorio nuevo, calcula tamaño y sha256 antes y después de copiar y
escribe un manifiesto con el universo de IDs. Nunca escribe dentro de una fuente, de
``/srv/medios`` ni de ``site/`` del repositorio, y nunca reemplaza un directorio existente.

Uso:
    python3 scripts/evaluation/baseline.py \
        --out ~/typesafe-lab/politica/medios/polarizacion/validacion_vnext/referencia_20261005 \
        --manifest experiments/direction_vnext/baseline_manifest.json
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import subprocess
from datetime import datetime, timezone
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
TALLER = Path("~/typesafe-lab/politica/medios/polarizacion").expanduser()
PRODUCTION = Path("/srv/medios")

# Nombre lógico -> ruta. Los JSONL de etiquetas definen el universo de IDs.
LABEL_SOURCES = {
    "historico_contextual": TALLER / "historico_io_100_may2018_aug2023" / "clasificado_contextual.jsonl",
    "xv_contextual": TALLER / "legislatura_xv_io_100" / "clasificado_contextual.jsonl",
}
DEFAULT_SOURCES = {
    **LABEL_SOURCES,
    "historico_base": TALLER / "historico_io_100_may2018_aug2023" / "clasificado.jsonl",
    "xv_base": TALLER / "legislatura_xv_io_100" / "clasificado.jsonl",
    "capa_contextual": TALLER / "reclasificacion_contextual_psoe_20260925",
    "script_clasificador": TALLER / "clasificar_legislatura_xv.py",
    "script_reclasificar_contexto": TALLER / "reclasificar_contexto_psoe.py",
    "script_aplicar_contexto": TALLER / "aplicar_reclasificacion_contextual.py",
    "miembros": TALLER.parent / "members.json",
    "agregador": REPO / "scripts" / "build_legislatura_data.py",
    "sitio_produccion": PRODUCTION / "site" / "data",
    "sitio_desarrollo": REPO / "site" / "data",
}
# Rutas donde está prohibido escribir cualquier salida de la evaluación.
PROTECTED = (PRODUCTION, REPO / "site", TALLER / "historico_io_100_may2018_aug2023",
             TALLER / "legislatura_xv_io_100", TALLER / "reclasificacion_contextual_psoe_20260925")


class UnsafeOutput(ValueError):
    """Una salida apunta a una fuente de referencia o a producción."""


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def load_jsonl(path: Path) -> list[dict]:
    with path.open() as source:
        return [json.loads(line) for line in source if line.strip()]


def write_jsonl(path: Path, rows) -> None:
    with path.open("x") as output:
        for row in rows:
            output.write(json.dumps(row, ensure_ascii=False, sort_keys=True) + "\n")


def _within(path: Path, root: Path) -> bool:
    path, root = path.resolve(), root.resolve()
    return path == root or root in path.parents


def guard_output(path: Path, sources=(), protected=PROTECTED) -> Path:
    """Rechaza una salida que coincide con una fuente, está dentro de ella o en producción."""
    path = Path(path).expanduser().resolve()
    for source in [*sources, *protected]:
        source = Path(source).expanduser()
        if _within(path, source):
            raise UnsafeOutput(f"Salida prohibida: {path} coincide con {source}")
    return path


def file_entries(path: Path) -> list[dict]:
    files = [path] if path.is_file() else sorted(p for p in path.rglob("*") if p.is_file())
    base = path.parent if path.is_file() else path
    return [{"ruta": str(f.relative_to(base)), "bytes": f.stat().st_size, "sha256": sha256(f)} for f in files]


def tree_digest(entries: list[dict]) -> str:
    joined = "\n".join(f"{e['ruta']}\t{e['sha256']}" for e in entries)
    return hashlib.sha256(joined.encode()).hexdigest()


def universe(label_sources: dict[str, Path]) -> dict:
    """Recuento del universo de IDs y de etiquetas, sin reinterpretar la confianza."""
    seen: dict[str, str] = {}
    summary = {"por_fuente": {}, "ids_repetidos_entre_fuentes": 0}
    for name, path in label_sources.items():
        rows = political = contextual = 0
        duplicates = 0
        for row in load_jsonl(path):
            rows += 1
            political += bool(row.get("politica"))
            contextual += "revision_contextual" in row
            tweet_id = str(row["id"])
            if tweet_id in seen:
                duplicates += 1
                if seen[tweet_id] != name:
                    summary["ids_repetidos_entre_fuentes"] += 1
            seen[tweet_id] = name
        summary["por_fuente"][name] = {"filas": rows, "politicos": political,
                                       "con_revision_contextual": contextual,
                                       "ids_repetidos_dentro": duplicates}
    ids = sorted(seen)
    summary["ids_unicos"] = len(ids)
    summary["sha256_ids_ordenados"] = hashlib.sha256("\n".join(ids).encode()).hexdigest()
    return summary


def git_head(path: Path) -> str | None:
    try:
        return subprocess.run(["git", "-C", str(path), "rev-parse", "HEAD"], check=True,
                              capture_output=True, text=True).stdout.strip()
    except (subprocess.CalledProcessError, FileNotFoundError):
        return None


def freeze(out: Path, sources: dict[str, Path], label_sources: dict[str, Path],
           protected=PROTECTED) -> dict:
    out = guard_output(out, sources.values(), protected)
    if out.exists():
        raise FileExistsError(f"{out} ya existe; la referencia congelada no se reemplaza")
    missing = [name for name, path in sources.items() if not Path(path).exists()]
    if missing:
        raise FileNotFoundError(f"Faltan fuentes: {missing}")

    before = {name: file_entries(Path(path)) for name, path in sources.items()}
    out.mkdir(parents=True)
    manifest = {
        "creado": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "copia": str(out),
        "commit_produccion": git_head(PRODUCTION),
        "commit_desarrollo": git_head(REPO),
        "fuentes": {},
        "notas": [
            "Referencia A: etiquetas publicadas con la capa contextual, sin nuevas llamadas.",
            "conf 0,9/0,7/0,5 son etiquetas alta/media/baja, no probabilidades calibradas.",
            "Los JSONL no guardan la versión del modelo ni el motivo; quedan como desconocidos.",
        ],
    }
    for name, path in sources.items():
        path = Path(path)
        target = out / name
        if path.is_file():
            target.mkdir()
            shutil.copy2(path, target / path.name)  # copia real, nunca enlace duro
        else:
            shutil.copytree(path, target, copy_function=shutil.copy2)
        after = file_entries(target / path.name if path.is_file() else target)
        if [(e["ruta"], e["sha256"]) for e in after] != [(e["ruta"], e["sha256"]) for e in before[name]]:
            raise RuntimeError(f"La copia de {name} no coincide con su fuente")
        if file_entries(path) != before[name]:
            raise RuntimeError(f"La fuente {name} cambió durante la copia")
        manifest["fuentes"][name] = {
            "origen": str(path).replace(str(Path.home()), "~"),
            "tipo": "fichero" if path.is_file() else "directorio",
            "ficheros": len(before[name]),
            "bytes": sum(e["bytes"] for e in before[name]),
            "sha256_arbol": tree_digest(before[name]),
            "detalle": before[name] if len(before[name]) <= 20 else None,
        }
    manifest["universo"] = universe(label_sources)
    return manifest


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--manifest", type=Path, required=True)
    args = parser.parse_args()
    manifest_path = guard_output(args.manifest, DEFAULT_SOURCES.values())
    if manifest_path.exists():
        raise SystemExit(f"{manifest_path} ya existe")
    manifest = freeze(args.out.expanduser(), DEFAULT_SOURCES, LABEL_SOURCES)
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    text = json.dumps(manifest, ensure_ascii=False, indent=2) + "\n"
    manifest_path.write_text(text)
    (Path(manifest["copia"]) / "manifest.json").write_text(text)
    print(json.dumps(manifest["universo"], ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
