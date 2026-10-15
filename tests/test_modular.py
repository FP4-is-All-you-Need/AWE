import json
from pathlib import Path
import tempfile
import unittest
import jsonschema

from tools.check_modular import check
from tools.ingest import digest
from tools.modular_ingest import convert, ingest
from verify.core import Invalid, algebra
from verify.modular import verify, verify_set


def source_row(modulus):
    representatives = {3: [0, 1, -1], 5: [0, 1, 2, -2, -1]}[modulus]
    return {'modulus': modulus, 'weights': [1], 'mechanism': 'one',
            'face_forms': [[1]], 'face_pairs': [[0, 0]], 'products': 1,
            'coefficients_numerator': [1], 'coefficient_denominator': 1,
            'encoding_lut': [[x] for x in representatives]}


def source():
    return {'M': 1, 'K_requested': 7, 'choices': {'signed_magnitude_M': {
        'moduli': [3, 5], 'products': 2,
        'construction': [source_row(3), source_row(5)]}}}


class ModularMathTests(unittest.TestCase):
    def test_small_explicit_tables_and_modular_not_integer_identity(self):
        for p in (3, 5):
            row = convert(source_row(p))
            proof = verify(row)
            self.assertEqual(proof['verified']['n_pairs'], p*p)
            self.assertEqual(proof['verified']['identity'], 'modulo_p')
            row['products'][0]['numerator'] = 1+p
            self.assertEqual(verify(row)['verified']['identity'], 'modulo_p')
            with self.assertRaisesRegex(Invalid, '^identity_failed$'):
                algebra(row)

    def test_coefficient_corruption(self):
        row = convert(source_row(5))
        row['products'][0]['numerator'] = 2
        with self.assertRaisesRegex(Invalid, '^modular_identity_failed$'):
            verify(row)

    def test_encoding_hole_wrong_residue_and_storage_violation(self):
        for mutation, reason in (
                (lambda r: r['encoding']['A'].pop(), 'incomplete_residue_table'),
                (lambda r: r['encoding']['A'].__setitem__(1, [0]), 'residue_encoding_failed'),
                (lambda r: r['encoding']['A'].__setitem__(0, [5]), 'limb_outside_storage')):
            with self.subTest(reason=reason):
                row = convert(source_row(5))
                mutation(row)
                with self.assertRaisesRegex(Invalid, '^'+reason+'$'):
                    verify(row)

    def test_plane_storage_violation(self):
        row = convert(source_row(5))
        row['planes']['A'] = [[6]]  # 6 == 1 mod 5, so the modular identity still holds.
        row['encoding']['A'][4] = [4]  # legal limb, correct residue, face 24 is not in S.
        with self.assertRaisesRegex(Invalid, '^plane_outside_storage$'):
            verify(row)

    def test_strict_k_boundary_and_duplicate_selection(self):
        solutions = {str(p): convert(source_row(p)) for p in (3, 5)}
        selected = {'schema_version': 1, 'kind': 'modular_set',
                    'magnitude_bits': 1, 'k': 7, 'solution_ids': ['3', '5']}
        self.assertEqual(verify_set(selected, solutions)['max_k'], '7')
        selected['k'] = 8
        with self.assertRaisesRegex(Invalid, '^k_outside_guarantee$'):
            verify_set(selected, solutions)
        selected.update(k=1, solution_ids=['3', '3'])
        with self.assertRaisesRegex(Invalid, '^invalid_solution_ids$'):
            verify_set(selected, solutions)


class ModularImportTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root/'inputs').mkdir()
        self.input = self.root/'inputs'/'source.json'
        self.output = self.root/'public'

    def build(self, raw=None, duplicate=False):
        self.input.write_text(json.dumps(source() if raw is None else raw))
        paths = [self.input]
        if duplicate:
            second = self.input.with_name('copy.json')
            second.write_bytes(self.input.read_bytes())
            paths += [self.input, second]
        return ingest(paths, self.output, '2026-10-10')

    def alter(self, mutation, refresh_hash=True):
        path = self.output/'catalog.json'
        catalog = json.loads(path.read_text())
        mutation(catalog)
        path.write_text(json.dumps(catalog))
        if refresh_hash:
            index_path = self.output/'index.json'
            index = json.loads(index_path.read_text())
            index['sha256'] = digest(path)
            index_path.write_text(json.dumps(index))

    def test_duplicate_inputs_count_once_and_prose_not_copied(self):
        raw = source()
        marker = 'PRIVATE_PROSE_SENTINEL'
        raw['description'] = marker
        raw['choices']['signed_magnitude_M']['construction'][0]['notes'] = marker
        self.assertEqual(self.build(raw, duplicate=True),
                         {'solutions': 2, 'sets': 1, 'residue_pairs': 34})
        self.assertEqual(check(self.output)['residue_pairs'], 34)
        text = (self.output/'catalog.json').read_text()
        self.assertNotIn(marker, text)
        catalog = json.loads(text)
        self.assertEqual(len(catalog['sources']), 1)
        self.assertTrue(all(len(r['provenance']) == 1 for r in catalog['solutions']))

    def test_hash_tampering_rejected(self):
        self.build()
        self.alter(lambda c: c.update(data_version='changed'), refresh_hash=False)
        with self.assertRaisesRegex(Invalid, '^hash_mismatch$'):
            check(self.output)

    def test_ids_and_verified_metadata_rejected_even_with_updated_hash(self):
        mutations = [
            (lambda c: c['solutions'][0].update(id='awem1_wrong'), 'id_mismatch'),
            (lambda c: c['sets'][0].update(id='awems1_wrong'), 'id_mismatch'),
            (lambda c: c['solutions'][0]['verified'].update(n_pairs=0), 'proof_mismatch'),
            (lambda c: c['solutions'][0]['accumulation'].update(max_k=1), 'proof_mismatch'),
            (lambda c: c['sets'][0]['verification'].update(products=99), 'proof_mismatch'),
            (lambda c: c['solutions'][0]['provenance'][0].update(position=99), 'missing_origin'),
        ]
        self.build()
        original = (self.output/'catalog.json').read_bytes()
        for mutation, reason in mutations:
            with self.subTest(reason=reason):
                (self.output/'catalog.json').write_bytes(original)
                self.alter(mutation)
                with self.assertRaisesRegex(Invalid, '^'+reason+'$'):
                    check(self.output)

    def test_bad_source_rejected_without_public_output(self):
        raw = source()
        raw['choices']['signed_magnitude_M']['construction'][0]['modular_holes'] = [1]
        with self.assertRaisesRegex(Invalid, '^unsupported_modular_encoding$'):
            self.build(raw)
        self.assertFalse(self.output.exists())

    def test_source_and_set_provenance_tampering_rejected(self):
        mutations = [
            (lambda c: c['sources'].append(dict(c['sources'][0])), 'duplicate_source'),
            (lambda c: c['sets'][0]['provenance'][0].update(source_sha256='0'*64), 'invalid_origin'),
            (lambda c: c['sets'][0]['provenance'][0].update(notes='unreviewed'), 'invalid_origin'),
            (lambda c: c['sets'][0]['provenance'].append(dict(c['sets'][0]['provenance'][0])), 'duplicate_origin'),
            (lambda c: c['sets'][0].update(provenance=[]), 'missing_origin'),
        ]
        self.build()
        original = (self.output/'catalog.json').read_bytes()
        for mutation, reason in mutations:
            with self.subTest(reason=reason, mutation=mutation):
                (self.output/'catalog.json').write_bytes(original)
                self.alter(mutation)
                with self.assertRaisesRegex(Invalid, '^'+reason+'$'):
                    check(self.output)

    def test_schema_rejects_boolean_position_after_hash_refresh(self):
        self.build()
        # Python compares True equal to 1; the schema requires an integer position.
        def mutation(catalog):
            origin = next(row['provenance'][0] for row in catalog['solutions']
                          if row['provenance'][0]['position'] == 1)
            origin['position'] = True
        self.alter(mutation)
        with self.assertRaises(jsonschema.ValidationError):
            check(self.output)

    def test_date_change_rejected_by_fixed_index_hash(self):
        self.build()
        self.alter(lambda c: c['solutions'][0]['verified'].update(date='2026-10-11'),
                   refresh_hash=False)
        with self.assertRaisesRegex(Invalid, '^hash_mismatch$'):
            check(self.output)
