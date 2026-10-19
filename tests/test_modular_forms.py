"""Tests for single modular constructions (schema 2)."""
import copy
import json
import tempfile
import unittest
from pathlib import Path
from tools import modular_forms as T
from verify import modular_forms as MF

DATE = '2026-10-18'
PLAIN = {'modulus': 65, 'weights': {'A': [1, 39], 'B': [1, 39]}, 'planes': {'A': [[1, 0], [1, -1]], 'B': [[1, 0], [1, -1]]},
         'plane_moduli': {'A': [65, 65], 'B': [65, 65]}, 'products': [[0, 0, 40], [1, 1, 26]], 'denominator': 1, 'value_set': '2xE2M1'}
FOLDED = {'modulus': 51, 'weights': {'A': [1, 13], 'B': [1, 13]}, 'planes': {'A': [[1, 0], [0, 1], [1, 1]], 'B': [[1, 0], [0, 1], [1, 1]]},
          'plane_moduli': {'A': [17, 17, 51], 'B': [17, 17, 51]}, 'products': [[0, 0, 39], [1, 1, 3], [2, 2, 13]], 'denominator': 1,
          'value_set': '2xE2M1'}
FP6 = {'modulus': 64, 'weights': {'A': [17, 2], 'B': [33, 34]}, 'planes': {'A': [[1, 0], [1, 2]], 'B': [[1, 0], [1, 2]]},
       'plane_moduli': {'A': [64, 64], 'B': [64, 64]}, 'products': [[0, 0, 48], [1, 1, 1]], 'denominator': 1, 'value_set': '8xE2M3'}
HOLES_SMALL = {'modulus': 10, 'weights': {'A': [1, 0, 0], 'B': [1, 0, 0]}, 'planes': {'A': [[1, 0, 0]], 'B': [[1, 0, 0]]},
               'plane_moduli': {'A': [10], 'B': [10]}, 'products': [[0, 0, 1]], 'denominator': 1, 'value_set': '2xE2M1'}
HOLES_LARGE = {'modulus': 106, 'weights': {'A': [1, 53, 0], 'B': [1, 0, 54]}, 'planes': {'A': [[1, 0, 0], [0, 1, 0]], 'B': [[1, 0, 0], [0, 0, 1]]},
               'plane_moduli': {'A': [106, 2], 'B': [106, 53]}, 'products': [[0, 0, 1], [1, 0, 53], [0, 1, 54]], 'denominator': 1,
               'value_set': '2xE2M1'}


def rec(line, **kw):
    return MF.record(T.construction(line), DATE, **kw)


def literal_table(m):
    """One limb of weight 1 and one plane equal to it: residue x -> limb and plane value sym(x)."""
    return [('Z', [MF.sym(x, m)], [MF.sym(x, m)]) for x in range(m)]


