"""Tarea 3 del plan: IDs únicos, conjuntos disjuntos, cuotas honestas y pesos coherentes."""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))

from evaluation import sample as s  # noqa: E402


def fila(i, fecha, politica=True, partido="Psoe", direccion="perjudica", handle="@a"):
    return {"id": str(i), "fecha": fecha, "politica": politica, "partido": partido if politica else "",
            "direccion": direccion if politica else "", "handle": handle, "url": f"u{i}", "retweets": 0}


def corpus():
    rows, i = [], 0
    for fecha in ("2018-06-01", "2021-01-01", "2024-01-01"):
        for _ in range(15):
            i += 1
            rows.append(fila(i, fecha, politica=False))
        for partido in ("Psoe", "Pp", "Vox", "Sumar"):
            for direccion in ("beneficia", "perjudica", "neutro"):
                for _ in range(8):
                    i += 1
                    rows.append(fila(i, fecha, partido=partido, direccion=direccion, handle=f"@m{i % 5}"))
        for _ in range(25):
            i += 1
            rows.append(fila(i, fecha, partido="Varios", direccion="perjudica"))
    return rows


class SamplingTest(unittest.TestCase):
    def setUp(self):
        self.rows = s.unique_by_id(corpus())
        self.textos = {t: f"texto distinto {t} https://t.co/{t}" for t in self.rows}

    def test_repeated_ids_are_rejected(self):
        with self.assertRaises(s.SamplingError):
            s.unique_by_id([fila(1, "2020-01-01"), fila(1, "2020-01-01")])

    def test_sets_must_be_disjoint(self):
        with self.assertRaises(s.SamplingError):
            s.check_disjoint(examen=["1", "2"], desarrollo=["2", "3"])
        with self.assertRaises(s.SamplingError):
            s.check_disjoint(examen=["1", "1"])
        s.check_disjoint(examen=["1"], desarrollo=["2"])

    def test_strata_are_exhaustive_and_exclusive(self):
        self.assertEqual(s.estrato(fila(1, "2020-01-01", politica=False)), "no_politico")
        self.assertEqual(s.estrato(fila(1, "2020-01-01", direccion="beneficia")), "concreto_beneficia")
        self.assertEqual(s.estrato(fila(1, "2020-01-01", partido="Varios")), "resto_politico")
        self.assertEqual(s.estrato(fila(1, "2020-01-01", direccion="neutro")), "resto_politico")

    def test_holdout_weights_add_up_to_the_population(self):
        examen, diseno = s.stratified_holdout(self.rows, 20, seed=1)
        self.assertEqual(len(diseno), 12)
        self.assertAlmostEqual(sum(e["peso"] for e in examen), len(self.rows))
        for celda in diseno:
            if celda["n"]:
                self.assertAlmostEqual(celda["probabilidad_inclusion"] * celda["peso"], 1.0)

    def test_short_strata_are_reported_not_padded(self):
        examen, diseno = s.stratified_holdout(self.rows, 20, seed=1)
        cortos = [d for d in diseno if d["cuota_incompleta"]]
        self.assertEqual({d["estrato"] for d in cortos}, {"no_politico"})
        self.assertTrue(all(d["n"] == 15 for d in cortos), "no_politico tiene 15 por época y debe quedar incompleto")
        self.assertEqual(len({e["id"] for e in examen}), len(examen))

    def test_holdout_is_deterministic(self):
        a, _ = s.stratified_holdout(self.rows, 20, seed=7)
        b, _ = s.stratified_holdout(self.rows, 20, seed=7)
        self.assertEqual(a, b)

    def test_development_excludes_holdout_and_its_duplicates(self):
        examen, _ = s.stratified_holdout(self.rows, 20, seed=1)
        ids = {e["id"] for e in examen}
        gemelo = next(t for t in self.rows if t not in ids and self.rows[t]["politica"]
                      and s.partido(self.rows[t]) == "PSOE")
        un_examen = next(iter(ids))
        self.textos[gemelo] = self.textos[un_examen].split(" https")[0] + "   https://t.co/otro"
        huellas = {s.huella(self.textos[t]) for t in ids}
        desarrollo, cuotas = s.balanced_cells(self.rows, ids, huellas, self.textos, 10, 1, "d")
        elegidos = {d["id"] for d in desarrollo}
        self.assertFalse(elegidos & ids)
        self.assertNotIn(gemelo, elegidos)
        self.assertEqual(len(cuotas), 12)

    def test_development_quotas_cover_epochs(self):
        desarrollo, cuotas = s.balanced_cells(self.rows, set(), set(), self.textos, 10, 1, "d")
        for cuota in cuotas:
            self.assertEqual(cuota["elegidos"], 10)
            self.assertEqual(len(cuota["epocas"]), 3)

    def test_impossible_quota_is_recorded(self):
        _, cuotas = s.balanced_cells(self.rows, set(), set(), self.textos, 30, 1, "d")
        self.assertTrue(all(c["cuota_incompleta"] and c["elegidos"] == 24 for c in cuotas))


if __name__ == "__main__":
    unittest.main()
