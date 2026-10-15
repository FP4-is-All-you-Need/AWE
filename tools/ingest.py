"""Verify before publishing, with complete accounting and atomic output directory."""
import argparse
from collections import Counter, defaultdict
from datetime import date
import hashlib
import json
import os
from pathlib import Path
import shutil
import tempfile
from tools.normalize import canonical, identify, packed
from tools.sources import catalog_row, numeric_record, supplementary
from tools.input_roots import input_roots
from verify.core import Invalid, verify


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write(path, obj):
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_bytes(packed(obj)+b'\n')


def ingest(inputs, output, *, limit=None, shard=0, shards=1, verified_date=None):
    roots = input_roots(inputs)
    if any(output.resolve().is_relative_to(root) for root in roots): raise ValueError('output_inside_inputs')
    if limit is not None and limit < 0: raise ValueError('invalid_limit')
    if output.exists(): raise ValueError('output_exists')
    if not 0 <= shard < shards <= 256: raise ValueError('invalid_shards')
    verified_date = verified_date or date.today().isoformat()
    date.fromisoformat(verified_date)
    records, excluded, sources = {}, [], []
    templates=json.loads(Path('tools/reviewed_templates.json').read_text())
    reviewed={(r['source_sha256'],r['position']):r['construction'] for r in templates}
    counts = Counter(input=0, accepted=0, duplicates=0, quarantined=0)

    def consume(raw, adapter, source_hash, position):
        counts['input'] += 1
        origin = {'source_sha256':source_hash,'position':position}
        try:
            source_construction=reviewed.get((source_hash,position))
            s = canonical(source_construction if source_construction is not None else adapter(raw))
            sid = identify(s)
            if sid in records:
                records[sid]['provenance'].append(origin)
                counts['duplicates'] += 1
                return
            result = verify(s)
            result['verified']['date'] = verified_date
            s.update(result, id=sid, provenance=[origin])
            records[sid] = s
            counts['accepted'] += 1
        except Invalid as e:
            excluded.append(dict(origin,reason=str(e)))
            counts['quarantined'] += 1

    seen_sources = set()
    for root in roots:
        for path, role, rows, adapter in source_batches(root):
            source_hash = digest(path)
            if source_hash in seen_sources:
                continue
            seen_sources.add(source_hash)
            # Content hashes and positions identify copies without exposing paths.
            sources.append({'role':role,'sha256':source_hash,'records':len(rows)})
            if limit is not None:
                rows = rows[:limit] if role == 'integer_catalog' else []
            for i, row in enumerate(rows, 1):
                if (i-1)%shards == shard:
                    consume(row, adapter, source_hash, i)
                    if counts['input']%5000 == 0:
                        print(json.dumps({'progress':dict(counts)}),flush=True)
    if not sources:
        raise ValueError('no_recognized_sources')
    assert counts['input'] == counts['accepted']+counts['duplicates']+counts['quarantined']
    output.parent.mkdir(parents=True,exist_ok=True)
    staging = Path(tempfile.mkdtemp(prefix='.ingest-',dir=output.parent))
    try:
        groups = defaultdict(list)
        for sid,s in sorted(records.items()): groups[sid[5:7]].append(s)
        entries = []
        for prefix,solutions in sorted(groups.items()):
            path = staging/'solutions'/(prefix+'.json')
            write(path,solutions)
            entries.append({'path':'solutions/'+path.name,'count':len(solutions),'sha256':digest(path)})
        summary = {'schema_version':1,'complete':limit is None and shards==1,'shard':shard,'shards':shards,
                   'counts':dict(counts),'reasons':dict(Counter(x['reason'] for x in excluded)),
                   'widths':dict(Counter(str(s['widths']['A'])+'x'+str(s['widths']['B']) for s in records.values())),
                   'sources':sources}
        write(staging/'index.json',{'schema_version':1,'data_version':'0.1.0','complete':summary['complete'],
                                   'count':len(records),'files':entries})
        write(staging/'report.json',summary)
        write(staging/'quarantine.json',excluded)
        os.replace(staging,output)
    except BaseException:
        shutil.rmtree(staging)
        raise
    print(json.dumps(summary,sort_keys=True),flush=True)
    return summary


def source_batches(root):
    path = root/'solutions/SOLUTIONS_intN.json'
    if path.is_file():
        data = json.loads(path.read_text())
        yield path, 'integer_catalog', data['rows'], lambda r: catalog_row(r, data['pair_sets'])
    for relative, role in [('s_2xe2m1/diagonal.jsonl','equal_width_records'),
                           ('s_2xe2m1/rectangular.jsonl','independent_records'),
                           ('hybrid.jsonl','mixed_format_records')]:
        path = root/'solutions'/relative
        if path.is_file():
            rows = [json.loads(line) for line in path.read_text().splitlines() if line.strip()]
            yield path, role, rows, numeric_record
    yield from supplementary(root)


if __name__ == '__main__':
    p=argparse.ArgumentParser()
    p.add_argument('--inputs',required=True,type=Path,action='append',help='Input root; repeat to add existing result collections')
    p.add_argument('--output',required=True,type=Path)
    p.add_argument('--limit',type=int)
    p.add_argument('--shard',type=int,default=0)
    p.add_argument('--shards',type=int,default=1)
    p.add_argument('--date')
    a=p.parse_args()
    ingest(a.inputs,a.output,limit=a.limit,shard=a.shard,shards=a.shards,verified_date=a.date)
