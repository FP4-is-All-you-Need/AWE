import copy
import json
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from tools.run_usage import attach, run_record


class RunUsageChecks(unittest.TestCase):
    def test_success_requires_executed_engine_and_matching_hashes(self):
        with TemporaryDirectory() as tmp:
            root = Path(tmp)
            source = root/'set_a'/'moduli_set.json'
            summary = root/'run_20261005'/'summary.json'
            expected = root/'expected.json'
            source.parent.mkdir(); summary.parent.mkdir()
            source.write_text(json.dumps({'M': 53}))
            expected.write_text(json.dumps({'hash_by_bits_shape': {'53': {'4x4x4': '0123456789abcdef'}}}))
            row = {'engine':'set_a','base':'reference','bits':53,'shape':'4x4x4','processes':2,'hash':['0123456789abcdef'], 'total_ms':123.456}
            baseline = dict(row,engine='reference')
            info = {'ok':True,'failures':[],'scope':'B200, run','ratios':[row,baseline]}
            def read(value):
                summary.write_text(json.dumps(value))
                return run_record(source,summary,expected)
            record = read(info)
            self.assertEqual(record['checks'][0]['comparison'],'expected_and_baseline')
            self.assertEqual(record['date'],'2026-10-05')
            self.assertNotIn('total_ms',json.dumps(record))
            self.assertNotIn('123.456',json.dumps(record))
            data = {'sets':[{'provenance':[{'source_sha256':record['source_sha256']}],'usage':[]}]}
            attach(data,record); attach(data,record)
            self.assertEqual(len(data['sets'][0]['usage']),1)
            wrong = copy.deepcopy(info); wrong['ratios'][0]['hash']=['fedcba9876543210']
            with self.assertRaisesRegex(ValueError,'baseline_hash_mismatch'):read(wrong)
            wrong['ratios'][1]['hash']=['fedcba9876543210']
            with self.assertRaisesRegex(ValueError,'expected_hash_mismatch'):read(wrong)
            wrong = copy.deepcopy(info); wrong['ratios']=[baseline]
            with self.assertRaisesRegex(ValueError,'engine_not_executed'):read(wrong)
            wrong = copy.deepcopy(info); wrong['ok']=False
            with self.assertRaisesRegex(ValueError,'unsuccessful_summary'):read(wrong)
            wrong = copy.deepcopy(info); wrong['failures']=['missing done']
            with self.assertRaisesRegex(ValueError,'unsuccessful_summary'):read(wrong)
            wrong = copy.deepcopy(info); wrong['ratios'][0]['bits']=57
            with self.assertRaisesRegex(ValueError,'width_or_shape_mismatch'):read(wrong)
            wrong = copy.deepcopy(info); wrong['ratios'][0]['base']='set_a'
            with self.assertRaisesRegex(ValueError,'baseline_hash_mismatch'):read(wrong)
            for r in info['ratios']:r['shape']='8x8x4'
            self.assertEqual(read(info)['checks'][0]['comparison'],'baseline_only')
            with self.assertRaisesRegex(ValueError,'source_set_not_unique'):attach({'sets':[]},record)


if __name__ == '__main__':unittest.main()
