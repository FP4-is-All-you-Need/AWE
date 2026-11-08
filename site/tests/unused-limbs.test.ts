import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {unusedLimbs,withoutUnusedLimbs} from '../src/unusedLimbs.ts';
import {formConstruction} from '../src/formConstruction.ts';
import {formRows,type FormSolution} from '../src/modularForms.ts';
import {fromCanonical,residual,type Construction} from '../src/visual.ts';
import type {ModularSolution} from '../src/modular.ts';

const read=(name:string)=>JSON.parse(fs.readFileSync(new URL('../../data/modular/'+name,import.meta.url),'utf8'));
const small:FormSolution[]=read('forms-0000002-0000069.json').solutions,middle:FormSolution[]=read('forms-0000286-0000728.json').solutions;
const find=(list:FormSolution[],prefix:string)=>list.find(s=>s.id.startsWith(prefix))!;
const holds=(s:FormSolution)=>residual({modulus:s.modulus,weights:s.weights,planes:s.planes,products:s.products.map(p=>({...p,group:null})),denominator:s.denominator} as Construction)!.every(row=>row.every(v=>v==='0'));

test('a limb of weight 0 that never reaches a product is left out with its zero plane and product',()=>{
 const raw=find(small,'awem2_9fa03837'),s=withoutUnusedLimbs(raw);
 assert.deepEqual(unusedLimbs(raw),{A:[1],B:[1]});
 assert.deepEqual(s.weights,{A:[1],B:[1]});assert.deepEqual(s.planes,{A:[[1]],B:[[1]]});assert.deepEqual(s.products,[{a:0,b:0,numerator:1}]);
 assert.deepEqual(s.plane_moduli,{A:[4],B:[4]});assert.deepEqual(s.encoding!.A,[[0],[1],[-2],[-1]]);
 assert.deepEqual(raw.weights,{A:[1,0],B:[1,0]});
 const c=formConstruction(raw);assert.equal(c.id,raw.id);assert.equal(c.products.length,1);assert.equal(c.faces_a,1);assert.equal(c.additional?.omitted_limbs,2);
 assert.ok(residual(c)!.every(row=>row.every(v=>v==='0')));
 const five=formConstruction(find(small,'awem2_50b57013'));assert.deepEqual(five.weights,{A:[1],B:[1]});assert.equal(five.products.length,1);
});
test('a limb of weight 0 that planes use is kept',()=>{
 const raw=find(middle,'awem2_643f91c4');assert.equal(withoutUnusedLimbs(raw),raw);
 const c=formConstruction(raw);assert.deepEqual(c.weights.A,[0,1,16]);assert.equal(c.additional?.omitted_limbs,undefined);
});
test('leaving out unused limbs keeps every checked identity',()=>{
 let changed=0;
 for(const raw of [...small,...middle]){
  const s=withoutUnusedLimbs(raw);if(s===raw)continue;changed++;
  assert.deepEqual(unusedLimbs(s),{A:[],B:[]},raw.id);
  if(holds(raw))assert.ok(holds(s),raw.id);
 }
 assert.ok(changed>100);
});
test('saved FP6 constructions leave out unused limbs too',()=>{
 const fp6:ModularSolution[]=read('fp6-sets.json').solutions;
 for(const id of ['awem2_e2c6d242','awem2_6162bfa1']){
  const c=fromCanonical(fp6.find(s=>s.id.startsWith(id))!);
  assert.deepEqual(c.weights,{A:[1],B:[1]});assert.equal(c.shape,'one');assert.equal(c.additional?.omitted_limbs,2);assert.deepEqual(c.canonical!.encoding.A[1],[1]);
 }
});
test('the list shows a construction once when leaving out unused limbs makes two rows the same',()=>{
 const rows=formRows(small,{range:'4',set:'2xE2M1',holeFree:false},{});
 assert.ok(rows.some(r=>r.id.startsWith('awem2_16fdd925')));assert.ok(!rows.some(r=>r.id.startsWith('awem2_9fa03837')));
 assert.ok(rows.every(r=>r.products===1));
});
