#!/usr/bin/env python3
"""Reproduce a supplied drawing without changing its source files."""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import runpy
import sys

sys.dont_write_bytecode = True


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--reference", type=Path, required=True)
    parser.add_argument("--output", type=Path, default=Path("build/compact-reference"))
    parser.add_argument("--web", type=Path, help="Browser screenshot of the SVG at cell=72px")
    parser.add_argument("--comparison-prefix", type=Path, default=Path("build/screens/compact-paper"))
    args = parser.parse_args()
    from matplotlib.figure import Figure
    from PIL import Image, ImageChops

    args.output.mkdir(parents=True, exist_ok=True)
    inputs = [args.source, args.source.parent / "toom_style.py", args.source.parent / "fig_checks.py", args.reference]
    before = {p.name: digest(p) for p in inputs}
    original_save = Figure.savefig
    original_argv = sys.argv[:]
    captured = []

    def redirected(fig, filename, *a, **kw):
        result = original_save(fig, args.output / Path(filename).name, *a, **kw)
        if not captured:
            captured.append(fig)
            original_save(fig, args.output / "compact-source-canvas.png", dpi=288,
                          bbox_inches=None, pad_inches=0)
            original_save(fig, args.output / "compact-source-canvas.svg", bbox_inches=None)
        return result

    try:
        Figure.savefig = redirected
        sys.argv = [str(args.source)]
        runpy.run_path(str(args.source), run_name="__main__")
    finally:
        Figure.savefig = original_save
        sys.argv = original_argv
    assert before == {p.name: digest(p) for p in inputs}, "Input changed"
    generated = args.output / "fig_m12_compact.png"
    with Image.open(generated) as left, Image.open(args.reference) as right:
        left_rgb, right_rgb = left.convert("RGB"), right.convert("RGB")
        sizes_equal = left.size == right.size
        pixels_equal = sizes_equal and ImageChops.difference(left_rgb, right_rgb).getbbox() is None
        sizes = {"rerun": list(left.size), "reference": list(right.size)}
    with Image.open(args.output / "compact-source-canvas.png") as canvas:
        canvas_size = list(canvas.size)
    report = {
        "inputs_sha256": before,
        "inputs_unchanged": True,
        "reference_png_byte_identical": digest(generated) == digest(args.reference),
        "reference_png_pixels_identical": pixels_equal,
        "png_sizes": sizes,
        "canvas_inches": captured[0].get_size_inches().tolist(),
        "canvas_dpi": 288,
        "canvas_pixels": canvas_size,
        "cell_pixels": 72,
        "outputs_sha256": {p.name: digest(p) for p in sorted(args.output.iterdir()) if p.suffix in (".pdf", ".png", ".svg")},
    }
    (args.output / "reference-audit.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    if args.web:
        from PIL import ImageDraw, ImageFont
        source = Image.open(args.output / "compact-source-canvas.png").convert("RGB")
        web = Image.open(args.web).convert("RGB")
        width, height = max(source.width, web.width), max(source.height, web.height)
        # Pad only: both have 72px cells, so no independent scaling is allowed.
        layers = []
        for original in (source, web):
            layer = Image.new("RGB", (width, height), "white")
            layer.paste(original, (0, 0))
            layers.append(layer)
        font = ImageFont.truetype("DejaVuSans.ttf", 18)
        comparison = Image.new("RGB", (2 * width + 16, height + 34), "white")
        draw = ImageDraw.Draw(comparison)
        for i, (label, layer) in enumerate(zip(("Drawing source (72 px / cell)", "Interactive SVG (72 px / cell)"), layers)):
            x = i * (width + 16)
            draw.text((x + 4, 5), label, fill="#1A1A1A", font=font)
            comparison.paste(layer, (x, 34))
        args.comparison_prefix.parent.mkdir(parents=True, exist_ok=True)
        comparison.save(str(args.comparison_prefix) + "-comparison.png")
        Image.blend(*layers, .5).save(str(args.comparison_prefix) + "-overlay.png")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
