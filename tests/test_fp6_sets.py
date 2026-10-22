"""The saved FP6 sets rebuild from their constructions and reach the Pages staging copy unchanged."""
import json
import unittest
from tools.fp6_sets import check
from tools.pages_artifact import ROOT


class FP6SetsTest(unittest.TestCase):
    def test_sets_rebuild_from_constructions(self):
        self.assertEqual(check(ROOT/'data/modular/fp6-sets.json'), {'constructions': 26, 'sets': 2, 'valid': True})
        data = json.loads((ROOT/'data/modular/fp6-sets.json').read_text())
        sets = sorted((s['magnitude_bits'], len(s['solution_ids']), s['verification']['products']) for s in data['sets'])
        self.assertEqual(sets, [(53, 20, 30), (72, 22, 41)])
        # The site reads the encoding tables of a saved set, so every record keeps them.
        for r in data['solutions']:
            self.assertEqual([len(r['encoding'][side]) for side in 'AB'], [r['modulus'], r['modulus']])

    def test_public_copy_is_unchanged(self):
        for name in ('modular/fp6-sets.json', 'schema/modular-fp6-sets.schema.json'):
            self.assertEqual((ROOT/'build/pages-data'/name).read_bytes(), (ROOT/'data'/name).read_bytes())


if __name__ == '__main__':
    unittest.main()
