"""Summarize saved prime-power records and engine tables without running generators."""
import argparse
import hashlib
import json
import math
import re
from pathlib import Path


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def prime_power(n):
    for p in range(2, math.isqrt(n) + 1):
        if n % p:
            continue
        e = 0
        while n % p == 0:
            n //= p
            e += 1
        return [p, e] if n == 1 and e > 1 else None
    return None


def catalog(path):
    data = json.loads(path.read_text())
    mods = {r['modulus'] for r in data['solutions']}
    return {'sha256': sha(path), 'constructions': len(data['solutions']),
            'moduli': len(mods), 'max_modulus': max(mods)}, data, mods


def engine(root):
    path = root / 'zl8_tables_rt.h'
    text = path.read_text()
    tables = []
    for match in re.finditer(r'static const L8kMod (\w+)\[.*?\] = \{(.*?)\n\};', text, re.S):
        rows = [tuple(map(int, m.groups())) for line in match[2].splitlines()
                if (m := re.match(r'\s*\{(\d+),(\d+),(\d+),', line))]
        tables.append({'name': match[1], 'parts': len(rows), 'moduli': sorted({r[0] for r in rows}),
                       'products': sum(r[2] for r in rows), 'planes_per_side': sum(r[1] for r in rows)})
    assert len(tables) == 2
    for t in tables:
        for macro, value in [('L8K_NMOD', t['parts']), ('ZL8_NMODC', len(t['moduli'])),
                             ('L8K_PRODUCTS59', t['products']), ('L8K_PLANES59', t['planes_per_side'])]:
            assert int(re.search(r'#define ' + macro + r' (\d+)', text)[1]) == value
    compile_text = (root / 'build.sh').read_text()
    assert '-DZL8=1' in compile_text
    bits = int(re.search(r'-DL8_BITS=(\d+)', compile_text)[1])
    modulus_product = math.prod(tables[0]['moduli'])
    # This is only the CRT range condition, not an accumulator or kernel guarantee.
    crt_k = (modulus_product - 1) // (4 * (2**bits - 1)**2)
    witness_path = root / 'r1b/tables_generated.h'
    witnesses = [tuple(map(int, m.groups())) for line in witness_path.read_text().splitlines()
                 if (m := re.match(r'\{(\d+),(\d+),(\d+),\{\{', line))]
    return {'request': root.name, 'bits': bits, 'source_sha256': sha(path), 'tables': tables,
            'crt_range_k_only': crt_k, 'header_comment': text.splitlines()[1].split(' from ', 1)[-1],
            'included_witness_catalog': {'count': len(witnesses), 'moduli': [r[0] for r in witnesses],
                                         'sha256': sha(witness_path)}}


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--input', type=Path, required=True, help='Existing int8-opt input directory')
    p.add_argument('--engine', type=Path, action='append', default=[])
    p.add_argument('--catalog', type=Path, default=Path('data/modular/catalog.json'))
    p.add_argument('--preview', type=Path, default=Path('site/dist/modular/catalog.json'))
    args = p.parse_args()
    current, data, mods = catalog(args.catalog)
    preview, _, _ = catalog(args.preview)
    summary_path = args.input / 'typei_collected/min_products_by_modulus.jsonl'
    all_rows = [json.loads(l) for l in summary_path.read_text().splitlines() if l.strip()]
    powers = []
    for line, row in enumerate(all_rows, 1):
        if factors := prime_power(row['p']):
            powers.append({k: row[k] for k in ('p', 'products', 'faces', 'hole_share', 'holey',
                                              'bits', 'source', 'weights')} |
                          {'line': line, 'power': factors, 'modulus_in_catalog': row['p'] in mods})
    intake_hashes = {r['source_sha256'] for r in data['intake']}
    intake_hashes |= {r['sha256'] for r in json.loads(Path('data/report.json').read_text())['sources']}
    source_checks = []
    for folder in ('typei_collected', 'relax_typei_r2_collected', 'sol3x3_parts'):
        paths = sorted((args.input / folder).rglob('*.jsonl'))
        source_checks.append({'folder': folder, 'files': len(paths),
                              'intake_matches': [str(f.relative_to(args.input)) for f in paths if sha(f) in intake_hashes]})
    print(json.dumps({'catalog': current, 'preview': preview,
                      'summary_sha256': sha(summary_path), 'summary_rows': len(all_rows),
                      'summary_moduli': len({r['p'] for r in all_rows}), 'prime_power_rows': powers,
                      'source_checks': source_checks, 'engines': [engine(e) for e in args.engine]},
                     ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
