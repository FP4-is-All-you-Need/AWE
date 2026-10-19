import test from 'node:test';
import assert from 'node:assert/strict';
import {cost,dominance,DEFAULT_COEFFICIENTS,groupRows,componentComparison,shift,type PolarRow} from '../src/polarModel.ts';
const sample=(id:string,m=6):PolarRow=>({id,m,vs:'2xE2M1',R:3,FA:2,FB:2,hA:0,hB:0,exact:true,weights:{A:[1,2],B:[1,2]},maxK:8192,model:{E32f:[1,1,1],E32i:[1,1,1],K32f:8192,K32i:8192,encA:3,encB:3,mP:[0,0,0,0],L:1,shiftLength:null},origin:null,inCatalog:true,source:''});
test('unmatched cost metadata stays unknown, and coefficient changes can reverse the preferred form',()=>{
 const a=sample('a'),b={...sample('b'),R:2,FA:5,FB:5};
 assert.equal(cost({...a,model:null},DEFAULT_COEFFICIENTS),null);
 assert.ok(cost(a,DEFAULT_COEFFICIENTS)!<cost(b,DEFAULT_COEFFICIENTS)!);
 assert.ok(cost(a,{...DEFAULT_COEFFICIENTS,wF:0})!>cost(b,{...DEFAULT_COEFFICIENTS,wF:0})!);
 assert.equal(cost(a,{...DEFAULT_COEFFICIENTS,wF:0,wM:0,wA:0}),3);
});
test('ten-measure dominance cannot cross the checked value set or modulus',()=>{
 const a=sample('a'),better={...sample('b'),R:2};
 assert.equal(dominance([a,better],DEFAULT_COEFFICIENTS).get('a'),'b');
 assert.equal(dominance([a,{...better,vs:'8xE2M3'}],DEFAULT_COEFFICIENTS).size,0);
 assert.equal(dominance([a,{...better,m:7}],DEFAULT_COEFFICIENTS).size,0);
});
test('a missing CRT component cannot create a saving, and known component minima add',()=>{
 const a=sample('a'),p={...sample('p',2),R:2},q={...sample('q',3),R:2};
 const unknown=componentComparison(6,groupRows([a,p]),DEFAULT_COEFFICIENTS);
 assert.equal(unknown.sum,null);assert.equal(unknown.saving,null);
 const known=componentComparison(6,groupRows([a,p,q]),DEFAULT_COEFFICIENTS);
 assert.deepEqual(known.components,[2,3]);assert.equal(known.sum,4);assert.equal(known.saving,1);
});
test('two-sided shifts of an even modulus use an even block length',()=>{
 const r={...sample('r',20),hA:2,hB:2};
 assert.deepEqual(shift(r),{L:6,k:2});
});
