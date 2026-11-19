"""Selection of modulus sets for reconstruction by the Chinese remainder theorem: the saved FP4 sets meet the
single-accumulation conditions, and the selection from the forms uses no more products than they do."""
import json
import unittest
from tools.pages_artifact import ROOT
from tools.select_sets import feasible, select

MOD = ROOT/'data/modular'


class SelectSetsTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        index = json.loads((MOD/'forms-index.json').read_text())
        cls.records = [r for c in index['chunks'] for r in json.loads((MOD/c['path']).read_text())['solutions']]

    def test_saved_fp4_sets(self):
        fewest = {}
        for name in ('catalog', 'powers', 'fp32', 'fp32-history'):
            d = json.loads((MOD/f'{name}.json').read_text())
            byid = {s['id']: s for s in d['solutions']}
            for st in d['sets']:
                b, k = st['magnitude_bits'], st['k']
                self.assertTrue(feasible([byid[i] for i in st['solution_ids']], b, k, 'single'), st['id'])
                fewest[(b, k)] = min(fewest.get((b, k), 10 ** 9), st['verification']['products'])
        s = select(self.records, {'2xE2M1'}, 53, 16384, 'single')
        self.assertLessEqual(s['products'], fewest[(53, 16384)])
        self.assertTrue(s['crt_max_k'] >= 16384 and s['max_k'] >= 16384)

    def test_segmented_accumulation(self):
        s = select(self.records, {'2xE2M1', '8xE2M3'}, 53, 8192, 'segmented', max_products=40)
        self.assertGreaterEqual(s['crt_max_k'], 8192)
        self.assertGreaterEqual(s['launches'], s['products'])


if __name__ == '__main__':
    unittest.main()
