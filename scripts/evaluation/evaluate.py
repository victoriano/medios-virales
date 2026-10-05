#!/usr/bin/env python3
"""Evalúa un piloto: expectativas de los pares, acuerdo con la referencia y coherencia del contrato.

El acuerdo con la referencia no es acierto: la referencia contiene errores conocidos. Sirve para
localizar desacuerdos que hay que revisar, no para puntuar.

Uso:
    python3 scripts/evaluation/evaluate.py --piloto <dir del piloto> --referencia-desarrollo <jsonl> \
        --informe experiments/direction_vnext/reports/piloto_jev_20261005.json
"""
from __future__ import annotations

import argparse
import json
from collections import Counter
from pathlib import Path

if __package__ in (None, ""):
    import sys
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from evaluation.baseline import load_jsonl  # noqa: E402

CAMPOS = ("partido_objetivo", "direccion_mensaje", "voz", "encuadre_medio", "evidencia_suficiente")


def cumple(valor, spec) -> bool:
    if isinstance(spec, dict):
        if "en" in spec:
            return valor in spec["en"]
        if "no" in spec:
            return valor not in spec["no"]
    return valor == spec


def evalua_par(par: int, lados: dict, critica: bool) -> list[dict]:
    """Devuelve los fallos de un par. ``lados`` mapea a/b a (esperado, salida o None si rechazada)."""
    fallos = []
    for lado, (esperado, salida) in lados.items():
        if "entrada_rechazada" in esperado:
            if esperado["entrada_rechazada"] != (salida is None):
                fallos.append({"par": par, "lado": lado, "campo": "entrada_rechazada", "critica": critica})
            continue
        if salida is None:
            fallos.append({"par": par, "lado": lado, "campo": "sin_respuesta", "critica": critica})
            continue
        for campo, spec in esperado.items():
            if campo == "igual_que":
                otro = lados[spec][1]
                if otro is not None and any(salida[c] != otro[c] for c in CAMPOS) and lado == "a":
                    fallos.append({"par": par, "lado": "a=b", "campo": "igual_que", "critica": critica,
                                   "a": {c: salida[c] for c in CAMPOS}, "b": {c: otro[c] for c in CAMPOS}})
            elif not cumple(salida[campo], spec):
                fallos.append({"par": par, "lado": lado, "campo": campo, "esperado": spec,
                               "obtenido": salida[campo], "critica": critica})
    return fallos


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--piloto", type=Path, required=True)
    parser.add_argument("--referencia-desarrollo", type=Path, required=True)
    parser.add_argument("--informe", type=Path, required=True)
    args = parser.parse_args()

    filas = [r for r in load_jsonl(args.piloto.expanduser() / "resultados.jsonl") if r["resultado"]["ok"]]
    pares_raw = load_jsonl(Path(__file__).resolve().parents[2] / "experiments" / "direction_vnext" / "pairs.jsonl")
    por_id = {r["caso"]["entrada"]["id"]: r for r in filas}

    fallos_pares = []
    for par in pares_raw:
        lados = {l: (par[l]["esperado"], (por_id.get(par[l]["entrada"]["id"]) or {}).get("salida")) for l in "ab"}
        fallos_pares.extend(evalua_par(par["par"], lados, par["critica"]))
    pares_con_fallo = sorted({f["par"] for f in fallos_pares})

    def acuerdo(rows, ref):
        tabla = Counter()
        desacuerdos = []
        for r in rows:
            s = r["salida"]
            e = ref[r["caso"]["entrada"]["id"]]
            igual_p = s["partido_objetivo"] == e["partido_objetivo"]
            igual_d = s["direccion_mensaje"] == e["direccion_mensaje"]
            tabla["partido_y_direccion" if igual_p and igual_d else "solo_partido" if igual_p
                  else "solo_direccion" if igual_d else "ninguno"] += 1
            if not (igual_p and igual_d):
                desacuerdos.append({"id": r["caso"]["entrada"]["id"], "fecha": r["caso"]["entrada"]["fecha"],
                                    "texto": r["caso"]["entrada"]["texto"][:220],
                                    "referencia": f"{e['partido_objetivo']} {e['direccion_mensaje']}",
                                    "jev": f"{s['partido_objetivo']} {s['direccion_mensaje']}",
                                    "confianza_jev": r["resultado"]["respuestas"]["objetivo_direccion"].get("confidence")})
        return dict(tabla), desacuerdos

    controles = [r for r in filas if r["caso"]["origen"] == "control"]
    ref_controles = {r["caso"]["entrada"]["id"]: r["caso"]["esperado"] for r in controles}
    ref_dev = {}
    for row in load_jsonl(args.referencia_desarrollo.expanduser()):
        ref_dev[row["id"]] = {"partido_objetivo": row["partido"], "direccion_mensaje": row["direccion"] or "no_aplica"}
    desarrollo = [r for r in filas if r["caso"]["origen"] == "desarrollo"]

    tabla_c, desac_c = acuerdo(controles, ref_controles)
    tabla_d, desac_d = acuerdo(desarrollo, ref_dev)
    informe = {
        "llamadas_ok": len(filas),
        "modelos": sorted({r["resultado"]["modelo"] for r in filas}),
        "usd": round(sum(r["resultado"]["usd"] for r in filas), 6),
        "pares": {"total": len(pares_raw), "con_fallo": pares_con_fallo,
                  "criticos_con_fallo": sorted({f["par"] for f in fallos_pares if f["critica"]}),
                  "fallos": fallos_pares},
        "controles": {"n": len(controles), "acuerdo": tabla_c, "desacuerdos": desac_c},
        "desarrollo": {"n": len(desarrollo), "acuerdo": tabla_d, "desacuerdos": desac_d},
        "incoherencias_contrato": [{"id": r["caso"]["entrada"]["id"], "incoherencias": r["salida"]["incoherencias"]}
                                   for r in filas if r["salida"]["incoherencias"]],
        "direcciones_jev": dict(Counter(r["salida"]["direccion_mensaje"] for r in filas)),
        "instruccion_hostil": {r["caso"]["entrada"]["id"]: r["resultado"]["respuestas"]["instruccion_hostil"]["noul"]
                               for r in filas if r["caso"]["entrada"]["id"] in ("p23a", "p23b")},
    }
    args.informe.parent.mkdir(parents=True, exist_ok=True)
    args.informe.write_text(json.dumps(informe, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({k: informe[k] for k in ("llamadas_ok", "modelos", "usd", "direcciones_jev", "instruccion_hostil")}, ensure_ascii=False))
    print("pares con fallo:", pares_con_fallo, "criticos:", informe["pares"]["criticos_con_fallo"])
    print("controles:", tabla_c, "desarrollo:", tabla_d, "incoherencias:", len(informe["incoherencias_contrato"]))


if __name__ == "__main__":
    main()
