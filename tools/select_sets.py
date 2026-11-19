"""Select modulus sets for reconstruction by the Chinese remainder theorem (CRT) from single-construction records, the
same way for every value set.

A set for (magnitude bits b, K) is a list of pairwise coprime moduli, one construction each, without holes (residues
with no encoding on a side), on the value set or on a value set it contains, whose CRT range covers K:
(prod m - 1) // (2 B^2) >= K with B = 2^b - 1 (verify/crt.py crt_max_k).  Two accumulation conditions:
  single     every construction's accumulation.max_k >= K: each product is summed in one FP32 accumulation.
             The fewest products, then the largest modulus product.
  segmented  K is split into segments of at most max_k for each construction, ceil(K / max_k) of them.  The fewest
             products, then the fewest launches (products times segments, summed over the moduli), then the largest
             modulus product.
Exact dynamic programming over primes; moduli whose primes are all at most 13 share a bit mask, and moduli with two
primes above 13 are not used.  Products are counted as the site shows them (tools/unused_limbs.py).
"""
from math import gcd, prod
from tools.unused_limbs import without_unused_limbs

SMALL = (2, 3, 5, 7, 11, 13)
MODES = ('single', 'segmented')


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


def segments(k, max_k):
    return -(-k // max_k)


def candidates(records, sets, k, mode='single'):
    """modulus -> (products, segments, -max_k, id, record): per modulus the construction kept for the selection."""
    best = {}
    for r in records:
        if r['plane_sets']['A'][0] not in sets or r['holes']['A'] or r['holes']['B']:
            continue
        mk = (r.get('accumulation') or {}).get('max_k')
        if not mk or (mode == 'single' and mk < k):
            continue
        key = (len(without_unused_limbs(r)['products']), segments(k, mk), -mk, r['id'])
        if r['modulus'] not in best or key < best[r['modulus']][:4]:
            best[r['modulus']] = key + (r,)
    return best


def crt_need(bits, k):
    return 2 * k * (2 ** bits - 1) ** 2 + 1          # prod m - 1 >= 2 K B^2


def select(records, sets, bits, k, mode='single', max_products=200):
    if mode not in MODES:
        raise ValueError(mode)
    need = crt_need(bits, k)
    cand = candidates(records, sets, k, mode)
    groups = {}
    for m, c in cand.items():
        fs = factor(m)
        big = [p for p, _ in fs if p not in SMALL]
        if len(big) > 1:
            continue
        mask = sum(1 << SMALL.index(p) for p, _ in fs if p in SMALL)
        groups.setdefault(big[0] if big else 0, []).append((m, mask, c[0], c[0] * c[1] if mode == 'segmented' else 0))
    # dp: (mask, products, launches) -> (modulus product, chosen moduli)
    dp = {(0, 0, 0): (1, ())}
    for g in sorted(groups):
        nxt = dict(dp)
        for (mask, n, s), (P, chosen) in dp.items():
            for m, mm, cost, pay in groups[g]:
                if mask & mm or n + cost > max_products:
                    continue
                key = (mask | mm, n + cost, s + pay)
                if key not in nxt or P * m > nxt[key][0]:
                    nxt[key] = (P * m, chosen + (m,))
        dp = nxt
    best = None
    for (mask, n, s), (P, chosen) in dp.items():
        if P >= need and (best is None or (n, s, -P) < best[0]):
            best = ((n, s, -P), chosen)
    if best is None:
        return None
    mods = sorted(best[1])
    assert all(gcd(a, b) == 1 for i, a in enumerate(mods) for b in mods[i + 1:])
    recs = [cand[m][4] for m in mods]
    out = {'mode': mode, 'magnitude_bits': bits, 'k': k, 'moduli': mods, 'products': best[0][0],
           'solution_ids': [r['id'] for r in recs], 'crt_max_k': (prod(mods) - 1) // (2 * (2 ** bits - 1) ** 2),
           'max_k': min(r['accumulation']['max_k'] for r in recs)}
    if mode == 'segmented':
        out['launches'] = best[0][1]
    return out


def feasible(rows, bits, k, mode='single'):
    """Whether a given set (its records, in order) meets the conditions of the mode."""
    mods = [r['modulus'] for r in rows]
    if any(gcd(a, b) != 1 for i, a in enumerate(mods) for b in mods[i + 1:]) or prod(mods) < crt_need(bits, k):
        return False
    return mode == 'segmented' or all((r.get('accumulation') or {}).get('max_k', 0) >= k for r in rows)
