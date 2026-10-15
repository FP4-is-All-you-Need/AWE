"""Versioned normalization preserving limb axes and operand orientation."""
import copy
import hashlib
import json
from functools import reduce
from math import gcd
from verify.core import validate

FIELDS = ('schema_version', 'kind', 'weights', 'limb_sets', 'planes', 'plane_sets', 'products', 'denominator', 'domain')

def packed(obj):
    return json.dumps(obj, sort_keys=True, separators=(',', ':'), ensure_ascii=True).encode('utf-8')


def canonical(s):
    validate(s)
    out = {k: copy.deepcopy(s[k]) for k in FIELDS}
    maps, signs = {}, {}
    for side in ('A', 'B'):
        keys, signs[side] = [], []
        for plane, storage in zip(s['planes'][side], s['plane_sets'][side]):
            sign = 1 if next(x for x in plane if x) > 0 else -1
            keys.append((tuple(sign*x for x in plane), storage))
            signs[side].append(sign)
        ordered = sorted(set(keys))
        maps[side] = [ordered.index(x) for x in keys]
        out['planes'][side] = [list(x[0]) for x in ordered]
        out['plane_sets'][side] = [x[1] for x in ordered]
    terms = {}
    for p in s['products']:
        key = maps['A'][p['a']], maps['B'][p['b']]
        terms[key] = terms.get(key, 0) + p['numerator']*signs['A'][p['a']]*signs['B'][p['b']]
    terms = {k:v for k,v in terms.items() if v}
    common = reduce(gcd, [out['denominator']] + list(terms.values()))
    out['denominator'] //= common
    out['products'] = [{'a':a, 'b':b, 'numerator':v//common} for (a,b),v in sorted(terms.items())]
    validate(out)
    return out


def identify(s):
    return 'awe1_' + hashlib.sha256(packed(canonical(s))).hexdigest()
