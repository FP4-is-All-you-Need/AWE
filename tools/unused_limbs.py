"""Limbs of weight 0 modulo the modulus that never reach a product: no plane uses them, or the stored encoding gives them
0 for every residue (site/src/unusedLimbs.ts applies the same rule on the site).  Planes that are then all zero and the
products of those planes, which are always 0, go with them.  The published records keep every limb; the display indexes
count without these."""


def unused_limbs(r):
    m, encoding = r['modulus'], r.get('encoding')
    out = {}
    for side in 'AB':
        table = encoding.get(side) if isinstance(encoding, dict) else None
        rows = [t for t in table if isinstance(t, list)] if isinstance(table, list) else []
        out[side] = [i for i, w in enumerate(r['weights'][side])
                     if m and w % m == 0 and (not any(p[i] for p in r['planes'][side]) or (rows and not any(t[i] for t in rows)))]
    return out


def without_unused_limbs(r):
    """r with weights, planes, plane_moduli and products as the site shows them; r itself when nothing is left out."""
    unused = unused_limbs(r)
    if not unused['A'] and not unused['B']:
        return r
    limbs = {s: [i for i in range(len(r['weights'][s])) if i not in unused[s]] for s in 'AB'}
    columns = {s: [[p[i] for i in limbs[s]] for p in r['planes'][s]] for s in 'AB'}
    planes = {s: [j for j, p in enumerate(columns[s]) if any(p)] for s in 'AB'}
    products = [p for p in r['products'] if p['a'] in planes['A'] and p['b'] in planes['B']]
    if not limbs['A'] or not limbs['B'] or not products:
        return r
    out = dict(r, weights={s: [r['weights'][s][i] for i in limbs[s]] for s in 'AB'},
               planes={s: [columns[s][j] for j in planes[s]] for s in 'AB'},
               products=[dict(p, a=planes['A'].index(p['a']), b=planes['B'].index(p['b'])) for p in products])
    if r.get('plane_moduli'):
        out['plane_moduli'] = {s: [r['plane_moduli'][s][j] for j in planes[s]] for s in 'AB'}
    return out


def omitted_limbs(r, shown):
    return sum(len(r['weights'][s]) - len(shown['weights'][s]) for s in 'AB')
