"""Project saved encoding tables into browser examples without searching."""
import argparse
import hashlib
import json
from pathlib import Path


S = [-12, -8, -6, -4, -3, -2, -1, 0, 1, 2, 3, 4, 6, 8, 12]


def project(residue_lut, alternative_lut):
    specifications = [
        ('frozen_residue', residue_lut,
         '13を法とする各剰余の代表を、±12を除いた13値から選ぶ保存済みの表。'),
        ('min_nonzero', alternative_lut,
         '非零リム数、リムの絶対値の和、リム列の辞書順の順で選ぶ保存済みの表。'),
    ]
    tables = []
    for method, relative, description in specifications:
        raw = relative.read_bytes()
        source = json.loads(raw)
        weights = source['weights']
        domain = source['input_domain']
        limbset = sorted(source.get('limb_values', source.get('limb_set', [])))
        if method == 'frozen_residue':
            rows = source['rows']
            values = {str(row['x']): row['limbs'] for row in rows}
            if len(values) != len(rows):
                raise ValueError('Duplicate saved input')
        else:
            values = source['values']
        if weights != [1, 13, 169] or domain != [-128, 127]:
            raise ValueError('Unexpected saved construction or input domain')
        expected = S if method == 'min_nonzero' else [x for x in S if abs(x) != 12]
        if limbset != expected:
            raise ValueError('Unexpected saved limb set')
        if set(values) != {str(x) for x in range(domain[0], domain[1] + 1)}:
            raise ValueError('Saved table does not cover its stated domain')
        for x, limbs in values.items():
            if len(limbs) != len(weights) or any(type(v) is not int or v not in limbset for v in limbs):
                raise ValueError('Invalid saved limb tuple')
            if sum(w * v for w, v in zip(weights, limbs)) != int(x):
                raise ValueError('Saved tuple does not reconstruct its input')
        tables.append({
            'method': method, 'description': description,
            'weights': weights, 'input_domain': domain, 'limbset': limbset,
            'values': {str(x): values[str(x)] for x in range(domain[0], domain[1] + 1)},
            'source_sha256': hashlib.sha256(raw).hexdigest(),
            'choice_semantics': 'selected_from_saved_table',
            'alternatives_complete': False,
        })
    return {'schema_version': 1, 'tables': tables}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--residue-lut', type=Path, required=True)
    parser.add_argument('--alternative-lut', type=Path, required=True)
    parser.add_argument('--output', type=Path, default=Path('data/visualization/encoding-examples.json'))
    args = parser.parse_args()
    data = project(args.residue_lut, args.alternative_lut)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')) + '\n')
    print(json.dumps({'tables': len(data['tables']), 'rows': [len(t['values']) for t in data['tables']],
                      'tuples_validated': sum(len(t['values']) for t in data['tables'])}))


if __name__ == '__main__':
    main()
