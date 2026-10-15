"""Small independently specified constructions and rejection regressions."""
import copy
import unittest

from tools.normalize import canonical, identify
from tools.sources import base, catalog_row, uv_record
from verify.core import Invalid, verify


def single():
    return base({'A': [1], 'B': [1]}, {'A': [[1]], 'B': [[1]]},
                [{'a': 0, 'b': 0, 'numerator': 1}],
                {'A': [-4, 4], 'B': [-3, 3]})


def pair_sum():
    # (a0+6a1)(b0+6b1) = -5a0b0+30a1b1+6(a0+a1)(b0+b1).
    return base({'A': [1, 6], 'B': [1, 6]},
                {'A': [[1, 0], [0, 1], [1, 1]],
                 'B': [[1, 0], [0, 1], [1, 1]]},
                [{'a': 0, 'b': 0, 'numerator': -5},
                 {'a': 1, 'b': 1, 'numerator': 30},
                 {'a': 2, 'b': 2, 'numerator': 6}],
                {'A': [-10, 10], 'B': [-10, 10]})


class ExactVerificationTests(unittest.TestCase):
    def test_one_limb_asymmetric_domains(self):
        proof = verify(single())
        exhaustive = verify(single(), pairs=True)
        self.assertEqual(proof['coverage'], {'A': 4, 'B': 3})
        self.assertEqual(proof['verified']['n_pairs_proven'], 63)
        self.assertEqual(exhaustive['verified']['n_pairs'], 63)
        self.assertEqual(proof['accumulation']['product_bounds'], [12])
        self.assertEqual(proof['accumulation'], exhaustive['accumulation'])

    def test_pair_sum_identity_and_all_pairs(self):
        proof = verify(pair_sum())
        exhaustive = verify(pair_sum(), pairs=True)
        self.assertEqual(exhaustive['verified']['n_pairs'], 441)
        self.assertEqual(proof['verified']['n_pairs_proven'], 441)
        self.assertEqual(proof['accumulation'], exhaustive['accumulation'])

    def test_polynomial_identity_is_required_even_on_the_zero_domain(self):
        s=single()
        s['domain']={'A':[0,0],'B':[0,0]}
        s['products'][0]['numerator']=2
        # The only evaluated pair is (0,0); the formal coefficient is still wrong.
        for pairs in (False,True):
            with self.assertRaisesRegex(Invalid,'identity_failed'):
                verify(s,pairs=pairs)

    def test_broken_coefficient(self):
        s = pair_sum()
        s['products'][0]['numerator'] += 1
        with self.assertRaisesRegex(Invalid, '^identity_failed$'):
            verify(s)

    def test_encoding_hole(self):
        s = single()
        s['domain']['A'] = [-5, 5]  # 5 is absent from the one-limb storage set.
        with self.assertRaisesRegex(Invalid, '^encoding_missing$'):
            verify(s)

    def test_dimension_and_unknown_fields(self):
        s = single()
        s['planes']['A'][0].append(0)
        with self.assertRaises(Invalid):
            verify(s)
        s = single()
        s['unexpected'] = 'annotation'
        with self.assertRaisesRegex(Invalid, '^invalid_fields$'):
            verify(s)

    def test_boolean_is_not_numeric(self):
        for field in ('weight', 'plane', 'denominator', 'index', 'numerator', 'domain'):
            with self.subTest(field=field):
                s = single()
                if field == 'weight': s['weights']['A'][0] = True
                elif field == 'plane': s['planes']['A'][0][0] = True
                elif field == 'denominator': s['denominator'] = True
                elif field == 'index': s['products'][0]['a'] = False
                elif field == 'numerator': s['products'][0]['numerator'] = True
                else: s['domain']['A'][0] = False
                with self.assertRaisesRegex(Invalid, '^invalid_integer$'):
                    verify(s)


