"""Build and check the saved FP6 modulus sets (data/modular/fp6-sets.json).

Each input file is one saved set: magnitude_bits, k, value_set and its constructions in order (modulus, weights, planes,
plane_moduli, products [[a, b, numerator]], denominator, value_set).  Every construction is verified with
verify/modular_forms.py on the smallest value set that keeps its holes, exactly as the single-construction catalog does,
so a construction already in forms-*.json gets the same awem2_ id.  Unlike forms-*.json, every record keeps its full encoding
table whatever the modulus, as the records of catalog.json do, because the site reads the tables of a saved set.
A set is kept only when every construction verifies, the moduli are coprime and the CRT range covers k.
build: write the file.  check: validate the schema and rebuild every record, set and summary from the constructions.
"""
import argparse
from collections import Counter
from datetime import date
import json
from math import gcd, prod
from pathlib import Path
from hashlib import sha256
import jsonschema
from tools.ingest import digest, write
from tools.modular_forms import DATA_VERSION, minimal_record, validator
import verify.modular_forms as MF

SET_FIELDS = ('schema_version', 'kind', 'magnitude_bits', 'k', 'value_set', 'solution_ids')
SCHEMA = Path('data/schema/modular-fp6-sets.schema.json')


def set_id(definition):
    return 'awemfs2_' + sha256(MF.packed({k: definition[k] for k in SET_FIELDS})).hexdigest()


def set_record(definition, rows, source_sha256):
    """A saved set with the same measurements as the power-modulus sets: CRT range, K bound, products and planes."""
    moduli = [r['modulus'] for r in rows]
    if not all(gcd(p, q) == 1 for i, p in enumerate(moduli) for q in moduli[i+1:]):
        raise ValueError('not_coprime')
    bound = (1 << definition['magnitude_bits']) - 1
    crt = (prod(moduli) - 1) // (2 * bound * bound)
    if crt < definition['k']:
        raise ValueError('crt_range_below_k')
    k = min([crt, definition['k']] + [r['accumulation']['max_k'] for r in rows])
    return dict(definition, id=set_id(definition), provenance=[{'source_sha256': source_sha256}],
                verification={'max_k': str(k), 'crt_max_k': str(crt), 'products': sum(len(r['products']) for r in rows),
                              'faces': sum(len(r['planes'][s]) for r in rows for s in MF.SIDES), 'moduli': moduli,
                              'modulus_product': str(prod(moduli)), 'max_abs_operand': str(bound)})


def build(paths, verified_date):
    date.fromisoformat(verified_date)
    records, sets, sources = {}, [], []
    for path in paths:
        sha = digest(path)
        raw = json.loads(path.read_text())
        sources.append({'sha256': sha, 'rows': len(raw['constructions'])})
        ids = []
        for position, line in enumerate(raw['constructions'], 1):
            r = minimal_record(line, verified_date, table_max=line['modulus'])
            r = records.setdefault(r['id'], dict(r, provenance=[]))
            r['provenance'].append({'source_sha256': sha, 'position': position})
            ids.append(r['id'])
        definition = {'schema_version': 2, 'kind': 'modular_set', 'magnitude_bits': raw['magnitude_bits'], 'k': raw['k'],
                      'value_set': raw['value_set'], 'solution_ids': ids}
        sets.append(set_record(definition, [records[i] for i in ids], sha))
    solutions = sorted(records.values(), key=lambda r: (r['modulus'], r['id']))
    return {'schema_version': 2, 'data_version': DATA_VERSION, 'kind': 'modular_fp6_sets', 'solutions': solutions, 'sets': sets,
            'sources': sources, 'verification': {'date': verified_date, 'verifier_version': MF.VERSION, 'constructions': len(solutions),
                                                  'sets': len(sets), 'methods': dict(Counter(r['verified']['method'] for r in solutions))}}


def validate(v, doc, what):
    """Validate and report only where it failed: the path, the failing keyword and the start of its message."""
    error = jsonschema.exceptions.best_match(v.iter_errors(doc))
    if error is not None:
        raise ValueError('schema:%s:%s:%s:%s' % (what, '/'.join(map(str, error.absolute_path)), error.validator, error.message[:160]))


def check(path):
    data = json.loads(path.read_text())
    validate(jsonschema.Draft202012Validator(json.loads(SCHEMA.read_text())), data, SCHEMA.name)
    # Apart from provenance and the tables, every field follows the single-construction schema; its tables stop at
    # 4096 residues, so the tables (one row per residue, any modulus) are checked by this file's schema and the rebuild.
    tables = ('encoding', 'plane_values')
    plain = [{k: v for k, v in r.items() if k != 'provenance' and k not in tables} for r in data['solutions']]
    validate(validator(), {'schema_version': 2, 'data_version': data['data_version'], 'kind': 'modular_forms', 'solutions': plain},
             'modular-forms.schema.json')
    bare = [{k: v for k, v in r.items() if k != 'provenance'} for r in data['solutions']]
    if len({r['id'] for r in bare}) != len(bare):
        raise ValueError('duplicate_construction')
    for r in bare:
        MF.check_record(r, rebuild=True)
    byid = {r['id']: r for r in data['solutions']}
    origins = {(o['source_sha256'], o['position']) for r in data['solutions'] for o in r['provenance']}
    expected = {(s['sha256'], i) for s in data['sources'] for i in range(1, s['rows'] + 1)}
    if origins != expected:
        raise ValueError('source_accounting_mismatch')
    for s in data['sets']:
        rows, sha = [byid[i] for i in s['solution_ids']], s['provenance'][0]['source_sha256']
        # The n-th construction of a set comes from position n of that set's input.
        if any((sha, n) not in {(o['source_sha256'], o['position']) for o in r['provenance']} for n, r in enumerate(rows, 1)):
            raise ValueError('set_order_mismatch')
        again = set_record({k: s[k] for k in SET_FIELDS}, rows, s['provenance'][0]['source_sha256'])
        if again != s:
            raise ValueError('set_measurement_mismatch')
    v = data['verification']
    if v['constructions'] != len(bare) or v['sets'] != len(data['sets']) or v['verifier_version'] != MF.VERSION or \
            v['methods'] != dict(Counter(r['verified']['method'] for r in bare)):
        raise ValueError('summary_mismatch')
    return {'constructions': len(bare), 'sets': len(data['sets']), 'valid': True}


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    sub = p.add_subparsers(dest='command', required=True)
    b = sub.add_parser('build')
    b.add_argument('inputs', type=Path, nargs='+')
    b.add_argument('--output', type=Path, required=True)
    b.add_argument('--date', default=date.today().isoformat())
    c = sub.add_parser('check')
    c.add_argument('path', type=Path, nargs='?', default=Path('data/modular/fp6-sets.json'))
    a = p.parse_args()
    if a.command == 'build':
        if any(a.output.resolve().is_relative_to(i.resolve().parent) for i in a.inputs):
            raise ValueError('output_inside_input')
        write(a.output, build(a.inputs, a.date))
        print(json.dumps(check(a.output), sort_keys=True))
    else:
        print(json.dumps(check(a.path), sort_keys=True))
