"""Recheck the independent measurements and identifiers of the supplemental catalog."""
import argparse
import json
import jsonschema
from collections import Counter
from verify.folded_encoding import encoding
from pathlib import Path
from math import prod, gcd
from tools.power_ingest import identify, definition
from verify.power import measure


def check(path):
    data=json.loads(path.read_text()); ids=set(); origins=set()
    jsonschema.validate(data,json.loads(Path('data/schema/modular-powers.schema.json').read_text()))
    if data['schema_version']!=2:raise ValueError('unsupported_schema')
    for s in data['solutions']:
        if s['id'] in ids: raise ValueError('duplicate_construction')
        ids.add(s['id'])
        for o in s['provenance']:
            key=(o['source_sha256'],o['position'])
            if key in origins:raise ValueError('duplicate_origin')
            origins.add(key)
        if s.get('encoding_origin')=='fixed_construction_enumeration':
            for side in ('A','B'):
                lut=encoding(s['weights'][side],s['planes'][side],s['plane_moduli'][side],s['modulus'])
                if lut!=s['encoding'][side]:raise ValueError('encoding_enumeration_mismatch')
        if identify(definition(s),'awemp2_')!=s['id']:raise ValueError('id_mismatch')
        m=measure(s)
        if {k:v for k,v in s['verified'].items() if k!='date'}!=m['verified'] or s['measurement']!=m['measurement'] or s['accumulation']!=m['accumulation']:raise ValueError('measurement_mismatch')
    byid={s['id']:s for s in data['solutions']}
    for s in data['sets']:
        fields=('schema_version','kind','magnitude_bits','k','solution_ids')
        if s['id']!=identify({k:s[k] for k in fields},'awemps2_'):raise ValueError('set_id_mismatch')
        rows=[byid[i] for i in s['solution_ids']];moduli=[r['modulus'] for r in rows]
        if not all(gcd(p,q)==1 for i,p in enumerate(moduli) for q in moduli[i+1:]):raise ValueError('not_coprime')
        crt=(prod(moduli)-1)//(2*((1<<s['magnitude_bits'])-1)**2)
        k=min([crt,s['k']]+[r['accumulation']['max_k'] for r in rows])
        v=s['verification']
        if v['moduli']!=moduli or v['modulus_product']!=str(prod(moduli)) or v['max_k']!=str(k) or v['crt_max_k']!=str(crt) or v['products']!=sum(len(r['products']) for r in rows):raise ValueError('set_measurement_mismatch')
    expected={(s['sha256'],i) for s in data['sources'] for i in s.get('selected_positions',range(1,s['rows']+1))}
    rejected={(s['source_sha256'],s['position']) for s in data['issues']}
    if origins|rejected!=expected:raise ValueError('source_accounting_mismatch')
    summary=data['verification']
    if summary['constructions']!=len(ids) or summary['sets']!=len(data['sets']) or summary['issues']!=len(data['issues']) or summary['methods']!=dict(Counter(s['verified']['method'] for s in data['solutions'])):raise ValueError('summary_mismatch')
    return summary


if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('path',type=Path,nargs='?',default=Path('data/modular/powers.json'))
    print(json.dumps(check(p.parse_args().path)))
