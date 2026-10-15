import json
from pathlib import Path
import tempfile
import unittest
from tools.ingest import write, digest
from tools.check_data import check
from tools.check_modular import check as check_modular
from tools.modular_ingest import ingest
from tools.verification_summary import summarize, validate
from tools.preview_data import preview
from tests.test_modular import source
from verify.core import Invalid


class VerificationSummaryTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.data = self.root/'data'
        preview(self.data)
        # The integer summary fixture does not need the production modular data.
        p = self.data/'index.json'
        index = json.loads(p.read_text()); index.pop('modular', None); write(p,index)

    def test_successful_check_records_counts_method_version_and_hashes(self):
        result = check(self.data, record=True)
        saved = validate(self.data, 'integer')
        self.assertEqual(saved['checks'], [result])
        self.assertEqual(saved['counts'], {'constructions':4})
        self.assertEqual(saved['methods'], [{'method':'exhaustive_encoding_and_bilinear_identity',
                                            'verifier_version':'1.0.0','count':4}])
        self.assertEqual(sum(x['count'] for x in saved['methods']),4)
        self.assertEqual(len(saved['date']),10)
        self.assertTrue(all(digest(self.data/f['path'])==f['sha256'] for f in saved['files']))

    def test_failed_or_partial_checks_cannot_replace_record(self):
        check(self.data,record=True)
        path=self.data/'verification.json'; original=path.read_bytes()
        with self.assertRaisesRegex(Invalid,'record_requires_all_shards'):
            check(self.data,shards=2,record=True)
        index=json.loads((self.data/'index.json').read_text())
        shard=self.data/index['files'][0]['path']; shard.write_bytes(shard.read_bytes()+b' ')
        with self.assertRaisesRegex(Invalid,'hash_mismatch'):
            check(self.data,record=True)
        self.assertEqual(path.read_bytes(),original)

    def test_saved_summary_rejects_changed_date_shape_or_counts(self):
        check(self.data,record=True)
        path=self.data/'verification.json'; data=json.loads(path.read_text())
        data['counts']['constructions']+=1;write(path,data)
        with self.assertRaisesRegex(ValueError,'verification_record_mismatch'):
            validate(self.data,'integer')

    def test_shard_counts_are_not_added_and_partial_evidence_is_rejected(self):
        checks=[{'count':4,'shard':i,'shards':2,'valid':True} for i in range(2)]
        self.assertEqual(summarize(self.data,'integer',checks)['counts']['constructions'],4)
        with self.assertRaisesRegex(ValueError,'incomplete_checks'):
            summarize(self.data,'integer',checks[:1])
        checks[0]['notes'] = 'unreviewed source text'
        with self.assertRaisesRegex(ValueError,'invalid_checks'):
            summarize(self.data,'integer',checks)

    def test_distribution_requires_matching_record_and_copies_it(self):
        from tools.search_index import build
        from tools.site_bundle import bundle
        index_path = self.data/'index.json'
        index = json.loads(index_path.read_text()); index['complete'] = True; write(index_path,index)
        build(self.data)
        assets=self.root/'assets'; assets.mkdir(); (assets/'index.html').write_text('<html></html>')
        with self.assertRaises(FileNotFoundError):
            bundle(self.data,assets,self.root/'missing')
        self.assertFalse((self.root/'missing').exists())
        check(self.data,record=True)
        bundle(self.data,assets,self.root/'ready')
        self.assertEqual((self.data/'verification.json').read_bytes(),
                         (self.root/'ready/verification.json').read_bytes())
        path=self.data/'verification.json'; value=json.loads(path.read_text())
        value['methods'][0]['count']=0;write(path,value)
        with self.assertRaisesRegex(ValueError,'verification_record_mismatch'):
            bundle(self.data,assets,self.root/'stale')
        self.assertFalse((self.root/'stale').exists())

    def test_modular_summary_is_saved_only_after_success(self):
        inputs=self.root/'inputs';inputs.mkdir();p=inputs/'source.json';write(p,source())
        output=self.root/'modular';ingest([p],output,'2026-10-10')
        check_modular(output,record=True)
        record=validate(output,'modular')
        self.assertEqual(record['counts'],{'constructions':2,'sets':1,'residue_pairs':34})
        self.assertEqual(record['methods'],[{'method':'full_pairs','verifier_version':'1.0.0','count':2}])
