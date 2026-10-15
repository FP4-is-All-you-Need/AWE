"""Recheck the staged modular catalog, including hashes, IDs and all residue pairs."""
import argparse
from datetime import date
import json
from pathlib import Path
import re
import jsonschema
from tools.ingest import digest
from tools.modular_ingest import identify, SET_FIELDS
from verify.core import Invalid
from verify.modular import FIELDS, verify, verify_set


def check(root, *, record=False):
    index = json.loads((root/'index.json').read_text())
    if set(index) != {'schema_version', 'data_version', 'path', 'sha256', 'solutions', 'sets'} or index['path'] != 'catalog.json':
        raise Invalid('invalid_index')
    path = root/'catalog.json'
    if digest(path) != index['sha256']: raise Invalid('hash_mismatch')
    catalog = json.loads(path.read_text())
    schema = json.loads(Path('data/schema/modular.schema.json').read_text())
    # Algebra and provenance checks below give stable reason codes; the schema
    # additionally closes every nested object against unreviewed source text.
    required = {'schema_version', 'data_version', 'sources', 'solutions', 'sets'}
    if not required <= catalog.keys() or catalog.keys()-required-{'intake', 'search_scopes'}:
        raise Invalid('invalid_fields')
    if catalog['schema_version'] != 1 or index['schema_version'] != 1 or catalog['data_version'] != '0.1.0' or index['data_version'] != '0.1.0':
        raise Invalid('unsupported_schema')
    solutions, sets = catalog['solutions'], catalog['sets']
    if len(solutions) != index['solutions'] or len(sets) != index['sets']:
        raise Invalid('count_mismatch')
    by_id = {s['id']: s for s in solutions}
    if len(by_id) != len(solutions) or len({s['id'] for s in sets}) != len(sets):
        raise Invalid('duplicate_id')
    origins = set()
    for s in solutions:
        result = verify(s)
        date.fromisoformat(s['verified']['date'])
        if {k: v for k, v in s['verified'].items() if k != 'date'} != result['verified'] or s['accumulation'] != result['accumulation']:
            raise Invalid('proof_mismatch')
        if s['id'] != identify(s, FIELDS, 'awem1_'): raise Invalid('id_mismatch')
        for origin in s['provenance']:
            if set(origin) != {'source_sha256', 'position'}: raise Invalid('invalid_origin')
            key = (origin['source_sha256'], origin['position'])
            if key in origins: raise Invalid('duplicate_origin')
            origins.add(key)
    source_map = {}
    for source in catalog['sources']:
        if set(source) != {'sha256', 'records'} or not re.fullmatch('[0-9a-f]{64}', source['sha256']):
            raise Invalid('invalid_origin')
        if source['sha256'] in source_map: raise Invalid('duplicate_source')
        source_map[source['sha256']] = source['records']
    expected = {(s['sha256'], i) for s in catalog['sources'] for i in range(1, s['records']+1)}
    if origins != expected: raise Invalid('missing_origin')
    for s in sets:
        if s['id'] != identify(s, SET_FIELDS, 'awems1_'): raise Invalid('id_mismatch')
        if s['verification'] != verify_set(s, by_id): raise Invalid('proof_mismatch')
        used_sources = set()
        for origin in s['provenance']:
            if set(origin) != {'source_sha256'} or origin['source_sha256'] not in source_map:
                raise Invalid('invalid_origin')
            sha = origin['source_sha256']
            if sha in used_sources: raise Invalid('duplicate_origin')
            used_sources.add(sha)
            if source_map[sha] != len(s['solution_ids']): raise Invalid('missing_origin')
            for position, sid in enumerate(s['solution_ids'], 1):
                if {'source_sha256': sha, 'position': position} not in by_id[sid]['provenance']:
                    raise Invalid('missing_origin')
    if set(by_id) != {sid for s in sets for sid in s['solution_ids']}:
        raise Invalid('unreferenced_solution')
    if {p['source_sha256'] for s in sets for p in s['provenance']} != set(source_map):
        raise Invalid('missing_origin')
    if 'intake' in catalog:
        receipts = catalog['intake']
        if len({r['source_sha256'] for r in receipts}) != len(receipts):
            raise Invalid('duplicate_intake')
        if {r['source_sha256'] for r in receipts if r['status'] == 'accepted'} != set(source_map):
            raise Invalid('intake_accounting_mismatch')
        scopes = {s['source_sha256'] for s in catalog.get('search_scopes', [])}
        for r in receipts:
            if (r['status'] == 'accepted') != (r['reason'] == 'independently_verified'):
                raise Invalid('intake_status_mismatch')
            for declaration in r['declarations']:
                if declaration['scope_id'] is not None and declaration['scope_id'] not in scopes:
                    raise Invalid('missing_search_scope')
    jsonschema.Draft202012Validator(schema, format_checker=jsonschema.FormatChecker()).validate(catalog)
    result = {'solutions': len(solutions), 'sets': len(sets),
              'residue_pairs': sum(s['verified']['n_pairs'] for s in solutions), 'valid': True}
    if record:
        from tools.verification_summary import record as save_record
        save_record(root, 'modular', [result])
    return result


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('root', type=Path)
    p.add_argument('--record', action='store_true', help='Save verification.json after successful verification')
    a = p.parse_args()
    print(json.dumps(check(a.root, record=a.record), sort_keys=True))
