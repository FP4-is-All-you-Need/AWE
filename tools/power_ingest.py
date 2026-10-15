"""Import saved power-modulus selections and their evidence; no search or generators."""
import argparse
from collections import Counter
from datetime import date
from hashlib import sha256
import json
from math import prod, gcd
from pathlib import Path
import re
from tools.modular_ingest import convert
from verify.power import measure, VERSION
from verify.folded_encoding import encoding


def digest(p): return sha256(p.read_bytes()).hexdigest()
def packed(x): return json.dumps(x, sort_keys=True, separators=(',',':')).encode()
def identify(x, prefix): return prefix+sha256(packed(x)).hexdigest()
def definition(s):
    return {k:v for k,v in s.items() if k not in ('id','verified','measurement','accumulation','provenance','source_claims','encoding_origin','correction')}

def both(x): return {'A': x, 'B': x}


def convert_power(r):
    if 'encoding_faces' not in r:
        s = convert(r)
    else:
        n = {'cube3': 3, 'fourth4': 4}.get(r['mechanism'])
        if n is None: raise ValueError('unsupported_saved_form')
        p = r['modulus']
        q = next((q for q in range(2, p+1) if q**n >= p), None)
        if q is None or q**n != p: raise ValueError('invalid_power')
        planes = [[int(i==j) for i in range(n)] for j in range(n)]
        plan = r['acc_plan']; coefficients = [0]*len(r['face_pairs'])
        for a, entries in enumerate(plan['accs']):
            for e in entries: coefficients[e['prod']] += e['w']*(1 if a==0 else plan['gamma'])
        inv = pow(plan['lam0'], -1, p)
        s = {'kind':'modular', 'modulus':p, 'weights':both([q**i for i in range(n)]),
             'planes':both(planes), 'limb_sets':both(['2xE2M1']*n), 'plane_sets':both(['2xE2M1']*n),
             'products':[{'a':a,'b':b,'numerator':c*inv%p} for (a,b),c in zip(r['face_pairs'],coefficients)],
             'denominator':1,'encoding':both(r['encoding_faces']), 'accumulation_plan':plan}
    s['schema_version'] = 2
    s['limbs_stored'] = {side:[True]*len(s['weights'][side]) for side in ('A','B')}
    if len(s['products']) != r['products']: raise ValueError('product_count_mismatch')
    return s


def convert_folded(r):
    pairs = r.get('pairs')
    if pairs is None: pairs = [[i,i] for i in range(len(r['coefficients']))]
    expanded = len(pairs) != r['products']
    terms=[]
    for (a,b),c in zip(pairs,r['coefficients']):
        terms.append({'a':a,'b':b,'numerator':c})
        if expanded and a!=b: terms.append({'a':b,'b':a,'numerator':c})
    if len(terms)!=r['products']: raise ValueError('product_count_mismatch')
    s={'schema_version':2,'kind':'modular','modulus':r['p'],'denominator':1,'products':terms}
    for key, field in [('weights','weights'),('planes','faces'),('plane_moduli','face_moduli')]:
        s[key]={side:r[field+'_'+side.lower()] for side in ('A','B')}
    s['limbs_stored']={side:[False]*len(s['weights'][side]) for side in ('A','B')}
    s['limb_sets']={side:['residues']*len(s['weights'][side]) for side in ('A','B')}
    s['plane_sets']={side:['2xE2M1']*len(s['planes'][side]) for side in ('A','B')}
    s['encoding']={}
    for side in ('A','B'):
        if side=='B' and all(s[k]['A']==s[k]['B'] for k in ('weights','planes','plane_moduli')):
            s['encoding'][side]=s['encoding']['A']
        else:s['encoding'][side]=encoding(s['weights'][side],s['planes'][side],s['plane_moduli'][side],r['p'])
    s['encoding_origin']='fixed_construction_enumeration'
    s['source_claims']={k:r[k] for k in ('holes','hole_share','flash_adds_per_MNK','correction_rel_mma','verified_all_pairs') if k in r}
    s['correction']={'kind':'unspecified','verified':False,'source_cost':{k:r[k] for k in ('flash_adds_per_MNK','correction_rel_mma') if k in r}} if any(v is None for side in s['encoding'].values() for v in side) else None
    return s


def header_arrays(path):
    text = path.read_text()
    def array(name):
        m = re.search(r'\b'+name+r'\[[^;]+?=\s*(\{.*?\});',text,re.S)
        if not m: raise ValueError('missing_header_array:'+name)
        return json.loads(m[1].replace('{','[').replace('}',']'))
    return {name:array(name) for name in ('l8_mod','l8_kind','l8_planes','l8_limb_off','l8_limbs')}


def matches_header(raw, arrays):
    rows = raw['choices']['signed_magnitude_M']['construction']
    if [r['modulus'] for r in rows] != arrays['l8_mod']: return False
    for i,r in enumerate(rows):
        lut = r.get('encoding_faces',r.get('encoding_lut'))
        expected = [v if 'encoding_faces' in r else ([v[0],v[1],sum(v)] if r['mechanism']=='A' else v) for v in lut]
        start = arrays['l8_limb_off'][i]
        actual = arrays['l8_limbs'][start:start+r['modulus']]
        if len(actual)!=len(expected) or any(a[:len(b)]!=b or any(a[len(b):]) for a,b in zip(actual,expected)): return False
    return True


