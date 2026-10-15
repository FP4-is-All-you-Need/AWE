"""Project saved joint encoding references without searching or selecting tuples."""
import argparse
from datetime import datetime, timezone
from fractions import Fraction
import hashlib
import json
from pathlib import Path


S = {-12, -8, -6, -4, -3, -2, -1, 0, 1, 2, 3, 4, 6, 8, 12}


def project(root, correction_file=None):
    raw = (root / 'final_contracts.json').read_bytes()
    source = json.loads(raw)
    source_hash = hashlib.sha256(raw).hexdigest()
    corrections = None
    if correction_file:
        correction_raw = correction_file.read_bytes()
        corrections, _ = json.JSONDecoder().raw_decode(correction_raw.decode())
    rows = []
    for reference in source['references']:
        weights, planes = reference['w'], reference['forms']
        coefficients = [Fraction(v) for v in reference['lam']]
        if any(v.denominator != 1 for v in coefficients):
            raise ValueError('Noninteger saved reconstruction coefficient')
        if len(planes) != len(coefficients) or any(len(p) != len(weights) for p in planes):
            raise ValueError('Invalid saved plane dimensions')
        coefficients = [int(v) for v in coefficients]
        for i, wi in enumerate(weights):
            for j, wj in enumerate(weights):
                if sum(c * p[i] * p[j] for c, p in zip(coefficients, planes)) != wi * wj:
                    raise ValueError('Saved symbolic reconstruction identity fails')
        key = f"{weights}|{planes}|{reference['lam']}"
        saved = source['luts'][key]
        encoding = saved['lut']
        if set(encoding) != set(saved['lut_faces']):
            raise ValueError('Saved input and face keys differ')
        for x, limbs in encoding.items():
            if not -128 <= int(x) <= 127 or len(limbs) != len(weights):
                raise ValueError('Invalid saved input or tuple dimension')
            if any(type(v) is not int for v in limbs):
                raise ValueError('Noninteger saved limb')
            if sum(w * v for w, v in zip(weights, limbs)) != int(x):
                raise ValueError('Saved tuple reconstruction fails')
            faces = [sum(c * v for c, v in zip(p, limbs)) for p in planes]
            if faces != saved['lut_faces'][x] or any(v not in S for v in faces):
                raise ValueError('Saved plane values differ or are outside the stored alphabet')
        holes = [x for x in range(-128, 128) if str(x) not in encoding]
        if holes != reference['missing'] or len(encoding) != reference['covered']:
            raise ValueError('Saved coverage claim differs from table')
        math = {'weights': weights, 'planes': planes,
                'products': [{'a': i, 'b': i, 'coefficient': c} for i, c in enumerate(coefficients)],
                'denominator': 1}
        identifier = hashlib.sha256(json.dumps(math, sort_keys=True, separators=(',', ':')).encode()).hexdigest()[:20]
        correction = None
        if corrections and weights == [1, 5, 26] and planes == [[1,0,0],[0,1,0],[0,0,1],[1,-1,0],[1,0,-1],[0,1,-1]]:
            claim = next(v for v in corrections if v['weights'] == weights)
            correction = {'kind':'nearest_shift','max_abs_shift':claim['c1']['max_abs_correction'],'radius_source_claim':claim['c1']['R'],'identity':'AB=A0*B0+dA*B+A0*dB','chosen_representatives':None,'source_sha256':hashlib.sha256(correction_raw).hexdigest()}
        rows.append({'correction':correction,'id': identifier, **math, 'domain': [-128, 127], 'holes': holes,
                     'share': len(holes) / 256, 'encoding': encoding,
                     'source_sha256': source_hash,
                     'source_claim': {'pairs': reference.get('pairs'), 'violations': reference.get('violations')},
                     'alternatives_complete': False})
    return {'schema_version': 1, 'references': rows}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-root', required=True, type=Path)
    parser.add_argument('--output', type=Path, default=Path('data/visualization/joint-examples.json'))
    parser.add_argument('--correction-file',type=Path)
    args = parser.parse_args()
    data = project(args.source_root,args.correction_file)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')) + '\n')
    summary = {'measured_at': datetime.now(timezone.utc).isoformat(),
               'verifier_sha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
               'output_sha256': hashlib.sha256(args.output.read_bytes()).hexdigest(),
               'constructions': len(data['references']),
               'saved_tuples_checked': sum(len(r['encoding']) for r in data['references']),
               'coefficient_identities': 'exact',
               'tuple_checks': ['weighted_value', 'plane_storage_set'],
               'coverage_basis': 'keys_present_in_saved_lut',
               'missing_counts': [len(r['holes']) for r in data['references']],
               'pair_enumeration': False, 'alternatives_complete': False}
    args.output.with_name(args.output.stem + '-measurements.json').write_text(
        json.dumps(summary, indent=2) + '\n')
    print(json.dumps({'references': len(data['references']),
                      'saved_tuples_validated': sum(len(r['encoding']) for r in data['references']),
                      'holes': [len(r['holes']) for r in data['references']]}))


if __name__ == '__main__':
    main()
