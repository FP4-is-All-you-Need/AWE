"""Optional exact int64 batching of verify.modular_forms.pairs_literal.

NumPy is optional. This checks the same ordered pairs and returns the same first
failure count. It uses no floating point. If a conservative absolute bound can
overflow int64, it falls back to the original arbitrary-precision implementation.
The rest of the verifier, including the module check, is unchanged.
"""
from verify import modular_forms as MF

REFERENCE_PAIRS = MF.pairs_literal

def pairs_literal_numpy(c, enc_a, enc_b, chunk_size=128):
    import numpy as np
    modulus, den, products = MF.check_modulus(c), c['den'], c['prod']
    left = [(x, e) for x, e in enumerate(enc_a) if e is not None]
    right = [(y, e) for y, e in enumerate(enc_b) if e is not None]
    if not left or not right:
        return True, 0
    g = [[e[2][b] for _, b, _ in products] for _, e in right]
    max_g = max((abs(v) for row in g for v in row), default=0)
    bound = (modulus - 1) * (len(products) * max_g + max(x for x, _ in left))
    if modulus > (1 << 63) - 1 or max_g > (1 << 63) - 1 or bound > (1 << 63) - 1:
        return REFERENCE_PAIRS(c, enc_a, enc_b)
    gt = np.asarray(g, dtype=np.int64).T
    dy = np.asarray([(den * y) % modulus for y, _ in right], dtype=np.int64)
    checked = 0
    for start in range(0, len(left), chunk_size):
        batch = left[start:start + chunk_size]
        ks = np.asarray([[(num * e[2][a]) % modulus for a, _, num in products] for _, e in batch], dtype=np.int64)
        xs = np.asarray([x for x, _ in batch], dtype=np.int64)
        bad = np.flatnonzero((ks @ gt - xs[:, None] * dy[None, :]) % modulus)
        if bad.size:
            return False, checked + int(bad[0])
        checked += len(batch) * len(right)
    return True, checked
