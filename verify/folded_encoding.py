"""Enumerate encodings for fixed weights and planes, never construction candidates."""
from itertools import combinations, product
from math import gcd, prod, lcm
from verify.power import S


def det(a):
    if not a: return 1
    return sum((-1)**i*x*det([r[:i]+r[i+1:] for r in a[1:]]) for i,x in enumerate(a[0]))


def encoding(weights, planes, folds, p, budget=3000000):
    n=len(weights)
    domains=[[v for v in range(p) if any((v-s)%m==0 for s in S)] for m in folds]
    choices=[]
    for ids in combinations(range(len(planes)),n):
        d=det([planes[i] for i in ids])
        if gcd(d,p)==1: choices.append((prod(len(domains[i]) for i in ids),ids,d))
    if not choices:
        # Remove only coordinate freedom that leaves all planes AND the weighted
        # value unchanged modulo p. Check the row-space identity mechanically.
        for k in range(n-1,0,-1):
            for rows in combinations(range(len(planes)),k):
                for cols in combinations(range(n),k):
                    a=[[planes[r][c] for c in cols] for r in rows];d=det(a)
                    if gcd(d,p)!=1:continue
                    inv=pow(d,-1,p)
                    inverse=[[((-1)**(i+j)*det([r[:i]+r[i+1:] for t,r in enumerate(a) if t!=j])*inv)%p for j in range(k)] for i in range(k)]
                    def preserved(v):
                        coeff=[sum(v[cols[i]]*inverse[i][j] for i in range(k))%p for j in range(k)]
                        return all((sum(coeff[j]*planes[rows[j]][i] for j in range(k))-v[i])%p==0 for i in range(n))
                    if all(preserved(v) for v in [weights]+planes):
                        reduced=encoding([weights[c] for c in cols],[[v[c] for c in cols] for v in planes],folds,p,budget)
                        return [None if row is None else [row[cols.index(i)] if i in cols else 0 for i in range(n)] for row in reduced]
        # Periods preserve both the weighted residue and every plane residue.
        # These are coordinates of the same fixed construction, not new limbs.
        periods=[lcm(p//gcd(p,w),*(m//gcd(m,row[i]) for row,m in zip(planes,folds))) for i,w in enumerate(weights)]
        if prod(periods)>budget: raise ValueError('fixed_encoding_resource_limit')
        valid=[{s%m for s in S} for m in folds];lut=[None]*p
        for limbs in product(*(range(period) for period in periods)):
            if any(sum(a*b for a,b in zip(row,limbs))%m not in allowed for row,m,allowed in zip(planes,folds,valid)):continue
            r=sum(a*b for a,b in zip(weights,limbs))%p
            if lut[r] is None:lut[r]=list(limbs)
        return lut
    count,ids,d=min(choices)
    if count>budget: raise ValueError('fixed_encoding_resource_limit')
    matrix=[planes[i] for i in ids]; inv=pow(d,-1,p)
    inverse=[[((-1)**(i+j)*det([r[:i]+r[i+1:] for k,r in enumerate(matrix) if k!=j])*inv)%p for j in range(n)] for i in range(n)]
    valid=[{s%m for s in S} for m in folds]
    lut=[None]*p
    for values in product(*(domains[i] for i in ids)):
        limbs=[sum(a*b for a,b in zip(row,values))%p for row in inverse]
        if any(sum(a*b for a,b in zip(row,limbs))%m not in allowed for row,m,allowed in zip(planes,folds,valid)): continue
        r=sum(a*b for a,b in zip(weights,limbs))%p
        if lut[r] is None: lut[r]=limbs
    return lut
