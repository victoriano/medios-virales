#!/usr/bin/env python3
"""Invariantes de los datos estáticos combinados del sitio."""
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "site" / "data"
EXPECTED_PERIODS = ["todo", "xv", *map(str, range(2018, 2027))]
EXPECTED_TOTALS = {
    "muestreados": 607_571,
    "clasificados": 157_659,
    "gate_no": 449_912,
}


class SiteDataTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.index = json.loads((DATA / "index.json").read_text())
        cls.polarizacion = json.loads((DATA / "polarizacion.json").read_text())

    def test_combined_totals_and_range(self):
        totals = self.index["totales"]
        for key, expected in EXPECTED_TOTALS.items():
            self.assertEqual(totals[key], expected, key)
        self.assertEqual(self.index["ventana"]["desde"][:10], "2018-05-02")
        self.assertEqual(self.index["ventana"]["hasta"][:10], "2026-09-24")
        self.assertEqual(
            totals["coste_clasificacion_usd"],
            (0.0 + 52.836766 + 0.127702) + (0.0 + 28.794637 + 0.602315) + (1.16287 + 0.031478),
        )
        self.assertEqual(totals["coste_descarga_usd"], (57.85245 + 0.13065) + (33.0213 + 0.57465))
        self.assertEqual(self.index["revision_contextual"]["candidatos"], 3_813 + 88)
        self.assertEqual(self.index["revision_contextual"]["cambios"], 601 + 11)
        self.assertEqual(self.index["revision_contextual"]["coste_usd"], 1.16287 + 0.031478)

    def test_party_data_adds_up_to_left_and_right(self):
        """partidos.json reparte por partido exactamente los mismos tuits que polarizacion.json."""
        partidos = json.loads((DATA / "partidos.json").read_text())
        self.assertEqual(list(partidos["periodos"]), EXPECTED_PERIODS)
        for clave in EXPECTED_PERIODS:
            por_handle = {r["h"].lower(): r for r in partidos["periodos"][clave]["medios"]}
            for medio in self.polarizacion["periodos"][clave]["medios"]:
                fila = por_handle[medio["handle"].lower()]
                for i, serie in enumerate(("publicado", "viral")):
                    izq = fila["PSOE"][i][0] + fila["Sumar"][i][0] + fila["PP"][i][1] + fila["Vox"][i][1]
                    der = fila["PSOE"][i][1] + fila["Sumar"][i][1] + fila["PP"][i][0] + fila["Vox"][i][0]
                    self.assertEqual((izq, der), (medio[serie]["izq"], medio[serie]["der"]),
                                     f"{clave} {medio['handle']} {serie}")
                    lados = fila["lados"][i]
                    self.assertEqual((lados[0], lados[1]), (izq, der), f"{clave} {medio['handle']} {serie}")
                    self.assertEqual(lados[2], medio[serie]["rt_mediana"], f"{clave} {medio['handle']} {serie}")

    def test_periods_cover_full_series_xv_and_each_year(self):
        self.assertEqual(list(self.polarizacion["periodos"]), EXPECTED_PERIODS)
        full = self.polarizacion["periodos"]["todo"]
        xv = self.polarizacion["periodos"]["xv"]
        self.assertEqual(full["desde"], "2018-05-02")
        self.assertEqual(full["hasta"], "2026-09-24")
        self.assertEqual(xv["desde"], "2023-08-17")
        self.assertEqual(xv["hasta"], "2026-09-24")

    def test_global_inclusion_fields_are_consistent(self):
        for medium in self.index["medios"]:
            self.assertEqual(
                medium["incluido"], medium["izq"] + medium["der"] > 50,
                medium["handle"],
            )
            expected = (
                100 * medium["politicos"] / medium["muestreados"]
                if medium["muestreados"] else 0
            )
            self.assertAlmostEqual(medium["pct_politicos"], expected, places=6)

    def test_every_medium_has_a_known_type(self):
        tipos = self.index["tipos"]
        manual = json.loads((ROOT / "data" / "tipos_medio.json").read_text())
        self.assertEqual(tipos, manual["tipos"])
        por_handle = {h.lower(): t for h, t in manual["medios"].items()}
        for medium in self.index["medios"]:
            self.assertIn(medium.get("tipo"), tipos, medium["handle"])
            self.assertEqual(medium["tipo"], por_handle[medium["handle"].lower()], medium["handle"])

    def test_detail_is_partitioned_and_complete(self):
        total = 0
        for medium in self.index["medios"]:
            manifest_path = DATA / medium["archivo"]
            self.assertEqual(manifest_path.name, "index.json", medium["handle"])
            manifest = json.loads(manifest_path.read_text())
            self.assertEqual(manifest["handle"], medium["handle"])
            self.assertEqual(sum(x["tuits"] for x in manifest["particiones"]), medium["muestreados"])
            years = [x["year"] for x in manifest["particiones"]]
            self.assertEqual(years, sorted(years))
            count = 0
            for part in manifest["particiones"]:
                part_path = manifest_path.parent / part["archivo"]
                payload = json.loads(part_path.read_text())
                tweets = payload["tweets"]
                self.assertEqual(len(tweets), part["tuits"])
                self.assertTrue(all(t["f"].startswith(str(part["year"])) for t in tweets))
                count += len(tweets)
            self.assertEqual(count, medium["muestreados"])
            total += count
        self.assertEqual(total, EXPECTED_TOTALS["muestreados"])
        self.assertFalse(any((DATA / "medios").glob("*.json")))

    def test_map_metrics_expose_absolute_counts_and_median_retweets(self):
        """El eje Y usa con_lado (número absoluto) y el tamaño usa rt_mediana (mediana de retuits)."""
        for period in self.polarizacion["periodos"].values():
            for medium in period["medios"]:
                for series in ("publicado", "viral"):
                    metric = medium[series]
                    with self.subTest(handle=medium["handle"], series=series):
                        self.assertIn("con_lado", metric)
                        self.assertIn("rt_mediana", metric)
                        self.assertIn("tuits", metric)
                        self.assertLessEqual(metric["con_lado"], metric["tuits"])
                        self.assertGreaterEqual(metric["con_lado"], 0)
                        self.assertGreaterEqual(metric["rt_mediana"], 0)
                        self.assertIsInstance(metric["rt_mediana"], (int, float))
                        # El subconjunto de 100 RT o más nunca puede tener una mediana inferior a 100 cuando hay muestra.
                        if series == "viral" and metric["con_lado"] > 0:
                            self.assertGreaterEqual(metric["rt_mediana"], 100)
                        self.assertEqual(
                            metric["porcentaje_con_lado"],
                            round(100 * metric["con_lado"] / metric["tuits"], 6)
                            if metric["tuits"] else 0,
                        )

    def test_polarizacion_metadata_describes_new_axes(self):
        """La metodología documenta el nuevo eje Y y el tamaño por mediana de retuits."""
        metrica = self.polarizacion.get("metrica", "")
        for esperado in ("número de tuits con lado claro", "mediana de retuits"):
            self.assertIn(esperado, metrica, metrica)


if __name__ == "__main__":
    unittest.main(verbosity=2)
