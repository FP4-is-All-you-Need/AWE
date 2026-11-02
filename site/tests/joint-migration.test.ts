import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {legacyJointQuery} from '../src/legacyJoint.ts';
import {formConstruction} from '../src/formConstruction.ts';
import type {FormSolution} from '../src/modularForms.ts';
const read=(p:string)=>JSON.parse(readFileSync(new URL('../../data/'+p,import.meta.url),'utf8'));
test('all four legacy records retain every field, including filtered holes and corrections',()=>{
 const old=read('visualization/joint-examples.json'),moved=read('modular/integer-examples.json');
 assert.equal(old.references.length,4);assert.deepEqual(moved.references,old.references);
 assert.equal(Object.keys(moved.canonical_keys).length,4);assert.equal(new Set(Object.values(moved.canonical_keys)).size,4);
 for(const row of old.references){assert.deepEqual(row.domain,[-128,127]);const q=new URLSearchParams({joint_id:row.id,prime_set:'fp6',lang:'en',hole_pct:'0',['product_index.joint_'+row.id]:'2'}),next=legacyJointQuery(q,moved.legacy_aliases)!;
  assert.equal(next.get('forms_id'),'joint_'+row.id);assert.equal(next.get('prime_set'),'fp4');assert.equal(next.get('section'),'modular-forms');assert.equal(next.get('open.integer-constructions'),'1');assert.equal(next.get('lang'),'en');assert.equal(next.get('product_index.joint_'+row.id),'2');assert(!next.has('joint_id'));assert(q.has('joint_id'));
 }
 assert.equal(legacyJointQuery(new URLSearchParams('joint_id=unknown'),moved.legacy_aliases),null);
});
test('modular expansion keeps holes, folding and encoding gaps without inventing integer data',()=>{
 const s:FormSolution={schema_version:2,id:'test',modulus:3,weights:{A:[1],B:[1]},planes:{A:[[1]],B:[[1]]},plane_sets:{A:['8xE2M3'],B:['8xE2M3']},plane_moduli:{A:[3],B:[3]},products:[{a:0,b:0,numerator:2}],denominator:2,holes:{A:1,B:0,exact:true},encoding:{A:[[0],null,[-1]],B:[[0],[1],[-1]]},reconstruction:{procedure:'divide_d1_then_multiply_d2_inverse'}};
 const c=formConstruction(s);assert.equal(c.modulus,3);assert.equal(c.integer,undefined);assert.equal(c.holes.count,1);assert.equal(c.saved_encoding?.A['1'],undefined);assert.deepEqual(c.saved_encoding?.A['2'],[-1]);assert.deepEqual(c.plane_moduli,s.plane_moduli);assert.equal(c.denominator,2);assert.deepEqual(c.additional?.reconstruction,s.reconstruction);
 assert.equal(formConstruction({...s,encoding:undefined}).saved_encoding,undefined);
});
