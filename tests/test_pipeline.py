"""Publication accounting, reproducibility, and independent recheck regressions."""
import contextlib
import io
import json
from pathlib import Path
import tempfile
import unittest
import shutil

from tools.check_data import check
from tools.ingest import digest, ingest, write
from tools.source_scope import inventory
from verify.core import Invalid


class PublicationPipelineTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.inputs = self.root / 'inputs'
        solutions = self.inputs / 'solutions'
        solutions.mkdir(parents=True)
        valid = [1, 1, 0, 1, 4] + [0] * 11
        hole = [1, 1, 0, 1, 5] + [0] * 11
        self.private_text = 'PRIVATE_FIXTURE_PERSON /private/host/path DO_NOT_PUBLISH'
        write(solutions / 'SOLUTIONS_intN.json', {
            'rows': [valid, hole, valid], 'pair_sets': {'0': []},
            'meta': {'notes': self.private_text}})
        for relative in ('s_2xe2m1/diagonal.jsonl', 's_2xe2m1/rectangular.jsonl', 'hybrid.jsonl'):
            path = solutions / relative
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(b'')
        self.output = self.root / 'published'
        self.summary = self.generate(self.output)

    def generate(self, output):
        with contextlib.redirect_stdout(io.StringIO()):
            return ingest(self.inputs, output, verified_date='2026-10-10')

    def shard_path(self):
        index = json.loads((self.output / 'index.json').read_text())
        return self.output / index['files'][0]['path']

    def test_accounting_quarantine_and_no_source_prose(self):
        self.assertEqual(self.summary['counts'], {
            'input': 3, 'accepted': 1, 'quarantined': 1, 'duplicates': 1})
        self.assertEqual(self.summary['reasons'], {'encoding_missing': 1})
        quarantine = json.loads((self.output / 'quarantine.json').read_text())
        self.assertEqual(len(quarantine), 1)
        self.assertEqual(quarantine[0]['position'], 2)
        self.assertEqual(quarantine[0]['reason'], 'encoding_missing')
        records = json.loads(self.shard_path().read_text())
        self.assertEqual([p['position'] for p in records[0]['provenance']], [1, 3])
        self.assertEqual(records[0]['verified']['n_pairs_proven'], 81)
        self.assertEqual(check(self.output, require_complete=True), {'count': 1, 'shard': 0, 'shards': 1, 'valid': True})
        for path in self.output.rglob('*'):
            if path.is_file():
                self.assertNotIn(self.private_text.encode(), path.read_bytes())

    def test_fixed_date_rebuild_is_byte_identical(self):
        second = self.root / 'rebuilt'
        self.generate(second)
        first_files = {str(p.relative_to(self.output)): p.read_bytes()
                       for p in self.output.rglob('*') if p.is_file()}
        second_files = {str(p.relative_to(second)): p.read_bytes()
                        for p in second.rglob('*') if p.is_file()}
        self.assertEqual(first_files, second_files)

    def test_shard_hash_tampering_is_rejected(self):
        path = self.shard_path()
        path.write_bytes(path.read_bytes() + b' ')
        with self.assertRaisesRegex(Invalid, '^hash_mismatch$'):
            check(self.output)

    def test_forged_proof_is_rejected_even_with_updated_hash(self):
        path = self.shard_path()
        records = json.loads(path.read_text())
        records[0]['verified']['n_pairs_proven'] += 1
        write(path, records)
        index_path = self.output / 'index.json'
        index = json.loads(index_path.read_text())
        index['files'][0]['sha256'] = digest(path)
        write(index_path, index)
        with self.assertRaisesRegex(Invalid, '^proof_mismatch$'):
            check(self.output)

    def test_coverage_proof_label_without_a_checked_certificate_is_rejected(self):
        path=self.shard_path()
        records=json.loads(path.read_text())
        records[0]['verified']['method']='coverage_proof_and_bilinear_identity'
        write(path,records)
        index_path=self.output/'index.json'
        index=json.loads(index_path.read_text())
        index['files'][0]['sha256']=digest(path)
        write(index_path,index)
        with self.assertRaisesRegex(Invalid,'unsupported_coverage_proof'):
            check(self.output)

    def test_unlisted_shard_is_rejected(self):
        extra = self.output / 'solutions' / 'ff.json'
        if extra == self.shard_path():
            extra = extra.with_name('00.json')
        write(extra, [])
        with self.assertRaisesRegex(Invalid, '^unexpected_shard$'):
            check(self.output)


    def test_incomplete_catalog_cannot_pass_distribution_gate(self):
        path=self.output/'index.json'
        index=json.loads(path.read_text())
        index['complete']=False
        write(path,index)
        with self.assertRaisesRegex(Invalid,'^incomplete_catalog$'):
            check(self.output,require_complete=True)

    def test_missing_source_position_is_detected(self):
        path=self.output/'report.json'
        report=json.loads(path.read_text())
        report['sources'][0]['records']+=1
        write(path,report)
        with self.assertRaisesRegex(Invalid,'^missing_origin$'):
            check(self.output,require_complete=True)

    def test_multiple_roots_deduplicate_copies_and_keep_new_origins(self):
        copy = self.root / 'copy'
        shutil.copytree(self.inputs, copy)
        extra = self.root / 'extra'
        write(extra / 'solutions/SOLUTIONS_intN.json', {
            'rows': [[1, 1, 0, 1, 3] + [0] * 11, [1, 1, 0, 1, 4] + [0] * 11],
            'pair_sets': {'0': []}})
        write(extra / 'solutions/unknown.json', {'notes': self.private_text})
        inputs = [self.inputs, copy, extra, self.inputs]
        output = self.root / 'combined'
        with contextlib.redirect_stdout(io.StringIO()):
            summary = ingest(inputs, output, verified_date='2026-10-10')
        self.assertEqual(summary['counts'], {
            'input': 5, 'accepted': 2, 'quarantined': 1, 'duplicates': 2})
        self.assertEqual(check(output, require_complete=True)['count'], 2)
        records = [s for path in (output / 'solutions').glob('*.json')
                   for s in json.loads(path.read_text())]
        original = next(s for s in records if s['domain']['A'] == [-4, 4])
        self.assertEqual(len({p['source_sha256'] for p in original['provenance']}), 2)
        scope = inventory(inputs, summary)
        self.assertEqual(len(scope['files']), 4)
        self.assertEqual(sum(f['status'] == 'unsupported_source_format' for f in scope['files']), 1)
        for path in output.rglob('*.json'):
            self.assertNotIn(str(extra), path.read_text())
            self.assertNotIn(self.private_text, path.read_text())

    def test_output_cannot_be_inside_any_input_root(self):
        extra = self.root / 'extra'
        (extra / 'solutions').mkdir(parents=True)
        with self.assertRaisesRegex(ValueError, '^output_inside_inputs$'):
            ingest([self.inputs, extra], extra / 'output')

    def test_partial_collection_without_main_catalog_is_supported(self):
        extra = self.root / 'extra'
        write(extra / 'solutions/s_2xe2m1/diagonal.jsonl', {
            'kind': 'solution', 'weights': [1], 'X': 3,
            'products': [[[1], [1]]], 'lambda': [1]})
        output = self.root / 'partial'
        with contextlib.redirect_stdout(io.StringIO()):
            summary = ingest(extra, output, verified_date='2026-10-10')
        self.assertEqual(summary['counts']['accepted'], 1)
        self.assertEqual(check(output, require_complete=True)['count'], 1)

    def test_missing_or_unrecognized_input_is_not_a_complete_catalog(self):
        with self.assertRaisesRegex(ValueError, '^input_directory_missing$'):
            ingest([self.inputs, self.root / 'missing'], self.root / 'combined')
        extra = self.root / 'extra'
        write(extra / 'solutions/unknown.json', {})
        with self.assertRaisesRegex(ValueError, '^no_recognized_sources$'):
            ingest(extra, self.root / 'empty')
        self.assertFalse((self.root / 'empty').exists())

if __name__ == '__main__':
    unittest.main()
