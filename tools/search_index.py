"""Build small mathematical summaries without changing verified constructions."""
import argparse
from collections import defaultdict
import json
from pathlib import Path
from tools.ingest import digest, write
from verify.core import Invalid

COLUMNS=['id','width_a','width_b','limbs_a','limbs_b','r','planes_a','planes_b','denominator','max_k','weights_a','weights_b','mixed','cost']


def naive_additions(solution):
    """Count additions in independent evaluations of the used signed unit planes."""
    result={}
    for side,key in (('A','a'),('B','b')):
        planes=solution['planes'][side]
        used=[planes[i] for i in sorted({p[key] for p in solution['products']})]
        result['add_'+key]=(None if any(v not in (0,-1,1) for plane in used for v in plane)
                           else sum(max(0,sum(v!=0 for v in plane)-1) for plane in used))
    return result


def row_metadata(solution):
    """Retain the exact canonical operand ranges alongside plane costs."""
    return {**naive_additions(solution),
            'domain_a':solution['domain']['A'],
            'domain_b':solution['domain']['B']}


def build(root):
    index=json.loads((root/'index.json').read_text())
    groups=defaultdict(list)
    for entry in index['files']:
        path=root/entry['path']
        if digest(path)!=entry['sha256']: raise Invalid('hash_mismatch')
        for s in json.loads(path.read_text()):
            a,b=s['widths']['A'],s['widths']['B']
            mixed=any(name!='2xE2M1' for side in ('A','B') for name in s['plane_sets'][side])
            r=len(s['products'])
            row=[s['id'],a,b,len(s['weights']['A']),len(s['weights']['B']),r,
                 len(s['planes']['A']),len(s['planes']['B']),s['denominator'],s['accumulation']['max_k'],
                 s['weights']['A'],s['weights']['B'],mixed,row_metadata(s)]
            groups[(a,b,r,mixed)].append(row)
    entries=[]
    for (a,b,r,mixed),rows in sorted(groups.items()):
        rows.sort(key=lambda x:x[0])
        name=f'A{a}_B{b}_r{r}'+('_mixed' if mixed else '')+'.json'
        path=root/'search'/name
        write(path,rows)
        entries.append({'path':'search/'+name,'sha256':digest(path),'count':len(rows),
                        'width_a':a,'width_b':b,'r':r,'mixed':mixed})
    search={'schema_version':1,'complete':index['complete'],'columns':COLUMNS,'count':sum(len(x) for x in groups.values()),'groups':entries}
    write(root/'search/index.json',search)
    index['search']={'path':'search/index.json','sha256':digest(root/'search/index.json')}
    write(root/'index.json',index)
    return {'count':search['count'],'groups':len(entries)}


def check_search(root):
    """Check every derived row against the corresponding immutable construction."""
    index=json.loads((root/'index.json').read_text())
    ref=index['search']
    if ref['path']!='search/index.json' or digest(root/ref['path'])!=ref['sha256']:
        raise Invalid('search_hash')
    search=json.loads((root/ref['path']).read_text())
    if search['columns']!=COLUMNS or search['complete']!=index['complete']:
        raise Invalid('search_metadata')
    rows={}
    for group in search['groups']:
        path=Path(group['path'])
        if path.parent!=Path('search') or path.suffix!='.json' or path.name=='index.json':
            raise Invalid('search_path')
        if digest(root/path)!=group['sha256']: raise Invalid('search_hash')
        part=json.loads((root/path).read_text())
        if len(part)!=group['count']: raise Invalid('search_count')
        for row in part:
            if row[0] in rows: raise Invalid('search_duplicate')
            if [row[1],row[2],row[5],row[12]]!=[group['width_a'],group['width_b'],group['r'],group['mixed']]:
                raise Invalid('search_group')
            rows[row[0]]=row
    for entry in index['files']:
        path=root/entry['path']
        if digest(path)!=entry['sha256']: raise Invalid('hash_mismatch')
        for s in json.loads(path.read_text()):
            expected=[s['id'],s['widths']['A'],s['widths']['B'],len(s['weights']['A']),len(s['weights']['B']),
                      len(s['products']),len(s['planes']['A']),len(s['planes']['B']),s['denominator'],
                      s['accumulation']['max_k'],s['weights']['A'],s['weights']['B'],
                      any(t!='2xE2M1' for side in ('A','B') for t in s['plane_sets'][side]),
                      row_metadata(s)]
            if rows.pop(s['id'],None)!=expected: raise Invalid('search_row')
    if rows or search['count']!=index['count'] or sum(g['count'] for g in search['groups'])!=index['count']:
        raise Invalid('search_count')
    return {'count':index['count'],'groups':len(search['groups']),'valid':True}


if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('root',type=Path);p.add_argument('--check',action='store_true');a=p.parse_args()
    print(json.dumps(check_search(a.root) if a.check else build(a.root),sort_keys=True))
