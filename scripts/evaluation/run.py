#!/usr/bin/env python3
"""Runner del piloto con Jev: salida nueva, presupuesto reservado, reanudable y con registro completo.

Cada caso se identifica por una clave que combina ID, modelo, preguntas, condición y estado
enviado; cambiar cualquiera de ellos invalida la caché. Un error de API nunca se guarda como
etiqueta. El presupuesto se reserva antes de enviar y se ajusta con el consumo real.

Uso (sonda del 5 de octubre, 100 llamadas):
    python3 scripts/evaluation/run.py --out ~/typesafe-lab/.../validacion_vnext/piloto_jev_20261005 \
        --desarrollo 29 --max-usd 0.10
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import random
import threading
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

if __package__ in (None, ""):
    import sys
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from evaluation import jev  # noqa: E402
from evaluation.baseline import guard_output, load_jsonl  # noqa: E402
from evaluation.contract import valida_entrada  # noqa: E402

API = "https://api.typesafe.ai/v1/systemone"
MODEL = "jev-latest"
USD_POR_TOKEN = 42 / 1e9  # solo cuenta la entrada
EXPERIMENTS = Path(__file__).resolve().parents[2] / "experiments" / "direction_vnext"


class BudgetExceeded(RuntimeError):
    pass


class Budget:
    """Reserva antes de enviar; si la reserva no cabe, la llamada no sale."""

    def __init__(self, max_usd: float, gastado: float = 0.0):
        self.max_usd, self.gastado, self.reservado = max_usd, gastado, 0.0
        self.lock = threading.Lock()

    def reservar(self, usd: float) -> None:
        with self.lock:
            if self.gastado + self.reservado + usd > self.max_usd:
                raise BudgetExceeded(f"{self.gastado + self.reservado + usd:.6f} > {self.max_usd}")
            self.reservado += usd

    def liquidar(self, reservado: float, real: float) -> None:
        with self.lock:
            self.reservado -= reservado
            self.gastado += real


def clave(caso: dict, qs_hash: str) -> str:
    payload = json.dumps([caso["entrada"]["id"], MODEL, qs_hash, caso.get("condicion"),
                          jev.estado(caso["entrada"], caso.get("condicion"))], ensure_ascii=False, sort_keys=True)
    return hashlib.sha256(payload.encode()).hexdigest()


def estimar_usd(body: dict) -> float:
    # Cota superior holgada: un token por cada dos caracteres del cuerpo.
    return len(json.dumps(body, ensure_ascii=False)) / 2 * USD_POR_TOKEN


def http_send(body: dict, key: str, timeout: float = 60) -> tuple[int, dict]:
    req = urllib.request.Request(API, data=json.dumps(body).encode(), method="POST", headers={
        "Authorization": f"Bearer {key}", "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as response:
            return response.status, json.load(response)
    except urllib.error.HTTPError as exc:
        try:
            return exc.code, json.load(exc)
        except Exception:
            return exc.code, {}


def call(caso: dict, qs: dict, send, budget: Budget, retries: int = 4, sleep=time.sleep) -> dict:
    body = {"state": jev.estado(caso["entrada"], caso.get("condicion")), "model": MODEL, "questions": qs}
    reserva = estimar_usd(body)
    budget.reservar(reserva)
    real, intento = 0.0, 0
    try:
        while True:
            intento += 1
            status, data = send(body)
            if status in (429, 500, 502, 503, 529) and intento <= retries:
                sleep(2 ** intento)
                continue
            if status != 200:
                return {"ok": False, "error": f"HTTP {status}", "detalle": data, "intentos": intento}
            tokens = (data.get("usage") or {}).get("input_tokens")
            real = (tokens or 0) * USD_POR_TOKEN
            respuestas = {q: data.get(q) or (data.get("answers") or {}).get(q) for q in qs}
            faltan = [q for q, v in respuestas.items() if not v]
            if faltan or tokens is None:
                return {"ok": False, "error": "respuesta incompleta", "faltan": faltan, "detalle": data,
                        "intentos": intento}
            return {"ok": True, "modelo": data.get("model"), "tokens_entrada": tokens, "usd": real,
                    "respuestas": respuestas, "intentos": intento}
    finally:
        budget.liquidar(reserva, real)


def casos_piloto(n_desarrollo: int, seed: int = 20261005) -> tuple[list[dict], list[dict]]:
    casos, rechazados = [], []
    for par in load_jsonl(EXPERIMENTS / "pairs.jsonl"):
        for lado in "ab":
            item = par[lado]
            caso = {"origen": "par", "par": par["par"], "lado": lado, "entrada": item["entrada"],
                    "condicion": item.get("condicion"), "esperado": item["esperado"]}
            errores = valida_entrada(item["entrada"])
            (rechazados if errores else casos).append({**caso, "errores_entrada": errores})
    for row in load_jsonl(EXPERIMENTS / "regression_candidatos.jsonl"):
        entrada = {k: row[k] for k in ("id", "fecha", "texto")}
        casos.append({"origen": "control", "entrada": entrada, "esperado": row["esperado"]})
    desarrollo = load_jsonl(EXPERIMENTS / "development.jsonl")
    for row in random.Random(f"{seed}:piloto").sample(desarrollo, n_desarrollo):
        casos.append({"origen": "desarrollo", "entrada": row})
    for caso in casos:
        errores = valida_entrada(caso["entrada"])
        if errores:
            raise ValueError(f"Entrada inválida {caso['entrada']['id']}: {errores}")
    return casos, rechazados


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--desarrollo", type=int, default=29)
    parser.add_argument("--max-usd", type=float, default=0.10)
    parser.add_argument("--workers", type=int, default=8)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    out = guard_output(args.out)
    out.mkdir(parents=True, exist_ok=True)
    resultados = out / "resultados.jsonl"
    casos, rechazados = casos_piloto(args.desarrollo)
    qs, qs_inverso = jev.preguntas(), jev.preguntas(inverso=True)
    hechos = {}
    if resultados.exists():
        for row in load_jsonl(resultados):
            if row["resultado"]["ok"]:
                hechos[row["clave"]] = row
    budget = Budget(args.max_usd, sum(r["resultado"]["usd"] for r in hechos.values()))

    def preguntas_de(caso):
        inverso = (caso.get("condicion") or {}).get("orden_opciones") == "inverso"
        return qs_inverso if inverso else qs

    pendientes = [c for c in casos if clave(c, jev.huella_preguntas(preguntas_de(c))) not in hechos]
    resumen = {"casos": len(casos), "rechazados_por_contrato": [r["entrada"]["id"] for r in rechazados],
               "ya_hechos": len(hechos), "pendientes": len(pendientes), "max_usd": args.max_usd,
               "estimacion_usd": round(sum(estimar_usd({"state": jev.estado(c["entrada"], c.get("condicion")),
                                                        "model": MODEL, "questions": preguntas_de(c)})
                                           for c in pendientes), 6)}
    print(json.dumps(resumen, ensure_ascii=False), flush=True)
    (out / "plan.json").write_text(json.dumps({**resumen, "rubrica": jev.RUBRICA, "modelo_pedido": MODEL,
                                               "huella_preguntas": jev.huella_preguntas(qs),
                                               "huella_preguntas_inverso": jev.huella_preguntas(qs_inverso),
                                               "preguntas": qs}, ensure_ascii=False, indent=2) + "\n")
    if args.dry_run or not pendientes:
        return

    env = Path("~/.config/api-keys/.env").expanduser().read_text().splitlines()
    key = next(l.split("=", 1)[1].strip().strip('"') for l in env if l.startswith("TYPESAFE_API_KEY="))
    lock = threading.Lock()

    def trabajo(caso):
        q = preguntas_de(caso)
        try:
            resultado = call(caso, q, lambda body: http_send(body, key), budget)
        except BudgetExceeded as exc:
            resultado = {"ok": False, "error": f"presupuesto: {exc}"}
        row = {"clave": clave(caso, jev.huella_preguntas(q)), "caso": caso,
               "huella_preguntas": jev.huella_preguntas(q), "resultado": resultado,
               "en": time.strftime("%Y-%m-%dT%H:%M:%S")}
        if resultado["ok"]:
            row["salida"] = jev.a_contrato(resultado["respuestas"])
        with lock, resultados.open("a") as output:
            output.write(json.dumps(row, ensure_ascii=False) + "\n")
        return resultado

    inicio = time.time()
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        finales = list(pool.map(trabajo, pendientes))
    modelos = sorted({r.get("modelo") for r in finales if r["ok"]})
    final = {"enviados": len(finales), "ok": sum(r["ok"] for r in finales),
             "errores": [r["error"] for r in finales if not r["ok"]], "modelos": modelos,
             "tokens_entrada": sum(r.get("tokens_entrada", 0) for r in finales),
             "usd_total": round(budget.gastado, 6), "segundos": round(time.time() - inicio, 1)}
    (out / "coste.json").write_text(json.dumps(final, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps(final, ensure_ascii=False), flush=True)


if __name__ == "__main__":
    main()
