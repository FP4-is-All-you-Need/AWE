"""Rebuild and check the display indexes that count limbs, planes and products: the prime_powers summary of
data/modular/forms-index.json and the weights, R, FA and FB of data/visualization/polar-catalog.json.  Both count a
construction as the site shows it, without the limbs that never reach a product (tools/unused_limbs.py).  Construction
records and ids are not changed; the cost-model columns of the polar index are kept as they are.

build: rewrite both indexes in place.  check: rebuild them in memory and compare with the files.
"""
import argparse
import json
from pathlib import Path
from tools.ingest import digest, write
from tools.modular_forms import EXCLUDED_FILE, prime_power_summary
from tools.unused_limbs import omitted_limbs, without_unused_limbs
from verify.core import Invalid

FORMS_INDEX = Path('modular/forms-index.json')
POLAR = Path('visualization/polar-catalog.json')


def forms_index(root):
    """forms-index.json with prime_powers summarized from the chunk files and forms-excluded.json."""
    index = json.loads((root/FORMS_INDEX).read_text())
    rows = [r for c in index['chunks'] for r in json.loads((root/'modular'/c['path']).read_text())['solutions']]
    left = json.loads((root/'modular'/EXCLUDED_FILE).read_text())
    excluded = [{'reason': g['reason'], 'construction': c} for g in left['excluded'] for c in g['constructions']]
    return dict(index, prime_powers=prime_power_summary(rows, excluded))


def polar_catalog(root, forms_index_sha256):
    """polar-catalog.json with weights, R, FA and FB counted without unused limbs.  A row that leaves out limbs and then
    shows the same construction as another row of its modulus and value set is dropped (fewer omitted limbs first, then
    the smaller id)."""
    polar = json.loads((root/POLAR).read_text())
    files, rows = {}, []
    for row in polar['rows']:
        if row['source'] not in files:
            files[row['source']] = {r['id']: r for r in json.loads((root/row['source']).read_text())['solutions']}
        r = files[row['source']].get(row['id'])
        if r is None or r['modulus'] != row['m']:
            raise Invalid('polar_source_mismatch')
        s = without_unused_limbs(r)
        omitted = omitted_limbs(r, s)
        key = json.dumps([row['m'], row['vs'], s['weights'], s['planes'], s.get('plane_moduli'),
                          sorted([p['a'], p['b'], p['numerator']] for p in s['products']), r['denominator'], row['hA'], row['hB']])
        rows.append((dict(row, weights=s['weights'], R=len(s['products']), FA=len(s['planes']['A']), FB=len(s['planes']['B'])),
                     key, (omitted, row['id'])))
    first = {}
    for _, key, rank in rows:
        first[key] = min(first.get(key, rank), rank)
    return dict(polar, forms_index_sha256=forms_index_sha256, rows=[row for row, key, rank in rows if not rank[0] or rank == first[key]])


def build(root):
    write(root/FORMS_INDEX, forms_index(root))
    polar = polar_catalog(root, digest(root/FORMS_INDEX))
    write(root/POLAR, polar)
    return {'prime_powers': len(json.loads((root/FORMS_INDEX).read_text())['prime_powers']), 'polar_rows': len(polar['rows'])}


def check(root):
    index = forms_index(root)
    if index != json.loads((root/FORMS_INDEX).read_text()):
        raise Invalid('summary_mismatch')
    polar = polar_catalog(root, digest(root/FORMS_INDEX))
    if polar != json.loads((root/POLAR).read_text()):
        raise Invalid('polar_index_mismatch')
    return {'prime_powers': len(index['prime_powers']), 'polar_rows': len(polar['rows']), 'valid': True}


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('command', choices=('build', 'check'))
    p.add_argument('root', type=Path, nargs='?', default=Path('data'))
    a = p.parse_args()
    print(json.dumps((build if a.command == 'build' else check)(a.root), sort_keys=True))
