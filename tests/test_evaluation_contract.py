"""Tarea 2 del plan: el contrato distingue desconocimiento, neutralidad y postura."""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))

from evaluation import contract as c  # noqa: E402

ENTRADA = {"id": "1", "fecha": "2021-03-10",
           "texto": "La oposición acusa al Gobierno de ocultar el informe sobre las residencias"}
HECHO = {"id": "h1", "afirmacion": "Pedro Sánchez preside el Gobierno de España (PSOE).",
         "fecha_hecho": "2018-06-02", "fecha_fuente": "2018-06-02", "fuente": "BOE"}


def salida(**cambios):
    base = {"politica": True, "entidades": [{"nombre": "Gobierno de España", "partido": "PSOE",
                                             "vigencia_desde": "2018-06-02"}],
            "partido_objetivo": "PSOE", "direccion_mensaje": "perjudica", "voz": "otra_fuente",
            "encuadre_medio": "atribucion_descriptiva",
            "evidencia": [{"tipo": "texto", "fragmento": "acusa al Gobierno de ocultar"}],
            "evidencia_suficiente": True}
    base.update(cambios)
    return base


class InputContractTest(unittest.TestCase):
    def test_valid_input_passes(self):
        self.assertEqual(c.valida_entrada({**ENTRADA, "contexto": [HECHO]}), [])

    def test_missing_date_fails(self):
        errores = c.valida_entrada({"id": "1", "texto": "hola"})
        self.assertTrue(any("fecha" in e for e in errores))

    def test_non_iso_date_fails(self):
        self.assertTrue(c.valida_entrada({**ENTRADA, "fecha": "Wed Mar 10 08:00:00 +0000 2021"}))

    def test_truncated_text_without_notice_fails(self):
        errores = c.valida_entrada({**ENTRADA, "texto_chars_original": 900})
        self.assertTrue(any("truncado" in e for e in errores))
        self.assertEqual(c.valida_entrada({**ENTRADA, "texto_chars_original": 900, "aviso_truncado": True}), [])

    def test_outlet_and_virality_are_not_sent_by_default(self):
        errores = c.valida_entrada({**ENTRADA, "handle": "@medio", "retweets": 120})
        self.assertTrue(any("no permitidos" in e for e in errores))

    def test_context_after_the_tweet_is_rejected(self):
        posterior = {**HECHO, "id": "h2", "fecha_hecho": "2022-01-01", "fecha_fuente": "2022-01-01"}
        errores = c.valida_entrada({**ENTRADA, "contexto": [posterior]})
        self.assertTrue(any("posterior al tuit" in e for e in errores))

    def test_later_source_needs_explicit_flag(self):
        tardia = {**HECHO, "fecha_fuente": "2024-05-01"}
        self.assertTrue(c.valida_entrada({**ENTRADA, "contexto": [tardia]}))
        tardia["documenta_hecho_vigente"] = True
        self.assertEqual(c.valida_entrada({**ENTRADA, "contexto": [tardia]}), [])

    def test_context_cannot_carry_the_answer(self):
        trampa = {**HECHO, "orientacion_medio": "derecha"}
        errores = c.valida_entrada({**ENTRADA, "contexto": [trampa]})
        self.assertTrue(any("respuesta como contexto" in e for e in errores))


class OutputContractTest(unittest.TestCase):
    def test_valid_output_passes(self):
        self.assertEqual(c.valida_salida(salida(), ENTRADA), [])

    def test_invented_evidence_fails(self):
        errores = c.valida_salida(salida(evidencia=[{"tipo": "texto", "fragmento": "dimite el ministro"}]), ENTRADA)
        self.assertTrue(any("no está en el tuit" in e for e in errores))

    def test_evidence_pointing_to_missing_context_fails(self):
        errores = c.valida_salida(salida(evidencia=[{"tipo": "contexto", "id": "h9"}]), ENTRADA)
        self.assertTrue(any("no existe" in e for e in errores))

    def test_signal_without_evidence_fails(self):
        self.assertTrue(c.valida_salida(salida(evidencia=[]), ENTRADA))

    def test_incompatible_party_and_direction_fail(self):
        for partido, direccion in (("ninguno", "perjudica"), ("indeterminado", "beneficia"),
                                   ("ninguno", "mixto"), ("indeterminado", "neutro")):
            with self.subTest(partido=partido, direccion=direccion):
                self.assertTrue(c.valida_salida(salida(partido_objetivo=partido, direccion_mensaje=direccion), ENTRADA))

    def test_non_political_is_not_neutral(self):
        self.assertTrue(c.valida_salida(salida(politica=False, partido_objetivo="ninguno",
                                               direccion_mensaje="neutro", evidencia=[]), ENTRADA))
        self.assertEqual(c.valida_salida(salida(politica=False, partido_objetivo="ninguno",
                                                direccion_mensaje="no_aplica", evidencia=[]), ENTRADA), [])

    def test_insufficient_evidence_means_undetermined_not_neutral(self):
        self.assertTrue(c.valida_salida(salida(direccion_mensaje="neutro", evidencia_suficiente=False), ENTRADA))
        self.assertEqual(c.valida_salida(salida(direccion_mensaje="indeterminado", evidencia=[],
                                                evidencia_suficiente=False), ENTRADA), [])

    def test_affiliation_must_be_valid_on_the_tweet_date(self):
        futura = [{"nombre": "Ministra X", "partido": "Sumar", "vigencia_desde": "2023-11-21"}]
        self.assertTrue(c.valida_salida(salida(entidades=futura), ENTRADA))
        pasada = [{"nombre": "Ministro Y", "partido": "PP", "vigencia_desde": "2011-12-22",
                   "vigencia_hasta": "2018-06-01"}]
        self.assertTrue(c.valida_salida(salida(entidades=pasada), ENTRADA))

    def test_unknown_vocabulary_fails(self):
        self.assertTrue(c.valida_salida(salida(voz="medio"), ENTRADA))
        self.assertTrue(c.valida_salida(salida(partido_objetivo="Psoe"), ENTRADA))

    def test_reference_party_keeps_podemos_separate(self):
        self.assertEqual(c.partido_referencia("Psoe", True), "PSOE")
        self.assertEqual(c.partido_referencia("Podemos", True), "Podemos")
        self.assertEqual(c.partido_referencia("Ciudadanos", True), "otro")
        self.assertEqual(c.partido_referencia("", False), "ninguno")


if __name__ == "__main__":
    unittest.main()