def evidence(root, raw):
    out = []
    for path in sorted((root/'requests').rglob('l8_tables.h')):
        arrays = header_arrays(path)
        if not matches_header(raw, arrays): continue
        request = path.relative_to(root/'requests').parts[0]
        summary = root/'done'/request/'summary.json'
        info = json.loads(summary.read_text()) if summary.exists() else {}
        # A request/purpose alone is not proof of execution.
        state = 'measured' if info.get('gpu_executed') is True and info.get('exit_code')==0 else 'build_only' if info.get('gpu_executed') is False and info.get('exit_code')==0 else 'unknown'
        out.append({'header_sha256':digest(path),'summary_sha256':digest(summary) if summary.exists() else None,'state':state})
    return sorted({packed(e):e for e in out}.values(),key=lambda e:e['header_sha256'])


def ingest(paths, evidence_root, stamp, folded_paths=()):
    constructions, sets, issues, sources = {},{},[],[]
    for path in paths:
        sha=digest(path)
        if any(s['sha256']==sha for s in sources): continue
        raw=json.loads(path.read_text()); rows=raw['choices']['signed_magnitude_M']['construction']
        sources.append({'sha256':sha,'rows':len(rows)})
        ids=[]
        for i,r in enumerate(rows,1):
            origin={'source_sha256':sha,'position':i}
            try:
                s=convert_power(r); sid=identify(definition(s),'awemp2_')
                if sid not in constructions:
                    proof=measure(s); proof['verified']['date']=stamp
                    s.update(id=sid,**proof,provenance=[])
                    constructions[sid]=s
                s=constructions[sid];s['provenance'].append(origin);ids.append(sid)
                if s['verified']['method']=='failed': issues.append(dict(origin,reason='measurement_failed',construction_id=sid))
            except (KeyError,ValueError,TypeError,IndexError) as exc:
                issues.append(dict(origin,reason=str(exc),modulus=r.get('modulus')));ids.append(None)
        if None in ids: continue
        moduli=[constructions[i]['modulus'] for i in ids]
        assert all(gcd(a,b)==1 for j,a in enumerate(moduli) for b in moduli[j+1:])
        bits=raw['M']; bound=(1<<bits)-1
        crt=(prod(moduli)-1)//(2*bound*bound)
        max_k=min([crt,raw['K_requested']]+[constructions[i]['accumulation']['max_k'] for i in ids])
        set_definition={'schema_version':2,'kind':'modular_set','magnitude_bits':bits,'k':raw['K_requested'],'solution_ids':ids}
        sid=identify(set_definition,'awemps2_')
        sets[sid]=dict(set_definition,id=sid,verification={'max_k':str(max_k),'crt_max_k':str(crt),
            'products':sum(len(constructions[i]['products']) for i in ids),
            'faces':sum(sum(len(v) for v in constructions[i]['planes'].values()) for i in ids),
            'moduli':moduli,'modulus_product':str(prod(moduli)),'max_abs_operand':str(bound)},
            provenance=[{'source_sha256':sha}],usage=evidence(evidence_root,raw))
    for path in folded_paths:
        sha=digest(path)
        if any(s['sha256']==sha for s in sources): continue
        rows=[json.loads(line) for line in path.read_text().splitlines() if line.strip()]
        selected=[(i,r) for i,r in enumerate(rows,1) if r.get('p')==343]
        sources.append({'sha256':sha,'rows':len(rows),'selected_positions':[i for i,_ in selected], 'scope': 'fixed_modulus_343'})
        for i,r in selected:
            origin={'source_sha256':sha,'position':i}
            try:
                s=convert_folded(r); sid=identify(definition(s),'awemp2_')
                if sid not in constructions:
                    proof=measure(s);proof['verified']['date']=stamp
                    s.update(id=sid,**proof,provenance=[]);constructions[sid]=s
                constructions[sid]['provenance'].append(origin)
                if constructions[sid]['verified']['method']=='failed':issues.append(dict(origin,reason='measurement_failed',construction_id=sid))
            except (KeyError,ValueError,TypeError,IndexError) as exc:
                issues.append(dict(origin,reason=str(exc),modulus=r.get('p')))
    result={'schema_version':2,'solutions':list(constructions.values()),'sets':list(sets.values()),'issues':issues,'sources':sources}
    result['verification']={'date':stamp,'verifier_version':VERSION,'methods':dict(Counter(s['verified']['method'] for s in constructions.values())),
                            'constructions':len(constructions),'sets':len(sets),'issues':len(issues)}
    return result


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--source',type=Path,action='append',required=True)
    p.add_argument('--folded-source',type=Path,action='append',default=[])
    p.add_argument('--evidence',type=Path,required=True)
    p.add_argument('--output',type=Path,required=True)
    p.add_argument('--date',default=date.today().isoformat())
    a=p.parse_args()
    if any(a.output.resolve().is_relative_to(s.resolve().parent) for s in a.source+a.folded_source) or a.output.resolve().is_relative_to(a.evidence.resolve()): raise ValueError('output_inside_input')
    x=ingest(a.source,a.evidence,a.date,a.folded_source)
    a.output.parent.mkdir(parents=True,exist_ok=True);a.output.write_bytes(packed(x)+b'\n')
    print(json.dumps(x['verification']))
