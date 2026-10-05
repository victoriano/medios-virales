"""Prueba 0 del plan: la referencia congelada no se puede pisar y la copia es fiel."""
import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))

from evaluation import baseline  # noqa: E402


def write(path: Path, rows):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("".join(json.dumps(r) + "\n" for r in rows))


class BaselineTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        root = Path(self.tmp.name)
        self.a = root / "fuente" / "a.jsonl"
        self.b = root / "fuente" / "b.jsonl"
        write(self.a, [{"id": "1", "politica": True}, {"id": "2", "politica": False}])
        write(self.b, [{"id": "3", "politica": True, "revision_contextual": {}}])
        (root / "sitio" / "medios").mkdir(parents=True)
        (root / "sitio" / "index.json").write_text("{}")
        (root / "sitio" / "medios" / "x.json").write_text("[]")
        self.root = root
        self.labels = {"a": self.a, "b": self.b}
        self.sources = {**self.labels, "sitio": root / "sitio"}

    def tearDown(self):
        self.tmp.cleanup()

    def test_output_equal_to_a_source_is_rejected(self):
        with self.assertRaises(baseline.UnsafeOutput):
            baseline.guard_output(self.a, self.sources.values(), protected=())

    def test_output_inside_a_source_directory_is_rejected(self):
        with self.assertRaises(baseline.UnsafeOutput):
            baseline.guard_output(self.root / "sitio" / "nuevo", self.sources.values(), protected=())

    def test_output_inside_production_is_rejected(self):
        with self.assertRaises(baseline.UnsafeOutput):
            baseline.guard_output(Path("/srv/medios/experimento"), [])

    def test_freeze_copies_hashes_and_counts_universe(self):
        out = self.root / "congelado"
        manifest = baseline.freeze(out, self.sources, self.labels, protected=())
        self.assertEqual(manifest["universo"]["ids_unicos"], 3)
        self.assertEqual(manifest["universo"]["ids_repetidos_entre_fuentes"], 0)
        self.assertEqual(manifest["universo"]["por_fuente"]["b"]["con_revision_contextual"], 1)
        copied = out / "a" / "a.jsonl"
        self.assertEqual(baseline.sha256(copied), baseline.sha256(self.a))
        self.assertNotEqual(copied.stat().st_ino, self.a.stat().st_ino, "no debe ser enlace duro")
        self.assertEqual(manifest["fuentes"]["sitio"]["ficheros"], 2)

    def test_freeze_never_replaces_an_existing_snapshot(self):
        out = self.root / "congelado"
        baseline.freeze(out, self.sources, self.labels, protected=())
        with self.assertRaises(FileExistsError):
            baseline.freeze(out, self.sources, self.labels, protected=())

    def test_duplicate_ids_between_sources_are_reported(self):
        write(self.b, [{"id": "1", "politica": True}])
        summary = baseline.universe(self.labels)
        self.assertEqual(summary["ids_repetidos_entre_fuentes"], 1)
        self.assertEqual(summary["ids_unicos"], 2)


if __name__ == "__main__":
    unittest.main()