class ModularFormsTest(unittest.TestCase):
    def test_plain_round_trip(self):
        r = rec(PLAIN)
        self.assertTrue(r['id'].startswith('awem2_'))
        self.assertEqual(r['holes'], {'A': 0, 'B': 0, 'exact': True, 'method': 'search'})
        self.assertEqual(r['reconstruction'], {'procedure': 'none'})
        self.assertEqual(r['verified']['encoding'], 'all_residues')
        self.assertIn('encoding', r)
        self.assertEqual(MF.check_record(copy.deepcopy(r)), {'id': r['id'], 'rebuilt': True})

    def test_folded_planes(self):
        r = rec(FOLDED)
        self.assertEqual(r['plane_moduli']['A'], [17, 17, 51])
        self.assertTrue(MF.check_record(r)['rebuilt'])

    def test_fp6_value_set(self):
        r = rec(FP6)
        self.assertEqual(r['plane_sets'], {'A': ['8xE2M3', '8xE2M3'], 'B': ['8xE2M3', '8xE2M3']})
        self.assertTrue(MF.check_record(r)['rebuilt'])

    def test_unknown_value_set(self):
        line = dict(PLAIN, value_set='3xE2M1')
        with self.assertRaises(T.Invalid):
            rec(line)

    def test_verified_fields(self):
        v = rec(PLAIN)['verified']
        self.assertEqual((v['check_modulus'], v['den_split'], v['fold_rule']), (65, [1, 1], True))
        self.assertNotIn('plane_values_binding', v)

    def test_nonunit_denominator_needs_table(self):
        c = MF.make(6, [1], [1], [[1]], [[1]], [6], [6], [(0, 0, 2)], 2)
        res, _, _ = MF.verify(c)
        self.assertEqual((res['ok'], res['reason'], res['check_modulus']), (False, 'nonunit_denominator_needs_table', 12))
        with self.assertRaises(MF.Fail) as e:
            MF.record(MF.make(6, [1], [1], [[1]], [[1]], [6], [6], [(0, 0, 2)], 2), DATE, table_max=5)
        self.assertEqual(str(e.exception), 'nonunit_denominator_needs_table')

    def test_nonunit_denominator_on_the_literal_table(self):
        # den = 2 on m = 6: checked modulo 12 on the literal table, which the record stores and the rebuild makes again
        r = MF.record(MF.make(6, [1], [1], [[1]], [[1]], [6], [6], [(0, 0, 2)], 2), DATE)
        self.assertEqual(r['holes'], {'A': 0, 'B': 0, 'exact': True, 'method': 'literal_table'})
        self.assertEqual((r['verified']['check_modulus'], r['verified']['den_split'], r['verified']['identity']), (12, [2, 1], 'modulo_dm'))
        self.assertEqual(r['reconstruction']['procedure'], 'divide_d1_then_multiply_d2_inverse')
        self.assertTrue(r['verified']['fold_rule'])
        self.assertNotIn('plane_values_binding', r['verified'])
        self.assertEqual(len(r['encoding']['A']), 6)
        self.assertTrue(MF.check_record(copy.deepcopy(r))['rebuilt'])
        self.assertFalse(MF.check_record(copy.deepcopy(r), rebuild=False)['rebuilt'])
        bad = copy.deepcopy(r)
        bad['products'][0]['numerator'] = 4
        with self.assertRaises(MF.Fail):
            MF.check_record(bad)

    def test_literal_table_holes_are_an_upper_bound(self):
        # den = 2 on m = 26: 13 and its negatives are not literal values, so the literal table leaves holes
        r = MF.record(MF.make(26, [1], [1], [[1]], [[1]], [26], [26], [(0, 0, 2)], 2), DATE)
        self.assertEqual((r['holes']['method'], r['holes']['exact']), ('literal_table', False))
        self.assertGreater(r['holes']['A'], 0)

    def test_split_denominator_with_table(self):
        # den = 6 = 2 * 3 on m = 2: the checks work modulo 2 * 2 = 4; (2 x y mod 4) / 2 * 3^-1 == x y (mod 2)
        c = MF.make(2, [1], [1], [[1]], [[1]], [2], [2], [(0, 0, 2)], 6)
        t = literal_table(2)
        res, _, _ = MF.verify(c, enc_given=(t, t))
        self.assertEqual((res['ok'], res['check_modulus'], res['den_unit']), (True, 4, False))

    def test_fold_rule_failure_with_table(self):
        # plane modulus 3 on m = 6 breaks the fold rule; the literal table still gives x y on every pair
        own, _, _ = MF.verify(MF.make(6, [1], [1], [[1]], [[1]], [3], [3], [(0, 0, 1)], 1))
        self.assertEqual(own['reason'], 'fold_rule_failed')
        t = literal_table(6)
        res, _, _ = MF.verify(MF.make(6, [1], [1], [[1]], [[1]], [3], [3], [(0, 0, 1)], 1), enc_given=(t, t))
        self.assertTrue(res['ok'])
        self.assertFalse(res['fold_rule'])
        self.assertIn('fold_rule_failed', res['notes'])
        self.assertIn('table_pairs_ok', res['notes'])
        bad = [('Z', [1], [4]) if x == 1 else e for x, e in enumerate(t)]   # 4 == 1 mod 3 but not mod 6
        res, _, _ = MF.verify(MF.make(6, [1], [1], [[1]], [[1]], [3], [3], [(0, 0, 1)], 1), enc_given=(bad, bad))
        self.assertFalse(res['ok'])

    def test_table_length(self):
        t = literal_table(6)[:5]
        res, _, _ = MF.verify(MF.make(6, [1], [1], [[1]], [[1]], [6], [6], [(0, 0, 1)], 1), enc_given=(t, t))
        self.assertEqual(res['reason'], 'table_length')

    def test_unit_denominator_identity_label(self):
        # den = 2 is a unit mod 65: the identity is checked modulo the modulus itself
        line = dict(PLAIN, products=[[0, 0, 80], [1, 1, 52]], denominator=2)
        r = rec(line)
        self.assertEqual(r['verified']['identity'], 'modulo_p')

    def test_holes(self):
        small = rec(HOLES_SMALL)
        self.assertEqual(small['hole_set'], {'A': [5], 'B': [5]})
        self.assertEqual(small['verified']['encoding'], 'served_residues')
        large = rec(HOLES_LARGE)
        self.assertNotIn('hole_set', large)
        self.assertEqual((large['holes']['A'], large['holes']['B']), (76, 44))
        self.assertTrue(MF.check_record(large)['rebuilt'])

    def test_table_only_for_small_moduli(self):
        r = rec(PLAIN, table_max=64)
        self.assertNotIn('encoding', r)
        self.assertNotIn('plane_values', r)
        self.assertTrue(MF.check_record(r)['rebuilt'])

    def test_tampered_coefficient_fails(self):
        r = rec(PLAIN)
        r['products'][0]['numerator'] += 1
        with self.assertRaises(MF.Fail):
            MF.check_record(r)

    def test_quick_check_detects_id(self):
        r = rec(PLAIN)
        r['id'] = 'awem2_' + '0' * 64
        with self.assertRaises(MF.Fail):
            MF.check_record(r, rebuild=False)

    def test_schema1_row_unchanged(self):
        v1 = json.loads(Path('data/modular/catalog.json').read_text())['solutions'][0]
        MF.check_record(copy.deepcopy(v1))
        T.validator().validate({'schema_version': 2, 'data_version': '0.2.0', 'kind': 'modular_forms', 'solutions': [v1]})

    def test_smallest_value_set(self):
        # given as FP6, the construction holds on 2xE2M1 with the same holes: one record, on 2xE2M1, with both checker versions
        fp4 = rec(PLAIN)
        r = T.minimal_record(dict(PLAIN, value_set='8xE2M3'), DATE)
        self.assertEqual((r['id'], r['plane_sets']['A'][0]), (fp4['id'], '2xE2M1'))
        records, excluded = T.collect([(dict(PLAIN, prior_checker_version='1.1'), fp4),
                                       (dict(PLAIN, value_set='8xE2M3', prior_checker_version='1.3'), copy.deepcopy(r))])
        self.assertEqual((len(records), excluded), (1, []))
        self.assertEqual(records[fp4['id']]['prior_checker_versions'], ['1.1', '1.3'])
        self.assertTrue(MF.check_record(records[fp4['id']])['rebuilt'])
        # the given holes decide: FP6 keeps a construction whose 2xE2M1 holes differ
        six = T.minimal_record(dict(FP6, holes=[0, 0]), DATE)
        self.assertEqual(six['plane_sets']['A'][0], '8xE2M3')
        with self.assertRaises(MF.Fail) as e:
            T.minimal_record(dict(PLAIN, holes=[1, 0], holes_exact=True), DATE)
        self.assertEqual(str(e.exception), 'holes_differ_from_input')
        self.assertEqual(T.inclusion(), {'2xE2M1': ['8xE2M3', '16xE3M2']})

    def test_given_holes_as_an_upper_bound(self):
        # HOLES_SMALL has holes [1, 1] on 2xE2M1 (residue 5): an upper bound of [3, 2] admits it, an exact [3, 2] does not
        r = T.minimal_record(dict(HOLES_SMALL, holes=[3, 2]), DATE)
        self.assertEqual((r['holes']['A'], r['holes']['B'], r['holes']['exact']), (1, 1, True))
        with self.assertRaises(MF.Fail) as e:
            T.minimal_record(dict(HOLES_SMALL, holes=[3, 2], holes_exact=True), DATE)
        self.assertEqual(str(e.exception), 'holes_differ_from_input')
        with self.assertRaises(MF.Fail):
            T.minimal_record(dict(HOLES_SMALL, holes=[0, 1]), DATE)
        # given as FP6 with an upper bound: FP6 has no hole here, so the 2xE2M1 record (one hole) is not taken
        six = T.minimal_record(dict(HOLES_SMALL, value_set='8xE2M3', holes=[3, 3]), DATE)
        self.assertEqual((six['plane_sets']['A'][0], six['holes']['A']), ('8xE2M3', 0))

    def test_build_and_check(self):
        with tempfile.TemporaryDirectory() as d:
            out = Path(d)/'forms'
            res = T.build([PLAIN, FOLDED, FP6, HOLES_LARGE, PLAIN], out, DATE)
            self.assertEqual((res['solutions'], res['failed']), (4, []))
            self.assertEqual(T.check(out)['rebuilt'], 4)
            self.assertEqual(T.check(out, rebuild=False)['rebuilt'], 0)
            index = json.loads((out/'forms-index.json').read_text())
            self.assertEqual([(p['modulus'], p['prime'], p['exponent'], p['value_set'], p['kind']) for p in index['prime_powers']],
                             [(64, 2, 6, '8xE2M3', 'hole_free')])
            index['prime_powers'] = []
            (out/'forms-index.json').write_text(json.dumps(index))
            with self.assertRaises(T.Invalid):
                T.check(out, rebuild=False)

    def test_build_drops_broken_identity(self):
        bad = copy.deepcopy(PLAIN)
        bad['products'][1][2] += 1
        with tempfile.TemporaryDirectory() as d:
            res = T.build([bad], Path(d)/'forms', DATE)
            self.assertEqual(res['solutions'], 0)
            self.assertEqual(res['failed'][0]['line'], 1)
            index = json.loads((Path(d)/'forms'/'forms-index.json').read_text())
            self.assertEqual([(e['reason'], e['count']) for e in index['excluded']], [('identity_failed', 1)])
            left = json.loads((Path(d)/'forms'/'forms-excluded.json').read_text())['excluded'][0]['constructions'][0]
            self.assertEqual((left['modulus'], left['id']), (65, T.input_id(bad)))
            self.assertTrue(T.check(Path(d)/'forms')['valid'])

    def test_chunks(self):
        with tempfile.TemporaryDirectory() as d:
            out = Path(d)/'forms'
            recs = [rec(x) for x in (PLAIN, FOLDED, HOLES_LARGE)]
            left = [{'reason': 'coverage_cost_cap', 'construction': dict(x, id=T.input_id(x))} for x in (FP6, HOLES_SMALL)]
            T.write_forms(recs, out, left, chunk_bytes=1)
            index = json.loads((out/'forms-index.json').read_text())
            self.assertEqual([(c['modulus_min'], c['modulus_max']) for c in index['chunks']], [(51, 51), (65, 65), (106, 106)])
            self.assertEqual(index['excluded'][0]['count'], 2)
            self.assertEqual(T.check(out)['chunks'], 3)
            (out/'forms-0000999-0000999.json').write_text('{}')
            with self.assertRaises(T.Invalid):
                T.check(out, rebuild=False)
            (out/'forms-0000999-0000999.json').unlink()
            path = out/index['chunks'][1]['path']
            path.write_text(path.read_text() + ' ')
            with self.assertRaises(T.Invalid):
                T.check(out, rebuild=False)


if __name__ == '__main__':
    unittest.main()
