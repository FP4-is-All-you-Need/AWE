import copy
import json
from pathlib import Path
import unittest
from tools.modular_header import header_rows
from tools.check_fp32 import check
from tempfile import TemporaryDirectory

DATA = Path(__file__).resolve().parents[1]/'data/modular/fp32-history.json'

class FP32History(unittest.TestCase):
    def test_all_saved_residue_pairs_and_set_bounds(self):
        result = check(DATA)
        self.assertTrue(result['valid'])
        self.assertEqual((result['sets'], result['constructions'], result['residue_pairs']), (16, 28, 328333))

    def test_group_by_actual_moduli_keep_both_precision_results(self):
        d = json.loads(DATA.read_text())
        groups = d['fp32_groups']
        self.assertEqual(len(groups), len({tuple(g['moduli']) for g in groups}))
        engines = [e for g in groups for e in g['engines']]
        self.assertEqual(sum(e['id'].startswith('k64_') for e in engines), 9)
        self.assertEqual(sum(e['id'].startswith('k96_') for e in engines), 16)
        self.assertEqual(sum(e['id'].startswith('sg_') for e in engines), 13)
        runs = [r for e in engines for r in e['measurements']]
        failed = [r for r in runs if r['qualified'] is False]
        self.assertEqual(len(failed), 4)
        self.assertEqual({(r['bits'], r['routine']) for r in failed}, {(20, 'SGEMM'), (21, 'SGEMM')})
        self.assertEqual(sum(r['scope']=='fixed_1024_points' for r in runs), 38)
        group = next(g for g in groups if any(e['id']=='k64_s24' for e in g['engines']))
        self.assertTrue({'k64_s24','k96_s24_fused','sg_7f263525faa8'} <= {e['id'] for e in group['engines']})
        self.assertEqual(next(e for e in engines if e['id']=='k64_s24')['state'], 'build_only')
        self.assertEqual(next(e for e in engines if e['id']=='k96_s24_fused')['state'], 'measured')
        self.assertTrue(all(r['shape'][0] == r['shape'][1] for r in runs if r['scope']=='fixed_1024_points'))
        self.assertNotIn('median_ms', DATA.read_text())
        self.assertNotIn('/home/', DATA.read_text())

    def test_lut_unit_rows_are_not_a_weight_search(self):
        header = '''int l8_mod[1]={3}; int l8_kind[1]={0}; int l8_planes[1]={1};
        int l8_limb_off[1]={0}; int l8_limbs[3][2]={{0,0},{1,0},{-1,0}};'''
        with TemporaryDirectory() as tmp:
            path = Path(tmp)/'table.h';path.write_text(header)
            self.assertEqual(header_rows(path)[0]['weights'], [1])
            path.write_text(header.replace('{-1,0}', '{0,0}'))
            with self.assertRaisesRegex(ValueError, 'weight_mismatch'):header_rows(path)
