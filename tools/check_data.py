"""Reverify public shards and reject stale proofs, IDs, hashes or extra files."""
import argparse
from datetime import date
import json
from pathlib import Path
import re
import jsonschema
from tools.ingest import digest
from tools.normalize import canonical, identify, FIELDS
from verify.core import verify, Invalid


def check(root, *, shard=0, shards=1, require_complete=False, record=False):
    if record and (shard != 0 or shards != 1):
        raise Invalid('record_requires_all_shards')
    schema=json.loads(Path('data/schema/solution.schema.json').read_text())
    jsonschema.Draft202012Validator.check_schema(schema)
    validator=jsonschema.Draft202012Validator(schema,format_checker=jsonschema.FormatChecker())
    index=json.loads((root/'index.json').read_text())
    index_schema=json.loads(Path('data/schema/index.schema.json').read_text())
    jsonschema.Draft202012Validator(index_schema).validate(index)
    if require_complete and not index['complete']: raise Invalid('incomplete_catalog')
    expected={entry['path'] for entry in index['files']}
    if len(expected)!=len(index['files']): raise Invalid('duplicate_shard')
    actual={str(p.relative_to(root)) for p in (root/'solutions').glob('*.json')}
    if actual!=expected: raise Invalid('unexpected_shard')
    seen=set()
    origins=set()
    total=0
    for position,entry in enumerate(index['files']):
        if not re.fullmatch(r'solutions/[0-9a-f]{2}\.json',entry['path']): raise Invalid('invalid_path')
        path=root/entry['path']
        if digest(path)!=entry['sha256']: raise Invalid('hash_mismatch')
        records=json.loads(path.read_text())
        if len(records)!=entry['count']: raise Invalid('count_mismatch')
        total+=len(records)
        for s in records:
            if s['id'] in seen: raise Invalid('duplicate_id')
            seen.add(s['id'])
            for origin in s['provenance']:
                key=(origin['source_sha256'],origin['position'])
                if key in origins: raise Invalid('duplicate_origin')
                origins.add(key)
            if s['id'][5:7]!=path.stem: raise Invalid('wrong_shard')
        if position%shards!=shard: continue
        for s in records:
            validator.validate(s)
            if s['id']!=identify(s): raise Invalid('id_mismatch')
            if {k:s[k] for k in FIELDS}!=canonical(s): raise Invalid('not_canonical')
            if s['verified']['method']=='coverage_proof_and_bilinear_identity':
                # A method label is not a machine-checkable coverage certificate.
                raise Invalid('unsupported_coverage_proof')
            result=verify(s,pairs=s['verified']['method']=='full_pairs')
            recorded={k:v for k,v in s['verified'].items() if k!='date'}
            if result['verified']!=recorded: raise Invalid('proof_mismatch')
            date.fromisoformat(s['verified']['date'])
    if total!=index['count']: raise Invalid('total_mismatch')
    if 'input_inventory' in index:
        from tools.input_manifest import check as check_inventory
        ref=index['input_inventory']
        if ref['path'] != 'input-inventory.json' or digest(root/ref['path']) != ref['sha256']:
            raise Invalid('hash_mismatch')
        check_inventory(root/ref['path'])
    if 'modular' in index:
        from tools.check_modular import check as check_modular
        ref=index['modular']
        if digest(root/ref['path'])!=ref['sha256']: raise Invalid('hash_mismatch')
        modular_result = check_modular(root/'modular')
    if require_complete:
        report=json.loads((root/'report.json').read_text())
        quarantine=json.loads((root/'quarantine.json').read_text())
        counts=report['counts']
        if total!=counts['accepted'] or len(origins)!=total+counts.get('duplicates',0):
            raise Invalid('accounting_mismatch')
        if len(quarantine)!=counts.get('quarantined',0): raise Invalid('quarantine_mismatch')
        for item in quarantine:
            key=(item['source_sha256'],item['position'])
            if key in origins: raise Invalid('duplicate_origin')
            origins.add(key)
        expected_origins={(s['sha256'],i) for s in report['sources'] for i in range(1,s['records']+1)}
        if origins!=expected_origins or len(origins)!=counts['input']: raise Invalid('missing_origin')
    result = {'count':total,'shard':shard,'shards':shards,'valid':True}
    if record:
        from tools.verification_summary import record as save_record
        if 'modular' in index:
            save_record(root/'modular', 'modular', [modular_result])
        save_record(root, 'integer', [result])
    return result


if __name__=='__main__':
    p=argparse.ArgumentParser()
    p.add_argument('root',type=Path)
    p.add_argument('--require-complete',action='store_true')
    p.add_argument('--record',action='store_true',help='Save verification.json after a successful unsharded check')
    p.add_argument('--shard',type=int,default=0)
    p.add_argument('--shards',type=int,default=1)
    a=p.parse_args()
    if not 0<=a.shard<a.shards: p.error('invalid shards')
    print(json.dumps(check(a.root,shard=a.shard,shards=a.shards,require_complete=a.require_complete,record=a.record),sort_keys=True))
