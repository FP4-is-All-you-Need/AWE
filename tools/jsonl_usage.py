"""Check run output, engine manifests and a saved table before recording usage."""
import argparse
import csv
from datetime import datetime, timezone
import json
from pathlib import Path
import re
from tools.power_ingest import digest, packed, header_arrays, matches_header
from tools.run_usage import attach


def manifest(path):
    entries = {}
    for line in path.read_text().splitlines():
        value, name = line.split(maxsplit=1)
        if not re.fullmatch(r'[0-9a-f]{64}', value) or name in entries:
            raise ValueError('invalid_hash_manifest')
        entries[name] = value
    return entries


def jsonl_record(source, run, header):
    raw = json.loads(source.read_text())
    engine = source.parent.name
    src, body = run/'src', run/'body'
    files = manifest(src/'SHA256SUMS')
    for name in ('engines.json', 'expected.json', 'run_calib.py', 'job_body.sh', f'engines/{engine}/build.sh'):
        if files.get('./'+name) != digest(src/name):
            raise ValueError('source_manifest_mismatch:'+name)
    if files.get(f'./engines/{engine}/l8_tables.h') != digest(header) or not matches_header(raw, header_arrays(header)):
        raise ValueError('table_mismatch')
    engines = json.loads((src/'engines.json').read_text())
    config = engines[engine]
    rows = raw['choices']['signed_magnitude_M']['construction']
    if (config['bits'], config['moduli'], config['mma_products']) != (raw['M'], len(rows), sum(r['products'] for r in rows)):
        raise ValueError('engine_definition_mismatch')
    libraries = manifest(body/'engines.sha256')
    suffix = f'/engines/{engine}/prebuilt/{config["lib"]}'
    hashes = [v for n,v in libraries.items() if n.endswith(suffix)]
    if len(hashes) != 1:
        raise ValueError('missing_engine_binary_hash')
    stdout = (run/'stdout.txt').read_text()
    if re.findall(r'^body rc (\d+)$', stdout, re.M) != ['0'] or not re.search(r'^end \d+ s$', stdout, re.M):
        raise ValueError('job_not_completed')
    devices = list(csv.DictReader((body/'smi_start.csv').read_text().splitlines(), skipinitialspace=True))
    names = {r['name'] for r in devices}
    if len(names) != 1 or not names <= {'NVIDIA GB200', 'NVIDIA B200', 'NVIDIA B300'}:
        raise ValueError('unknown_device')
    uuids = {r['uuid'] for r in devices}
    expected = json.loads((src/'expected.json').read_text())['hash_by_bits_shape'].get(str(raw['M']), {})
    shapes = {tuple(map(int,s.split('x'))) for s in config['shapes'].split(',')}
    outputs = sorted(body.glob('out_gpu*.jsonl'))
    if not outputs or len(outputs) != len(uuids):
        raise ValueError('missing_process_output')
    checks, seen, dates = None, set(), set()
    for path in outputs:
        records = [json.loads(s) for s in path.read_text().splitlines() if s.strip()]
        if not records or [r['kind'] for r in records] != ['start']+['row']*(len(records)-2)+['done']:
            raise ValueError('incomplete_process')
        start, done = records[0], records[-1]
        if done.get('ok') is not True or done.get('failures') != []:
            raise ValueError('failed_process')
        if start['cuda_visible'] not in uuids or start['cuda_visible'] in seen:
            raise ValueError('duplicate_or_unknown_device')
        seen.add(start['cuda_visible'])
        dates.add(datetime.fromtimestamp(start['time'], timezone.utc).date().isoformat())
        if start['engines'] != {n:{k:c[k] for k in ('bits','moduli','mma_products','lib')} for n,c in engines.items()}:
            raise ValueError('start_engine_mismatch')
        actual = [r for r in records if r.get('engine') == engine]
        if len(actual) != len(shapes) or {tuple(r[k] for k in ('m','n','k')) for r in actual} != shapes:
            raise ValueError('missing_shape')
        current = []
        for row in actual:
            shape = tuple(row[k] for k in ('m','n','k'))
            info = row['info']
            if row['spot_bad'] != 0 or (info['quantize_bits'],info['moduli'],info['mma_products']) != (config['bits'],config['moduli'],config['mma_products']):
                raise ValueError('row_check_failed')
            ref = [r for r in records if r.get('engine') == start['ref'] and tuple(r.get(k) for k in ('m','n','k')) == shape]
            if start['ref'] == engine or len(ref) != 1 or ref[0]['hash'] != row['hash'] or ref[0]['input_hashes'] != row['input_hashes']:
                raise ValueError('baseline_mismatch')
            wanted = expected.get('x'.join(map(str,shape)))
            if not re.fullmatch(r'[0-9a-f]{16}',row['hash']) or row['b300_expected'] != wanted or (wanted is not None and wanted != row['hash']):
                raise ValueError('output_hash_mismatch')
            current.append({'shape':list(shape),'output_hash':row['hash'],'comparison':'expected_and_baseline' if wanted else 'baseline_only'})
        current.sort(key=lambda r:r['shape'])
        if checks is not None and current != checks:
            raise ValueError('process_hash_mismatch')
        checks = current
    if len(dates) != 1:
        raise ValueError('inconsistent_run_date')
    evidence = {k:digest(p) for k,p in {
        'manifest':src/'SHA256SUMS','engines':src/'engines.json','libraries':body/'engines.sha256',
        'job':run/'job.sh','stdout':run/'stdout.txt','runner':src/'run_calib.py',
        'body':src/'job_body.sh','devices':body/'smi_start.csv'}.items()}
    return {'kind':'run_jsonl','state':'measured','association':'header_hash_and_engine_manifest',
            'source_sha256':digest(source),'header_sha256':digest(header),'binary_sha256':hashes[0],
            'reference_sha256':digest(src/'expected.json'),'evidence_sha256':evidence,
            'output_sha256':[digest(p) for p in outputs],'processes':len(outputs),
            'device':next(iter(names)),'date':next(iter(dates)),'checks':checks}


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    for name in ('source','run','header','catalog','output'):p.add_argument('--'+name,type=Path,required=True)
    a = p.parse_args()
    if any(a.output.resolve().is_relative_to(v.resolve() if v.is_dir() else v.resolve().parent) for v in (a.source,a.run,a.header)):
        raise ValueError('output_inside_input')
    data = json.loads(a.catalog.read_text())
    attach(data,jsonl_record(a.source,a.run,a.header))
    a.output.write_bytes(packed(data)+b'\n')
    print(json.dumps({'measured':sum(any(e['state']=='measured' for e in s['usage']) for s in data['sets'])}))
