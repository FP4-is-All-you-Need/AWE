"""Exact checks of supplied residue tables and modular bilinear coefficients."""
from math import prod
from verify.core import Invalid, SETS, integer, validate as validate_integer
from verify.crt import crt_max_k

VERSION = '1.0.0'
FIELDS = ('schema_version', 'kind', 'modulus', 'weights', 'limb_sets', 'planes',
          'plane_sets', 'products', 'denominator', 'encoding')


def verify(s):
    if type(s) is not dict or not set(FIELDS) <= s.keys() or s.keys() - set(FIELDS) - {'id', 'verified', 'accumulation', 'provenance'}:
        raise Invalid('invalid_fields')
    if s['kind'] != 'modular':
        raise Invalid('unsupported_schema')
    integer(s['modulus'], 2, 2000)
    p = s['modulus']
    # This first format has integral reconstruction coefficients only.
    integer(s['denominator'], 1, 1)
    base = {k: s[k] for k in ('schema_version', 'weights', 'limb_sets', 'planes', 'plane_sets', 'products', 'denominator')}
    validate_integer(dict(base, kind='integer', domain={'A': [0, p-1], 'B': [0, p-1]}))
    if p*p*len(s['products']) > 20_000_000:
        raise Invalid('pair_resource_limit')
    for i, wa in enumerate(s['weights']['A']):
        for j, wb in enumerate(s['weights']['B']):
            got = sum(t['numerator'] * s['planes']['A'][t['a']][i] * s['planes']['B'][t['b']][j]
                      for t in s['products'])
            if (got - wa*wb) % p:
                raise Invalid('modular_identity_failed')
    if type(s['encoding']) is not dict or set(s['encoding']) != {'A', 'B'}:
        raise Invalid('invalid_sides')
    faces = {}
    maxima = {}
    for side in ('A', 'B'):
        lut = s['encoding'][side]
        if type(lut) is not list or len(lut) != p:
            raise Invalid('incomplete_residue_table')
        faces[side] = []
        for residue, limbs in enumerate(lut):
            if type(limbs) is not list or len(limbs) != len(s['weights'][side]):
                raise Invalid('invalid_encoding_dimension')
            for value, storage in zip(limbs, s['limb_sets'][side]):
                integer(value)
                if value not in SETS[storage]:
                    raise Invalid('limb_outside_storage')
            if sum(w*x for w, x in zip(s['weights'][side], limbs)) % p != residue:
                raise Invalid('residue_encoding_failed')
            row = [sum(c*x for c, x in zip(plane, limbs)) for plane in s['planes'][side]]
            if any(x not in SETS[storage] for x, storage in zip(row, s['plane_sets'][side])):
                raise Invalid('plane_outside_storage')
            faces[side].append(row)
        maxima[side] = [max(abs(row[i]) for row in faces[side]) for i in range(len(s['planes'][side]))]
    # Every supplied residue pair is checked; no source verdict is trusted.
    for a, fa in enumerate(faces['A']):
        for b, fb in enumerate(faces['B']):
            result = sum(t['numerator']*fa[t['a']]*fb[t['b']] for t in s['products'])
            if (result-a*b) % p:
                raise Invalid('residue_pair_failed')
    bounds = [maxima['A'][t['a']]*maxima['B'][t['b']] for t in s['products']]
    nonzero = [b for b in bounds if b]
    return {
        'verified': {'method': 'full_pairs', 'identity': 'modulo_p', 'encoding': 'all_residues',
                     'n_pairs': p*p, 'n_residues': {'A': p, 'B': p}, 'verifier_version': VERSION},
        'accumulation': {'model': 'separate_products_then_exact_integer_reconstruction',
                         'product_bounds': bounds,
                         'max_k': min((2**24-1)//b for b in nonzero) if nonzero else None}}


def verify_set(s, solutions):
    required = {'schema_version', 'kind', 'magnitude_bits', 'k', 'solution_ids'}
    if type(s) is not dict or not required <= s.keys() or s.keys()-required-{'id', 'verification', 'provenance'}:
        raise Invalid('invalid_fields')
    integer(s['schema_version'], 1, 1)
    if s['kind'] != 'modular_set':
        raise Invalid('unsupported_schema')
    integer(s['magnitude_bits'], 1, 256)
    integer(s['k'], 1)
    ids = s['solution_ids']
    if type(ids) is not list or not 1 <= len(ids) <= 256 or any(type(x) is not str for x in ids):
        raise Invalid('invalid_solution_ids')
    if len(set(ids)) != len(ids) or any(x not in solutions for x in ids):
        raise Invalid('invalid_solution_ids')
    # Recheck the mathematical records, not just their proof labels.
    rows = [solutions[x] for x in ids]
    proofs = [verify(row) for row in rows]
    moduli = [row['modulus'] for row in rows]
    bound = (1 << s['magnitude_bits'])-1
    k_crt = crt_max_k(moduli, bound, bound)
    k_acc = [p['accumulation']['max_k'] for p in proofs if p['accumulation']['max_k'] is not None]
    k_max = min([k_crt]+k_acc)
    if s['k'] > k_max:
        raise Invalid('k_outside_guarantee')
    return {'moduli': moduli, 'products': sum(len(row['products']) for row in rows),
            'faces': sum(len(row['planes'][side]) for row in rows for side in ('A', 'B')),
            'max_abs_operand': str(bound), 'modulus_product': str(prod(moduli)),
            'output_bound': str(s['k']*bound*bound), 'crt_max_k': str(k_crt), 'max_k': str(k_max),
            'integer_encoding': 'euclidean_remainder_then_complete_residue_table',
            'reconstruction': 'centered_crt', 'verifier_version': VERSION}