class CanonicalIdentityTests(unittest.TestCase):
    def test_sign_order_denominator_and_duplicates(self):
        original = pair_sum()
        changed = copy.deepcopy(original)
        order = [2, 0, 1]
        for side in ('A', 'B'):
            changed['planes'][side] = [[-x for x in original['planes'][side][i]] for i in order]
            changed['plane_sets'][side] = [original['plane_sets'][side][i] for i in order]
        changed['denominator'] = 2
        changed['products'] = [{'a': order.index(p['a']), 'b': order.index(p['b']),
                                'numerator': 2 * p['numerator']} for p in reversed(original['products'])]
        # Negate just one side once more and compensate each coefficient.
        changed['planes']['A'] = [[-x for x in p] for p in changed['planes']['A']]
        for p in changed['products']: p['numerator'] *= -1
        verify(changed, pairs=True)
        self.assertEqual(identify(original), identify(changed))
        first = changed['products'].pop()
        changed['products'].extend([dict(first, numerator=first['numerator'] // 2)] * 2)
        self.assertEqual(canonical(original), canonical(changed))

    def test_different_product_decomposition_has_different_id(self):
        direct = pair_sum()
        direct['planes'] = {'A': [[1, 0], [0, 1]], 'B': [[1, 0], [0, 1]]}
        direct['plane_sets'] = {'A': ['2xE2M1'] * 2, 'B': ['2xE2M1'] * 2}
        direct['products'] = [{'a': i, 'b': j, 'numerator': c}
                              for i, j, c in [(0, 0, 1), (0, 1, 6), (1, 0, 6), (1, 1, 36)]]
        verify(direct, pairs=True)
        self.assertNotEqual(identify(pair_sum()), identify(direct))

    def test_canonical_does_not_mutate_input(self):
        s = pair_sum()
        before = copy.deepcopy(s)
        canonical(s)
        self.assertEqual(s, before)

    def test_catalog_pair_sum_adapter(self):
        row = [2, 3, 7, 1, 6, 10] + [0] * 11
        converted = catalog_row(row, {'7': [[0, 1]]})
        self.assertEqual(converted, pair_sum())
        verify(converted, pairs=True)
        row[1] = 4
        with self.assertRaisesRegex(Invalid, '^source_product_count$'):
            catalog_row(row, {'7': [[0, 1]]})


class PairAssignmentRegressionTests(unittest.TestCase):
    def test_pair_assignment_changes_encoding_coverage(self):
        record = {'w': [1, 18, 59], 'pairs': [[0, 1], [1, 2]],
                  'uv': [[1, 1], [1, 1]], 'X': 127}
        correct = uv_record(record)
        self.assertEqual(verify(correct, pairs=True)['verified']['n_pairs'], 65025)
        expanded = uv_record(dict(record, X=204))
        self.assertEqual(verify(expanded)['coverage'], {'A': 204, 'B': 204})
        wrong = dict(record, pairs=[[0, 1], [0, 2]])
        with self.assertRaisesRegex(Invalid, '^encoding_missing$'):
            verify(uv_record(wrong))
        self.assertEqual(verify(uv_record(dict(wrong, X=8)))['coverage'], {'A': 8, 'B': 8})
        with self.assertRaisesRegex(Invalid, '^encoding_missing$'):
            verify(uv_record(dict(wrong, X=9)))

    def test_three_limb_six_products_full_pairs(self):
        solution = uv_record({'w': [1, 29, 37], 'uv': [[1, 1]] * 3, 'X': 148})
        self.assertEqual(len(solution['products']), 6)
        self.assertEqual(solution['denominator'], 1)
        self.assertEqual([p['numerator'] for p in solution['products']],
                         [-65, -261, 259, 29, 37, 1073])
        proof = verify(solution)
        exhaustive = verify(solution, pairs=True)
        self.assertEqual(exhaustive['verified']['n_pairs'], 88209)
        self.assertEqual(proof['verified']['n_pairs_proven'], 88209)
        self.assertEqual(proof['coverage'], {'A': 148, 'B': 148})
        self.assertEqual(proof['accumulation'], exhaustive['accumulation'])

class EncodingImplementationsTests(unittest.TestCase):
    def test_python_and_array_witnesses_agree(self):
        from verify.core import encode_side
        for s in (single(), pair_sum()):
            for side in ('A', 'B'):
                self.assertEqual(encode_side(s,side,accelerated=False), encode_side(s,side))

    def test_source_exact_fraction_correction(self):
        from tools.sources import numeric_record
        rec = {'kind':'solution', 'weights':[1], 'X':4,
               'construction':{'products':[[[1],[1]]], 'lambda':[2]},
               'lambda_correction_20260824':{'lambda_exact':['1']}}
        self.assertEqual(verify(numeric_record(rec),pairs=True)['verified']['n_pairs'],81)

    def test_schema_version_boolean_is_rejected(self):
        s=single()
        s['schema_version']=True
        with self.assertRaises(Invalid): verify(s)

class AdditionalAdapterTests(unittest.TestCase):
    def test_rational_pair_planes(self):
        from tools.sources import uv_record
        s=uv_record({'w':[1,7],'uvs':[[1,2]],'X':3})
        self.assertEqual(s['denominator'],2)
        self.assertEqual([p['numerator'] for p in s['products']],[-5,70,7])
        self.assertEqual(verify(s,pairs=True)['verified']['n_pairs'],49)

    def test_coefficients_from_explicit_products(self):
        from tools.sources import numeric_record
        s=numeric_record({'kind':'solution','weights':[1,6],'X':10,
                          'products':[[[1,0],[1,0]],[[0,1],[0,1]],[[1,1],[1,1]]]})
        self.assertEqual(identify(s),identify(pair_sum()))
        self.assertEqual(verify(s,pairs=True)['verified']['n_pairs'],441)


if __name__ == '__main__':
    unittest.main()
