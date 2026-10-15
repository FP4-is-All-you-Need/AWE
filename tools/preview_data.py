"""Create a tiny verified mathematical preview; never impersonates the full catalog."""
import argparse
from datetime import date
from pathlib import Path
from tools.ingest import write,digest
from tools.normalize import canonical,identify,packed
import hashlib
import json
import shutil
from tools.sources import uv_record
from tools.search_index import build
from verify.core import verify


def preview(root):
    candidates=[{'w':[1,29,37],'uv':[[1,1]]*3,'X':148},
                {'w':[1,11,39],'uv':[[1,1]]*3,'X':134},
                {'w':[8,17,48],'uv':[[1,-1],[1,1],[1,1]],'X':130},
                {'w':[1,6],'uv':[[1,1]],'X':24}]
    files=[]
    shards={}
    for raw in candidates:
        s=canonical(uv_record(raw));s.update(verify(s));s['id']=identify(s)
        s['verified']['date']=date.today().isoformat();s['provenance']=[{'source_sha256':hashlib.sha256(packed(raw)).hexdigest(),'position':1}]
        path=root/'solutions'/(s['id'][5:7]+'.json')
        shards.setdefault(path,[]).append(s)
    for path,rows in sorted(shards.items()):
        write(path,rows);files.append({'path':'solutions/'+path.name,'count':len(rows),'sha256':digest(path)})
    write(root/'index.json',{'schema_version':1,'data_version':'0.1.0','complete':False,'count':len(candidates),'files':files})
    build(root)
    visual = Path('data/visualization')
    if visual.is_dir():
        shutil.copytree(visual, root/'visualization', dirs_exist_ok=True)
    modular = Path('data/modular')
    if modular.is_dir():
        shutil.copytree(modular, root/'modular', dirs_exist_ok=True)
        index = json.loads((root/'index.json').read_text())
        index['modular'] = {'path':'modular/index.json','sha256':digest(root/'modular/index.json')}
        write(root/'index.json', index)


if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('root',type=Path);a=p.parse_args();preview(a.root)
