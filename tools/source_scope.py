"""Account for every structured input file without copying source prose."""
import argparse
import json
from pathlib import Path
from tools.ingest import digest, write
from tools.input_roots import input_roots


def inventory(inputs, report):
    processed={s['sha256'] for s in report['sources']}
    supporting={'cap_uv6.json','verify_six.json','ladder_updates_20260823.json'}
    result=[]
    seen=set()
    paths=(path for root in input_roots(inputs) for path in sorted((root/'solutions').rglob('*')))
    for path in paths:
        if path.suffix not in ('.json','.jsonl') or not path.is_file(): continue
        sha=digest(path)
        if sha in seen: continue
        seen.add(sha)
        if sha in processed: status='processed'
        elif path.name=='plane.json': status='excluded_performance_data'
        elif path.name in supporting: status='supporting_summary'
        else: status='unsupported_source_format'
        result.append({'source_sha256':sha,'bytes':path.stat().st_size,'status':status})
    return {'schema_version':1,'files':result}


if __name__=='__main__':
    p=argparse.ArgumentParser()
    p.add_argument('--inputs',required=True,type=Path,action='append',help='Input root; repeat to add existing result collections')
    p.add_argument('--report',required=True,type=Path)
    p.add_argument('--output',required=True,type=Path)
    a=p.parse_args()
    roots=input_roots(a.inputs)
    if any(a.output.resolve().is_relative_to(root) for root in roots):
        p.error('output_inside_inputs')
    write(a.output,inventory(roots,json.loads(a.report.read_text())))
