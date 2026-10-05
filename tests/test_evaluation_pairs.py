"""Prueba 2 del plan: los 24 pares mínimos son coherentes con el contrato antes de usarlos."""
import json
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from evaluation import contract as c  # noqa: E402

PAIRS = ROOT / "experiments" / "direction_vnext" / "pairs.jsonl"
VOCAB = {"partido_objetivo": c.PARTIDO_OBJETIVO, "direccion_mensaje": c.DIRECCION,
         "voz": c.VOZ, "encuadre_medio": c.ENCUADRE}


def valores(spec):
    if isinstance(spec, dict):
        return spec.get("en", []) + spec.get("no", [])
    return [spec]


class PairsTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pares = [json.loads(line) for line in PAIRS.read_text().splitlines() if line.strip()]

    def test_there_are_24_pairs_and_48_unique_entries(self):
        self.assertEqual([p["par"] for p in self.pares], list(range(1, 25)))
        ids = [p[lado]["entrada"]["id"] for p in self.pares for lado in "ab"]
        self.assertEqual(len(ids), 48)
        self.assertEqual(len(set(ids)), 48)
        self.assertTrue(all(p["sintetico"] for p in self.pares))

    def test_inputs_follow_the_contract_unless_rejection_is_expected(self):
        for p in self.pares:
            for lado in "ab":
                with self.subTest(par=p["par"], lado=lado):
                    errores = c.valida_entrada(p[lado]["entrada"])
                    rechazo = p[lado]["esperado"].get("entrada_rechazada", False)
                    self.assertEqual(bool(errores), rechazo, errores)

    def test_expectations_use_the_contract_vocabulary(self):
        for p in self.pares:
            for lado in "ab":
                for campo, spec in p[lado]["esperado"].items():
                    if campo in VOCAB:
                        for valor in valores(spec):
                            self.assertIn(valor, VOCAB[campo], (p["par"], lado, campo))

    def test_expected_party_and_direction_are_a_valid_pair(self):
        for p in self.pares:
            for lado in "ab":
                esperado = p[lado]["esperado"]
                partido, direccion = esperado.get("partido_objetivo"), esperado.get("direccion_mensaje")
                if isinstance(partido, str) and isinstance(direccion, str):
                    suficiente = esperado.get("evidencia_suficiente", direccion != "indeterminado")
                    self.assertEqual(c.valida_par(True, partido, direccion, suficiente), [], (p["par"], lado))

    def test_critical_invariants_are_marked(self):
        criticos = {p["par"] for p in self.pares if p["critica"]}
        # fecha (7, 13), objetivo (5, 9), simetría (4), identidad y evidencia ausente (6, 12, 19),
        # seguridad (23) y recorte (24)
        self.assertEqual(criticos, {4, 5, 6, 7, 9, 12, 13, 19, 23, 24})

    def test_truncation_pair_really_differs_after_char_400(self):
        p24 = self.pares[23]
        completo, recortado = p24["a"]["entrada"]["texto"], p24["b"]["entrada"]["texto"]
        self.assertGreater(len(completo), 400)
        self.assertEqual(recortado, completo[:400])
        self.assertIn("dimisión", completo[400:])


if __name__ == "__main__":
    unittest.main()
