"""Propose single modular constructions of fixed families for one value set, as input lines of tools/modular_forms.py build.

The value set is an argument (2xE2M1, 8xE2M3, 16xE3M2); its values are verify/modular_forms.py ALPHABETS.  Every line is
verified and recorded by the build (minimal_record), so this file only proposes; a proposal that fails there is dropped.

families (x = a0 + w a1 on both sides, the same table on A and B)
  one_plane    x = a0: one product.  Kept when the value set hits every residue modulo m.
  two_direct   planes a0 and a1; the products a_i b_j whose coefficient w^(i+j) is not 0 modulo m (three when w^2 = 0).
  two_face     planes a0, a1 and u a0 + v a1 with 1 <= u <= 3, v in {-3..3} \\ {0}, gcd(u, |v|) = 1, u v a unit modulo m;
               three products n0 a0 b0 + n1 a1 b1 + n2 (u a0 + v a1)(u b0 + v b1) with n2 = w / (u v), n0 = 1 - n2 u^2,
               n1 = w^2 - n2 v^2 (a product whose numerator is 0 is dropped).
  two_products two-product constructions with a denominator coprime to m = p^e, the first TWO_PRODUCT_CAP found for a
               modulus (the enumeration reaches every one up to a unit, so a modulus with two products is not missed):
               side A serves x = u1 + b u2 over (u1, u2) with c u2 = d u1 (mod p^i) and side B serves y = c z1 + d n z2
               over (z1, z2) with n z2 = b z1 (mod p^j), c = 1 - d b, i + j = e; each choice is written as two limbs per
               side.
For each modulus, family and product count only the proposals with the smallest table maximum are kept (the smallest
bound t such that the plane values of absolute value at most t still give every residue), at most KEEP.
"""
import argparse
from itertools import product as cartesian
import json
from math import gcd
import sys
from pathlib import Path
import numpy as np
import verify.modular_forms as MF

KEEP = 2
TWO_PRODUCT_CAP = 300   # two-product proposals examined per modulus before the best are kept
FACES = [(u, v) for u in (1, 2, 3) for v in (-3, -2, -1, 1, 2, 3) if gcd(u, abs(v)) == 1]


def factor(n):
    out, p = [], 2
    while p * p <= n:
        if n % p == 0:
            e = 0
            while n % p == 0:
                n //= p
                e += 1
            out.append((p, e))
        p += 1
    if n > 1:
        out.append((n, 1))
    return out


def values(name):
    return np.array(MF.ALPHABETS[MF.SET_KEY[name]], dtype=np.int64)


def rep_table(S, m):
    """class mod m -> the value of S with the smallest |s| (verify/modular_forms.py rep), as an array with -1 for none."""
    out = np.full(m, -1, dtype=np.int64)
    for s in sorted(S.tolist(), key=lambda s: (abs(s), s < 0)):
        if out[s % m] < 0:
            out[s % m] = abs(s)
    return out


def table_max(x, cost, m):
    """The smallest achievable largest cost over all residues, or None when a residue is missing."""
    best = np.full(m, np.iinfo(np.int64).max, dtype=np.int64)
    np.minimum.at(best, x, cost)
    if (best == np.iinfo(np.int64).max).any():
        return None
    return int(best.max())


def line(m, vs, weights, planes_a, planes_b, products, family):
    return {'modulus': m, 'weights': {'A': list(weights[0]), 'B': list(weights[1])}, 'planes': {'A': planes_a, 'B': planes_b},
            'plane_moduli': {'A': [m] * len(planes_a), 'B': [m] * len(planes_b)}, 'products': products, 'denominator': 1,
            'value_set': vs, 'holes': [0, 0], 'holes_exact': True, 'family': family}


def one_plane(m, vs, S):
    if len(set((S % m).tolist())) == m:
        yield 0, line(m, vs, ([1], [1]), [[1]], [[1]], [[0, 0, 1]], 'one_plane')


def pairs(S):
    a0, a1 = np.meshgrid(S, S, indexing='ij')
    return a0.ravel(), a1.ravel()


def full_rows(X, m):
    r = X.shape[0]
    return (np.bincount((np.arange(r)[:, None] * m + X).ravel(), minlength=r * m).reshape(r, m) > 0).all(axis=1)


