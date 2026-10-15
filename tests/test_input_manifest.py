import hashlib
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from tools.input_manifest import inventory, main, check


class InputManifestTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.base = Path(self.temp.name)
        self.root = self.base / 'inputs'
        self.root.mkdir()
        self.output = self.base / 'manifest.json'

    def test_duplicates_overlaps_readonly_and_public_fields(self):
        child = self.root / 'nested'
        child.mkdir()
        content = b'private person, machine and source path\n'
        (self.root / 'verified.json').write_bytes(content)
        (child / 'negative.txt').write_bytes(content)
        (child / 'execute.py').write_text('raise RuntimeError("must never execute")')
        before = {p: (p.read_bytes(), p.stat().st_mtime_ns)
                  for p in self.root.rglob('*') if p.is_file()}
        result = inventory([self.root, child, self.root], self.output)
        self.assertEqual(result['counts'], {'physical_files': 3, 'unique_contents': 2,
                                           'duplicate_copies': 1,
                                           'physical_bytes': sum(len(v[0]) for v in before.values())})
        self.assertEqual(set(result), {'schema_version', 'counts', 'files'})
        self.assertEqual(result['schema_version'], 1)
        duplicate = next(e for e in result['files'] if e['copies'] == 2)
        self.assertEqual(duplicate['source_sha256'], hashlib.sha256(content).hexdigest())
        self.assertEqual(duplicate['formats'], ['json', 'text'])
        for entry in result['files']:
            self.assertEqual(set(entry), {'source_sha256', 'bytes', 'copies', 'formats', 'review_status'})
            self.assertEqual(entry['review_status'], 'unreviewed')
        encoded = self.output.read_text()
        for private in ['private person', 'machine', str(self.root), 'verified', 'negative', 'execute']:
            self.assertNotIn(private, encoded)
        self.assertEqual(json.loads(encoded), result)
        self.assertEqual(before, {p: (p.read_bytes(), p.stat().st_mtime_ns) for p in before})

    def test_rejections(self):
        for inputs, output, error in [([], self.output, 'inputs_empty'),
                                      ([self.base / 'missing'], self.output, 'input_directory_missing'),
                                      ([self.root], self.root / 'out.json', 'output_inside_inputs')]:
            with self.assertRaisesRegex(ValueError, error):
                inventory(inputs, output)
        self.output.write_text('existing')
        with self.assertRaisesRegex(ValueError, 'output_exists'):
            inventory([self.root], self.output)
        self.assertEqual(self.output.read_text(), 'existing')

    def test_symlinks_skipped_and_output_alias_rejected(self):
        (self.root / 'actual.csv').write_bytes(b'a,b')
        outside = self.base / 'outside'
        outside.mkdir()
        (outside / 'secret').write_bytes(b'secret')
        (self.root / 'outside').symlink_to(outside, target_is_directory=True)
        (self.root / 'alias.csv').symlink_to(self.root / 'actual.csv')
        (self.root / 'secret').symlink_to(outside / 'secret')
        alias = self.base / 'alias'
        alias.symlink_to(self.root, target_is_directory=True)
        with self.assertRaisesRegex(ValueError, 'output_inside_inputs'):
            inventory([self.root], alias / 'manifest.json')
        with self.assertRaisesRegex(ValueError, 'input_root_symlink'):
            inventory([alias], self.output)
        self.assertEqual(inventory([self.root], self.output)['counts']['physical_files'], 1)

    def test_streaming_and_atomic_no_overwrite(self):
        (self.root / 'large.bin').write_bytes(b'x' * 17)
        with patch('tools.input_manifest.BLOCK_BYTES', 3):
            result = inventory([self.root], self.output)
        self.assertEqual(result['files'][0]['source_sha256'], hashlib.sha256(b'x' * 17).hexdigest())
        self.output.unlink()
        def concurrent_output(source, destination):
            Path(destination).write_text('concurrent')
            raise FileExistsError()
        with patch('tools.input_manifest.os.link', concurrent_output):
            with self.assertRaises(FileExistsError):
                inventory([self.root], self.output)
        self.assertEqual(self.output.read_text(), 'concurrent')
        self.assertEqual(sorted(p.name for p in self.base.iterdir()), ['inputs', 'manifest.json'])

    def test_public_inventory_rejects_changed_counts_and_extra_fields(self):
        (self.root / 'row.json').write_text('{}')
        result = inventory([self.root], self.output)
        self.assertEqual(check(self.output), result['counts'])
        result['counts']['physical_files'] += 1
        self.output.write_text(json.dumps(result))
        with self.assertRaisesRegex(ValueError, 'inventory_count_mismatch'):
            check(self.output)
        result['counts']['physical_files'] -= 1
        result['files'][0]['source_path'] = 'private'
        self.output.write_text(json.dumps(result))
        with self.assertRaisesRegex(ValueError, 'invalid_inventory_fields'):
            check(self.output)

    def test_cli_repeated_roots(self):
        main(['--inputs', str(self.root), '--inputs', str(self.root), '--output', str(self.output)])
        self.assertEqual(json.loads(self.output.read_text())['counts']['physical_files'], 0)


if __name__ == '__main__':
    unittest.main()
