"""Attach successful run summaries to saved sets, without importing timings."""
from hashlib import sha256
import argparse
import json
from pathlib import Path
import re
from tools.power_ingest import digest, packed


def run_record(source, summary, expected):
    raw = json.loads(source.read_text())
    info = json.loads(summary.read_text())
    references = json.loads(expected.read_text())['hash_by_bits_shape']
    # This adapter accepts exact table-directory / summary-engine names only.
    # It records a reported association, not a binary-to-table identity proof.
    engine = source.parent.name
    if info.get('ok') is not True or info.get('failures') != []:
        raise ValueError('unsuccessful_summary')
    device = re.match(r'^(B200|B300)\b', info.get('scope', ''))
    day = re.search(r'_(\d{8})$', summary.parent.name)
    if not device or not day:
        raise ValueError('missing_device_or_date')
    rows = [r for r in info['ratios'] if r['engine'] == engine]
    if not rows:
        raise ValueError('engine_not_executed')
    checks = []
    for row in rows:
        shape = row['shape']
        hashes = row.get('hash', [])
        if row['bits'] != raw['M'] or not re.fullmatch(r'[1-9]\d*x[1-9]\d*x[1-9]\d*', shape):
            raise ValueError('width_or_shape_mismatch')
        if row.get('processes', 0) < 1 or len(hashes) != 1 or not re.fullmatch(r'[0-9a-f]{16}', hashes[0]):
            raise ValueError('missing_run_hash')
        baseline = [r for r in info['ratios'] if r['engine'] == row['base'] and r['bits'] == row['bits'] and r['shape'] == shape]
        if row['base'] == engine or len(baseline) != 1 or baseline[0].get('hash') != hashes:
            raise ValueError('baseline_hash_mismatch')
        reference = references.get(str(row['bits']), {}).get(shape)
        if reference is not None and reference != hashes[0]:
            raise ValueError('expected_hash_mismatch')
        checks.append({'shape': [int(n) for n in shape.split('x')], 'output_hash': hashes[0],
                       'comparison': 'expected_and_baseline' if reference else 'baseline_only'})
    if len({tuple(c['shape']) for c in checks}) != len(checks):
        raise ValueError('duplicate_shape')
    ymd = day[1]
    return {'kind': 'run_summary', 'state': 'measured', 'source_sha256': digest(source),
            'summary_sha256': digest(summary), 'reference_sha256': digest(expected),
            'engine_sha256': sha256(engine.encode()).hexdigest(),
            'association': 'reported_table_name', 'device': device[1],
            'date': f'{ymd[:4]}-{ymd[4:6]}-{ymd[6:]}', 'checks': checks}


def attach(data, record):
    rows = [s for s in data['sets'] if {'source_sha256': record['source_sha256']} in s['provenance']]
    if len(rows) != 1:
        raise ValueError('source_set_not_unique')
    usage = rows[0]['usage']
    if record not in usage:
        usage.append(record)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--catalog', type=Path, required=True)
    parser.add_argument('--run', nargs=2, type=Path, action='append', required=True,
                        metavar=('SOURCE_JSON', 'SUMMARY_JSON'))
    parser.add_argument('--expected', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    if any(args.output.resolve().is_relative_to(p.resolve().parent) for pair in args.run for p in pair) or args.output.resolve().is_relative_to(args.expected.resolve().parent):
        raise ValueError('output_inside_input')
    data = json.loads(args.catalog.read_text())
    for source, summary in args.run:
        attach(data, run_record(source, summary, args.expected))
    args.output.write_bytes(packed(data) + b'\n')
    print(json.dumps({'sets': len(data['sets']), 'measured': sum(any(e['state'] == 'measured' for e in s['usage']) for s in data['sets'])}))
