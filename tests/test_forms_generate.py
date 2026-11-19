"""The shared generator proposes lines that tools/modular_forms.py records, for any value set."""
import unittest
from tools import forms_generate as G
from tools.modular_forms import minimal_record

DATE = '2026-11-19'


def fewest(vs, m, families):
    out = []
    for line in G.proposals(vs, [m], families):
        r = minimal_record(line, DATE)
        if not r['holes']['A'] and not r['holes']['B']:
            out.append(len(r['products']))
    return min(out) if out else None


class FormsGenerateTest(unittest.TestCase):
    def test_one_plane_when_the_value_set_hits_every_residue(self):
        self.assertEqual(fewest('2xE2M1', 13, ['one_plane']), 1)
        self.assertIsNone(fewest('2xE2M1', 17, ['one_plane']))
        self.assertEqual(fewest('8xE2M3', 47, ['one_plane']), 1)
        self.assertEqual(fewest('512xE4M3', 149, ['one_plane']), 1)
        self.assertIsNone(fewest('512xE4M3', 151, ['one_plane']))

    def test_record_on_the_smallest_value_set(self):
        # proposed on 512xE4M3, one plane modulo 47 is recorded on 8xE2M3, and modulo 53 on 512xE4M3
        sets = {m: [minimal_record(ln, DATE)['plane_sets']['A'][0] for ln in G.proposals('512xE4M3', [m], ['one_plane'])]
                for m in (47, 53)}
        self.assertEqual(sets, {47: ['8xE2M3'], 53: ['512xE4M3']})

    def test_two_products_on_fp4(self):
        self.assertEqual(fewest('2xE2M1', 16, ['two_products']), 2)
        self.assertEqual(fewest('2xE2M1', 27, ['two_products']), 2)
        self.assertIsNone(fewest('2xE2M1', 25, ['two_products']))

    def test_two_limbs_with_a_vanishing_square(self):
        # x = a0 + 17 a1 modulo 289: a0 b0 + 17 (a0 b1 + a1 b0), the term 289 a1 b1 is 0
        self.assertEqual(fewest('8xE2M3', 289, ['two_direct']), 3)

    def test_one_linear_face(self):
        self.assertEqual(fewest('8xE2M3', 1009, ['two_face']), 3)


if __name__ == '__main__':
    unittest.main()
