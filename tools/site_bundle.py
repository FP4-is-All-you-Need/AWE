"""Assemble a static preview of validated distribution files; never deploys."""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
from tools.search_index import check_search


def bundle(data,assets,output):
    if output.exists(): raise ValueError('output must be a new directory')
    if not (assets/'index.html').is_file(): raise ValueError('build the site first')
    if (assets/'index.json').exists() and (assets/'index.json').read_bytes() != (data/'index.json').read_bytes():
        raise ValueError('preview data or mismatched data must not enter a distribution')
    index=json.loads((data/'index.json').read_text())
    if not index['complete']: raise ValueError('preview catalog cannot be distributed')
    from tools.verification_summary import validate as validate_record
    validate_record(data, 'integer')
    check_search(data)
    if 'input_inventory' in index:
        from tools.input_manifest import check as check_inventory
        from tools.ingest import digest
        ref = index['input_inventory']
        if ref['path'] != 'input-inventory.json' or digest(data/ref['path']) != ref['sha256']:
            raise ValueError('input inventory hash mismatch')
        check_inventory(data/ref['path'])
    if 'modular' in index:
        from tools.check_modular import check
        from tools.ingest import digest
        ref = index['modular']
        if ref['path'] != 'modular/index.json' or digest(data/ref['path']) != ref['sha256']:
            raise ValueError('modular index hash mismatch')
        check(data/'modular')
        validate_record(data/'modular', 'modular')
    if (data/'modular/powers.json').exists():
        from tools.check_powers import check as check_powers
        check_powers(data/'modular/powers.json')
    # Full mathematical rechecking is an explicit prerequisite, not inferred from this assembly.
    output.mkdir(parents=True)
    shutil.copytree(assets,output,dirs_exist_ok=True)
    paths={'index.json','search/index.json','verification.json'}|{e['path'] for e in index['files']}
    if 'input_inventory' in index: paths.add('input-inventory.json')
    if 'modular' in index: paths.update({'modular/index.json', 'modular/catalog.json', 'modular/verification.json'})
    if (data/'modular/powers.json').exists(): paths.add('modular/powers.json')
    search=json.loads((data/'search/index.json').read_text())
    paths.update(g['path'] for g in search['groups'])
    paths.update(str(p.relative_to(data)) for p in (data/'schema').glob('*.json'))
    for path in sorted(paths):
        dst=output/path;dst.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(data/path,dst)
    for name in ['llms.txt']:
        if Path(name).is_file():shutil.copyfile(name,output/name)
    manifest={str(p.relative_to(output)):hashlib.sha256(p.read_bytes()).hexdigest()
              for p in sorted(output.rglob('*')) if p.is_file()}
    (output/'manifest.json').write_text(json.dumps({'data_version':index['data_version'],'files':manifest},sort_keys=True)+'\n')
    return {'constructions':index['count'],'files':len(manifest),'index_sha256':manifest['index.json']}


if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--data',type=Path,default=Path('data'))
    p.add_argument('--assets',type=Path,default=Path('site/dist'));p.add_argument('--output',type=Path,required=True)
    a=p.parse_args();print(json.dumps(bundle(a.data,a.assets,a.output),sort_keys=True))
