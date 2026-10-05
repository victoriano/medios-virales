"""Tarea 4 del plan: el runner falla de forma segura sin red. Las respuestas son fixtures."""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))

from evaluation import jev, run  # noqa: E402

CASO = {"entrada": {"id": "1", "fecha": "2024-01-15", "texto": "Feijóo: «Sánchez es el peor presidente»"}}


def respuesta(eleccion="PSOE|perjudica", politica=0.97, suficiente=0.9, modelo="jev-1.13.0"):
    return {"model": modelo, "usage": {"input_tokens": 1500, "output_tokens": 40}, "answers": {
        "politica": {"type": "noul", "noul": politica},
        "objetivo_direccion": {"type": "choice", "choice": eleccion, "confidence": 0.8, "probabilities": {}},
        "voz": {"type": "choice", "choice": "cargo_politico"},
        "encuadre_medio": {"type": "choice", "choice": "atribucion_descriptiva"},
        "evidencia_suficiente": {"type": "noul", "noul": suficiente},
        "instruccion_hostil": {"type": "noul", "noul": 0.01}}}


class RunnerTest(unittest.TestCase):
    def setUp(self):
        self.qs = jev.preguntas()

    def test_429_is_retried_then_succeeds(self):
        estados = iter([(429, {}), (200, respuesta())])
        r = run.call(CASO, self.qs, lambda body: next(estados), run.Budget(1), sleep=lambda s: None)
        self.assertTrue(r["ok"])
        self.assertEqual(r["intentos"], 2)
        self.assertEqual(r["modelo"], "jev-1.13.0")

    def test_partial_response_is_an_error_not_a_label(self):
        parcial = respuesta()
        del parcial["answers"]["voz"]
        r = run.call(CASO, self.qs, lambda body: (200, parcial), run.Budget(1))
        self.assertFalse(r["ok"])
        self.assertEqual(r["faltan"], ["voz"])

    def test_http_error_is_not_neutral(self):
        r = run.call(CASO, self.qs, lambda body: (400, {"error": "x"}), run.Budget(1), sleep=lambda s: None)
        self.assertFalse(r["ok"])
        self.assertNotIn("respuestas", r)

    def test_budget_is_reserved_before_sending(self):
        enviados = []
        with self.assertRaises(run.BudgetExceeded):
            run.call(CASO, self.qs, lambda body: enviados.append(body) or (200, respuesta()), run.Budget(1e-9))
        self.assertEqual(enviados, [])

    def test_budget_settles_with_real_usage(self):
        budget = run.Budget(1)
        run.call(CASO, self.qs, lambda body: (200, respuesta()), budget)
        self.assertAlmostEqual(budget.gastado, 1500 * run.USD_POR_TOKEN)
        self.assertAlmostEqual(budget.reservado, 0)

    def test_cache_key_changes_with_questions_condition_and_text(self):
        base = run.clave(CASO, jev.huella_preguntas(self.qs))
        self.assertNotEqual(base, run.clave(CASO, jev.huella_preguntas(jev.preguntas(inverso=True))))
        self.assertNotEqual(base, run.clave({**CASO, "condicion": {"medio_enviado": "x"}}, jev.huella_preguntas(self.qs)))
        otro = {"entrada": {**CASO["entrada"], "texto": "otro"}}
        self.assertNotEqual(base, run.clave(otro, jev.huella_preguntas(self.qs)))

    def test_outlet_is_only_sent_under_explicit_condition(self):
        self.assertNotIn("medio", jev.estado(CASO["entrada"]))
        self.assertEqual(jev.estado(CASO["entrada"], {"medio_enviado": "x"})["medio"], "x")

    def test_mapping_to_contract(self):
        salida = jev.a_contrato(respuesta()["answers"])
        self.assertEqual((salida["partido_objetivo"], salida["direccion_mensaje"]), ("PSOE", "perjudica"))
        self.assertEqual(salida["incoherencias"], [])
        no_pol = jev.a_contrato(respuesta(politica=0.1)["answers"])
        self.assertEqual((no_pol["politica"], no_pol["direccion_mensaje"]), (False, "no_aplica"))
        indet = jev.a_contrato(respuesta(eleccion="indeterminado")["answers"])
        self.assertEqual((indet["direccion_mensaje"], indet["evidencia_suficiente"]), ("indeterminado", False))

    def test_incoherence_is_recorded_not_hidden(self):
        salida = jev.a_contrato(respuesta(suficiente=0.2)["answers"])
        self.assertEqual(salida["direccion_mensaje"], "perjudica")
        self.assertTrue(salida["incoherencias"])

    def test_pilot_has_100_calls_and_rejects_the_posterior_context(self):
        casos, rechazados = run.casos_piloto(29)
        self.assertEqual(len(casos), 100)
        self.assertEqual([r["entrada"]["id"] for r in rechazados], ["p13b"])
        self.assertEqual(len({c["entrada"]["id"] + str(c.get("condicion")) for c in casos}), 100)


if __name__ == "__main__":
    unittest.main()
