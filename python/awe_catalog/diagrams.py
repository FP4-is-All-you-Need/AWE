"""Portable diagrams of exact product decompositions."""

from fractions import Fraction
from html import escape
import json


def _linear(vector, letter, tex=False):
    terms = []
    for i, value in enumerate(vector):
        value = int(value)
        if not value:
            continue
        variable = f"{letter}_{{{i}}}" if tex else f"{letter}{i}"
        body = (str(abs(value)) + " " if abs(value) != 1 else "") + variable
        terms.append((value < 0, body))
    return "".join(("-" if negative else "+" if n else "") + body
                   for n, (negative, body) in enumerate(terms)) or "0"


def _payload(s, tex=False):
    a = [int(x) for x in s["weights"]["A"]]
    b = [int(x) for x in s["weights"]["B"]]
    denominator = int(s["denominator"])
    cells = []
    for i, wa in enumerate(a):
        row = []
        for j, wb in enumerate(b):
            labels = [str(wa * wb)]
            for k, product in enumerate(s["products"]):
                u = int(s["planes"]["A"][product["a"]][i])
                v = int(s["planes"]["B"][product["b"]][j])
                value = Fraction(int(product["numerator"]) * u * v, denominator)
                if value:
                    name = f"P_{{{k + 1}}}" if tex else f"P{k + 1}"
                    labels.append(f"{name}: {value}")
            row.append(labels)
        cells.append(row)
    products = []
    for k, p in enumerate(s["products"]):
        name = f"P_{{{k + 1}}}" if tex else f"P{k + 1}"
        u = _linear(s["planes"]["A"][p["a"]], "a", tex)
        v = _linear(s["planes"]["B"][p["b"]], "b", tex)
        coefficient = str(Fraction(int(p["numerator"]), denominator))
        products.append(f"{name} = ({u}) ({v}); coefficient = {coefficient}")
    if s.get('kind') == 'modular':
        modulus = int(s['modulus'])
        products.append((r'\mathrm{Cell\ sums\ interpreted\ modulo\ } ' if tex else 'Cell sums interpreted modulo ') + str(modulus))
    return {"a": a, "b": b, "cells": cells, "products": products}


def svg(s):
    """Return an SVG containing every nonzero cell contribution."""
    data = _payload(s)
    cell_width = max(150, max(len(t) for row in data["cells"] for c in row for t in c) * 8 + 24)
    cell_height = max(len(c) for row in data["cells"] for c in row) * 19 + 20
    margin = 45
    grid_height = len(data["a"]) * cell_height
    width = max(margin + len(data["b"]) * cell_width + 20,
                max((len(x) for x in data["products"]), default=0) * 8 + 40)
    height = margin + grid_height + 40 + 24 * len(data["products"])
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">',
           '<rect width="100%" height="100%" fill="white"/>',
           '<g font-family="monospace" font-size="14" fill="#17251e">']
    def text(x, y, value):
        out.append(f'<text x="{x}" y="{y}">{escape(value)}</text>')
    for j in range(len(data["b"])):
        text(margin + j * cell_width + 8, 25, f"b{j}")
    for i, row in enumerate(data["cells"]):
        text(8, margin + i * cell_height + 22, f"a{i}")
        for j, labels in enumerate(row):
            x, y = margin + j * cell_width, margin + i * cell_height
            out.append(f'<rect x="{x}" y="{y}" width="{cell_width}" height="{cell_height}" fill="none" stroke="#728277"/>')
            for n, label in enumerate(labels):
                text(x + 8, y + 22 + n * 19, label)
    for k, label in enumerate(data["products"]):
        text(12, margin + grid_height + 30 + 24 * k, label)
    out.extend(["</g>", "</svg>"])
    return "\n".join(out) + "\n"


def tikz(s):
    """Return a complete article document using the TikZ package."""
    data = _payload(s, tex=True)
    h = max(len(c) for row in data["cells"] for c in row) * 0.36 + 0.35
    w = max(3.2, max(len(t) for row in data["cells"] for c in row for t in c) * 0.13)
    out = [r"\documentclass{article}", r"\usepackage{tikz}",
           r"\pagestyle{empty}", r"\begin{document}",
           r"\begin{tikzpicture}[x=1cm,y=1cm,font=\scriptsize]"]
    for j in range(len(data["b"])):
        out.append(f"\\node at ({j*w+w/2:.4f},0.3) {{$b_{{{j}}}$}};")
    for i, row in enumerate(data["cells"]):
        out.append(f"\\node at (-0.4,{-i*h-h/2:.4f}) {{$a_{{{i}}}$}};")
        for j, labels in enumerate(row):
            x, y = j*w, -i*h
            out.append(f"\\draw ({x:.4f},{y:.4f}) rectangle ({x+w:.4f},{y-h:.4f});")
            for n, label in enumerate(labels):
                out.append(f"\\node[anchor=west] at ({x+0.1:.4f},{y-0.25-n*0.36:.4f}) {{${label}$}};")
    for k, label in enumerate(data["products"]):
        # All labels originate from integer/Fraction formatting, never raw text.
        label = label.replace("; coefficient = ", r";\quad \mathrm{coefficient} = ")
        out.append(f"\\node[anchor=west] at (0,{-len(data['a'])*h-0.4-k*0.45:.4f}) {{${label}$}};")
    out.extend([r"\end{tikzpicture}", r"\end{document}"])
    return "\n".join(out) + "\n"


def matplotlib(s):
    """Return a standalone plotting script with --output or interactive display."""
    payload = json.dumps(_payload(s), ensure_ascii=True, separators=(",", ":"))
    return '''"""Plot an exact product decomposition."""
import argparse
import json
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle

DATA = json.loads(''' + repr(payload) + ''')

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", help="Save the figure to this file")
    args = parser.parse_args()
    rows, columns = len(DATA["a"]), len(DATA["b"])
    lines = max(len(c) for row in DATA["cells"] for c in row)
    cell_height = max(1.0, lines * 0.24 + 0.2)
    cell_width = max(2.0, max(len(t) for row in DATA["cells"] for c in row for t in c) * 0.11)
    bottom = rows * cell_height
    width = max(columns * cell_width + 0.8, max((len(x) for x in DATA["products"]), default=0) * 0.095)
    height = bottom + 0.8 + len(DATA["products"]) * 0.3
    fig, ax = plt.subplots(figsize=(width, height))
    for j in range(columns):
        ax.text(j * cell_width + 0.1, -0.2, "b" + str(j), fontsize=10)
    for i, row in enumerate(DATA["cells"]):
        ax.text(-0.45, i * cell_height + 0.3, "a" + str(i), fontsize=10)
        for j, labels in enumerate(row):
            x, y = j * cell_width, i * cell_height
            ax.add_patch(Rectangle((x, y), cell_width, cell_height, fill=False))
            ax.text(x + 0.1, y + 0.15, "\\n".join(labels), va="top", fontsize=9, family="monospace")
    for k, label in enumerate(DATA["products"]):
        ax.text(0, bottom + 0.35 + k * 0.3, label, fontsize=9, family="monospace")
    ax.set_xlim(-0.6, width)
    ax.set_ylim(height, -0.5)
    ax.axis("off")
    fig.tight_layout()
    if args.output:
        fig.savefig(args.output, bbox_inches="tight")
    else:
        plt.show()

if __name__ == "__main__":
    main()
'''
