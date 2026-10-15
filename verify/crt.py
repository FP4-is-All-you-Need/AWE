"""Exact CRT range bounds with explicit operand bounds; no modular-product claim."""
from math import gcd,prod
from verify.core import Invalid


def crt_max_k(moduli,max_abs_a,max_abs_b):
    if not isinstance(moduli,(list,tuple)) or not moduli:
        raise Invalid('invalid_moduli')
    if any(type(p) is not int or p<2 for p in moduli): raise Invalid('invalid_moduli')
    if any(gcd(p,q)!=1 for i,p in enumerate(moduli) for q in moduli[i+1:]):
        raise Invalid('non_coprime_moduli')
    if any(type(x) is not int or x<1 for x in (max_abs_a,max_abs_b)):
        raise Invalid('invalid_operand_bound')
    # Unique signed reconstruction needs P > 2*K*max_abs_a*max_abs_b.
    return (prod(moduli)-1)//(2*max_abs_a*max_abs_b)
