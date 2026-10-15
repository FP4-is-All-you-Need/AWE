import json
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from tools.jsonl_usage import jsonl_record
from tools.power_ingest import digest


class JsonlUsageChecks(unittest.TestCase):
    def setUp(self):
        self.tmp = TemporaryDirectory(); self.addCleanup(self.tmp.cleanup)
        root = Path(self.tmp.name)
        self.source = root/'saved'/'moduli_set.json'; self.source.parent.mkdir()
        self.source.write_text(json.dumps({'M':1,'choices':{'signed_magnitude_M':{'construction':[
            {'modulus':2,'encoding_faces':[[0],[1]],'products':1}]}}}))
        self.header = root/'l8_tables.h'
        self.header.write_text('int l8_mod[1]={2};int l8_kind[1]={0};int l8_planes[1]={1};int l8_limb_off[1]={0};int l8_limbs[2][1]={{0},{1}};')
        self.run = root/'run'; src=self.run/'src'; body=self.run/'body'
        (src/'engines'/'saved').mkdir(parents=True); body.mkdir()
        shapes='4x4x4,8x8x4'
        engines={n:{'bits':1,'moduli':1,'mma_products':1,'lib':n+'.so','shapes':shapes} for n in ('saved','ref')}
        (src/'engines.json').write_text(json.dumps(engines))
        (src/'expected.json').write_text(json.dumps({'hash_by_bits_shape':{'1':{'4x4x4':'0123456789abcdef'}}}))
        for n in ('job_body.sh','run_calib.py','engines/saved/build.sh'):(src/n).write_text('fixture')
        (src/'SHA256SUMS').write_text('\n'.join(digest(src/n)+'  ./'+n for n in ('engines.json','expected.json','job_body.sh','run_calib.py','engines/saved/build.sh'))+'\n'+digest(self.header)+'  ./engines/saved/l8_tables.h\n')
        (body/'engines.sha256').write_text('1'*64+'  /run/engines/saved/prebuilt/saved.so\n')
        (body/'smi_start.csv').write_text('index, name, uuid\n0, NVIDIA GB200, gpu-a\n1, NVIDIA GB200, gpu-b\n')
        (self.run/'stdout.txt').write_text('body rc 0\nend 1 s\n'); (self.run/'job.sh').write_text('fixture')
        for i in range(2):
            rows=[{'kind':'start','engines':{n:{k:c[k] for k in ('bits','moduli','mma_products','lib')} for n,c in engines.items()},'ref':'ref','cuda_visible':'gpu-'+('a' if i==0 else 'b'),'time':1791200917}]
            for m,n,k in ((4,4,4),(8,8,4)):
                for engine in engines:
                    rows.append({'kind':'row','engine':engine,'m':m,'n':n,'k':k,'info':{'quantize_bits':1,'moduli':1,'mma_products':1},'spot_bad':0,'hash':'0123456789abcdef','input_hashes':['a','b'],'b300_expected':'0123456789abcdef' if m==4 else None,'median_ms':12345})
            rows.append({'kind':'done','ok':True,'failures':[]})
            (body/f'out_gpu{i}.jsonl').write_text('\n'.join(map(json.dumps,rows)))

    def read(self):return jsonl_record(self.source,self.run,self.header)

    def test_matching_outputs_and_header_record_no_timings(self):
        result=self.read()
        self.assertEqual(result['processes'],2)
        self.assertEqual(result['device'],'NVIDIA GB200')
        self.assertEqual([c['comparison'] for c in result['checks']],['expected_and_baseline','baseline_only'])
        self.assertNotIn('median_ms',json.dumps(result));self.assertNotIn(': 12345',json.dumps(result))

    def test_wrong_table_or_manifest_is_rejected(self):
        self.header.write_text(self.header.read_text().replace('l8_mod[1]={2}','l8_mod[1]={3}'))
        with self.assertRaisesRegex(ValueError,'table_mismatch'):self.read()

    def test_changed_engine_definition_is_rejected(self):
        p=self.run/'src/engines.json';p.write_text(p.read_text()+' ')
        with self.assertRaisesRegex(ValueError,'source_manifest_mismatch'):self.read()

    def test_failed_missing_or_mismatched_output_is_rejected(self):
        p=self.run/'body/out_gpu0.jsonl'; original=p.read_text(); rows=[json.loads(s) for s in original.splitlines()]
        for mutation,error in [('done','incomplete_process'),('hash','baseline_mismatch'),('spot','row_check_failed'),('shape','missing_shape'),('failure','failed_process')]:
            changed=json.loads(json.dumps(rows))
            if mutation=='done':changed.pop()
            if mutation=='hash':changed[1]['hash']='fedcba9876543210'
            if mutation=='spot':changed[1]['spot_bad']=1
            if mutation=='shape':changed.pop(1)
            if mutation=='failure':changed[-1]['failures']=['incorrect']
            p.write_text('\n'.join(map(json.dumps,changed)))
            with self.subTest(mutation=mutation),self.assertRaisesRegex(ValueError,error):self.read()
        p.unlink()
        with self.assertRaisesRegex(ValueError,'missing_process_output'):self.read()


if __name__=='__main__':unittest.main()
