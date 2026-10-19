import assert from 'node:assert/strict';
import test from 'node:test';
import {existsSync,readFileSync} from 'node:fs';
import {chunksFor,factorText,formRows,parseRange,usableOn,type FormSolution,type FormsIndex,type ModularForms} from '../src/modularForms.ts';

const base={schema_version:2,weights:{A:[1,13],B:[1,13]},planes:{A:[[1,0],[0,1],[1,1]],B:[[1,0],[0,1],[1,1]]},products:[{a:0,b:0,numerator:39},{a:1,b:1,numerator:3},{a:2,b:2,numerator:13}],denominator:1};
const rows:FormSolution[]=[
 {...base,id:'awem2_b',modulus:51,plane_sets:{A:['2xE2M1','2xE2M1','2xE2M1'],B:['2xE2M1','2xE2M1','2xE2M1']},plane_moduli:{A:[17,17,51],B:[17,17,51]},holes:{A:0,B:0,exact:true},accumulation:{max_k:1000}},
 {...base,id:'awem2_a',modulus:4891,plane_sets:{A:['2xE2M1','2xE2M1','2xE2M1'],B:['2xE2M1','2xE2M1','2xE2M1']},holes:{A:0,B:0,exact:true},accumulation:{max_k:null}},
 {...base,id:'awem2_c',modulus:243,plane_sets:{A:['8xE2M3','8xE2M3','8xE2M3'],B:['8xE2M3','8xE2M3','8xE2M3']},holes:{A:6,B:6,exact:true},encoding:{A:[],B:[]},accumulation:{max_k:5}},
];
test('ranges accept a single modulus or an interval and reject other text',()=>{
 assert.deepEqual(parseRange(' 4000-6000 '),[4000,6000]);
 assert.deepEqual(parseRange('589'),[589,589]);
 assert.equal(parseRange(''),null);
 assert.equal(parseRange('4000-'),null);
});
test('factor text uses superscript exponents',()=>{
 assert.equal(factorText(4891),'67·73');
 assert.equal(factorText(1352),'2³·13²');
});
test('filters by modulus range, value set and holes, sorted by modulus',()=>{
 assert.deepEqual(formRows(rows,{range:'',set:'',holeFree:false}).map(r=>r.modulus),[51,243,4891]);
 assert.deepEqual(formRows(rows,{range:'4000-6000',set:'',holeFree:false}).map(r=>r.id),['awem2_a']);
 assert.deepEqual(formRows(rows,{range:'',set:'2xE2M1',holeFree:false}).map(r=>r.id),['awem2_b','awem2_a']);
 // 2xE2M1 constructions hold on 8xE2M3 too: the FP6 filter keeps them
 assert.deepEqual(formRows(rows,{range:'',set:'8xE2M3',holeFree:false}).map(r=>r.id),['awem2_b','awem2_c','awem2_a']);
 assert.deepEqual(formRows(rows,{range:'',set:'16xE3M2',holeFree:false}).map(r=>r.id),['awem2_b','awem2_a']);
 assert.deepEqual(formRows(rows,{range:'',set:'',holeFree:true}).map(r=>r.modulus),[51,4891]);
 const folded=formRows(rows,{range:'51',set:'',holeFree:false})[0];
 assert.equal(folded.folded,true);
 assert.equal(formRows(rows,{range:'243',set:'',holeFree:false})[0].table,true);
});
test('value-set inclusion: FP4 inside both FP6 sets, not the other way',()=>{
 assert.ok(usableOn('2xE2M1','8xE2M3')&&usableOn('2xE2M1','16xE3M2')&&usableOn('8xE2M3','8xE2M3'));
 assert.ok(!usableOn('8xE2M3','2xE2M1')&&!usableOn('8xE2M3','16xE3M2')&&!usableOn('16xE3M2','8xE2M3'));
});
test('the denominator column marks the divide-by-d1 reconstruction',()=>{
 const r=formRows([{...rows[0],denominator:2,reconstruction:{procedure:'divide_d1_then_multiply_d2_inverse'}}],{range:'',set:'',holeFree:false})[0];
 assert.equal(r.denominator,2);assert.equal(r.dividesD1,true);
 assert.equal(formRows(rows,{range:'51',set:'',holeFree:false})[0].dividesD1,false);
});
test('only the files whose modulus range meets the filter are read',()=>{
 const c=(lo:number,hi:number)=>({path:`forms-${lo}-${hi}.json`,sha256:'',solutions:1,modulus_min:lo,modulus_max:hi});
 const index:FormsIndex={schema_version:2,data_version:'0.2.0',kind:'modular_forms_index',solutions:3,chunks:[c(2,150),c(151,900),c(901,5000)],excluded:[]};
 assert.equal(chunksFor(index,'').length,3);
 assert.deepEqual(chunksFor(index,'4000-'),index.chunks);
 assert.deepEqual(chunksFor(index,'589').map(x=>x.modulus_min),[151]);
 assert.deepEqual(chunksFor(index,'100-1000').map(x=>x.modulus_min),[2,151,901]);
 assert.deepEqual(chunksFor(index,'6000-7000'),[]);
});
test('the published forms files, when present, are listed in the index with disjoint sorted modulus ranges',()=>{
 const indexPath=new URL('../../data/modular/forms-index.json',import.meta.url);
 if(!existsSync(indexPath))return;
 const index=JSON.parse(readFileSync(indexPath,'utf8')) as FormsIndex;
 assert.equal(index.kind,'modular_forms_index');
 let last=0,total=0;
 for(const c of index.chunks){
  assert.match(c.path,/^forms-[0-9]{7,10}-[0-9]{7,10}\.json$/);
  assert.ok(c.modulus_min>last&&c.modulus_max>=c.modulus_min);
  last=c.modulus_max;
  const data=JSON.parse(readFileSync(new URL('../../data/modular/'+c.path,import.meta.url),'utf8')) as ModularForms;
  assert.equal(data.kind,'modular_forms');
  assert.equal(data.schema_version,2);
  assert.equal(data.solutions.length,c.solutions);
  const ms=data.solutions.map(s=>s.modulus);
  assert.deepEqual(ms,[...ms].sort((a,b)=>a-b));
  assert.ok(ms.every(m=>m>=c.modulus_min&&m<=c.modulus_max));
  assert.ok(data.solutions.every(s=>s.encoding===undefined||s.modulus<=256));
  assert.ok(data.solutions.every(s=>s.denominator===1||s.reconstruction?.procedure==='divide_d1_then_multiply_d2_inverse'));
  total+=c.solutions;
 }
 assert.equal(total,index.solutions);
});
