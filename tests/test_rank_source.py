import unittest
from tools.sources import symmetric_rank_record
from tools.normalize import canonical
from verify.core import Invalid, verify


class SymmetricRankSourceTests(unittest.TestCase):
    def test_five_explicit_planes_prove_the_whole_domain(self):
        raw={'best_w':[3,8,18],'best_X':114,
             'best_faces':[[0,0,1],[0,1,0],[1,0,0],[2,-2,1],[2,1,-1]],
             'notes':'untrusted source annotation'}
        s=symmetric_rank_record(raw)
        self.assertEqual([p['numerator'] for p in s['products']],[429,286,429,-39,-66])
        self.assertNotIn('notes',s)
        result=verify(canonical(s),pairs=True)
        self.assertEqual(result['verified']['n_pairs'],52441)
        self.assertEqual(result['widths'],{'A':7,'B':7})

    def test_summary_without_numeric_construction_is_not_a_solution(self):
        with self.assertRaisesRegex(Invalid,'non_solution_record'):
            symmetric_rank_record({'best_X':-1})
