"""Exact checks of single modular constructions (schema 2), with folded planes, holes and FP6 value sets.

A construction is the modulus m, the limb weights, the planes with their plane moduli, the reconstruction
coefficients and the denominator.  The checker searches an encoding of every residue (exact witnesses; a residue
without one is a hole), checks each stored plane value against its value set and plane modulus, and checks the
bilinear identity on every pair of served residues (literally while small, else on generators of the served sets).
A denominator den is split as d1 * d2 with d2 coprime to m and every prime of d1 dividing m; all checks work modulo
d1 * m, which is m for a unit denominator.  A construction whose denominator is not a unit needs a given encoding
table and is refused by the search.  With a given table, a failed fold rule is reported and the pairs are still
checked on that table.  For such a construction with a modulus up to TABLE_MAX, record() takes the table of literal
encodings (limbs and plane values in the value set, no folding), stores it and checks every pair on it.
Schema-1 rows keep their own checker (verify.modular).
"""
import hashlib
import itertools
import json
import math
import operator
import time
from math import gcd

VERSION = '2.0.0'
S = (-12, -8, -6, -4, -3, -2, -1, 0, 1, 2, 3, 4, 6, 8, 12)
SSET = frozenset(S)
_E2M3_POS = list(range(1, 16)) + list(range(16, 31, 2)) + list(range(32, 61, 4))
_E3M2_POS = list(range(1, 8)) + [8, 10, 12, 14, 16, 20, 24, 28, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224,
                                 256, 320, 384, 448]
ALPHABETS = {'e2m1': S,
             'e2m3': tuple(sorted({0} | {v for p in _E2M3_POS for v in (p, -p)})),
             'e3m2': tuple(sorted({0} | {v for p in _E3M2_POS for v in (p, -p)}))}
ALPHSET = {k: frozenset(v) for k, v in ALPHABETS.items()}
LIMB_SET_NAME = {'e2m1': '2xE2M1', 'e2m3': '8xE2M3', 'e3m2': '16xE3M2'}
assert len(ALPHABETS['e2m3']) == 63 and len(ALPHABETS['e3m2']) == 63 and len(ALPHABETS['e2m1']) == 15
# value set -> the larger value sets that contain it as integers; a construction checked on the smaller set holds on the larger
INCLUDED_IN = {'e2m1': ('e2m3', 'e3m2'), 'e2m3': (), 'e3m2': ()}
assert all(ALPHSET[small] <= ALPHSET[big] for small, bigs in INCLUDED_IN.items() for big in bigs)
AWE_FIELDS = ('schema_version', 'kind', 'modulus', 'weights', 'limb_sets', 'planes', 'plane_sets', 'products',
              'denominator', 'encoding')
EXT_FIELDS = ('plane_moduli', 'plane_values')
CAPS = {'literal_pairs': 40_000_000, 'dp_work': 30_000_000, 'literal_limbs': 15 ** 4}
SIDES = ('A', 'B')


class Fail(Exception):
    """A stable reason code."""


# ---------------------------------------------------------------- small exact helpers
_cls, _rep = {}, {}


def classes(m, al='e2m1'):
    key = (al, m)
    if key not in _cls:
        _cls[key] = frozenset(s % m for s in ALPHABETS[al])
    return _cls[key]


def complete(m, al='e2m1'):
    return len(classes(m, al)) == m


def rep(m, al='e2m1'):
    """class mod m -> the element of the set with the smallest |s| (positive first)."""
    key = (al, m)
    if key not in _rep:
        tab = {}
        for s in sorted(ALPHABETS[al], key=lambda s: (abs(s), s < 0)):
            tab.setdefault(s % m, s)
        _rep[key] = tab
    return _rep[key]


def lcm(*xs):
    out = 1
    for x in xs:
        out = out * x // gcd(out, x)
    return out


def dot(u, v):
    return sum(a * b for a, b in zip(u, v))


def det(M):
    n = len(M)
    if n == 1:
        return M[0][0]
    if n == 2:
        return M[0][0] * M[1][1] - M[0][1] * M[1][0]
    return sum((-1) ** j * M[0][j] * det([r[:j] + r[j + 1:] for r in M[1:]]) for j in range(n) if M[0][j])


