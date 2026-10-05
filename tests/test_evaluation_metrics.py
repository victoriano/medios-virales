"""Tarea 5 del plan: la comprobación de pares mínimos detecta los fallos conocidos de un fixture."""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))

from evaluation.evaluate import evalua_par  # noqa: E402


def salida(partido="PSOE", direccion="perjudica", voz="cargo_politico"):
    return {"partido_objetivo": partido, "direccion_mensaje": direccion, "voz": voz,
            "encuadre_medio": "atribucion_descriptiva", "evidencia_suficiente": True}


class PairMetricsTest(unittest.TestCase):
    def test_expected_values_pass(self):
        lados = {"a": ({"partido_objetivo": "PSOE"}, salida()),
                 "b": ({"direccion_mensaje": {"no": ["beneficia"]}}, salida())}
        self.assertEqual(evalua_par(1, lados, True), [])

    def test_wrong_value_is_reported_once(self):
        lados = {"a": ({"partido_objetivo": "PP"}, salida()), "b": ({}, salida())}
        fallos = evalua_par(1, lados, True)
        self.assertEqual([(f["lado"], f["campo"], f["obtenido"]) for f in fallos], [("a", "partido_objetivo", "PSOE")])

    def test_equality_pair_reports_difference_once(self):
        lados = {"a": ({"igual_que": "b"}, salida()), "b": ({"igual_que": "a"}, salida(direccion="neutro"))}
        self.assertEqual(len(evalua_par(1, lados, False)), 1)

    def test_rejected_input_is_checked(self):
        lados = {"a": ({"entrada_rechazada": False}, salida()), "b": ({"entrada_rechazada": True}, None)}
        self.assertEqual(evalua_par(13, lados, True), [])
        lados["b"] = ({"entrada_rechazada": True}, salida())
        self.assertEqual(len(evalua_par(13, lados, True)), 1)


if __name__ == "__main__":
    unittest.main()
