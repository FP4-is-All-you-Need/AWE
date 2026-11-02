import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {familyRows,formLink,reconstructionText,type FP6Periodic} from '../src/fp6Periodic.ts';
const data:FP6Periodic=JSON.parse(readFileSync(new URL('../../data/visualization/fp6-periodic.json',import.meta.url),'utf8'));
test('all source representatives and summaries survive with distinct family/product keys',()=>{
 assert.equal(data.rows.length,3673);assert.equal(data.summaries.length,3605);
 assert.equal(new Set(data.rows.map(r=>[r.m,r.value_set,r.family,r.R].join(':'))).size,data.rows.length);
 assert.equal(new Set(data.rows.map(r=>r.family)).size,8);
 assert(data.rows.every(r=>r.holefree===r.holes.every(n=>n===0)));
 assert(data.rows.every(r=>(r.status==='checked')===Boolean(r.public_id)));
 assert(data.rows.some(r=>r.status==='source_only'&&r.recon==='d1_divide_d2_inverse'));
});
test('FP6 filters cannot mix FP4 or the other FP6 set, and preserve family representatives',()=>{
 assert.deepEqual(familyRows(data,'2xE2M1','','',true),[]);
 for(const set of ['8xE2M3','16xE3M2'] as const){
  const rows=familyRows(data,set,'','901',true);assert(rows.length);
  assert(rows.every(r=>r.m===901&&r.value_set===set));
  assert(familyRows(data,set,'p3','',false).every(r=>r.family==='p3'&&r.holefree));
 }
 assert.equal(familyRows(data,'8xE2M3','toom','',true).length,1530);
 assert.equal(familyRows(data,'16xE3M2','toom','',true).length,0);
});
test('construction links keep the same set and modulus, and reconstruction labels are explicit',()=>{
 const r=data.rows.find(r=>r.value_set==='16xE3M2'&&r.public_id)!;
 const q=new URLSearchParams(formLink(r,'en'));assert.equal(q.get('prime_set'),'fp6');assert.equal(q.get('lang'),'en');
 assert.equal(q.get('periodic_fp6'),r.value_set);assert.equal(q.get('forms_id'),r.public_id);
 assert.equal(q.get('forms_m'),String(r.m));
 assert.match(reconstructionText('d1_divide_d2_inverse',true),/inverse of d2/);
});
test('general-weight open cells and scope are retained beside negative bounds',()=>{
 const r=data.summaries.find(r=>r.m===901&&r.value_set==='8xE2M3')!;
 assert.equal(r.general_weight_no_holefree_upto,2);
 assert(r.general_weight_open_cells!.length>0);
 assert.match(r.scope_of_no_holefree!,/general weights/);
 assert.match(r.scope_of_no_holefree!,/denominator 1/);
});
