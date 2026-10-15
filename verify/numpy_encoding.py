"""Bounded int64 implementation of finite encoding; exact Python fallback exists."""
import numpy as np
from functools import lru_cache
from verify.core import Invalid, SETS


@lru_cache(maxsize=16)
def arrays(limb_sets, planes, plane_sets):
    from verify.core import legal
    rows = legal(limb_sets, planes, plane_sets)
    t = np.asarray(rows, dtype=np.int64)
    f = t @ np.asarray(planes, dtype=np.int64).T
    return t, f


def encode(s, side, rows):
    weights, planes = s['weights'][side], s['planes'][side]
    limits = [max(abs(v) for v in SETS[k]) for k in s['limb_sets'][side]]
    # Absolute-sum bounds cover every multiply and partial sum, not just the final value.
    if sum(abs(w)*m for w,m in zip(weights,limits)) > 2**63-1: return None
    if any(sum(abs(w)*m for w,m in zip(p,limits)) > 2**63-1 for p in planes): return None
    t, f = arrays(tuple(s['limb_sets'][side]),tuple(map(tuple,planes)),tuple(s['plane_sets'][side]))
    values = t @ np.asarray(weights, dtype=np.int64)
    unique, first = np.unique(values, return_index=True)
    lo, hi = s['domain'][side]
    selected = first[(unique >= lo) & (unique <= hi)]
    if len(selected) != hi-lo+1: raise Invalid('encoding_missing')
    # Every row comes from the independently enumerated legal set; uniqueness and
    # the count of distinct in-range integers prove the entire interval is encoded.
    chosen = t[selected]
    wanted = np.arange(lo,hi+1,dtype=np.int64)
    if not np.array_equal(chosen @ np.asarray(weights,dtype=np.int64),wanted):
        raise Invalid('encoding_failed')
    maxima = np.max(np.abs(f[selected]),axis=0).tolist()
    return {int(n):tuple(map(int,row)) for n,row in zip(wanted,chosen)}, maxima
