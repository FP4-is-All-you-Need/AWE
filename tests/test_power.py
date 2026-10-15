import copy
from itertools import product
import json
from pathlib import Path
import unittest
from verify.folded_encoding import encoding
from verify.power import measure, S
from tools.check_powers import check
from tools.power_ingest import convert_power


class PowerChecks(unittest.TestCase):
    def test_fixed_encoding_eliminates_only_invisible_coordinates(self):
        weights=[1,1,3];planes=[[1,1,0],[0,0,1]];folds=[27,9]
        lut=encoding(weights,planes,folds,27)
        expected=set()
        for v in product(range(27),repeat=3):
            if all(any((sum(a*b for a,b in zip(f,v))-s)%m==0 for s in S) for f,m in zip(planes,folds)):
                expected.add(sum(a*b for a,b in zip(weights,v))%27)
        self.assertEqual({i for i,v in enumerate(lut) if v is not None},expected)
        for i,v in enumerate(lut):
            if v is not None:self.assertEqual(sum(a*b for a,b in zip(weights,v))%27,i)

    def test_all_catalog_records_recheck(self):
        self.assertEqual(check(Path('data/modular/powers.json'))['issues'],0)

    def test_source_claims_do_not_override_measurements_or_ids(self):
        from tools.power_ingest import identify, definition
        data=json.loads(Path('data/modular/powers.json').read_text())
        s=next(s for s in data['solutions'] if s.get('source_claims',{}).get('holes')==[0,18])
        self.assertEqual(s['measurement']['holes']['B'],[119,133,137,143,147,154,161,165,171,172,178,182,189,196,200,206,210,224])
        self.assertIsNone(s['measurement']['correction_verified'])
        changed=copy.deepcopy(s);changed['source_claims']['holes']=[0,0]
        self.assertEqual(identify(definition(changed),'awemp2_'),s['id'])
        self.assertTrue(all(e['state']=='build_only' for row in data['sets'] for e in row['usage'] if e.get('kind') not in ('run_jsonl','run_summary')))
        self.assertEqual(sum(any(e['state']=='measured' for e in row['usage']) for row in data['sets']),3)

    def test_cube_staircase_and_mutation(self):
        rows=json.loads(Path('data/modular/powers.json').read_text())['solutions']
        s=next(s for s in rows if s['modulus']==343 and len(s['products'])==6 and s['weights']['B']==[1,7,49])
        self.assertEqual({(t['a'],t['b']) for t in s['products']},{(i,j) for i in range(3) for j in range(3) if i+j<3})
        wrong=copy.deepcopy(s);wrong['products'][0]['numerator']+=1
        self.assertEqual(measure(wrong)['verified']['method'],'failed')
        self.assertTrue(measure(wrong)['measurement']['identity_residuals'])
        malformed=copy.deepcopy(s);malformed['limbs_stored']['A'].pop()
        with self.assertRaisesRegex(ValueError,'storage_dimension'):measure(malformed)
        malformed=copy.deepcopy(s);malformed['products'][0]['a']=-1
        with self.assertRaisesRegex(ValueError,'product_plane_index'):measure(malformed)
        wrong=copy.deepcopy(s);wrong['encoding']['A'][5]=[0,0,0]
        self.assertTrue(measure(wrong)['measurement']['encoding_failures'])

    def test_all_343_served_pairs_including_folds_and_holes(self):
        rows=json.loads(Path('data/modular/powers.json').read_text())['solutions']
        holey=0
        for s in rows:
            if s['modulus']!=343:continue
            faces={}
            for side in ('A','B'):
                faces[side]={}
                for residue,limbs in enumerate(s['encoding'][side]):
                    if limbs is None:holey+=1;continue
                    vals=[]
                    for i,f in enumerate(s['planes'][side]):
                        v=sum(a*b for a,b in zip(f,limbs))
                        if 'plane_moduli' in s:
                            m=s['plane_moduli'][side][i]
                            v=min((x for x in S if (x-v)%m==0),key=lambda x:(abs(x),x))
                        vals.append(v)
                    faces[side][residue]=vals
            for a,fa in faces['A'].items():
                for b,fb in faces['B'].items():
                    self.assertEqual(sum(t['numerator']*fa[t['a']]*fb[t['b']] for t in s['products'])%343,a*b%343)
        self.assertGreater(holey,0)

if __name__=='__main__':unittest.main()
