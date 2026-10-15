import copy
import json
import unittest

from tools.visual_catalog import project, project_mod


class VisualCatalogTests(unittest.TestCase):
    def mod(self):
        return {"p": 81, "w": [1, 9], "planes": 2, "mech": "B",
                "prods": [[0, 0, None], [0, 1, 1], [1, 0, 1]]}

    def test_unknown_coefficients_holes_and_groups_remain_unknown(self):
        result = project_mod(self.mod(), "a" * 64)
        self.assertEqual(result["planes"]["A"], [[1, 0], [0, 1]])
        self.assertEqual(result["holes"], {"count": None, "share": None})
        self.assertIsNone(result["products"][0]["group"])
        self.assertTrue(all(p["numerator"] is None for p in result["products"]))

    def test_id_excludes_accumulators_source_and_saved_measurements(self):
        mod = self.mod()
        first = project_mod(mod, "a" * 64)
        other = copy.deepcopy(mod)
        other.update(holes=0, carry=10, set_json="private", measured={"time": 999})
        other["prods"][0][2] = 2
        second = project_mod(other, "b" * 64)
        self.assertEqual(first["id"], second["id"])
        self.assertEqual(second["holes"]["count"], 0)
        self.assertTrue(second["carry"])
        other["w"] = [1, 18]
        self.assertNotEqual(first["id"], project_mod(other, "a" * 64)["id"])

    def test_explicit_faces_and_coefficients_are_copied(self):
        mod = self.mod()
        mod.update(faces_a=[[1, 0], [0, 1]], faces_b=[[1, 0], [0, 1]], rho=["1", "9", "9"])
        result = project_mod(mod, "a" * 64)
        self.assertEqual([p["numerator"] for p in result["products"]], [1, 9, 9])
        self.assertEqual(result["planes"]["B"], mod["faces_b"])

    def test_whitelist_and_selection_lanes(self):
        selection = {"kind": "model", "moduli": [81], "products": 3, "planes": 2,
                     "k_max": 8192, "mods": [self.mod()], "source": "private", "model_time": 999}
        measured = dict(selection, kind="measured")
        catalog = project(json.dumps({"writer": "private", "widths": [
            {"bits": 53, "a": selection, "b": measured, "c": [selection]}]}).encode())
        rows = catalog["widths"][0]["rows"]
        self.assertEqual([r["lane"] for r in rows], ["products", "source_measured", "source_model"])
        self.assertEqual(rows[0]["k_max"], "8192")
        self.assertFalse(catalog["scope"]["global_minimum_proven"])
        self.assertNotIn("private", json.dumps(catalog))
        self.assertNotIn("model_time", json.dumps(catalog))

    def test_totals_must_match_saved_definitions(self):
        selection = {"moduli": [81], "products": 4, "planes": 2, "k_max": 1, "mods": [self.mod()]}
        with self.assertRaises(ValueError):
            project(json.dumps({"widths": [{"bits": 53, "a": selection}]}).encode())
