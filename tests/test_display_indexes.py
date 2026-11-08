"""The display indexes count a construction without the limbs that never reach a product and rebuild from the published
files."""
import json
import unittest
from tools.display_indexes import check
from tools.pages_artifact import ROOT
from tools.unused_limbs import unused_limbs, without_unused_limbs


def record(chunk, prefix):
    return next(r for r in json.loads((ROOT/'data/modular'/chunk).read_text())['solutions'] if r['id'].startswith(prefix))


class DisplayIndexesTest(unittest.TestCase):
    def test_limb_in_no_plane(self):
        r = {'modulus': 5, 'weights': {'A': [1, 0], 'B': [1, 0]}, 'planes': {'A': [[1, 0]], 'B': [[1, 0]]},
             'products': [{'a': 0, 'b': 0, 'numerator': 1}]}
        self.assertEqual(unused_limbs(r), {'A': [1], 'B': [1]})
        self.assertEqual(without_unused_limbs(r)['weights'], {'A': [1], 'B': [1]})
        self.assertEqual(r['weights'], {'A': [1, 0], 'B': [1, 0]})

    def test_limb_always_zero_goes_with_its_plane_and_product(self):
        s = without_unused_limbs(record('forms-0000002-0000069.json', 'awem2_9fa03837'))
        self.assertEqual((s['weights'], s['planes'], s['plane_moduli']), ({'A': [1], 'B': [1]}, {'A': [[1]], 'B': [[1]]}, {'A': [4], 'B': [4]}))
        self.assertEqual(s['products'], [{'a': 0, 'b': 0, 'numerator': 1}])

    def test_limb_used_in_planes_stays(self):
        r = record('forms-0000286-0000728.json', 'awem2_643f91c4')
        self.assertIs(without_unused_limbs(r), r)

    def test_indexes_rebuild_from_the_published_files(self):
        self.assertTrue(check(ROOT/'data')['valid'])
        index = json.loads((ROOT/'data/modular/forms-index.json').read_text())
        self.assertEqual([(p['products'], p['planes']) for p in index['prime_powers'] if p['modulus'] == 4 and p['value_set'] == '8xE2M3'],
                         [(1, [1, 1])])
        polar = json.loads((ROOT/'data/visualization/polar-catalog.json').read_text())
        self.assertEqual([(r['R'], r['weights']) for r in polar['rows'] if r['id'].startswith('awem2_a57a2a0b')], [(1, {'A': [1], 'B': [1]})])


if __name__ == '__main__':
    unittest.main()
