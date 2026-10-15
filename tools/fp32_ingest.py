"""Import a recorded FP32 table, binding its source to measurement evidence."""
import argparse
from datetime import date
from hashlib import sha256
import json
from pathlib import Path
import re

from tools.modular_ingest import convert, identify, SET_FIELDS
from verify.modular import FIELDS, verify, verify_set, VERSION


def digest(path):
    return sha256(path.read_bytes()).hexdigest()


def bind(source, header, manifest, evidence, engine_id):
    engine = next(e for e in manifest if e['id'] == engine_id)
    comparison = next(e['comparison'] for e in evidence['engines'] if e['id'] == engine_id)
    if digest(header) != engine['original_sha256']['l8_fp32_tables.h']:
        raise ValueError('header_hash_mismatch')
    if not re.search(r'\b' + digest(source) + r'\b', header.read_text()):
        raise ValueError('source_hash_mismatch')
    checks = comparison['device_metadata_checks']
    if not comparison['passed'] or not comparison['sass_equal'] or not all(
            checks.get(k) is True for k in ('inventory', 'resources', 'attributes', 'initialized_data')):
        raise ValueError('binary_comparison_failed')
    if comparison['reference_sha256'] != engine['reference_sha256']:
        raise ValueError('reference_hash_mismatch')
    runs = [r for r in evidence['operation_measurement_bindings']
            if r['engine'] == engine_id and r['reference_sha256'] == engine['reference_sha256']
            and r['asset_and_loaded_object_match'] and r['bits'] == engine['bits']]
    if not runs:
        raise ValueError('no_matching_measurement')
    for run in runs:
        checks = run['output_checks']
        if (checks.get('qualified') is not True or not checks.get('output_hash') or
                any(checks.get(k) != 0 for k in ('model_mismatches', 'unwritten_nan', 'upper_triangle_changed'))):
            raise ValueError('measurement_output_failed')
    return engine, runs


def check_header(header, rows):
    """Compare the generated arrays themselves, not only their source-hash comment."""
    text = header.read_text()
    def array(name):
        match = re.search(r'\b' + name + r'\s*(?:\[[^\]]+\])+\s*=\s*(\{.*?\});', text, re.S)
        if not match:
            raise ValueError('missing_header_array:' + name)
        return json.loads(match[1].replace('{', '[').replace('}', ']'))
    expected = {
        'l8_mod': [r['modulus'] for r in rows],
        'l8_kind': [{'one': 0, 'A': 1, 'B': 2, 'direct': 3}[r['mechanism']] for r in rows],
        'l8_planes': [len(convert(r)['planes']['A']) for r in rows],
        'l8_limb_off': [sum(r['modulus'] for r in rows[:i]) for i in range(len(rows))],
        'l8_limbs': [v + [0]*(2-len(v)) for r in rows for v in r['encoding_lut']],
    }
    for name, values in expected.items():
        if array(name) != values:
            raise ValueError('header_array_mismatch:' + name)


def ingest(source, header, manifest_path, evidence_path, engine_id, revision, stamp):
    date.fromisoformat(stamp)
    if not re.fullmatch('[0-9a-f]{40}', revision):
        raise ValueError('invalid_source_revision')
    manifest, evidence = [json.loads(p.read_text()) for p in (manifest_path, evidence_path)]
    engine, runs = bind(source, header, manifest, evidence, engine_id)
    choice = json.loads(source.read_text())['choices']['signed_magnitude_M']
    check_header(header, choice['construction'])
    solutions = {}
    for i, row in enumerate(choice['construction'], 1):
        s = convert(row)
        proof = verify(s)
        proof['verified']['date'] = stamp
        sid = identify(s, FIELDS, 'awem1_')
        solutions[sid] = dict(s, id=sid, **proof, provenance=[{'source_sha256': digest(source), 'position': i}])
    selected = {'schema_version': 1, 'kind': 'modular_set', 'magnitude_bits': engine['bits'],
                'k': engine['max_k'], 'solution_ids': list(solutions)}
    proof = verify_set(selected, solutions)
    if proof['moduli'] != engine['coverage']['moduli_values'] or proof['products'] != sum(row['products'] for row in choice['construction']):
        raise ValueError('selection_mismatch')
    if (proof['modulus_product'] != engine['coverage']['product'] or
            int(proof['max_k']) < engine['max_k']):
        raise ValueError('coverage_mismatch')
    sid = identify(selected, SET_FIELDS, 'awems1_')
    selected.update(id=sid, verification=proof, provenance=[{'source_sha256': digest(source)}],
                    usage=[{'state': 'measured', 'header_sha256': digest(header), 'summary_sha256': digest(evidence_path)}])
    return {'schema_version': 1, 'solutions': list(solutions.values()), 'sets': [selected],
            'sources': [{'sha256': digest(source), 'records': len(solutions)}],
            'evidence': {'source_revision': revision, 'manifest_sha256': digest(manifest_path),
                         'header_sha256': digest(header), 'binding_sha256': digest(evidence_path),
                         'reference_sha256': engine['reference_sha256'],
                         'measurements': [{k: r[k] for k in ('routine', 'shape', 'bits', 'measurement_sha256',
                                                            'asset_list_sha256', 'output_checks')} for r in runs]},
            'verification': {'date': stamp, 'verifier_version': VERSION, 'method': 'full_pairs',
                             'constructions': len(solutions), 'sets': 1,
                             'residue_pairs': sum(s['verified']['n_pairs'] for s in solutions.values())}}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ('source', 'header', 'manifest', 'evidence', 'output'):
        parser.add_argument('--'+name, type=Path, required=True)
    for name in ('engine', 'revision', 'date'):
        parser.add_argument('--'+name, required=True)
    args = parser.parse_args()
    result = ingest(args.source, args.header, args.manifest, args.evidence, args.engine, args.revision, args.date)
    args.output.write_text(json.dumps(result, ensure_ascii=False, sort_keys=True, separators=(',', ':'))+'\n')
    print(json.dumps(result['verification']))
