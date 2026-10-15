"""Hash-checked retrieval of versioned, exact integer constructions."""
import hashlib
import json
from pathlib import Path
import re
from urllib.parse import urljoin, urlparse
from urllib.request import urlopen

__version__ = '0.1.0'


class Catalog:
    """Read a local data directory or an HTTPS data base URL, pinned to an index hash."""
    def __init__(self, base, *, version, index_sha256):
        self.base = str(base)
        if urlparse(self.base).scheme not in ('', 'https'):
            raise ValueError('base must be a local directory or HTTPS URL')
        if not re.fullmatch(r'[0-9a-f]{64}', index_sha256):
            raise ValueError('an exact index SHA-256 is required')
        self.index = self._read('index.json', index_sha256)
        if self.index['data_version'] != version:
            raise ValueError('data version mismatch')
        self.version = version
        self.index_sha256 = index_sha256
        self._shards = {}
        ref = self.index['search']
        self.search = self._read(ref['path'], ref['sha256'])

    def _read(self, path, digest):
        if not re.fullmatch(r'(index\.json|(solutions|search|moduli|modular)/[A-Za-z0-9_.-]+\.json)', path):
            raise ValueError('invalid catalog path')
        if self.base.startswith('https://'):
            with urlopen(urljoin(self.base.rstrip('/')+'/', path), timeout=30) as response:
                raw = response.read(32*1024*1024+1)
        else:
            file = Path(self.base)/path
            if file.stat().st_size > 32*1024*1024:
                raise ValueError('catalog file exceeds resource limit')
            raw = file.read_bytes()
        if len(raw)>32*1024*1024 or hashlib.sha256(raw).hexdigest()!=digest:
            raise ValueError('catalog hash mismatch')
        return json.loads(raw)

    def get(self, construction_id):
        if not re.fullmatch(r'awe1_[0-9a-f]{64}', construction_id):
            raise ValueError('invalid construction ID')
        path = f'solutions/{construction_id[5:7]}.json'
        if path not in self._shards:
            entry = next((x for x in self.index['files'] if x['path']==path), None)
            if entry is None: raise KeyError(construction_id)
            self._shards[path] = {s['id']:s for s in self._read(path, entry['sha256'])}
        # A caller may edit a returned construction without corrupting the cache.
        return json.loads(json.dumps(self._shards[path][construction_id]))

    def find(self, a=8, b=8, *, products=0, limbs=0, planes=0, denominator=0,
             min_k=0, weights=(), mixed=False, product_cost=1, plane_cost=0):
        if min(a,b)<1 or min(products,limbs,planes,denominator,min_k,product_cost,plane_cost)<0:
            raise ValueError('invalid search condition')
        rows=[]
        for group in self.search['groups']:
            if group['width_a']<a or group['width_b']<b or (products and group['r']>products) or (group['mixed'] and not mixed):
                continue
            for row in self._read(group['path'],group['sha256']):
                if limbs and (row[3]!=limbs or row[4]!=limbs): continue
                if planes and row[6]+row[7]>planes: continue
                if denominator and row[8]!=denominator: continue
                if min_k and row[9] is not None and row[9]<min_k: continue
                if not all(w in row[10] or w in row[11] for w in weights): continue
                rows.append(row)
        rows.sort(key=lambda r:(r[5]*product_cost+(r[6]+r[7])*plane_cost,r[5],r[0]))
        return [dict(zip(self.search['columns'],r)) for r in rows]

    def modular_catalog(self):
        """Read supplied modular selections through both pinned hash references."""
        ref = self.index.get('modular')
        if ref is None: return {'solutions': [], 'sets': []}
        if ref['path'] != 'modular/index.json': raise ValueError('invalid modular index')
        index = self._read(ref['path'], ref['sha256'])
        if index['path'] != 'catalog.json' or index['data_version'] != self.version:
            raise ValueError('invalid modular index')
        data = self._read('modular/catalog.json', index['sha256'])
        if data['data_version'] != self.version: raise ValueError('data version mismatch')
        return data

    def get_modular(self, construction_id):
        if not re.fullmatch(r'awems?1_[0-9a-f]{64}', construction_id):
            raise ValueError('invalid modular construction ID')
        data = self.modular_catalog()
        for record in data['solutions'] + data['sets']:
            if record['id'] == construction_id: return record
        raise KeyError(construction_id)

    def find_modular(self, bits=53, k=8192, *, product_cost=1, plane_cost=0):
        import math
        if any(type(x) is not int or x < 1 for x in (bits, k)):
            raise ValueError('invalid modular search condition')
        if any(type(x) not in (int, float) or not math.isfinite(x) or x < 0 for x in (product_cost, plane_cost)):
            raise ValueError('invalid modular search condition')
        rows = [s for s in self.modular_catalog()['sets']
                if s['magnitude_bits'] >= bits and int(s['verification']['max_k']) >= k]
        return sorted(rows, key=lambda s: (s['verification']['products']*product_cost+s['verification']['faces']*plane_cost,
                                          s['verification']['products'], s['id']))

    def verify_modular_set(self, construction_id):
        from verify.modular import verify_set
        data = self.modular_catalog()
        record = next(s for s in data['sets'] if s['id'] == construction_id)
        return verify_set(record, {s['id']: s for s in data['solutions']})


def verify(solution, *, pairs=False):
    """Independently recheck the full encoding domain and exact reconstruction."""
    from verify.core import verify as exact
    return exact(solution, pairs=pairs)


def verify_modular(solution):
    """Check polynomial congruence, supplied residue encoding, and all residue pairs."""
    from verify.modular import verify as exact
    return exact(solution)


def modular_example(solution, a, b):
    verify_modular(solution)
    if type(a) is not int or type(b) is not int: raise ValueError('integer operands required')
    p = solution['modulus']
    residues = {'A': a % p, 'B': b % p}
    limbs = {side: list(solution['encoding'][side][residues[side]]) for side in ('A', 'B')}
    faces = {side: [sum(c*x for c, x in zip(plane, limbs[side])) for plane in solution['planes'][side]] for side in ('A', 'B')}
    products = [faces['A'][t['a']]*faces['B'][t['b']] for t in solution['products']]
    total = sum(t['numerator']*x for t, x in zip(solution['products'], products))
    return {'operands': {'A': a, 'B': b}, 'modulus': p, 'residues': residues,
            'limbs': limbs, 'planes': faces, 'products': products,
            'numerator': total, 'result_modulo_p': total % p}


def example(solution, a, b):
    """Return the deterministic limb, plane, product and exact reconstruction steps."""
    from verify.core import encode_side, verify as exact
    exact(solution)
    if type(a) is not int or type(b) is not int: raise ValueError('integer operands required')
    encoded={};faces={}
    for side,n in [('A',a),('B',b)]:
        table,_ = encode_side(solution,side)
        if n not in table: raise ValueError('operand outside verified domain')
        encoded[side]=list(table[n])
        faces[side]=[sum(c*x for c,x in zip(p,table[n])) for p in solution['planes'][side]]
    products=[faces['A'][p['a']]*faces['B'][p['b']] for p in solution['products']]
    numerator=sum(p['numerator']*v for p,v in zip(solution['products'],products))
    denominator=solution['denominator']
    if numerator!=denominator*a*b: raise ValueError('reconstruction mismatch')
    return {'operands':{'A':a,'B':b},'limbs':encoded,'planes':faces,'products':products,
            'numerator':numerator,'denominator':denominator,'result':a*b}
