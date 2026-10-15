"""Exact finite encoding and bilinear-identity proofs, independent of search code."""
from functools import lru_cache
from itertools import product
from math import prod

VERSION = '1.0.0'
SAFE = 2**53 - 1
SETS = {'2xE2M1': (-12, -8, -6, -4, -3, -2, -1, 0, 1, 2, 3, 4, 6, 8, 12),
        'E4M3_integer': tuple(sorted({0} | {s * v for s in (-1, 1)
            for v in list(range(1, 17)) + list(range(18, 33, 2)) + list(range(36, 65, 4))
            + list(range(72, 129, 8)) + list(range(144, 257, 16)) + list(range(288, 449, 32))}))}

class Invalid(ValueError):
    """Stable public reason code; never embeds source text."""


def integer(x, low=-SAFE, high=SAFE):
    if type(x) is not int or not low <= x <= high:
        raise Invalid('invalid_integer')


def validate(s):
    if type(s) is not dict:
        raise Invalid('invalid_object')
    required = {'schema_version', 'kind', 'weights', 'limb_sets', 'planes', 'plane_sets',
                'products', 'denominator', 'domain'}
    optional = {'id', 'widths', 'coverage', 'accumulation', 'verified', 'provenance'}
    if not required <= s.keys() or s.keys() - required - optional:
        raise Invalid('invalid_fields')
    integer(s['schema_version'], 1, 1)
    if s['schema_version'] != 1 or s['kind'] != 'integer':
        raise Invalid('unsupported_schema')
    integer(s['denominator'], 1)
    for key in ('weights', 'limb_sets', 'planes', 'plane_sets', 'domain'):
        if type(s[key]) is not dict or set(s[key]) != {'A', 'B'}:
            raise Invalid('invalid_sides')
    for side in ('A', 'B'):
        w, ls, ps, fs, domain = (s[k][side] for k in ('weights', 'limb_sets', 'planes', 'plane_sets', 'domain'))
        if any(type(x) is not list for x in (w, ls, ps, fs, domain)):
            raise Invalid('invalid_array')
        if not 1 <= len(w) <= 16 or len(ls) != len(w) or not 1 <= len(ps) <= 256 or len(fs) != len(ps):
            raise Invalid('invalid_dimension')
        for x in w: integer(x)
        for name in ls + fs:
            if type(name) is not str or name not in SETS: raise Invalid('unknown_storage_set')
        for plane in ps:
            if type(plane) is not list or len(plane) != len(w) or not any(plane):
                raise Invalid('invalid_plane')
            for x in plane: integer(x)
        if len(domain) != 2: raise Invalid('invalid_domain')
        for x in domain: integer(x)
        if domain[0] > 0 or domain[1] < 0: raise Invalid('invalid_domain')
    if type(s['products']) is not list or not 1 <= len(s['products']) <= 1024:
        raise Invalid('invalid_products')
    for p in s['products']:
        if type(p) is not dict or set(p) != {'a', 'b', 'numerator'}: raise Invalid('invalid_product')
        integer(p['a'], 0, len(s['planes']['A']) - 1)
        integer(p['b'], 0, len(s['planes']['B']) - 1)
        integer(p['numerator'])


def algebra(s):
    for i, wa in enumerate(s['weights']['A']):
        for j, wb in enumerate(s['weights']['B']):
            actual = sum(p['numerator'] * s['planes']['A'][p['a']][i] * s['planes']['B'][p['b']][j]
                         for p in s['products'])
            if actual != s['denominator'] * wa * wb:
                raise Invalid('identity_failed')


@lru_cache(maxsize=32)
def legal(limb_sets, planes, plane_sets):
    count = prod(len(SETS[k]) for k in limb_sets)
    if count > 1_000_000: raise Invalid('encoding_resource_limit')
    # Enumeration is independent of weights; reuse only the exact storage constraints.
    rows = [t for t in product(*(SETS[k] for k in limb_sets))
            if all(sum(c*x for c, x in zip(p, t)) in SETS[k] for p, k in zip(planes, plane_sets))]
    if not rows: raise Invalid('encoding_missing')
    return tuple(rows)


def encode_side(s, side, *, accelerated=True):
    weights, planes = s['weights'][side], s['planes'][side]
    lo, hi = s['domain'][side]
    if hi-lo+1 > 2_000_000: raise Invalid('domain_resource_limit')
    rows = legal(tuple(s['limb_sets'][side]), tuple(map(tuple, planes)), tuple(s['plane_sets'][side]))
    if accelerated:
        try:
            from verify.numpy_encoding import encode
        except ImportError:
            pass
        else:
            result = encode(s, side, rows)
            if result is not None: return result
    enc = {}
    for t in rows:
        n = sum(w*x for w, x in zip(weights, t))
        if lo <= n <= hi and n not in enc: enc[n] = t
    if len(enc) != hi-lo+1: raise Invalid('encoding_missing')
    maxima = [0] * len(planes)
    for n, t in enc.items():
        if sum(w*x for w, x in zip(weights, t)) != n: raise Invalid('encoding_failed')
        if any(x not in SETS[k] for x, k in zip(t, s['limb_sets'][side])): raise Invalid('limb_not_storable')
        for i, p in enumerate(planes):
            v = sum(c*x for c, x in zip(p, t))
            if v not in SETS[s['plane_sets'][side][i]]: raise Invalid('plane_not_storable')
            maxima[i] = max(maxima[i], abs(v))
    return enc, maxima


def verify(s, *, pairs=False):
    validate(s)
    algebra(s)
    ea, ma = encode_side(s, 'A')
    if all(s[k]['A'] == s[k]['B'] for k in ('weights', 'limb_sets', 'planes', 'plane_sets', 'domain')):
        eb, mb = ea, ma
    else: eb, mb = encode_side(s, 'B')
    checked = 0
    if pairs:
        if len(ea)*len(eb) > 2_000_000: raise Invalid('pairs_resource_limit')
        fa = {n: [sum(c*x for c,x in zip(p,t)) for p in s['planes']['A']] for n,t in ea.items()}
        fb = {n: [sum(c*x for c,x in zip(p,t)) for p in s['planes']['B']] for n,t in eb.items()}
        for a, av in fa.items():
            for b, bv in fb.items():
                if sum(p['numerator']*av[p['a']]*bv[p['b']] for p in s['products']) != s['denominator']*a*b:
                    raise Invalid('pair_failed')
                checked += 1
    bounds = [ma[p['a']]*mb[p['b']] for p in s['products']]
    maximum = max(bounds)
    accumulation = {'precision_bits': 24, 'mode': 'separate_products', 'product_bounds': bounds,
                    'max_k': (2**24 // maximum) if maximum else None}
    if 'accumulation' in s and s['accumulation'] != accumulation: raise Invalid('accumulation_mismatch')
    coverage = {side: min(-s['domain'][side][0],s['domain'][side][1]) for side in ('A','B')}
    widths = {side: (x+1).bit_length() for side,x in coverage.items()}
    if 'coverage' in s and s['coverage'] != coverage: raise Invalid('coverage_mismatch')
    if 'widths' in s and s['widths'] != widths: raise Invalid('widths_mismatch')
    return {'coverage': coverage, 'widths': widths, 'accumulation': accumulation,
            'verified': {'method': 'full_pairs' if pairs else 'exhaustive_encoding_and_bilinear_identity',
                         'n_pairs': checked, 'n_pairs_proven': len(ea)*len(eb), 'verifier_version': VERSION}}
