"""Audit numeric source candidates; this is not publication of verified modular solutions."""
import argparse
import hashlib
import json
from pathlib import Path
from verify.crt import crt_max_k


def audit(path,bits):
    data=json.loads(path.read_text());objects=[]
    def visit(value):
        if isinstance(value,dict):
            if isinstance(value.get('moduli'),list):objects.append(value)
            for item in value.values():visit(item)
        elif isinstance(value,list):
            for item in value:visit(item)
    visit(data)
    maximum=(1<<bits)-1
    result={'source_sha256':hashlib.sha256(path.read_bytes()).hexdigest(),
            'moduli_objects':len(objects),'matches_21_moduli_59_products':sum(len(r['moduli'])==21 and r.get('products')==59 for r in objects),
            'assumption':{'max_abs_a':str(maximum),'max_abs_b':str(maximum)},
            'modular_constructions_verified':False,'candidates':[]}
    for width in data['widths']:
        if width['bits']!=bits:continue
        candidates=[width[k] for k in ('a','b') if k in width]+width.get('c',[])
        for r in candidates:
            bound=crt_max_k(r['moduli'],maximum,maximum)
            result['candidates'].append({'moduli':r['moduli'],'moduli_count':len(r['moduli']),
                'declared_products':r['products'],'declared_k_max':r['k_max'],
                'crt_max_k_under_assumption':bound,'range_allows_k_16384':16384<=bound})
    return result


if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('input',type=Path);p.add_argument('--bits',type=int,default=53)
    args=p.parse_args()
    if not 1<=args.bits<=4096:p.error('bits must be in 1..4096')
    print(json.dumps(audit(args.input,args.bits),sort_keys=True))
