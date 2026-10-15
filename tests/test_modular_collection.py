import copy
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from tests.test_modular import source
from tools.check_modular import check
from tools.ingest import digest
from tools.modular_collection import collection
from verify.core import Invalid


class ModularCollectionTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.inputs = self.root / 'inputs'
        self.inputs.mkdir()
        self.output = self.root / 'public'

    def saved(self, name, raw=None):
        path = self.inputs / name
        path.write_text(json.dumps(source() if raw is None else raw))
        return path

    def build(self, paths):
        return collection(paths, [], None, self.output, '2026-10-10')

    def catalog(self):
        return json.loads((self.output / 'catalog.json').read_text())

    def alter(self, mutation):
        catalog = self.catalog()
        mutation(catalog)
        path = self.output / 'catalog.json'
        path.write_text(json.dumps(catalog))
        index_path = self.output / 'index.json'
        index = json.loads(index_path.read_text())
        index['sha256'] = digest(path)
        index_path.write_text(json.dumps(index))

    def test_duplicate_content_has_one_receipt_and_one_provenance(self):
        first = self.saved('one.json')
        second = self.saved('copy.json')
        result = self.build([first, second])
        self.assertEqual(result['input_copies'], 2)
        self.assertEqual(result['unique_sources'], 1)
        catalog = self.catalog()
        self.assertEqual(catalog['intake'][0]['copies'], 2)
        self.assertEqual(len(catalog['intake'][0]['declarations']), 1)
        self.assertEqual(len(catalog['sources']), 1)
        self.assertTrue(all(len(row['provenance']) == 1
                            for row in catalog['solutions'] + catalog['sets']))
        self.assertEqual(check(self.output)['residue_pairs'], 34)

    def test_invalid_selection_contributes_no_partial_solutions(self):
        good = self.saved('good.json')
        raw = source()
        raw['choices']['signed_magnitude_M']['construction'][1]['coefficients_numerator'] = [2]
        bad = self.saved('bad.json', raw)
        result = self.build([bad, good])
        self.assertEqual(result['intake'], {'quarantined': 1, 'accepted': 1})
        catalog = self.catalog()
        self.assertEqual(len(catalog['solutions']), 2)
        self.assertEqual(len(catalog['sets']), 1)
        self.assertEqual(catalog['sources'], [{'sha256': digest(good), 'records': 2}])
        self.assertTrue(all(p['source_sha256'] == digest(good)
                            for row in catalog['solutions'] for p in row['provenance']))
        bad_receipt = next(r for r in catalog['intake'] if r['source_sha256'] == digest(bad))
        self.assertEqual(bad_receipt['reason'], 'modular_identity_failed')
        self.assertTrue(check(self.output)['valid'])

    def test_complex_selection_is_quarantined(self):
        raw = source()
        raw['complex'] = True
        result = self.build([self.saved('complex.json', raw)])
        self.assertEqual(result['solutions'], 0)
        self.assertEqual(result['sets'], 0)
        self.assertEqual(self.catalog()['intake'][0]['reason'], 'unsupported_complex_construction')

    def test_intake_tampering_rejected_after_hash_refresh(self):
        self.build([self.saved('source.json')])
        self.alter(lambda c: c['intake'][0].update(status='quarantined'))
        with self.assertRaisesRegex(Invalid, '^intake_accounting_mismatch$'):
            check(self.output)

    def export_fixture(self, raw=None, status='PASS'):
        root = self.inputs / 'export'
        (root / 'sets').mkdir(parents=True)
        raw = copy.deepcopy(source() if raw is None else raw)
        raw['complex'] = False
        path = root / 'sets' / 'selection.json'
        path.write_text(json.dumps(raw))
        entry = {'path': 'deliverable/sets/selection.json', 'sha256': digest(path),
                 'bits': 1, 'K': 7, 'complex': False, 'pool': 'current_forms',
                 'table_check_status': status}
        (root / 'sets_index.json').write_text(json.dumps([entry]))
        scope_path = self.saved('scope.json', {})
        reviewed = json.loads(Path('tools/reviewed_search_scopes.json').read_text())[0]
        def scope_digest(path):
            return reviewed['source_sha256'] if Path(path) == scope_path else digest(path)
        return root, scope_path, reviewed, scope_digest

    def test_pass_status_does_not_replace_independent_verification(self):
        raw = source()
        raw['choices']['signed_magnitude_M']['construction'][1]['coefficients_numerator'] = [2]
        root, scope_path, reviewed, scope_digest = self.export_fixture(raw)
        with patch('tools.modular_collection.digest', side_effect=scope_digest):
            result = collection([], [root], scope_path, self.output, '2026-10-10')
        self.assertEqual(result['solutions'], 0)
        receipt = self.catalog()['intake'][0]
        self.assertEqual(receipt['declarations'][0]['table_check'], 'passed')
        self.assertEqual(receipt['status'], 'quarantined')
        self.assertEqual(receipt['reason'], 'modular_identity_failed')
        self.assertEqual(self.catalog()['search_scopes'], [reviewed])

    def test_reviewed_scope_template_and_source_status_preserved(self):
        root, scope_path, reviewed, scope_digest = self.export_fixture(status='FAIL')
        with patch('tools.modular_collection.digest', side_effect=scope_digest):
            result = collection([], [root], scope_path, self.output, '2026-10-10')
        self.assertEqual(result['solutions'], 2)
        self.assertEqual(self.catalog()['search_scopes'], [reviewed])
        self.assertEqual(self.catalog()['intake'][0]['declarations'][0]['table_check'], 'failed')
        self.assertFalse(reviewed['global_exhaustiveness_claimed'])
        self.assertTrue(check(self.output)['valid'])

    def test_export_hash_mismatch_rejected_without_output(self):
        root, scope_path, _, scope_digest = self.export_fixture()
        (root / 'sets' / 'selection.json').write_text('{}')
        with patch('tools.modular_collection.digest', side_effect=scope_digest):
            with self.assertRaisesRegex(Invalid, '^source_hash_mismatch$'):
                collection([], [root], scope_path, self.output, '2026-10-10')
        self.assertFalse(self.output.exists())

    def test_export_escaping_path_rejected_without_output(self):
        root, scope_path, _, scope_digest = self.export_fixture()
        path = root / 'sets_index.json'
        entries = json.loads(path.read_text())
        entries[0]['path'] = '../selection.json'
        path.write_text(json.dumps(entries))
        with patch('tools.modular_collection.digest', side_effect=scope_digest):
            with self.assertRaisesRegex(Invalid, '^unsupported_selection_path$'):
                collection([], [root], scope_path, self.output, '2026-10-10')
        self.assertFalse(self.output.exists())

    def test_unknown_table_status_rejected_without_output(self):
        root, scope_path, _, scope_digest = self.export_fixture(status='UNREVIEWED')
        with patch('tools.modular_collection.digest', side_effect=scope_digest):
            with self.assertRaisesRegex(Invalid, '^unknown_table_status$'):
                collection([], [root], scope_path, self.output, '2026-10-10')
        self.assertFalse(self.output.exists())

    def test_scope_schema_rejects_unreviewed_annotation(self):
        import jsonschema
        root, scope_path, _, scope_digest = self.export_fixture()
        with patch('tools.modular_collection.digest', side_effect=scope_digest):
            collection([], [root], scope_path, self.output, '2026-10-10')
        self.alter(lambda c: c['search_scopes'][0]['enumeration'].update(notes='UNREVIEWED'))
        with self.assertRaises(jsonschema.ValidationError):
            check(self.output)
