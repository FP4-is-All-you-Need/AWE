import unittest
from math import prod
from verify.core import Invalid
from verify.crt import crt_max_k


class CrtRangeTests(unittest.TestCase):
    def test_strict_crt_boundary_including_even_product(self):
        self.assertEqual(crt_max_k([3,5],1,1),7)
        self.assertEqual(crt_max_k([2,3],1,1),2)
        # At K=3, +3 and -3 coincide mod 6 and unique recovery fails.
        self.assertEqual(3%6,(-3)%6)
        for a in range(-2,3):
            for b in range(-2,3):
                self.assertEqual(a%6==b%6,a==b)

    def test_wide_operand_bounds_never_use_float_rounding(self):
        moduli=[7,8,9,53,59,61,67,71,73,79,83,85,89,109,121,127,131,139,157,169]
        maximum=(1<<53)-1
        k=crt_max_k(moduli,maximum,maximum)
        self.assertEqual(k,8259)
        self.assertGreater(prod(moduli),2*k*maximum**2)
        self.assertLessEqual(prod(moduli),2*(k+1)*maximum**2)
        self.assertLess(k,16384)

    def test_requires_coprime_moduli_and_explicit_positive_bounds(self):
        for moduli in ([6,9],[7,7],[],[True,3]):
            with self.assertRaises(Invalid):crt_max_k(moduli,1,1)
        with self.assertRaises(Invalid):crt_max_k([3,5],0,1)