def inv_mod_matrix(M, m):
    n = len(M)
    d = det(M) % m
    if gcd(d, m) != 1:
        return None
    di = pow(d, -1, m)
    if n == 1:
        return [[di]]
    adj = [[0] * n for _ in range(n)]
    for i in range(n):
        for j in range(n):
            minor = [r[:j] + r[j + 1:] for k, r in enumerate(M) if k != i]
            adj[j][i] = (-1) ** (i + j) * det(minor)
    return [[(adj[i][j] * di) % m for j in range(n)] for i in range(n)]


def egcd(a, b):
    """g = gcd(a, b) >= 0 and s, t with s a + t b = g."""
    s0, s1, t0, t1 = 1, 0, 0, 1
    while b:
        q, r = divmod(a, b)
        a, b = b, r
        s0, s1 = s1, s0 - q * s1
        t0, t1 = t1, t0 - q * t1
    if a < 0:
        a, s0, t0 = -a, -s0, -t0
    return a, s0, t0


def sym(x, m):
    x %= m
    return x - m if x > m // 2 else x


def packed(obj):
    return json.dumps(obj, sort_keys=True, separators=(',', ':'), ensure_ascii=True).encode('utf-8')


# ---------------------------------------------------------------- the normalized construction
def make(m, wA, wB, PA, PB, fA, fB, products, den=1, alph=('e2m1', 'e2m1')):
    if alph[0] not in ALPHABETS or alph[1] not in ALPHABETS:
        raise ValueError('unknown value set %r (known: %s)' % (alph, ', '.join(ALPHABETS)))
    return {'m': int(m), 'w': {'A': [int(x) for x in wA], 'B': [int(x) for x in wB]},
            'P': {'A': [[int(x) for x in r] for r in PA], 'B': [[int(x) for x in r] for r in PB]},
            'f': {'A': [int(x) for x in fA], 'B': [int(x) for x in fB]},
            'prod': [(int(a), int(b), int(c)) for a, b, c in products], 'den': int(den),
            'alph': {'A': alph[0], 'B': alph[1]}}


def den_split(den, m):
    """den = d1 * d2 with d2 coprime to m and every prime of d1 dividing m."""
    d2 = den
    g = gcd(d2, m)
    while g > 1:
        d2 //= g
        g = gcd(d2, m)
    return den // d2, d2


def check_modulus(c):
    """The modulus of every check: d1 * m (m for a unit denominator)."""
    if c['den'] < 1:
        return c['m']
    return den_split(c['den'], c['m'])[0] * c['m']


def side_alph(c, side):
    return c.get('alph', {}).get(side, 'e2m1')


def check_structure(c):
    m = c['m']
    if m < 2:
        raise Fail('bad_modulus')
    for side in SIDES:
        w, P, f = c['w'][side], c['P'][side], c['f'][side]
        if not w or not P or len(P) != len(f):
            raise Fail('bad_dimension')
        if any(len(r) != len(w) for r in P):
            raise Fail('bad_plane_length')
        if any(x < 1 or check_modulus(c) % x for x in f):
            raise Fail('plane_modulus_not_divisor')
    if not c['prod']:
        raise Fail('no_products')
    nA, nB = len(c['P']['A']), len(c['P']['B'])
    if any(not (0 <= a < nA and 0 <= b < nB) for a, b, _ in c['prod']):
        raise Fail('bad_product_index')
    if c['den'] < 1:
        raise Fail('bad_denominator')


def drop_zero_products(c):
    m = check_modulus(c)
    keep = [t for t in c['prod'] if t[2] % m]
    dropped = len(c['prod']) - len(keep)
    c['prod'] = keep
    return dropped


def check_fold(c):
    m = check_modulus(c)
    for a, b, num in c['prod']:
        need = m // gcd(num % m, m)
        if c['f']['A'][a] % need or c['f']['B'][b] % need:
            raise Fail('fold_rule_failed')


def check_identity(c):
    m, den = check_modulus(c), c['den']
    wA, wB, PA, PB = c['w']['A'], c['w']['B'], c['P']['A'], c['P']['B']
    for i in range(len(wA)):
        for j in range(len(wB)):
            s = sum(num * PA[a][i] * PB[b][j] for a, b, num in c['prod'])
            if (s - den * wA[i] * wB[j]) % m:
                raise Fail('identity_failed')


