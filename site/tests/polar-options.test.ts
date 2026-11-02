import assert from 'node:assert/strict';
import test from 'node:test';
import {cheapest,DEFAULT_COEFFICIENTS,formKind,productPlaneOptions,type PolarRow} from '../src/polarModel.ts';

const model={E32f:[null,10,null],E32i:[null,10,null],K32f:null,K32i:null,encA:1,encB:1,mP:[0,0,0,0],L:null,shiftLength:null};
const row=(id:string,R:number,FA:number,FB:number,A:number[],B=A):PolarRow=>({id,m:343,vs:'2xE2M1',R,FA,FB,hA:0,hB:0,exact:true,weights:{A,B},maxK:null,model,origin:null,inCatalog:true,source:'modular/forms.json'});
const folded=row('awem2_a',5,4,4,[7,42,1],[7,287,1]),vanishing5=row('awem2_b',5,4,4,[1,7,49]);
const vanishing6=row('awem2_z',6,3,3,[1,7,49]),fourLimbs=row('awem2_c',6,3,3,[1,7,49],[1,7,7,49]);
const rows=[folded,vanishing5,vanishing6,fourLimbs,row('awem2_e',5,5,5,[1,7,49]),row('awem2_f',7,3,3,[1,1,49],[1,1,7,7])];

test('options keep the products/planes pairs that no other pair beats, fewest products first',()=>{
 const options=productPlaneOptions(rows,DEFAULT_COEFFICIENTS);
 assert.deepEqual(options.map(o=>[o.R,o.F]),[[5,8],[6,6]]);
 assert.deepEqual(options[0].rows.map(r=>r.id),['awem2_a','awem2_b']);
});
test('a pair shows the given construction, otherwise the cheapest, then fewer limbs, then id',()=>{
 assert.deepEqual(productPlaneOptions(rows,DEFAULT_COEFFICIENTS,vanishing5).map(o=>o.shown.id),['awem2_b','awem2_z']);
 assert.deepEqual(productPlaneOptions(rows,DEFAULT_COEFFICIENTS).map(o=>o.shown.id),['awem2_a','awem2_z']);
 assert.equal(productPlaneOptions([folded,vanishing5],DEFAULT_COEFFICIENTS).length,1);
});
test('form kind: vanishing powers of geometric weights and plane moduli below the modulus',()=>{
 assert.deepEqual(formKind(vanishing6,undefined),{vanishing:[3,4],w:7,folded:undefined});
 assert.deepEqual(formKind(folded,[7,49,49,7,49,49]),{vanishing:[],w:7,folded:[7,49]});
 assert.deepEqual(formKind(fourLimbs,[343,343,343,343,343,343]).folded,[]);
 assert.deepEqual(formKind(fourLimbs,[343,343,343,343,343,343]).vanishing,[]);
 assert.equal(formKind(vanishing6,null).folded,null);
});
test('the default construction is the cheapest undominated one, then fewer limbs, then id, as in the bands',()=>{
 assert.equal(cheapest(rows,DEFAULT_COEFFICIENTS)?.id,'awem2_a');
 assert.equal(cheapest([vanishing6,fourLimbs],DEFAULT_COEFFICIENTS)?.id,'awem2_z');
 assert.equal(cheapest([],DEFAULT_COEFFICIENTS),undefined);
 const options=productPlaneOptions(rows,DEFAULT_COEFFICIENTS);
 assert.ok(options.some(o=>o.shown.id===cheapest(rows,DEFAULT_COEFFICIENTS)?.id));
});
