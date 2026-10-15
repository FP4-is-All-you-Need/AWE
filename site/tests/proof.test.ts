import assert from 'node:assert/strict';
import test from 'node:test';
import {proofLabel} from '../src/proof.ts';
import {verifyImported} from '../src/verify.ts';
test('proof methods have three distinct labels; unknown labels are unverified',()=>{
 const labels=['full_pairs','exhaustive_encoding_and_bilinear_identity','coverage_proof_and_bilinear_identity'].map(proofLabel);
 assert.equal(new Set(labels).size,3);
 assert.equal(labels[0],'全対の照合');assert.equal(labels[1],'係数の式の一致 ＋ 片側の全数');assert.equal(labels[2],'係数の式の一致 ＋ 被覆の証明');
 for(const method of ['unknown','__proto__','constructor',''])assert.equal(proofLabel(method),'未検証');
});
test('browser requires a polynomial identity even when all inputs are zero',async()=>{
 const s={schema_version:1,kind:'integer',weights:{A:[1],B:[1]},limb_sets:{A:['2xE2M1'],B:['2xE2M1']},planes:{A:[[1]],B:[[1]]},plane_sets:{A:['2xE2M1'],B:['2xE2M1']},products:[{a:0,b:0,numerator:2}],denominator:1,domain:{A:[0,0],B:[0,0]}};
 await assert.rejects(verifyImported(s),/identity_failed/);
});