def cheap_checks(c, allow_fold_failure=False):
    """Structure, folding and identity checks (no encoding).  Returns (dropped zero products, fold rule holds).
    A failed fold rule raises unless allow_fold_failure; a given table is then checked on every pair instead."""
    check_structure(c)
    dropped = drop_zero_products(c)
    if not c['prod']:
        raise Fail('all_products_zero')
    fold_ok = True
    try:
        check_fold(c)
    except Fail:
        if not allow_fold_failure:
            raise
        fold_ok = False
    check_identity(c)
    return dropped, fold_ok


# ---------------------------------------------------------------- encoding search
_lit_cache = {}


def literal_rows(m, w, P, al='e2m1'):
    """residue -> (limbs in S^L, plane values in S, no folding); the smallest max|plane| then sum|limb| per residue.
    S is the side's value set; the search runs only when |S|^L fits a fixed budget (15^4)."""
    key = (al, m, tuple(w), tuple(map(tuple, P)))
    if key in _lit_cache:
        return _lit_cache[key]
    L = len(w)
    best = {}
    Sv, Sset = ALPHABETS[al], ALPHSET[al]
    if len(Sv) ** L <= CAPS['literal_limbs']:
        for a in itertools.product(Sv, repeat=L):
            vals = tuple(dot(pl, a) for pl in P)
            if all(v in Sset for v in vals):
                x = dot(w, a) % m
                k = (max(abs(v) for v in vals), sum(abs(v) for v in a))
                cur = best.get(x)
                if cur is None or k < cur[0]:
                    best[x] = (k, a, vals)
    out = {x: (list(a), list(v)) for x, (k, a, v) in best.items()}
    if len(_lit_cache) > 64:
        _lit_cache.clear()
    _lit_cache[key] = out
    return out


def constrained(m, w, P, f, al='e2m1'):
    """planes that restrict the encoding: S is not complete modulo the plane modulus and the plane is not 0 mod it."""
    out = []
    for k, (pl, fk) in enumerate(zip(P, f)):
        if complete(fk, al):
            continue
        coeff = [x % fk for x in pl]
        if not any(coeff):
            continue
        out.append(k)
    return out


def sumset_witness(m, w, P, f, cons, al='e2m1'):
    """Exact witnesses when the constrained planes complete to a basis with unit determinant.  None if not applicable."""
    L = len(w)
    if len(cons) > L:
        return None
    pool = [P[k] for k in range(len(P)) if k not in cons] + [[1 if i == j else 0 for i in range(L)] for j in range(L)]
    Minv = rows = None
    for extra in itertools.combinations(range(len(pool)), L - len(cons)):
        rows = [P[k] for k in cons] + [pool[e] for e in extra]
        Minv = inv_mod_matrix(rows, m)
        if Minv is not None:
            break
    if Minv is None:
        return None
    lam = [sum(w[i] * Minv[i][j] for i in range(L)) % m for j in range(L)]   # x = lam . v,  alpha = Minv v
    nc = len(cons)
    gam = [(lam[k] * f[cons[k]]) % m for k in range(nc)] + [lam[j] for j in range(nc, L)]
    G, U = m, [0] * L
    for i, g in enumerate(gam):
        g2, s, t = egcd(G, g)
        if g2 != G:
            U = [s * u for u in U]
            U[i] += t
            G = g2
    # sumset of the S choices modulo G, with one witness per class
    T = {0: ()}
    for k in range(nc):
        lk, new = lam[k], {}
        for t, ch in T.items():
            for s in ALPHABETS[al]:
                new.setdefault((t + lk * s) % G, ch + (s,))
        T = new
    out = {}
    for x in range(m):
        ch = T.get(x % G)
        if ch is None:
            continue
        base = sum(lam[k] * ch[k] for k in range(nc))
        r = (x - base) % m
        q = r // G                                       # r is a multiple of G
        tt = [(u * q) % m for u in U]
        v = [ch[k] + f[cons[k]] * tt[k] for k in range(nc)] + [tt[j] for j in range(nc, L)]
        alpha = [sum(Minv[i][j] * v[j] for j in range(L)) % m for i in range(L)]
        out[x] = alpha
    return out


