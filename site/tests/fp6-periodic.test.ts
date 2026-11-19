import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {familyRows,fewestShown,formLink,reconstructionText,shownCounts,type FP6Periodic} from '../src/fp6Periodic.ts';
import {withoutUnusedLimbs} from '../src/unusedLimbs.ts';
import type {FormSolution} from '../src/modularForms.ts';
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
test('family rows show the counts of the construction they open, without unused limbs',()=>{
 const modular=(name:string)=>JSON.parse(readFileSync(new URL('../../data/modular/'+name,import.meta.url),'utf8'));
 const forms=new Map<string,FormSolution>(modular('forms-index.json').chunks.flatMap((c:{path:string})=>modular(c.path).solutions).map((s:FormSolution)=>[s.id,s]));
 const published=data.rows.filter(r=>r.public_id);assert.equal(published.length,2194);
 const changed:string[]=[];
 for(const r of published){
  const s=forms.get(r.public_id!);assert.ok(s,r.id);const v=withoutUnusedLimbs(s!),shown=shownCounts(r,s);
  assert.deepEqual(shown,{R:v.products.length,faces:[v.planes.A.length,v.planes.B.length]},r.id);
  if(shown.R!==r.R||shown.faces.join()!==r.faces.join())changed.push(`${r.id}:${shown.R}:${shown.faces.join('/')}`);
 }
 // Rows (by their id in data/visualization/fp6-periodic.json) whose shown counts differ from the row's own: the
 // construction leaves out unused limbs, or uses fewer products on the same planes.
 const resolved=['c07800:3:2/2','c07801:3:2/2','c07803:3:2/2','c07804:3:2/2','c07807:3:2/2','c07809:3:2/2','c07811:4:3/2','c07813:3:2/2',
  'c07814:4:3/3','c07817:3:2/2','c07818:3:2/2','c07824:3:2/2','c07829:4:3/3','c07831:4:3/3','c07833:4:3/3','c07835:4:3/3','c07843:4:3/3',
  'c07845:4:3/3','c07851:3:2/2','c07854:3:2/2','c07855:3:2/2','c07857:3:2/2','c07858:4:3/3','c07860:3:2/2','c07861:3:2/2',
  'c07863:4:3/3','c07864:3:2/2','c07867:3:2/2','c07873:4:3/3','c07875:4:2/2','c07878:3:2/2','c07879:4:2/2','c07880:3:2/2','c07890:4:3/3',
  'c07893:4:3/3','c07898:4:3/2','c07902:4:3/3','c07915:4:3/3','c07917:4:3/3','c07918:4:2/2','c07921:4:3/3','c07929:4:3/3','c07931:4:3/3',
  'c07935:4:3/3','c07971:3:2/2','c07977:3:2/2','c08003:4:2/3','c08053:4:3/3','c08055:4:3/3','c08066:4:3/3','c08067:4:3/3'];
 assert.deepEqual(changed.sort(),[...['c08190','c08191','c08192','c08193','c08195','c08196','c08197','c08200','c08257','c08258','c08259','c08260','c08262'].map(id=>id+':1:1/1'),'c07848:3:2/2',...resolved].sort());
 const source=data.rows.find(r=>!r.public_id)!;assert.deepEqual(shownCounts(source),{R:source.R,faces:source.faces});
 // The per-modulus summary is counted from the shown rows; the source value stays beside it where they differ.
 const four=data.summaries.find(s=>s.m===4&&s.value_set==='8xE2M3')!,fewest=fewestShown(familyRows(data,'8xE2M3','','4',true),r=>r.public_id?forms.get(r.public_id):undefined,four.holefree_family);
 assert.equal(four.holefree_R,2);assert.equal(fewest?.R,1);assert.equal(fewest?.row.family,'p2');
});
