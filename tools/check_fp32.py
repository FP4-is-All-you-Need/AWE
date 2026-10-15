"""Recheck the recorded FP32 residue tables and CRT bounds without original inputs."""
import argparse
import json
from pathlib import Path
from tools.modular_ingest import identify, SET_FIELDS
from verify.modular import FIELDS, verify, verify_set, VERSION


def check(path):
    data = json.loads(path.read_text())
    solutions = {s['id']: s for s in data['solutions']}
    if len(solutions) != len(data['solutions']):
        raise ValueError('duplicate_construction')
    pairs = 0
    for sid, s in solutions.items():
        if identify(s, FIELDS, 'awem1_') != sid:
            raise ValueError('construction_id_mismatch')
        proof = verify(s)
        if {k: v for k, v in s['verified'].items() if k != 'date'} != proof['verified'] or s['accumulation'] != proof['accumulation']:
            raise ValueError('construction_verification_mismatch')
        pairs += proof['verified']['n_pairs']
    for s in data['sets']:
        if identify(s, SET_FIELDS, 'awems1_') != s['id']:
            raise ValueError('set_id_mismatch')
        if verify_set({k: s[k] for k in SET_FIELDS}, solutions) != s['verification']:
            raise ValueError('set_verification_mismatch')
    summary = dict(constructions=len(solutions), sets=len(data['sets']), residue_pairs=pairs,
                   method='full_pairs', verifier_version=VERSION)
    if any(data['verification'].get(k) != v for k, v in summary.items()):
        raise ValueError('summary_mismatch')
    return dict(valid=True, ingestion_date=data['verification']['date'], **summary)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('catalog', type=Path)
    print(json.dumps(check(parser.parse_args().catalog)))