def basis_plan(m, w, P, f, cons, al='e2m1'):
    """A face basis with unit determinant minimizing the enumeration size; None if no basis exists."""
    L = len(w)
    pool = []
    for k in range(len(P)):
        size = len(classes(f[k], al)) * (m // f[k]) if k in cons else m
        pool.append((P[k], size, k))
    for j in range(L):
        pool.append(([1 if i == j else 0 for i in range(L)], m, None))
    best = None
    for comb in itertools.combinations(range(len(pool)), L):
        cost = 1
        for t in comb:
            cost *= pool[t][1]
        if best is not None and cost >= best[0]:
            continue
        Minv = inv_mod_matrix([pool[t][0] for t in comb], m)
        if Minv is None:
            continue
        best = (cost, [pool[t] for t in comb], Minv)
    if best is None:
        return None
    cost, rows, Minv = best
    inbasis = {r[2] for r in rows if r[2] is not None}
    others = [k for k in cons if k not in inbasis]
    return cost * (1 + len(others)), rows, Minv, others


def basis_witness(m, w, P, f, cons, plan, al='e2m1'):
    """Exact witnesses: enumerate the admissible values of the basis faces, alpha = Minv v, check the other constrained faces."""
    cost, rows, Minv, others = plan
    L = len(w)
    lam = [sum(w[i] * Minv[i][k] for i in range(L)) % m for k in range(L)]
    mu = [[sum(P[j][i] * Minv[i][k] for i in range(L)) % f[j] for k in range(L)] for j in others]
    fo = [f[j] for j in others]
    ok_o = [classes(f[j], al) for j in others]
    doms = []
    for vec, size, k in rows:
        if k is not None and k in cons:
            cl = classes(f[k], al)
            doms.append([v for v in range(m) if v % f[k] in cl])
        else:
            doms.append(list(range(m)))
    out = {}
    no = len(others)
    for v in itertools.product(*doms):
        x = sum(l * vk for l, vk in zip(lam, v)) % m
        if x in out:
            continue
        good = True
        for t in range(no):
            if sum(a * vk for a, vk in zip(mu[t], v)) % fo[t] not in ok_o[t]:
                good = False
                break
        if good:
            out[x] = [sum(Minv[i][k] * v[k] for k in range(L)) % m for i in range(L)]
    return out


def dp_witness(m, w, P, f, cons, cap, al='e2m1'):
    """Exact witnesses by a dynamic programme over limbs; state = (partial residue, open constrained plane values)."""
    L = len(w)
    info = []
    for k in cons:
        fk = f[k]
        coeff = [x % fk for x in P[k]]
        info.append((fk, coeff, classes(fk, al)))
    periods = []
    for i in range(L):
        per = m // gcd(w[i] % m, m)
        for fk, coeff, _ in info:
            if coeff[i]:
                per = lcm(per, fk // gcd(coeff[i], fk))
        periods.append(per)

    def est(order):
        cost, prefix, seen = 0, 1, set()
        for i in order:
            seen.add(i)
            open_mod = 1
            for fk, coeff, _ in info:
                sup = {j for j in range(L) if coeff[j]}
                if sup & seen and not sup <= seen:
                    open_mod *= fk
            states = min(prefix, m * open_mod)
            cost += states * periods[i]
            prefix *= periods[i]
        return cost

    orders = [list(range(L)), sorted(range(L), key=lambda i: periods[i]), list(range(L))[::-1]]
    order = min(orders, key=est)
    if est(order) > 4 * cap:
        raise Fail('coverage_cost_cap')
    last = []
    for fk, coeff, _ in info:
        pos = [order.index(j) for j in range(L) if coeff[j]]
        last.append(max(pos))
    open_ = list(range(len(info)))
    states = {(0, tuple(0 for _ in open_)): ()}
    work = 0
    for step, i in enumerate(order):
        wi, per = w[i] % m, periods[i]
        inc = [info[t][1][i] for t in open_]
        mods = [info[t][0] for t in open_]
        okset = [info[t][2] for t in open_]
        closing = [last[t] == step for t in open_]
        work += len(states) * per
        if work > cap:
            raise Fail('coverage_cost_cap')
        no = len(open_)
        new = {}
        for (x, parts), pref in states.items():
            for a in range(per):
                vals = []
                ok = True
                for t in range(no):
                    v = (parts[t] + inc[t] * a) % mods[t]
                    if closing[t]:
                        if v not in okset[t]:
                            ok = False
                            break
                    else:
                        vals.append(v)
                if ok:
                    key = ((x + wi * a) % m, tuple(vals))
                    if key not in new:
                        new[key] = pref + ((i, a),)
        states = new
        open_ = [open_[t] for t in range(no) if not closing[t]]
    out = {}
    for (x, _), pref in states.items():
        if x not in out:
            alpha = [0] * L
            for i, a in pref:
                alpha[i] = a
            out[x] = alpha
    return out, work


def encode_side(c, side, cap=None):
    """list over residues: None (hole) or (kind, limbs, plane values); kind 'S' = schema-1 row, 'Z' = folded/virtual."""
    m, w, P, f = c['m'], c['w'][side], c['P'][side], c['f'][side]
    al = side_alph(c, side)
    cap = CAPS['dp_work'] if cap is None else cap
    enc = [None] * m
    for x, (a, vals) in literal_rows(m, w, P, al).items():
        enc[x] = ('S', a, vals)
    missing = [x for x in range(m) if enc[x] is None]
    method = 'literal'
    if missing:
        cons = constrained(m, w, P, f, al)
        wit = sumset_witness(m, w, P, f, cons, al)
        method = 'sumset'
        if wit is None:
            try:
                wit, _ = dp_witness(m, w, P, f, cons, cap, al)
                method = 'dp'
            except Fail as e:
                if str(e) != 'coverage_cost_cap':
                    raise
                plan = basis_plan(m, w, P, f, cons, al)
                if plan is None or plan[0] > cap:
                    raise
                wit = basis_witness(m, w, P, f, cons, plan, al)
                method = 'basis'
        for x in missing:
            alpha = wit.get(x)
            if alpha is None:
                continue
            vals = []
            for pl, fk in zip(P, f):
                vals.append(rep(fk, al).get(dot(pl, alpha) % fk))
            if any(v is None for v in vals):
                raise Fail('witness_plane_outside_S')
            enc[x] = ('Z', list(alpha), vals)
    return enc, method


def check_table(c, side, enc):
    m, w, P, f = c['m'], c['w'][side], c['P'][side], c['f'][side]
    sset = ALPHSET[side_alph(c, side)]
    if len(enc) != m:
        raise Fail('table_length')
    for x, e in enumerate(enc):
        if e is None:
            continue
        kind, alpha, vals = e
        if len(alpha) != len(w) or len(vals) != len(P):
            raise Fail('table_dimension')
        if dot(w, alpha) % m != x:
            raise Fail('residue_encoding_failed')
        for pl, fk, v in zip(P, f, vals):
            if v not in sset:
                raise Fail('plane_outside_S')
            if (v - dot(pl, alpha)) % fk:
                raise Fail('plane_value_mismatch')
            if kind == 'S' and v != dot(pl, alpha):
                raise Fail('schema1_plane_not_literal')
        if kind == 'S' and any(a not in sset for a in alpha):
            raise Fail('schema1_limb_outside_S')


# ---------------------------------------------------------------- all residue pairs
def pairs_literal(c, encA, encB):
    m, den, prod = check_modulus(c), c['den'], c['prod']
    Bs = []
    for y, e in enumerate(encB):
        if e is not None:
            G = e[2]
            Bs.append(((den * y) % m, [G[b] for _, b, _ in prod]))
    n = 0
    for x, e in enumerate(encA):
        if e is None:
            continue
        F = e[2]
        ks = [(num * F[a]) % m for a, _, num in prod]
        for dy, G in Bs:
            if (sum(map(operator.mul, ks, G)) - dy * x) % m:
                return False, n
            n += 1
    return True, n


def module_basis(rows, n, m):
    """Triangular generators of span_Z(rows) + m Z^n; the pivot of row k divides m."""
    B = [[m if j == k else 0 for j in range(n)] for k in range(n)]
    for r in rows:
        r = [x % m for x in r]
        for k in range(n):
            if not r[k]:
                continue
            b = B[k]
            g, s, t = egcd(b[k], r[k])
            u, v = b[k] // g, r[k] // g
            nb = [s * bi + t * ri for bi, ri in zip(b, r)]
            nr = [u * ri - v * bi for bi, ri in zip(b, r)]
            B[k] = [nb[j] if j <= k else nb[j] % m for j in range(n)]
            r = [x % m for x in nr]
        if any(r):
            raise Fail('module_internal')
    return B


def pairs_module(c, encA, encB):
    m, den, prod = check_modulus(c), c['den'], c['prod']
    nA = len(c['P']['A'])
    U = [list(e[2]) + [x] for x, e in enumerate(encA) if e is not None]
    V = []
    for y, e in enumerate(encB):
        if e is None:
            continue
        G = e[2]
        v = [0] * (nA + 1)
        for a, b, num in prod:
            v[a] += num * G[b]
        v[nA] = -den * y
        V.append(v)
    BU = module_basis(U, nA + 1, m)
    BV = module_basis(V, nA + 1, m)
    return all(dot(u, v) % m == 0 for u in BU for v in BV)


# ---------------------------------------------------------------- the whole check
def verify(c, claims=None, enc_given=None, literal_cap=None, dp_cap=None):
    """Returns (result dict, encA, encB).  result['ok'] False carries 'reason'."""
    t0 = time.time()
    claims = claims or {}
    res = {'ok': False, 'reason': None, 'notes': []}
    encA = encB = None
    try:
        dropped, fold_ok = cheap_checks(c, allow_fold_failure=enc_given is not None)
        if dropped:
            res['notes'].append('dropped_zero_products:%d' % dropped)
        res['fold_rule'] = fold_ok
        if not fold_ok:
            res['notes'].append('fold_rule_failed')
        m, T = c['m'], len(c['prod'])
        if 'products' in claims and claims['products'] != T:
            raise Fail('product_count_mismatch')
        if 'planes' in claims and list(claims['planes']) != [len(c['P']['A']), len(c['P']['B'])]:
            raise Fail('plane_count_mismatch')
        res['den_unit'] = gcd(c['den'], m) == 1
        res['check_modulus'] = check_modulus(c)
        methods = {}
        if enc_given is None and not res['den_unit']:
            raise Fail('nonunit_denominator_needs_table')
        if enc_given is not None:
            encA, encB = enc_given
            methods = {'A': 'given', 'B': 'given'}
        else:
            encA, methods['A'] = encode_side(c, 'A', dp_cap)
            if (c['w']['A'] == c['w']['B'] and c['P']['A'] == c['P']['B'] and c['f']['A'] == c['f']['B']
                    and side_alph(c, 'A') == side_alph(c, 'B')):
                encB, methods['B'] = encA, methods['A']
            else:
                encB, methods['B'] = encode_side(c, 'B', dp_cap)
        check_table(c, 'A', encA)
        check_table(c, 'B', encB)
        holes = [sum(1 for e in encA if e is None), sum(1 for e in encB if e is None)]
        res['holes'] = holes
        res['coverage_method'] = methods
        if 'holes' in claims and claims['holes'] is not None:
            ch = list(claims['holes'])
            if any(h > k for h, k in zip(holes, ch)):
                raise Fail('more_holes_than_claimed')
            if holes != ch:
                res['notes'].append('fewer_holes_than_claimed:%s<%s' % (holes, ch))
        if 'hole_share' in claims and claims['hole_share'] is not None and 'holes' not in claims:
            if max(holes) / m > claims['hole_share'] + 0.5 / m + 1e-9:
                raise Fail('more_holes_than_claimed')
        nx, ny = m - holes[0], m - holes[1]
        if nx == 0 or ny == 0:
            raise Fail('no_served_residue')
        lit_cap = CAPS['literal_pairs'] if literal_cap is None else literal_cap
        res['literal_pairs'] = None
        if nx * ny * T <= lit_cap:
            ok, n = pairs_literal(c, encA, encB)
            if not ok:
                raise Fail('residue_pair_failed')
            res['literal_pairs'] = n
        if not pairs_module(c, encA, encB):
            raise Fail('module_pairs_failed')
        if not fold_ok:
            res['notes'].append('table_pairs_ok')
        res['n_served'] = [nx, ny]
        maxA = [max(abs(e[2][k]) for e in encA if e is not None) for k in range(len(c['P']['A']))]
        maxB = [max(abs(e[2][k]) for e in encB if e is not None) for k in range(len(c['P']['B']))]
        bounds = [maxA[a] * maxB[b] for a, b, _ in c['prod']]
        nz = [b for b in bounds if b]
        res['product_bounds'] = bounds
        res['max_k'] = min((2 ** 24 - 1) // b for b in nz) if nz else None
        one = sum(abs(sym(num, check_modulus(c))) * bd for (_, _, num), bd in zip(c['prod'], bounds))
        res['k_one_accumulator'] = (2 ** 24 - 1) // one if one else None
        res['alphabet'] = [side_alph(c, 'A'), side_alph(c, 'B')]
        res['face_max'] = {'A': maxA, 'B': maxB}
        res['max_k_int32'] = min((2 ** 31 - 1) // b for b in nz) if nz else None
        res['k_one_accumulator_int32'] = (2 ** 31 - 1) // one if one else None
        res['ok'] = True
    except Fail as e:
        res['reason'] = str(e)
    except MemoryError:
        encA = encB = None
        res['reason'] = 'memory_cap'
    except (ValueError, ZeroDivisionError, IndexError, TypeError, KeyError) as e:
        res['reason'] = 'malformed:%s' % type(e).__name__
    res['seconds'] = round(time.time() - t0, 3)
    return res, encA, encB


# ---------------------------------------------------------------- schema-2 records
SET_KEY = {name: key for key, name in LIMB_SET_NAME.items()}
ID_FIELDS = ('schema_version', 'kind', 'modulus', 'weights', 'limb_sets', 'planes', 'plane_sets', 'plane_moduli',
             'products', 'denominator')
TABLE_MAX = 256
HOLE_SET_MAX = 64
SOURCE_FIELDS = ('prior_checker_versions',)   # where the construction came from; not rebuilt from the construction
RECON_NOTE = ('Only this procedure is checked: keep the sum of the products modulo d1*m (verified.check_modulus), divide by d1, '
              'then multiply by the inverse of d2 modulo m (verified.den_split). Keeping the sum modulo denominator*m and '
              'dividing by the whole denominator is a different procedure; it is not covered by this check and can fail on '
              'some residue pairs when d2 > 1.')


def construction(s):
    """The construction of a schema-2 record; every plane on a side uses the same value set."""
    m = s['modulus']
    alph = []
    for side in SIDES:
        names = set(s['plane_sets'][side])
        if len(names) != 1 or next(iter(names)) not in SET_KEY:
            raise Fail('unsupported_plane_sets')
        alph.append(SET_KEY[next(iter(names))])
    pm = s.get('plane_moduli') or {side: [m] * len(s['planes'][side]) for side in SIDES}
    prods = [(t['a'], t['b'], t['numerator']) for t in s['products']]
    return make(m, s['weights']['A'], s['weights']['B'], s['planes']['A'], s['planes']['B'], pm['A'], pm['B'], prods,
                s['denominator'], alph=tuple(alph))


def literal_table(c, side):
    """The literal encodings of one side as a table: limbs and plane values in the value set, plane values unfolded."""
    m, w, P = c['m'], c['w'][side], c['P'][side]
    rows = literal_rows(m, w, P, side_alph(c, side))
    return [('S', list(rows[x][0]), list(rows[x][1])) if x in rows else None for x in range(m)]


def record(c, date, table_max=TABLE_MAX):
    """Verify a construction and return its schema-2 record; raises Fail with the reason code.
    A denominator that is not a unit modulo m is checked on the literal table, which is then stored (m <= table_max)."""
    m = c['m']
    literal = gcd(c['den'], m) != 1
    if literal and m > table_max:
        raise Fail('nonunit_denominator_needs_table')
    res, enc_a, enc_b = verify(c, enc_given=(literal_table(c, 'A'), literal_table(c, 'B')) if literal else None)
    if not res['ok']:
        raise Fail(res['reason'])
    enc = {'A': enc_a, 'B': enc_b}
    stored = all(e[0] == 'S' for e in enc_a + enc_b if e is not None)
    rec = {'schema_version': 2, 'kind': 'modular', 'modulus': m,
           'weights': {s: list(c['w'][s]) for s in SIDES},
           'limb_sets': {s: [LIMB_SET_NAME[side_alph(c, s)] if stored else 'Z_m'] * len(c['w'][s]) for s in SIDES},
           'planes': {s: [list(r) for r in c['P'][s]] for s in SIDES},
           'plane_sets': {s: [LIMB_SET_NAME[side_alph(c, s)]] * len(c['P'][s]) for s in SIDES},
           'plane_moduli': {s: list(c['f'][s]) for s in SIDES},
           'products': [{'a': a, 'b': b, 'numerator': num} for a, b, num in c['prod']],
           'denominator': c['den']}
    rec['id'] = 'awem2_' + hashlib.sha256(packed({k: rec[k] for k in ID_FIELDS})).hexdigest()
    holes = {s: [x for x, e in enumerate(enc[s]) if e is None] for s in SIDES}
    # search: every limb vector modulo m whose plane values lie in the value set modulo each plane modulus (exact count);
    # literal_table: limbs and plane values literally in the value set, so folded encodings may serve some holes (upper bound)
    rec['holes'] = {'A': len(holes['A']), 'B': len(holes['B']),
                    'exact': not literal or not (holes['A'] or holes['B']), 'method': 'literal_table' if literal else 'search'}
    if (holes['A'] or holes['B']) and max(len(holes['A']), len(holes['B'])) <= HOLE_SET_MAX:
        rec['hole_set'] = holes
    if m <= table_max:
        rec['encoding'] = {s: [list(e[1]) if e else None for e in enc[s]] for s in SIDES}
        rec['plane_values'] = {s: [list(e[2]) if e else None for e in enc[s]] for s in SIDES}
    rec['accumulation'] = {'model': 'separate_products_then_exact_integer_reconstruction',
                           'product_bounds': res['product_bounds'], 'max_k': res['max_k'],
                           'max_k_int32': res['max_k_int32']}
    nx, ny = res['n_served']
    d1, d2 = den_split(c['den'], m)
    rec['reconstruction'] = {'procedure': 'none'} if c['den'] == 1 else \
        {'procedure': 'divide_d1_then_multiply_d2_inverse', 'note': RECON_NOTE}
    rec['verified'] = {'method': 'full_pairs' if res['literal_pairs'] is not None else 'module_generators',
                       'identity': 'modulo_p' if d1 == 1 else 'modulo_dm',
                       'check_modulus': res['check_modulus'], 'den_split': [d1, d2], 'fold_rule': res.get('fold_rule', True),
                       'encoding': 'served_residues' if holes['A'] or holes['B'] else 'all_residues',
                       'n_pairs': nx * ny, 'n_residues': {'A': nx, 'B': ny}, 'verifier_version': VERSION, 'date': date}
    if not rec['verified']['fold_rule']:
        # the stored plane values are those of the table: another value of S in the same class breaks the identity
        rec['verified']['plane_values_binding'] = True
    return rec


def check_record(s, rebuild=True):
    """Recheck a record.  Schema 1 uses verify.modular; schema 2 is rebuilt from its construction and compared
    field by field (the encoding search is deterministic).  rebuild=False checks the id and the identity only."""
    if s.get('schema_version') == 1:
        from verify.modular import verify as verify_v1
        return verify_v1(s)
    c = construction(s)
    if not rebuild:
        cheap_checks(c, allow_fold_failure=s['verified'].get('fold_rule') is False)
        base = {k: s[k] for k in ID_FIELDS}
        if s['id'] != 'awem2_' + hashlib.sha256(packed(base)).hexdigest():
            raise Fail('id_mismatch')
        return {'id': s['id'], 'rebuilt': False}
    again = record(c, s['verified']['date'], table_max=s['modulus'] if 'encoding' in s else 0)
    for key in sorted((set(again) | set(s)) - set(SOURCE_FIELDS)):
        if again.get(key) != s.get(key):
            raise Fail('record_mismatch:' + key)
    return {'id': s['id'], 'rebuilt': True}
