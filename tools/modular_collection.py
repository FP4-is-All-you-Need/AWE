"""Import saved selections with source decisions and reviewed scope declarations.

No source generator is imported or executed. Failed/unsupported whole selections
remain in the intake ledger and contribute no partial solutions to the catalog.
"""
import argparse
from collections import Counter
from datetime import date
import json
import os
from pathlib import Path
import shutil
import tempfile
from tools.ingest import digest, write
from tools.modular_ingest import ingest
from verify.core import Invalid


TABLE_STATUS = {'PASS': 'passed', 'FAIL': 'failed',
                'OUTPUT_WIDTH_UNSUPPORTED': 'unsupported_output_width',
                'requires kernel/encoding changes; stock generator is inapplicable': 'not_applicable'}


def collection(sources, exports, scope_path, output, verified_date):
    date.fromisoformat(verified_date)
    protected = [p.resolve().parent for p in sources] + [p.resolve() for p in exports]
    if scope_path: protected.append(scope_path.resolve().parent)
    if any(output.resolve().is_relative_to(p) for p in protected):
        raise Invalid('output_inside_inputs')
    if output.exists(): raise Invalid('output_exists')
    scope = None
    if exports:
        if scope_path is None: raise Invalid('missing_search_scope')
        reviewed = json.loads(Path('tools/reviewed_search_scopes.json').read_text())
        scope = next((s for s in reviewed if s['source_sha256'] == digest(scope_path)), None)
        if scope is None: raise Invalid('unreviewed_search_scope')
    requests = [(p, {'scope_id': None, 'pool': 'unspecified', 'table_check': 'unspecified',
                      'selection': 'saved_selection'}) for p in sources]
    for root in exports:
        index_path = root/'sets_index.json'
        index_hash = digest(index_path)
        for entry in json.loads(index_path.read_text()):
            relative = Path(entry['path'])
            if relative.parent != Path('deliverable/sets') or relative.suffix != '.json':
                raise Invalid('unsupported_selection_path')
            path = root/'sets'/relative.name
            if not path.resolve().is_relative_to(root.resolve()): raise Invalid('input_outside_root')
            if digest(path) != entry['sha256']: raise Invalid('source_hash_mismatch')
            raw = json.loads(path.read_text())
            if (raw['M'], raw['K_requested'], raw['complex']) != (entry['bits'], entry['K'], entry['complex']):
                raise Invalid('selection_metadata_mismatch')
            if entry['pool'] not in ('current_forms', 'extension'): raise Invalid('unknown_selection_pool')
            if entry.get('table_check_status') not in TABLE_STATUS: raise Invalid('unknown_table_status')
            requests.append((path, {'scope_id': scope['source_sha256'], 'pool': entry['pool'],
                'table_check': TABLE_STATUS[entry['table_check_status']], 'selection': 'saved_selection',
                'selection_index_sha256': index_hash}))
    if not requests: raise Invalid('inputs_empty')
    output.parent.mkdir(parents=True, exist_ok=True)
    staging = Path(tempfile.mkdtemp(prefix='.collection-', dir=output.parent))
    try:
        solutions, sets, accepted, receipts = {}, {}, {}, {}
        for path, annotation in requests:
            sha = digest(path)
            if sha in receipts:
                receipt = receipts[sha]
                receipt['copies'] += 1
                if annotation not in receipt['declarations']: receipt['declarations'].append(annotation)
                continue
            receipt = {'source_sha256': sha, 'copies': 1, 'declarations': [annotation]}
            receipts[sha] = receipt
            try:
                ingest([path], staging/'single', verified_date)
            except (Invalid, KeyError, TypeError, ValueError, IndexError) as exc:
                reason = str(exc) if isinstance(exc, Invalid) else 'unsupported_source_structure'
                receipt.update(status='quarantined', reason=reason)
                continue
            catalog = json.loads((staging/'single/catalog.json').read_text())
            shutil.rmtree(staging/'single')
            receipt.update(status='accepted', reason='independently_verified')
            accepted[sha] = catalog['sources'][0]
            for key, target in [('solutions', solutions), ('sets', sets)]:
                for row in catalog[key]:
                    if row['id'] not in target: target[row['id']] = row
                    else:
                        target[row['id']]['provenance'].extend(p for p in row['provenance']
                                                               if p not in target[row['id']]['provenance'])
        data = {'schema_version': 1, 'data_version': '0.1.0',
                'sources': [accepted[k] for k in sorted(accepted)],
                'solutions': [solutions[k] for k in sorted(solutions)],
                'sets': [sets[k] for k in sorted(sets)],
                'intake': [receipts[k] for k in sorted(receipts)],
                'search_scopes': [scope] if scope else []}
        write(staging/'catalog.json', data)
        write(staging/'index.json', {'schema_version': 1, 'data_version': '0.1.0',
              'path': 'catalog.json', 'sha256': digest(staging/'catalog.json'),
              'solutions': len(solutions), 'sets': len(sets)})
        from tools.check_modular import check
        result = check(staging, record=True)
        result['intake'] = dict(Counter(r['status'] for r in receipts.values()))
        result['reasons'] = dict(Counter(r['reason'] for r in receipts.values() if r['status'] != 'accepted'))
        result['input_copies'] = len(requests)
        result['unique_sources'] = len(receipts)
        os.replace(staging, output)
        return result
    except BaseException:
        shutil.rmtree(staging)
        raise


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--source', type=Path, action='append', default=[])
    p.add_argument('--export', type=Path, action='append', default=[])
    p.add_argument('--scope', type=Path)
    p.add_argument('--output', type=Path, required=True)
    p.add_argument('--date', default=date.today().isoformat())
    a = p.parse_args()
    print(json.dumps(collection(a.source, a.export, a.scope, a.output, a.date), sort_keys=True))
