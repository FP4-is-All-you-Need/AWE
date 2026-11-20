"""Positional encodings of integers in one value set, x = a0 + B (a1 + B (a2 + ...)) with every limb value a_i in the set.

For a value set S let D be the largest integer with -D..D all in S (the limb radius), and take the base B = 3 D + 1.
Every residue r of x modulo B, taken in -(B - 1)/2 .. (B - 1)/2, has a limb value a in S with a = r (mod B) and
|a| <= 2 D: r itself when r is in S, else r - B or r + B (a carry of +1 or -1 into the next limb).  Encoding x from the
lowest limb, a = value(r) and x <- (x - a) / B, keeps |x| <= R_k at every step when it starts there, with R_1 = D and
R_k = B R_(k-1) + D, so R_k = D (B^k - 1) / (B - 1) = (B^k - 1) / 3.  The top limb holds what is left, which is then in
-D..D.  A value that would need a carry above the top limb is outside the k-limb range.  A residue that is not in S can
also be split into two values of S, r = a + b, each stored as its own plane for that limb (a plane is one stored
operand of a floating-point matrix multiplication).

The radius of a range is that of this encoding.  It is also the widest: radius + 1 is not a sum of k limb values at all,
except on 16xE3M2 with two or three limbs, where such sums cover every integer up to 210 and 5260 in size (WIDER), but
not by this recursive encoding.

build: write data/visualization/radix-encodings.json.  check: rebuild it in memory and compare with the file, then check
every residue row, every range (each integer in it encodes and decodes, and the widest range of sums of k limb values
is the radius or the one in WIDER) and every example.
"""
import argparse
import json
from pathlib import Path
from tools.ingest import write
import verify.modular_forms as MF
from verify.core import Invalid

OUTPUT = Path('data/visualization/radix-encodings.json')
# value set, number of limbs in the ranges, example values
# (value set, limbs) where sums of k limb values cover more consecutive integers than this encoding: the widest radius
WIDER = {('16xE3M2', 2): 210, ('16xE3M2', 3): 5260}
SETS = (('8xE2M3', 3, (17, 262, 8202, -8202, 1234, 39216)), ('16xE3M2', 3, (9, 34, 1234, -1234, 5208)),
        ('2xE2M1', 4, (5, 70, 1000, 9520)))


def values_of(name):
    return MF.ALPHABETS[MF.SET_KEY[name]]


def limb_radius(S):
    s, d = set(S), 0
    while d + 1 in s and -(d + 1) in s:
        d += 1
    return d


def residue_rows(S, B):
    s, h, D, rows = set(S), (B - 1) // 2, limb_radius(S), []
    for r in range(-h, h + 1):
        if r in s:
            v, split = r, None
        else:
            v = next(c for c in (r - B, r + B) if c in s and abs(c) <= 2 * D)
            a = max(x for x in s if 0 < x < abs(r) and abs(r) - x in s)
            split = [a, abs(r) - a] if r > 0 else [-a, a - abs(r)]
        rows.append({'residue': r, 'limb_value': v, 'carry': (r - v) // B, 'split': split})
    return rows


def encode(x, B, k, table):
    """limb values [a0 .. a(k-1)], residues [r0 .. r(k-2)] and carries [c0 .. c(k-2)] of x from the lowest limb; the top
    limb holds what is left, which is in -D..D when x is inside the k-limb range"""
    values, residues, carries = [], [], []
    for _ in range(k - 1):
        r = (x + (B - 1) // 2) % B - (B - 1) // 2
        v = table[r]
        values.append(v)
        residues.append(r)
        carries.append((r - v) // B)
        x = (x - v) // B
    values.append(x)
    return values, residues, carries


def entry(name, limbs, examples):
    S = list(values_of(name))
    D = limb_radius(S)
    B = 3 * D + 1
    rows = residue_rows(S, B)
    table = {row['residue']: row['limb_value'] for row in rows}
    ranges = [{'limbs': k, 'radius': (B ** k - 1) // 3} for k in range(1, limbs + 1)]
    ex = []
    for x in examples:
        k = next(r['limbs'] for r in ranges if abs(x) <= r['radius'])
        values, residues, carries = encode(x, B, k, table)
        ex.append({'value': x, 'limb_values': values, 'residues': residues, 'carries': carries})
    return {'value_set': name, 'base': B, 'limb_values': S, 'limb_radius': D, 'formula': '(%d^k - 1) / 3' % B,
            'residues': rows, 'ranges': ranges, 'examples': ex}


def build_doc():
    return {'schema_version': 1, 'kind': 'radix_encodings', 'encodings': [entry(*s) for s in SETS]}


def sums(S, B, k):
    out = {0}
    w = 1
    for _ in range(k):
        out = {v + d * w for v in out for d in S}
        w *= B
    return out


def check(path=OUTPUT):
    doc = json.loads(path.read_text())
    if doc != build_doc():
        raise Invalid('radix_encodings_mismatch')
    for e in doc['encodings']:
        S, B, D = set(e['limb_values']), e['base'], e['limb_radius']
        table = {}
        for row in e['residues']:
            r, v, c = row['residue'], row['limb_value'], row['carry']
            if v not in S or (r - v) % B or c != (r - v) // B or abs(v) > 2 * D:
                raise Invalid('radix_residue')
            if row['split'] is not None and (sum(row['split']) != r or not set(row['split']) <= S or r in S):
                raise Invalid('radix_split')
            table[r] = v
        for rng in e['ranges']:
            k, R = rng['limbs'], rng['radius']
            if R != D * (B ** k - 1) // (B - 1):
                raise Invalid('radix_formula')
            for x in range(-R, R + 1):
                values, _, _ = encode(x, B, k, table)
                if abs(values[-1]) > D or not set(values) <= S or sum(v * B ** i for i, v in enumerate(values)) != x:
                    raise Invalid('radix_range')
            s, widest = sums(sorted(S), B, k), R
            while widest + 1 in s and -(widest + 1) in s:
                widest += 1
            if widest != WIDER.get((e['value_set'], k), R):
                raise Invalid('radix_widest_range')
        for ex in e['examples']:
            if sum(v * B ** i for i, v in enumerate(ex['limb_values'])) != ex['value'] or not set(ex['limb_values']) <= S:
                raise Invalid('radix_example')
    return {'encodings': len(doc['encodings']), 'valid': True}


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument('command', choices=('build', 'check'))
    a = p.parse_args()
    if a.command == 'build':
        write(OUTPUT, build_doc())
        print(json.dumps({'written': str(OUTPUT)}))
    else:
        print(json.dumps(check()))
