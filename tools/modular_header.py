"""Read stored modular encoding tables from C headers."""
import json
import re
from tools.modular_ingest import convert


def array(text, name):
    match = re.search(r'\b'+name+r'\s*(?:\[[^\]]*\])+\s*=\s*(\{.*?\});', text, re.S)
    if not match:
        raise ValueError('missing_array:'+name)
    value = re.sub(r'//[^\n]*', '', match[1])
    value = re.sub(r'(0x[0-9a-fA-F]+|\d+)[uUlL]*', lambda m: str(int(m[1], 16)) if m[1].startswith('0x') else m[1], value)
    return json.loads(re.sub(r',\s*]', ']', value.replace('{', '[').replace('}', ']')))


def header_rows(path):
    """Read complete LUTs; recover each weight from its supplied unit-limb row.

    Plane kinds are defined in the encoder and generated_tables.md. Normalize the
    four stored forms to coefficients modulo p, independent of accumulator flips.
    This reads existing tables; it does not choose weights or new products.
    """
    text = path.read_text()
    moduli, kinds, faces, offsets, values = [array(text, 'l8_'+s) for s in ('mod', 'kind', 'planes', 'limb_off', 'limbs')]
    if len({len(moduli),len(kinds),len(faces),len(offsets)}) != 1 or len(set(moduli)) != len(moduli):
        raise ValueError('header_array_lengths')
    if offsets != [sum(moduli[:i]) for i in range(len(moduli))] or len(values) != sum(moduli):
        raise ValueError('header_lut_offsets')
    rows = []
    for p, kind, nf, offset in zip(moduli, kinds, faces, offsets):
        if kind not in (0, 1, 2, 3):
            raise ValueError('unsupported_kind')
        limbs = 1 if kind == 0 else 2
        lut = [r[:limbs] for r in values[offset:offset+p]]
        weights = [lut.index([int(i == j) for j in range(limbs)]) for i in range(limbs)]
        if any(sum(w*v for w, v in zip(weights, row)) % p != r for r, row in enumerate(lut)):
            raise ValueError('header_weight_mismatch')
        if kind == 0:
            pairs, coeff = [[0, 0]], [weights[0]**2]
        elif kind == 1:
            a, b = weights
            pairs, coeff = [[0, 0], [1, 1], [2, 2]], [a*a-a*b, b*b-a*b, a*b]
        else:
            pairs = [[i, j] for i in range(2) for j in range(2) if kind != 2 or (i, j) != (1, 1)]
            coeff = [weights[i]*weights[j] for i, j in pairs]
            if kind == 2 and weights[1]**2 % p:
                raise ValueError('nonzero_omitted_product')
        row = dict(modulus=p, mechanism=['one', 'A', 'B', 'direct'][kind], weights=weights,
                   uv=[1, 1], face_pairs=pairs, coefficients_numerator=[c % p for c in coeff],
                   coefficient_denominator=1, products=len(pairs), encoding_lut=lut)
        if len(convert(row)['planes']['A']) != nf:
            raise ValueError('plane_count_mismatch')
        rows.append(row)
    return rows