def scan(m, a0, a1, cost, ws, keep=KEEP):
    """[(w, table maximum)] for the w in ws whose map a0 + w a1 hits every residue modulo m using only pairs of cost at most
    the table maximum, smallest maxima first; stops at the first maximum that gives keep or more."""
    out = []
    if len(ws) == 0:
        return out
    for t in np.unique(cost):
        sel = cost <= t
        if sel.sum() < m:
            continue
        b0, b1 = a0[sel], a1[sel]
        step = max(1, (1 << 22) // max(1, len(b0)))
        for s0 in range(0, len(ws), step):
            W = ws[s0:s0 + step]
            X = (b0[None, :] + W[:, None] * b1[None, :]) % m
            out += [(int(w), int(t)) for w in W[full_rows(X, m)]]
        if len(out) >= keep:
            break
    return out


def two_direct(m, vs, S):
    a0, a1 = pairs(S)
    rep = rep_table(S, m)
    cost = np.maximum(rep[a0 % m], rep[a1 % m])
    ws = np.arange(1, m, dtype=np.int64)
    zero = (ws * ws) % m == 0
    for group in (ws[zero], ws[~zero]):
        for w, tm in scan(m, a0, a1, cost, group):
            prods = [[0, 0, 1], [0, 1, w], [1, 0, w]] + ([[1, 1, w * w % m]] if w * w % m else [])
            yield tm, line(m, vs, ([1, w], [1, w]), [[1, 0], [0, 1]], [[1, 0], [0, 1]], prods, 'two_direct')


def two_face(m, vs, S):
    a0, a1 = pairs(S)
    rep = rep_table(S, m)
    for u, v in FACES:
        if gcd(u * v, m) != 1:
            continue
        f = (u * a0 + v * a1) % m
        ok = rep[f] >= 0
        if ok.sum() < m:
            continue
        b0, b1 = a0[ok], a1[ok]
        cost = np.maximum(np.maximum(rep[b0 % m], rep[b1 % m]), rep[f[ok]])
        inv = pow(u * v, -1, m)
        ws = np.arange(1, m, dtype=np.int64)
        ws = ws[(ws * u - v) % m != 0]   # w = v / u turns the face into u x: one product, which one_plane covers
        for w, tm in scan(m, b0, b1, cost, ws):
            n2 = w * inv % m
            n0, n1 = (1 - n2 * u * u) % m, (w * w - n2 * v * v) % m
            prods = [[a, a, n] for a, n in ((0, n0), (1, n1), (2, n2)) if n]
            yield tm, line(m, vs, ([1, w], [1, w]), [[1, 0], [0, 1], [u, v]], [[1, 0], [0, 1], [u, v]], prods, 'two_face')


def kernel_basis(al, be, q, m):
    """Two integer vectors spanning {t in Z^2 : al t1 + be t2 = 0 (mod q)} together with m Z^2, q a power of a prime."""
    if q == 1:
        return [1, 0], [0, 1]
    g = gcd(gcd(al, be), q)
    al, be, q = al // g, be // g, q // g
    if q == 1:
        return [1, 0], [0, 1]
    if gcd(be, q) == 1:
        return [1, (-al * pow(be, -1, q)) % q], [0, q]
    return [(-be * pow(al, -1, q)) % q, 1], [q, 0]


def two_products_unit_free(m, vs, S, p, e, a0, a1, rep):
    """Two products, plane 0 times plane 0 with numerator n1 and plane 1 times plane 1 with numerator 1, where n1 is a
    multiple of p (not a unit modulo m = p^e).  This needs i = e, j = 0: side B has no condition and serves
    y = c n1 z1 + d z2."""
    for b in range(m):
        for d in range(m):
            c = (1 - d * b) % m
            okA = (c * a1 - d * a0) % m == 0
            if okA.sum() < m:
                continue
            xa = (a0[okA] + b * a1[okA]) % m
            if len(np.unique(xa)) < m:
                continue
            for n1 in range(0, m, p):
                yb = (c * n1 * a0 + d * a1) % m
                if len(np.unique(yb)) < m:
                    continue
                g1, g2 = kernel_basis(-d, c, m, m)
                wa = [(g1[0] + b * g1[1]) % m, (g2[0] + b * g2[1]) % m]
                pa = [[g1[0] % m, g2[0] % m], [g1[1] % m, g2[1] % m]]
                tm = max(table_max(xa, np.maximum(rep[a0[okA] % m], rep[a1[okA] % m]), m),
                         table_max(yb, np.maximum(rep[a0 % m], rep[a1 % m]), m))
                yield tm, {'modulus': m, 'weights': {'A': wa, 'B': [c * n1 % m, d % m]}, 'planes': {'A': pa, 'B': [[1, 0], [0, 1]]},
                           'plane_moduli': {'A': [m, m], 'B': [m, m]}, 'products': [[0, 0, n1], [1, 1, 1]], 'denominator': 1,
                           'value_set': vs, 'holes': [0, 0], 'holes_exact': True, 'family': 'two_products'}


def two_products(m, vs, S):
    """Every two-product construction with denominator 1 (see the module doc), written as two limbs per side."""
    fs = factor(m)
    if len(fs) != 1:
        return
    p, e = fs[0]
    a0, a1 = pairs(S)
    rep = rep_table(S, m)
    for i in range(e + 1):
        j = e - i
        qi, qj = p ** i, p ** j
        cnt = np.bincount(S % qi, minlength=qi)
        r_ = np.arange(qi)
        if max(int((cnt * cnt[(k * r_) % qi]).sum()) for k in range(qi)) < m:
            continue   # side A serves at most max_k sum_r cnt(r) cnt(k r) residues
        if j == 0:
            yield from two_products_unit_free(m, vs, S, p, e, a0, a1, rep)
        if j and len(set((S % qj).tolist())) < qj:
            continue   # with the first numerator 1, side B serves y = z1 (mod p^j)
        for b in range(m):
            for d in range(qi):
                c = (1 - d * b) % m
                okA = (c * a1 - d * a0) % qi == 0
                if okA.sum() < m:
                    continue
                xa = (a0[okA] + b * a1[okA]) % m
                if len(np.unique(xa)) < m:
                    continue
                for n in range(m):
                    okB = (n * a1 - b * a0) % qj == 0
                    if okB.sum() < m:
                        continue
                    yb = (c * a0[okB] + d * n * a1[okB]) % m
                    if len(np.unique(yb)) < m:
                        continue
                    # side A: u = (u1, u2) in the lattice c u2 = d u1 (mod p^i); side B: z with n z2 = b z1 (mod p^j)
                    g1, g2 = kernel_basis(-d, c, qi, m)
                    h1, h2 = kernel_basis(-b, n, qj, m)
                    wa = [(g1[0] + b * g1[1]) % m, (g2[0] + b * g2[1]) % m]
                    wb = [(c * h1[0] + d * n * h1[1]) % m, (c * h2[0] + d * n * h2[1]) % m]
                    pa = [[g1[0] % m, g2[0] % m], [g1[1] % m, g2[1] % m]]
                    pb = [[h1[0] % m, h2[0] % m], [h1[1] % m, h2[1] % m]]
                    tm = max(table_max(xa, np.maximum(rep[a0[okA] % m], rep[a1[okA] % m]), m),
                             table_max(yb, np.maximum(rep[a0[okB] % m], rep[a1[okB] % m]), m))
                    yield tm, {'modulus': m, 'weights': {'A': wa, 'B': wb}, 'planes': {'A': pa, 'B': pb},
                               'plane_moduli': {'A': [m, m], 'B': [m, m]}, 'products': [[0, 0, 1], [1, 1, n]],
                               'denominator': 1, 'value_set': vs, 'holes': [0, 0], 'holes_exact': True,
                               'family': 'two_products'}


def capped(gen, cap):
    for n, item in enumerate(gen):
        if n >= cap:
            return
        yield item


def proposals(vs, moduli, families, keep=KEEP):
    S = values(vs)
    gens = {'one_plane': one_plane, 'two_direct': two_direct, 'two_face': two_face, 'two_products': two_products}
    for m in moduli:
        best = {}
        for name in families:
            source = gens[name](m, vs, S)
            for tm, ln in (capped(source, TWO_PRODUCT_CAP) if name == 'two_products' else source):
                key = (name, len(ln['products']))
                best.setdefault(key, []).append((tm, json.dumps(ln, sort_keys=True), ln))
        for key, items in best.items():
            items.sort(key=lambda t: (t[0], t[1]))
            for tm, _, ln in items[:keep]:
                yield ln


if __name__ == '__main__':
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('value_set', choices=sorted(MF.SET_KEY))
    ap.add_argument('--moduli', required=True, help='lo:hi (every integer) or a comma-separated list')
    ap.add_argument('--families', default='one_plane,two_direct,two_face,two_products')
    ap.add_argument('--keep', type=int, default=KEEP)
    a = ap.parse_args()
    if ':' in a.moduli:
        lo, hi = map(int, a.moduli.split(':'))
        mods = range(lo, hi + 1)
    else:
        mods = [int(x) for x in a.moduli.split(',')]
    for ln in proposals(a.value_set, mods, a.families.split(','), a.keep):
        sys.stdout.write(json.dumps(ln, sort_keys=True) + '\n')
