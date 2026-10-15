"""Project saved selections into a numeric-only visualization catalog."""

import argparse
import hashlib
import json
from pathlib import Path


# The saved drawing defines these faces identically for both operands.
FORM_FACES = {
    "one": [[1]],
    "A": [[1, 0], [0, 1], [1, 1]],
    "B": [[1, 0], [0, 1]],
    "direct": [[1, 0], [0, 1]],
}
SHAPES = {"one": "direct", "A": "sum", "B": "vanishing", "direct": "direct",
          "limbs3": "three_limbs", "vanishA": "vanishing_sum"}


def project_mod(mod, source_sha256):
    """Copy only documented numeric definitions and saved measurement fields."""
    shape = SHAPES[mod["mech"]]
    faces_a = mod.get("faces_a", FORM_FACES.get(mod["mech"]))
    faces_b = mod.get("faces_b", FORM_FACES.get(mod["mech"]))
    planes = {"A": faces_a, "B": faces_b} if faces_a is not None and faces_b is not None else None
    weights = {"A": mod["w"], "B": mod.get("wb", mod["w"])}
    rho = mod.get("rho")
    if rho is not None and len(rho) != len(mod["prods"]):
        raise ValueError("coefficient count differs from product count")
    products = [{"a": a, "b": b, "group": group,
                 "numerator": int(rho[i]) if rho is not None else None}
                for i, (a, b, group) in enumerate(mod["prods"])]
    # Accumulator groups and source hashes are not mathematical definitions.
    identity = {"modulus": mod["p"], "weights": weights, "planes": planes,
                "products": [{k: p[k] for k in ("a", "b", "numerator")} for p in products],
                "denominator": 1}
    stable = hashlib.sha256(json.dumps(identity, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
    return {"id": "saved_" + stable[:24], **identity, "products": products,
            "shape": shape, "faces_a": mod["planes"],
            "faces_b": mod.get("planes_b", mod["planes"]),
            "holes": {"count": mod.get("holes"), "share": mod.get("hole_share")},
            "carry": bool(mod.get("carry")), "block_shift": bool(mod.get("block_shift")),
            "source_sha256": source_sha256}


def project(source_bytes):
    source = json.loads(source_bytes)
    source_sha256 = hashlib.sha256(source_bytes).hexdigest()
    widths = []
    for width in source["widths"]:
        rows = []
        lane_counts = {}
        selections = [("a", 0, width.get("a")), ("b", 0, width.get("b"))]
        selections.extend(("c", i, row) for i, row in enumerate(width.get("c") or []))
        for slot, index, selection in selections:
            if selection is None:
                continue
            kind = "products" if slot == "a" else ("measured" if selection["kind"] == "measured" else "model")
            lane = "products" if kind == "products" else "source_" + kind
            lane_index = lane_counts.get(lane, 0)
            lane_counts[lane] = lane_index + 1
            mods = [project_mod(mod, source_sha256) for mod in selection["mods"]]
            if sum(len(mod["products"]) for mod in mods) != selection["products"]:
                raise ValueError("saved product total differs from definitions")
            if sum(mod["faces_a"] for mod in mods) != selection["planes"]:
                raise ValueError("saved face total differs from definitions")
            rows.append({"id": f"saved_{width['bits']}_{lane}_{lane_index}",
                         "lane": lane, "selection_kind": kind,
                         "tag": "beyond_2x2" if selection.get("tag") == "beyond_2x2" else "standard",
                         "moduli": selection["moduli"], "products": selection["products"],
                         "faces_a": selection["planes"], "faces_b": sum(m["faces_b"] for m in mods),
                         "k_max": str(selection["k_max"]), "mods": mods})
        widths.append({"bits": width["bits"], "rows": rows})
    return {"schema_version": 1, "source_sha256": source_sha256,
            "scope": {"kind": "saved_selections", "global_minimum_proven": False}, "widths": widths}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output", type=Path, default=Path("data/visualization/modsets.json"))
    args = parser.parse_args()
    catalog = project(args.input.read_bytes())
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(catalog, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
