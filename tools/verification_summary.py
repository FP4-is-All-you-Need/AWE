"""Write compact records only after the caller's mathematical checks succeed."""
from collections import Counter
from datetime import date
import json
import os
from pathlib import Path
import tempfile
from tools.ingest import digest
from tools.normalize import packed


def summarize(root, kind, checks, *, checked_date=None):
    root = Path(root)
    index = json.loads((root/'index.json').read_text())
    methods = Counter()
    if kind == 'integer':
        files = [{'path': e['path'], 'sha256': e['sha256']} for e in index['files']]
        count = 0
        for entry in files:
            if digest(root/entry['path']) != entry['sha256']: raise ValueError('hash_mismatch')
            for row in json.loads((root/entry['path']).read_text()):
                proof = row['verified']
                methods[(proof['method'], proof['verifier_version'])] += 1
                count += 1
        if count != index['count']: raise ValueError('count_mismatch')
        if any(set(c) != {'count', 'shard', 'shards', 'valid'} or
               any(type(c[k]) is not int for k in ('count', 'shard', 'shards')) for c in checks):
            raise ValueError('invalid_checks')
        partitions = {c['shards'] for c in checks}
        if len(partitions) != 1: raise ValueError('incomplete_checks')
        n = next(iter(partitions))
        if n < 1 or len(checks) != n or {c['shard'] for c in checks} != set(range(n)):
            raise ValueError('incomplete_checks')
        if any(c['valid'] is not True or c['count'] != count for c in checks):
            raise ValueError('failed_checks')
        counts = {'constructions': count}
    elif kind == 'modular':
        files = [{'path': 'catalog.json', 'sha256': index['sha256']}]
        if digest(root/'catalog.json') != index['sha256']: raise ValueError('hash_mismatch')
        catalog = json.loads((root/'catalog.json').read_text())
        for row in catalog['solutions']:
            proof = row['verified']
            methods[(proof['method'], proof['verifier_version'])] += 1
        counts = {'constructions': len(catalog['solutions']), 'sets': len(catalog['sets']),
                  'residue_pairs': sum(s['verified']['n_pairs'] for s in catalog['solutions'])}
        if len(checks) != 1 or checks[0] != dict(solutions=counts['constructions'], sets=counts['sets'],
                                               residue_pairs=counts['residue_pairs'], valid=True):
            raise ValueError('failed_checks')
    else:
        raise ValueError('unsupported_verification_kind')
    stamp = checked_date or date.today().isoformat()
    date.fromisoformat(stamp)
    return {'schema_version': 2, 'kind': kind, 'date': stamp, 'counts': counts,
            'methods': [{'method': method, 'verifier_version': version, 'count': count}
                        for (method, version), count in sorted(methods.items())],
            'checks': checks, 'files': files}


def record(root, kind, checks, *, checked_date=None):
    """The caller must have verified all listed data; this function is aggregation."""
    root = Path(root)
    result = summarize(root, kind, checks, checked_date=checked_date)
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(dir=root, delete=False) as f:
            temporary = Path(f.name)
            f.write(packed(result)+b'\n')
        os.replace(temporary, root/'verification.json')
    finally:
        if temporary is not None: temporary.unlink(missing_ok=True)
    return result


def validate(root, kind):
    saved = json.loads((Path(root)/'verification.json').read_text())
    expected = summarize(root, kind, saved['checks'], checked_date=saved['date'])
    if saved != expected: raise ValueError('verification_record_mismatch')
    return saved
