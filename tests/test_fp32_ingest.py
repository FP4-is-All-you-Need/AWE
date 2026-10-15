import copy
import json
from pathlib import Path
import tempfile
import unittest

from tools.fp32_ingest import bind, check_header, digest
from tools.check_fp32 import check
from verify.modular import FIELDS, verify, verify_set
from tools.modular_ingest import SET_FIELDS, identify

ROOT = Path(__file__).resolve().parents[1]


class RecordedSingleTests(unittest.TestCase):
    def test_committed_table_rechecks_every_residue_pair_and_crt_bound(self):
        data = json.loads((ROOT/'data/modular/fp32.json').read_text())
        solutions = {s['id']: s for s in data['solutions']}
        pairs = 0
        for sid, s in solutions.items():
            self.assertEqual(identify(s, FIELDS, 'awem1_'), sid)
            pairs += verify(s)['verified']['n_pairs']
        s = data['sets'][0]
        proof = verify_set({k: s[k] for k in SET_FIELDS}, solutions)
        self.assertEqual(proof, s['verification'])
        self.assertEqual((len(solutions), pairs, proof['products'], proof['faces'], proof['max_k']),
                         (12, 79355, 28, 48, '9180'))
        self.assertEqual(s['magnitude_bits'], 24)
        self.assertEqual(data['verification']['residue_pairs'], pairs)
        self.assertTrue(check(ROOT/'data/modular/fp32.json')['valid'])

    def test_recheck_detects_changed_reconstruction_coefficients(self):
        data = json.loads((ROOT/'data/modular/fp32.json').read_text())
        data['solutions'][0]['products'][0]['numerator'] += 1
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp)/'catalog.json'
            path.write_text(json.dumps(data))
            with self.assertRaisesRegex(ValueError, 'construction_id_mismatch'):
                check(path)

    def test_measured_label_requires_source_header_binary_and_output_evidence(self):
        with tempfile.TemporaryDirectory() as tmp:
            source, header = Path(tmp)/'source.json', Path(tmp)/'table.h'
            source.write_text('{}')
            header.write_text('// sha256 '+digest(source))
            comparison = dict(passed=True, sass_equal=True, reference_sha256='a'*64,
                              device_metadata_checks=dict(inventory=True, resources=True,
                                                          attributes=True, initialized_data=True))
            engine = dict(id='test', bits=24, reference_sha256='a'*64,
                          original_sha256={'l8_fp32_tables.h': digest(header)})
            run = dict(engine='test', bits=24, reference_sha256='a'*64,
                       asset_and_loaded_object_match=True,
                       output_checks=dict(qualified=True, output_hash='b'*16, model_mismatches=0,
                                          unwritten_nan=0, upper_triangle_changed=0))
            evidence = dict(engines=[dict(id='test', comparison=comparison)], operation_measurement_bindings=[run])
            self.assertEqual(len(bind(source, header, [engine], evidence, 'test')[1]), 1)
            for field in ('asset_and_loaded_object_match', 'reference_sha256', 'bits'):
                bad = copy.deepcopy(evidence)
                bad['operation_measurement_bindings'][0][field] = False
                with self.assertRaisesRegex(ValueError, 'no_matching_measurement'):
                    bind(source, header, [engine], bad, 'test')
            run['output_checks']['model_mismatches'] = 1
            with self.assertRaisesRegex(ValueError, 'measurement_output_failed'):
                bind(source, header, [engine], evidence, 'test')
            source.write_text('{"changed":true}')
            with self.assertRaisesRegex(ValueError, 'source_hash_mismatch'):
                bind(source, header, [engine], evidence, 'test')
            header.write_text('changed')
            with self.assertRaisesRegex(ValueError, 'header_hash_mismatch'):
                bind(source, header, [engine], evidence, 'test')

    def test_header_arrays_are_checked_even_with_the_right_hash_comment(self):
        from tests.test_modular import source_row
        row = source_row(3)
        text = ('int l8_mod[1]={3}; int l8_kind[1]={0}; int l8_planes[1]={1}; '
                'int l8_limb_off[1]={0}; int l8_limbs[3][2]={{0,0},{1,0},{-1,0}};')
        with tempfile.TemporaryDirectory() as tmp:
            header = Path(tmp)/'table.h'
            header.write_text(text)
            check_header(header, [row])
            header.write_text(text.replace('{-1,0}', '{1,0}'))
            with self.assertRaisesRegex(ValueError, 'header_array_mismatch:l8_limbs'):
                check_header(header, [row])
