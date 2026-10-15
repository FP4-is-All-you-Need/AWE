"""Import existing signed-magnitude selections; never select or search for new sets."""
import argparse
import copy
from datetime import date
import hashlib
import json
import os
from pathlib import Path
import shutil
import tempfile
from tools.ingest import digest, write
from tools.normalize import packed
from verify.core import Invalid, integer
from verify.modular import FIELDS, verify, verify_set

SET_FIELDS = ('schema_version', 'kind', 'magnitude_bits', 'k', 'solution_ids')


def identify(record, fields, prefix):
    return prefix + hashlib.sha256(packed({k: record[k] for k in fields})).hexdigest()


def convert(row):
    """Expand only the four documented source forms; copy no descriptive strings."""
    weights = row['weights']
    mechanism = row.get('mechanism')
    if mechanism == 'one' and len(weights) == 1:
        planes = [[1]]
    elif mechanism in ('A', 'B', 'direct') and len(weights) == 2:
        planes = [[1, 0], [0, 1]]
        if mechanism == 'A':
            uv = row['uv']
            if type(uv) is not list or len(uv) != 2:
                raise Invalid('invalid_plane')
            for x in uv: integer(x)
            planes.append(uv)
    else:
        raise Invalid('unsupported_modular_form')
    if 'face_forms' in row and row['face_forms'] != planes:
        raise Invalid('source_plane_mismatch')
    if row.get('modular_holes', []) or row.get('parts', 1) != 1 or row.get('block_shift'):
        raise Invalid('unsupported_modular_encoding')
    pairs, coefficients = row['face_pairs'], row['coefficients_numerator']
    integer(row['products'], 1, 1024)
    if len(pairs) != len(coefficients) or len(pairs) != row['products']:
        raise Invalid('source_product_count')
    if any(type(pair) is not list or len(pair) != 2 for pair in pairs):
        raise Invalid('invalid_product')
    s = {'schema_version': 1, 'kind': 'modular', 'modulus': row['modulus'],
         'weights': {side: copy.deepcopy(weights) for side in ('A', 'B')},
         'limb_sets': {side: ['2xE2M1']*len(weights) for side in ('A', 'B')},
         'planes': {side: copy.deepcopy(planes) for side in ('A', 'B')},
         'plane_sets': {side: ['2xE2M1']*len(planes) for side in ('A', 'B')},
         'products': [{'a': pair[0], 'b': pair[1], 'numerator': c} for pair, c in zip(pairs, coefficients)],
         'denominator': row['coefficient_denominator'],
         'encoding': {side: copy.deepcopy(row['encoding_lut']) for side in ('A', 'B')}}
    return s


def ingest(paths, output, verified_date):
    date.fromisoformat(verified_date)
    if output.exists(): raise Invalid('output_exists')
    if any(output.resolve().is_relative_to(p.resolve().parent) for p in paths):
        raise Invalid('output_inside_inputs')
    sources, solutions, sets = [], {}, {}
    seen = set()
    for path in paths:
        sha = digest(path)
        if sha in seen: continue
        seen.add(sha)
        raw = json.loads(path.read_text())
        if raw.get('complex', False) is not False:
            raise Invalid('unsupported_complex_construction')
        choice = raw['choices']['signed_magnitude_M']
        rows = choice['construction']
        if [r['modulus'] for r in rows] != choice['moduli']:
            raise Invalid('source_moduli_mismatch')
        if sum(r['products'] for r in rows) != choice['products']:
            raise Invalid('source_product_count')
        sources.append({'sha256': sha, 'records': len(rows)})
        ids = []
        for position, row in enumerate(rows, 1):
            s = convert(row)
            proof = verify(s)
            proof['verified']['date'] = verified_date
            sid = identify(s, FIELDS, 'awem1_')
            origin = {'source_sha256': sha, 'position': position}
            if sid in solutions:
                solutions[sid]['provenance'].append(origin)
            else:
                solutions[sid] = dict(s, id=sid, **proof, provenance=[origin])
            ids.append(sid)
        selected = {'schema_version': 1, 'kind': 'modular_set', 'magnitude_bits': raw['M'],
                    'k': raw.get('K_requested', raw.get('K')), 'solution_ids': ids}
        proof = verify_set(selected, solutions)
        sid = identify(selected, SET_FIELDS, 'awems1_')
        if sid in sets:
            sets[sid]['provenance'].append({'source_sha256': sha})
        else:
            sets[sid] = dict(selected, id=sid, verification=proof, provenance=[{'source_sha256': sha}])
    if not sources: raise Invalid('inputs_empty')
    catalog = {'schema_version': 1, 'data_version': '0.1.0', 'sources': sources,
               'solutions': [solutions[k] for k in sorted(solutions)], 'sets': [sets[k] for k in sorted(sets)]}
    output.parent.mkdir(parents=True, exist_ok=True)
    staging = Path(tempfile.mkdtemp(prefix='.modular-', dir=output.parent))
    try:
        write(staging/'catalog.json', catalog)
        write(staging/'index.json', {'schema_version': 1, 'data_version': '0.1.0',
              'path': 'catalog.json', 'sha256': digest(staging/'catalog.json'),
              'solutions': len(solutions), 'sets': len(sets)})
        os.replace(staging, output)
    except BaseException:
        shutil.rmtree(staging)
        raise
    return {'solutions': len(solutions), 'sets': len(sets),
            'residue_pairs': sum(s['verified']['n_pairs'] for s in solutions.values())}


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('--source', type=Path, action='append', required=True)
    p.add_argument('--output', type=Path, required=True)
    p.add_argument('--date', default=date.today().isoformat())
    a = p.parse_args()
    print(json.dumps(ingest(a.source, a.output, a.date), sort_keys=True))
