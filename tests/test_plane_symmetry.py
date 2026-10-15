import json
from pathlib import Path
import unittest
from tools.audit_plane_symmetry import record_sets, measure
from verify.core import encode_side

ROOT=Path(__file__).resolve().parents[1]
class PlaneSymmetryTest(unittest.TestCase):
    def test_first_tuple_matches_exact_verifier(self):
        records=json.loads((ROOT/'data/solutions/16.json').read_text())
        for s in [records[0],next(s for s in records if s['id'].endswith('e4136'))]:
            encoded,_=encode_side(s,'A',accelerated=False)
            expected=[sorted({sum(a*b for a,b in zip(p,t)) for t in encoded.values()}) for p in s['planes']['A']]
            self.assertEqual(record_sets(s,'A'),expected)
        r=measure(s)
        self.assertEqual(s['domain']['A'][0],-s['domain']['A'][1])
        self.assertTrue(r['sides']['A']['asymmetric'])
    def test_saved_table_is_used_without_rechoosing(self):
        records=json.loads((ROOT/'data/modular/catalog.json').read_text())['solutions']
        for s in records[:4]:
            expected=[sorted({sum(a*b for a,b in zip(p,t)) for t in s['encoding']['A'] if t is not None}) for p in s['planes']['A']]
            self.assertEqual(record_sets(s,'A'),expected)
    def test_unknown_is_not_counted_as_symmetric(self):
        r=measure({'id':'unknown','weights':{'A':[1],'B':[1]},'planes':{'A':[[1]],'B':[[1]]}})
        self.assertIn('unknown',r['sides']['A'])
