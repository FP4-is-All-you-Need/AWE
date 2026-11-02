import assert from 'node:assert/strict';
import test from 'node:test';
import {moleculeSharing,type MoleculeSource} from '../src/moleculeModel.ts';
const one: MoleculeSource={id:'test',modulus:6,denominator:1,weights:{A:[1],B:[1]},planes:{A:[[1]],B:[[1]]},products:[{a:0,b:0,numerator:1}]};
test('one product serves both coprime components with one pair of limbs and planes',()=>{
 const s=moleculeSharing(one,[2,3]);assert.deepEqual(s.status,['checked','checked']);assert.deepEqual(s.terms,[[true,true]]);assert.equal(s.sharedProducts,1);assert.equal(s.sharedPlanes,2);assert.equal(s.sharedLimbs,2);
});
test('coefficient support distinguishes exclusive products from shared planes',()=>{
 const s=moleculeSharing({...one,products:[{a:0,b:0,numerator:3},{a:0,b:0,numerator:4}]},[2,3]);assert.deepEqual(s.status,['checked','checked']);assert.deepEqual(s.terms,[[true,false],[false,true]]);assert.equal(s.sharedProducts,0);assert.equal(s.sharedPlanes,2);
});
test('nonunit denominators and unsafe plane reductions do not invent shared edges',()=>{
 const d=moleculeSharing({...one,denominator:2,products:[{a:0,b:0,numerator:2}]},[2,3]);assert.deepEqual(d.status,['nonunit_denominator','checked']);assert.deepEqual(d.terms,[[null,true]]);assert.equal(d.sharedProducts,0);
 const f=moleculeSharing({...one,plane_moduli:{A:[2],B:[6]}},[2,3]);assert.deepEqual(f.status,['checked','folded_planes']);assert.deepEqual(f.terms,[[true,null]]);
});
test('a damaged identity is unconfirmed and zero divisors are handled at coefficient level',()=>{
 const bad=moleculeSharing({...one,products:[{a:0,b:0,numerator:2}]},[2,3]);assert.deepEqual(bad.status,['identity_mismatch','identity_mismatch']);assert.deepEqual(bad.terms,[[null,null]]);
 const zero=moleculeSharing({...one,modulus:4,weights:{A:[0],B:[1]},planes:{A:[[2]],B:[[1]]},products:[{a:0,b:0,numerator:2}]},[4]);assert.deepEqual(zero.status,['checked']);assert.deepEqual(zero.terms,[[false]]);
});

test('cell support retains product identity and separates coincident exclusive products from sharing',()=>{
 const separate=moleculeSharing({...one,products:[{a:0,b:0,numerator:3},{a:0,b:0,numerator:4}]},[2,3]);
 assert.deepEqual(separate.cellTerms,[[[[true,false],[false,true]]]]);
 const shared=moleculeSharing(one,[2,3]);assert.deepEqual(shared.cellTerms,[[[[true,true]]]]);
});
test('cell support distinguishes zero coefficients and unconfirmed components',()=>{
 const source={...one,weights:{A:[1,3],B:[1]},planes:{A:[[1,3]],B:[[1]]}};
 const s=moleculeSharing(source,[2,3]);assert.deepEqual(s.status,['checked','checked']);
 assert.deepEqual(s.cellTerms[0][0],[[true,true]]);assert.deepEqual(s.cellTerms[1][0],[[true,false]]);
 const unknown=moleculeSharing({...one,denominator:2,products:[{a:0,b:0,numerator:2}]},[2,3]);
 assert.deepEqual(unknown.cellTerms[0][0],[[null,true]]);
});
