"""The saved FP6 sets rebuild from their constructions and reach the Pages staging copy unchanged."""
import json
import unittest
from tools.fp6_sets import check
from tools.pages_artifact import ROOT


class FP6SetsTest(unittest.TestCase):
    def test_sets_rebuild_from_constructions(self):
        self.assertEqual(check(ROOT/'data/modular/fp6-sets.json'), {'constructions': 85, 'sets': 17, 'valid': True})
        data = json.loads((ROOT/'data/modular/fp6-sets.json').read_text())
        sets = {vs: sorted((s['magnitude_bits'], len(s['solution_ids']), s['verification']['products']) for s in data['sets']
                           if s['value_set'] == vs) for vs in ('8xE2M3', '16xE3M2')}
        # the sets for the engine that splits K into segments of at most max_k, and the sets with one accumulation
        # (max_k >= K) for the targets of the FP4 catalog
        self.assertEqual(sets['8xE2M3'], [(53, 15, 30), (53, 16, 31), (53, 19, 29), (53, 20, 30), (55, 16, 31), (55, 16, 32),
                                          (57, 15, 32), (57, 17, 33), (72, 20, 42), (72, 22, 41)])
        self.assertEqual(sets['16xE3M2'], [(53, 16, 40), (53, 16, 42), (55, 16, 43), (55, 17, 42), (57, 17, 43), (57, 17, 45),
                                           (72, 21, 56)])
        # The site reads the encoding tables of a saved set, so every record keeps them.
        for r in data['solutions']:
            self.assertEqual([len(r['encoding'][side]) for side in 'AB'], [r['modulus'], r['modulus']])

    def test_fp8_sets_rebuild_from_constructions(self):
        path = ROOT/'data/modular/gemmul8-fp8-sets.json'
        self.assertEqual(check(path), {'constructions': 31, 'sets': 19, 'valid': True})
        data = json.loads(path.read_text())
        self.assertEqual(data['kind'], 'modular_sets')
        # one set for each number of moduli 2 to 20, each with the file lines that list its moduli at the recorded commit
        self.assertEqual(sorted(len(s['solution_ids']) for s in data['sets']), list(range(2, 21)))
        for s in data['sets']:
            self.assertEqual((s['value_set'], s['k']), ('512xE4M3', 8192))
            self.assertEqual((s['source']['name'], s['source']['commit'], s['source']['date']),
                             ('GEMMul8 FP8', 'd8d390125964c7f1c60d5f1e0e5d9656e5614852', '2026-11-16'))
        # every construction of these sets names the same source with its commit date
        self.assertTrue(all(r.get('sources') and all(x['date'] == '2026-11-16' for x in r['sources']) for r in data['solutions']))
        # only constructions of a modulus up to 256 keep their encoding tables, as in forms-*.json
        self.assertTrue(all((r['modulus'] <= 256) == ('encoding' in r and 'plane_values' in r) for r in data['solutions']))

    def test_public_copy_is_unchanged(self):
        for name in ('modular/fp6-sets.json', 'modular/gemmul8-fp8-sets.json', 'schema/modular-fp6-sets.schema.json'):
            self.assertEqual((ROOT/'build/pages-data'/name).read_bytes(), (ROOT/'data'/name).read_bytes())


if __name__ == '__main__':
    unittest.main()
