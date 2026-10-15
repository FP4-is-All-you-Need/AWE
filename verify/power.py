"""Exact measurements of fixed modular constructions, including folded planes."""
from math import gcd, log2
from verify.core import SETS, Invalid

VERSION = '2.0.0'
S = SETS['2xE2M1']


def measure(s):
    p = s['modulus']
    if type(p) is not int or not 2 <= p <= 100000:
        raise Invalid('invalid_modulus')
    terms = s['products']
    for side in ('A','B'):
        n=len(s['weights'][side]); faces=len(s['planes'][side])
        if not n or not faces or len(s['limbs_stored'][side])!=n or len(s['limb_sets'][side])!=n or len(s['plane_sets'][side])!=faces:
            raise Invalid('storage_dimension')
        if 'plane_moduli' in s and len(s['plane_moduli'][side])!=faces:
            raise Invalid('storage_dimension')
        if any(not 0<=t['a' if side=='A' else 'b']<faces for t in terms):
            raise Invalid('product_plane_index')
    residuals = []
    for i, a in enumerate(s['weights']['A']):
        for j, b in enumerate(s['weights']['B']):
            actual = sum(t['numerator'] * s['planes']['A'][t['a']][i] * s['planes']['B'][t['b']][j] for t in terms)
            if (actual-s['denominator']*a*b) % p:
                residuals.append({'a': i, 'b': j, 'residue': (actual-s['denominator']*a*b) % p})
    holes, maxima, used, problems = {}, {}, {}, []
    for side in ('A', 'B'):
        weights, planes, lut = s['weights'][side], s['planes'][side], s['encoding'][side]
        if len(lut) != p or any(len(f) != len(weights) for f in planes):
            raise Invalid('encoding_dimension')
        folds = s.get('plane_moduli', {}).get(side, [p]*len(planes))
        # A multiple of the plane modulus must vanish in every incident term.
        for f, m in enumerate(folds):
            if m < 1 or p % m:
                raise Invalid('invalid_plane_modulus')
            if any(t['numerator']*m % p for t in terms if t['a' if side=='A' else 'b']==f):
                problems.append({'side':side,'plane':f,'reason':'plane_fold_identity_mismatch'})
        values = [set() for _ in planes]
        holes[side] = []
        for residue, limbs in enumerate(lut):
            if limbs is None:
                holes[side].append(residue)
                continue
            if len(limbs) != len(weights) or any(type(v) is not int for v in limbs):
                raise Invalid('encoding_dimension')
            if (sum(w*x for w,x in zip(weights, limbs))-residue) % p:
                problems.append({'side': side, 'residue': residue, 'reason': 'encoding_residue_mismatch'})
            if any(stored and x not in S for x,stored in zip(limbs,s['limbs_stored'][side])):
                problems.append({'side': side, 'residue': residue, 'reason': 'limb_outside_storage'})
            for f, row in enumerate(planes):
                v = sum(c*x for c,x in zip(row,limbs))
                if 'plane_moduli' in s:
                    choices = [x for x in S if (x-v) % folds[f] == 0]
                    if not choices:
                        problems.append({'side': side, 'residue': residue, 'reason': 'plane_outside_storage', 'plane': f})
                        continue
                    v = min(choices, key=lambda x:(abs(x),x))
                elif v not in S:
                    problems.append({'side': side, 'residue': residue, 'reason': 'plane_outside_storage', 'plane': f})
                values[f].add(v)
        maxima[side] = [max(map(abs,v), default=0) for v in values]
        used[side] = [sorted(v) for v in values]
    bounds = [maxima['A'][t['a']]*maxima['B'][t['b']] for t in terms]
    plan = s.get('accumulation_plan')
    group_bounds = None
    if plan:
        coefficients = [0]*len(terms)
        group_bounds = []
        for group, entries in enumerate(plan['accs']):
            if group > 1: raise Invalid('unsupported_accumulator_plan')
            bound = 0
            for e in entries:
                coefficients[e['prod']] += e['w']*(1 if group == 0 else plan['gamma'])
                bound += abs(e['w'])*bounds[e['prod']]
            group_bounds.append(bound)
        if any((c-plan['lam0']*t['numerator']) % p for c,t in zip(coefficients,terms)):
            problems.append({'reason': 'accumulator_coefficients_mismatch'})
    limits = group_bounds if group_bounds is not None else bounds
    k = min(((2**24-1)//v for v in limits if v), default=None)
    ok = not residuals and not problems
    return {'verified': {'method': 'coefficient_identity_and_side_enumeration' if ok else 'failed',
             'identity': 'modulo_p', 'encoding': 'served_residues' if any(holes.values()) else 'all_residues',
             'n_pairs': 0, 'n_residues': {side:p-len(holes[side]) for side in holes}, 'verifier_version': VERSION},
            'measurement': {'bits':round(log2(p),12), 'identity_residuals': residuals, 'encoding_failures': problems,
                'holes': holes, 'plane_values': used, 'correction_verified': None if any(holes.values()) else True},
            'accumulation': {'model': 'saved_accumulator_groups' if plan else 'separate_products_then_exact_integer_reconstruction',
                 'product_bounds': bounds, 'group_bounds': group_bounds, 'max_k': k}}
