"""Count sign symmetry of the actual encoding plane sets, without changing encodings."""
import argparse
from collections import Counter
from concurrent.futures import ProcessPoolExecutor
from functools import lru_cache
from hashlib import sha256
from itertools import product
import json
from pathlib import Path
import sys
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from verify.core import SETS

@lru_cache(maxsize=256)
def legal_arrays(limbs, planes, plane_sets):
    if np.prod([len(SETS[s]) for s in limbs]) > 1000000:
        raise ValueError('representation_limit')
    t = np.array(list(product(*(SETS[s] for s in limbs))), dtype=np.int64)
    f = t @ np.array(planes, dtype=np.int64).T
    ok = np.ones(len(t), dtype=bool)
    for i, name in enumerate(plane_sets):
        ok &= np.isin(f[:, i], SETS[name])
    return t[ok], f[ok]

def record_sets(s, side):
    planes = s['planes'][side]
    if 'encoding' in s:
        raw = s['encoding'][side]
        tuples = [t for t in (raw.values() if isinstance(raw, dict) else raw) if t is not None]
        if not tuples:
            raise ValueError('encoding_missing')
        f = [[sum(a*b for a,b in zip(p,t)) for p in planes] for t in tuples]
        if s.get('plane_moduli'):
            for row in f:
                for i, m in enumerate(s['plane_moduli'][side]):
                    if m:
                        choices = sorted((v for v in SETS['2xE2M1'] if (v-row[i]) % m == 0), key=lambda v:(abs(v),v))
                        if not choices:
                            raise ValueError('plane_not_storable')
                        row[i] = choices[0]
        return [sorted(set(row[i] for row in f)) for i in range(len(planes))]
    weights = s['weights'][side]
    limbs = tuple(s['limb_sets'][side])
    limits = [max(map(abs, SETS[n])) for n in limbs]
    if any(sum(abs(a)*b for a,b in zip(row,limits)) > 2**63-1 for row in [weights,*planes]):
        raise ValueError('integer_bound')
    t,f = legal_arrays(limbs, tuple(map(tuple,planes)), tuple(s['plane_sets'][side]))
    values = t @ np.array(weights,dtype=np.int64)
    unique, first = np.unique(values,return_index=True)
    lo,hi = s['domain'][side]
    keep = first[(unique >= lo) & (unique <= hi)]
    if len(keep) != hi-lo+1:
        raise ValueError('encoding_missing')
    # np.unique returns the first legal tuple in stored (lexicographic) order.
    return [np.unique(f[keep,i]).tolist() for i in range(len(planes))]

def measure(s):
    out={'id':s['id'],'kind':s.get('kind','integer'),'sides':{}}
    for side in ['A','B']:
        try:
            if side=='B' and all(s.get(k,{}).get('A')==s.get(k,{}).get('B') for k in ['weights','planes','limb_sets','plane_sets','domain','encoding','plane_moduli']):
                out['sides'][side]=out['sides']['A']
                continue
            sets=record_sets(s,side)
            out['sides'][side]={'values':sets,'asymmetric':[i for i,vs in enumerate(sets) if set(vs)!=set(-v for v in vs)],'domain':s.get('domain',{}).get(side)}
        except (KeyError,ValueError,TypeError,IndexError) as e:
            out['sides'][side]={'unknown':str(e)}
    return out

def shard(path):
    return [measure(s) for s in json.loads(Path(path).read_text())]

def main():
    p=argparse.ArgumentParser();p.add_argument('--output',type=Path,required=True);p.add_argument('--details',type=Path,required=True);p.add_argument('--workers',type=int,default=4);a=p.parse_args()
    if not 1<=a.workers<=8:p.error('workers must be 1..8')
    files=sorted((ROOT/'data/solutions').glob('*.json'));counts=Counter();examples=[];seen=set();categories={};all_records=[]
    def emit(r,stream):
        if r['id'] in seen:return
        seen.add(r['id']);counts['constructions']+=1;cat=categories.setdefault(r['kind'],Counter());cat['constructions']+=1;asym=False;unknown=False
        for side,v in r['sides'].items():
            counts['sides']+=1
            if 'unknown' in v:counts['unknown_sides']+=1;unknown=True;continue
            counts['measured_sides']+=1;counts['planes']+=len(v['values']);counts['asymmetric_planes']+=len(v['asymmetric']);counts['asymmetric_sides']+=bool(v['asymmetric']);asym |= bool(v['asymmetric'])
        counts['asymmetric_constructions']+=asym;counts['unknown_constructions']+=unknown;cat['asymmetric_constructions']+=asym;cat['unknown_constructions']+=unknown
        if asym and len(examples)<12:examples.append(r)
        stream.write(json.dumps(r,separators=(',',':'))+'\n')
    a.details.parent.mkdir(parents=True,exist_ok=True)
    with a.details.open('w') as stream, ProcessPoolExecutor(max_workers=a.workers) as pool:
        for i,rows in enumerate(pool.map(shard,files)):
            for r in rows:emit(r,stream)
            if i%32==0:print('shards',i+1,'constructions',len(seen),flush=True)
        for name in ['catalog','powers','fp32','fp32-history']:
            for s in json.loads((ROOT/f'data/modular/{name}.json').read_text())['solutions']:emit(measure(s),stream)
        for j in json.loads((ROOT/'data/visualization/joint-examples.json').read_text())['references']:
            s={'id':'joint_'+j['id'],'kind':'joint','weights':{s:j['weights'] for s in ['A','B']},'planes':{s:j['planes'] for s in ['A','B']},'encoding':{s:j['encoding'] for s in ['A','B']},'domain':{s:j['domain'] for s in ['A','B']}}
            emit(measure(s),stream)
        # Figure-only records without an encoding table cannot be assigned measured sets.
        for w in json.loads((ROOT/'data/visualization/modsets.json').read_text())['widths']:
            for lane in w['rows']:
                for c in lane['mods']:
                    if c['id'] not in seen:
                        # Match the same geometry as the site's connect()/pool() before counting.
                        all_records.append(c)
    # Resolve aliases by the same canonical geometry: modulus, weights and product planes.
    def geometry(c):
        ps=c.get('planes');return json.dumps([c['modulus'],c['weights'],sorted((ps['A'][p['a']],ps['B'][p['b']]) for p in c['products']) if ps else None],sort_keys=True)
    known={geometry(s) for name in ['catalog','powers','fp32','fp32-history'] for s in json.loads((ROOT/f'data/modular/{name}.json').read_text())['solutions'] if not s.get('plane_moduli')}
    with a.details.open('a') as stream:
        for c in all_records:
            if geometry(c) not in known:emit({'id':c['id'],'kind':'figure_only','sides':{s:{'unknown':'encoding_not_recorded'} for s in ['A','B']}},stream)
    result={'schema_version':1,'method':'saved_encoding_or_first_legal_tuple_in_stored_order','script_sha256':sha256(Path(__file__).read_bytes()).hexdigest(),'details_sha256':sha256(a.details.read_bytes()).hexdigest(),'counts':dict(counts),'categories':categories,'examples':examples}
    a.output.parent.mkdir(parents=True,exist_ok=True);a.output.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps(result['counts']),flush=True)
if __name__=='__main__':main()
