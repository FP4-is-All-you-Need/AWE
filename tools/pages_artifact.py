"""Prepare and inspect the static Pages artifact without deployment or source edits."""
import argparse
from datetime import date
import hashlib
import json
from pathlib import Path
import re
import shutil

ROOT = Path(__file__).resolve().parents[1]
# Optional organization-specific rules are provided as an external JSON file.
# The public default checks paths and credentials without embedding private terms.
RULES = {
    'personal_path': re.compile(r'/home/[\w.-]+/|/Users/[\w.-]+/|/mnt/[a-z]/|[A-Z]:\\Users\\', re.I),
    'credential': re.compile(r'gh[pousr]_[A-Za-z0-9]{30,}|github[_]pat_[A-Za-z0-9_]{30,}|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----', re.I),
}
TEXT = {'.json', '.jsonl', '.js', '.css', '.html', '.txt', '.md', '.py', '.ts', '.tsx', '.mjs', '.toml', '.svg', '.yml', '.yaml', '.map'}


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write(path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, sort_keys=True, separators=(',', ':'))+'\n')


def prepare(data, output):
    if output.resolve() == data.resolve() or data.resolve() in output.resolve().parents:
        raise ValueError('output must be separate from canonical data')
    index = json.loads((data/'index.json').read_text())
    if index.get('complete') is not True:
        raise ValueError('incomplete preview data')
    # Validate the already recorded checksums; do not re-run mathematical searches.
    refs = list(index['files']) + [index[k] for k in ('search', 'modular', 'input_inventory') if k in index]
    search = json.loads((data/'search/index.json').read_text())
    refs += search['groups']
    modular = json.loads((data/'modular/index.json').read_text())
    refs.append({'path': 'modular/'+modular['path'], 'sha256': modular['sha256']})
    for entry in refs:
        if digest(data/entry['path']) != entry['sha256']:
            raise ValueError('catalog hash mismatch: '+entry['path'])
    if output.exists():
        if not (output/'.pages-data').is_file():
            raise ValueError('refusing to replace a directory not made by this tool')
        shutil.rmtree(output)
    output.mkdir(parents=True)
    for path in sorted(data.rglob('*')):
        if path.is_symlink(): raise ValueError('symlinks are not supported')
        if path.is_file():
            target = output/path.relative_to(data)
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(path, target)
    changes = []
    name = 'modular/powers.json'
    powers = json.loads((data/name).read_text())
    for entry in powers['sets']:
        for usage in entry.get('usage', []):
            if 'device' in usage:
                del usage['device']
                changes.append({'file': name, 'set_id': entry['id'], 'field': 'usage.device'})
    write(output/name, powers)
    schema_name = 'schema/modular-powers.schema.json'
    schema = json.loads((data/schema_name).read_text())
    for variant in schema['properties']['sets']['items']['properties']['usage']['items']['oneOf']:
        variant.get('properties', {}).pop('device', None)
        if 'required' in variant:
            variant['required'] = [key for key in variant['required'] if key != 'device']
    write(output/schema_name, schema)
    write(output/'publication.json', {'schema_version': 1, 'data_version': index['data_version'],
        'canonical_index_sha256': digest(data/'index.json'),
        'metadata_omissions': changes,
        'transformed_files': [{'path': n, 'source_sha256': digest(data/n), 'published_sha256': digest(output/n)} for n in (name, schema_name)]})
    shutil.copyfile(ROOT/'llms.txt', output/'llms.txt')
    (output/'.nojekyll').touch()
    # The marker identifies the scratch tree and is omitted from the public build.
    (output/'.pages-data').touch()
    return {'checked_references': len(refs), 'omitted_metadata_fields': len(changes)}


def scan(path):
    if path.suffix not in TEXT: return []
    text = path.read_text(encoding='utf-8')
    # Explicitly requested FP32 run metadata: allow only these device field values.
    # Host names, paths and device identifiers elsewhere still fail the audit.
    if path.name == 'fp32-history.json' and path.parent.name == 'modular':
        text = re.sub(r'"(?:recorded_device|device)":"(?:B200|B300|GB200)"', '"device":""', text)
    # Report locations and categories, never the possibly sensitive value.
    return [{'category': category, 'count': len(matches)} for category, rule in RULES.items()
            if (matches := list(rule.finditer(text)))]


def audit(dist):
    if not (dist/'index.html').is_file(): raise ValueError('build the public site first')
    if (dist/'.pages-data').exists(): (dist/'.pages-data').unlink()
    files = sorted(p for p in dist.rglob('*') if p.is_file() and p.name != 'manifest.json')
    for p in dist.rglob('*'):
        if p.is_symlink(): raise ValueError('artifact contains symlink')
    manifest = {str(p.relative_to(dist)): {'sha256': digest(p), 'bytes': p.stat().st_size} for p in files}
    write(dist/'manifest.json', {'schema_version': 1, 'files': manifest})
    files += [dist/'manifest.json']
    violations = [{'file': str(p.relative_to(dist)), **hit}
                  for p in files for hit in scan(p)]
    size = sum(p.stat().st_size for p in files)
    largest = max(files, key=lambda p: p.stat().st_size)
    report = {'schema_version': 1, 'files': len(files), 'bytes': size,
              'largest': {'path': str(largest.relative_to(dist)), 'bytes': largest.stat().st_size},
              'over_50_mib': [str(p.relative_to(dist)) for p in files if p.stat().st_size>50*1024**2],
              'over_100_mb': [str(p.relative_to(dist)) for p in files if p.stat().st_size>100_000_000],
              'under_1_gb': size<1_000_000_000, 'scan_violations': violations,
              'manifest_sha256': digest(dist/'manifest.json')}
    return report


def main():
    p=argparse.ArgumentParser();p.add_argument('command', choices=['prepare', 'audit'])
    p.add_argument('--data',type=Path,default=ROOT/'data');p.add_argument('--staging',type=Path,default=ROOT/'build/pages-data')
    p.add_argument('--dist',type=Path,default=ROOT/'site/dist')
    p.add_argument('--rules', type=Path, help='External JSON object mapping categories to regular expressions')
    p.add_argument('--report',type=Path);p.add_argument('--traffic',type=Path)
    a=p.parse_args()
    if a.rules:
        RULES.update({k:re.compile(v,re.I) for k,v in json.loads(a.rules.read_text()).items()})
    result=prepare(a.data,a.staging) if a.command=='prepare' else audit(a.dist)
    if a.traffic:
        http=json.loads((a.traffic/'all-files.json').read_text())
        if http['manifest_sha256'] != result['manifest_sha256']:raise ValueError('traffic was measured on a different build')
        result.update(date=date.today().isoformat(),base_path='/AWE/',all_files_http=http,
            initial_load=[json.loads((a.traffic/('initial-'+lang+'-1440.json')).read_text()) for lang in ('en','ja')],
            interactive_checks=[{k:v for k,v in json.loads((a.traffic/('requests-'+lang+'-1440.json')).read_text()).items() if k!='resources'} for lang in ('en','ja')])
    if a.report:
        a.report.parent.mkdir(parents=True,exist_ok=True);a.report.write_text(json.dumps(result,indent=2)+'\n')
    print(json.dumps(result))
    if result.get('scan_violations') or result.get('over_100_mb') or result.get('under_1_gb') is False:raise SystemExit(1)


if __name__=='__main__':main()
