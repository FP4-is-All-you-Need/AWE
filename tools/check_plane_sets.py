"""Check browser plane distributions against exact Python enumeration."""
import hashlib
import json
from collections import Counter, defaultdict
from datetime import datetime, timezone
from itertools import product
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from verify.core import SETS, VERSION, encode_side, legal


def sha(path):
    return hashlib.sha256((ROOT / path).read_bytes()).hexdigest()


def main():
    results = json.loads(Path(sys.argv[1]).read_text())
    verified = []
    for result in results:
        if result['id'].startswith('awe1_'):
            source = 'data/solutions/' + result['id'][5:7] + '.json'
            record = next(s for s in json.loads((ROOT / source).read_text()) if s['id'] == result['id'])
        else:
            source = 'data/visualization/joint-examples.json'
            record = next(s for s in json.loads((ROOT / source).read_text())['references'] if 'joint_' + s['id'] == result['id'])
        output = {'id': result['id'], 'products': result['products'], 'weights': result['weights'],
                  'source': source, 'source_sha256': sha(source), 'sides': {}}
        for side, measured in result['sides'].items():
            weights, planes = result['weights'][side], result['planes'][side]
            if result['id'].startswith('awe1_'):
                choices, _ = encode_side(record, side, accelerated=False)
                rows = legal(tuple(record['limb_sets'][side]), tuple(map(tuple, planes)), tuple(record['plane_sets'][side]))
            else:
                # This reference stores a0, a1 and 3*a2 directly as planes.
                assert planes[:3] == [[1, 0, 0], [0, 1, 0], [0, 0, 3]]
                choices = {int(n): tuple(v) for n, v in record['encoding'].items()}
                S = SETS['2xE2M1']
                rows = [t for t in product(S, S, [v // 3 for v in S if v % 3 == 0])
                        if all(sum(a*b for a, b in zip(p, t)) in S for p in planes)]
            assert measured['chosen'] == {str(n): list(t) for n, t in choices.items()}
            alternatives = defaultdict(list)
            lo, hi = measured['domain']
            for t in rows:
                n = sum(w*v for w, v in zip(weights, t))
                if lo <= n <= hi:
                    alternatives[n].append(list(t))
            assert measured['alternatives'] == {str(n): sorted(alternatives[n]) for n in range(lo, hi+1)}
            holes = [n for n in range(lo, hi+1) if not alternatives[n]]
            assert holes == measured['holes'] and not measured['missing']
            for i, p in enumerate(planes):
                dot = lambda t: sum(a*b for a, b in zip(p, t))
                hist = Counter(dot(t) for t in choices.values())
                row = measured['planes'][i]
                assert row['histogram'] == {str(v): count for v, count in hist.items()}
                assert row['values'] == sorted(hist)
                extra = sorted({dot(t) for n in choices for t in alternatives[n]} - set(hist))
                assert row['extra'] == extra
                for witness in row['witnesses']:
                    n, t = witness['input'], witness['tuple']
                    assert t in alternatives[n]
                    assert witness['delta'] == [a-b for a, b in zip(t, choices[n])]
                    changes = [{'plane': j, 'from': sum(a*b for a,b in zip(q, choices[n])),
                                'to': sum(a*b for a,b in zip(q, t))} for j, q in enumerate(planes)]
                    assert witness['changes'] == [c for c in changes if c['from'] != c['to']]
            output['sides'][side] = {k: measured[k] for k in ('domain', 'method', 'holes', 'planes', 'sets')}
            output['sides'][side].update(encoded_count=len(choices), multiple_representation_inputs=sum(len(v)>1 for v in alternatives.values()))
        verified.append(output)
        print(result['id'], 'A/B choices, alternatives, histograms, extra sets and witnesses: exact match')
    report = {'schema_version': 1, 'date': datetime.now(timezone.utc).date().isoformat(),
              'method': 'exhaustive_fixed_construction_encoding_and_plane_evaluation',
              'verifier_version': VERSION, 'verifier_sha256': sha('verify/core.py'),
              'browser_measurement_sha256': sha('site/src/planeDistribution.ts'),
              'check_sha256': sha('tools/check_plane_sets.py'), 'constructions': verified}
    (ROOT / 'data/visualization/plane-set-measurements.json').write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n')


if __name__ == '__main__':
    main()
