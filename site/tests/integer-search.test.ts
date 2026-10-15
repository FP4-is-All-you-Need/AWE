import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {integerRows,integerRowCost,type IntegerFilters} from '../src/integerSearch.ts';
import {constructionCost,defaultCostSettings,type CostSettings} from '../src/cost.ts';
import {fromInteger} from '../src/visual.ts';
import type {Row,Solution} from '../src/types.ts';

const settings:CostSettings={...defaultCostSettings,product:'1',plane:'2',add:'3',additionModel:'naive'};
const filters:IntegerFilters={r:0,limbs:0,planes:0,denominator:0,weight:'',mixed:false,sort:'products'};
const dims={m:2,n:3,k:10};
const fixture=(id:string,changes:Partial<Record<number,unknown>>={}):Row=>Object.assign(
 [id,8,8,3,3,6,6,6,1,100,[2,5,31],[2,5,31],false,{add_a:3,add_b:3,domain_a:[-148,148],domain_b:[-148,148]}] as Row,changes);

test('canonical integer summary and full construction give identical costs in both models',()=>{
 const id='awe1_002b0cddfc3729fdb06a905e402dc9c2e9b5be0d8c4222c10571bc9a5cacc3bb';
 const solutions=JSON.parse(readFileSync(new URL('../../data/solutions/00.json',import.meta.url),'utf8')) as Solution[];
 const rows=JSON.parse(readFileSync(new URL('../../data/search/A8_B8_r6.json',import.meta.url),'utf8')) as Row[];
 const solution=solutions.find(s=>s.id===id)!;const row=rows.find(r=>r[0]===id)!;
 assert.ok(solution);assert.ok(row);assert.deepEqual(solution.weights,{A:[2,5,31],B:[2,5,31]});
 assert.equal(solution.products.length,6);assert.deepEqual(row[13],{add_a:3,add_b:3,domain_a:[-148,148],domain_b:[-148,148]});
 for(const model of ['additive','max'] as const){
  const config={...settings,model,stages:{...settings.stages,product:'1',plane:'1',add:'1'},overlaps:{'1':'0.5'}};
  const summary=integerRowCost(row,dims,config),full=constructionCost(fromInteger(solution),dims,config);
  assert.deepEqual(summary.terms,full.terms);assert.equal(summary.total,full.total);assert.ok(summary.total!==null);
  assert.equal(summary.total,model==='additive'?1410:1005);
 }
});

test('integer conditions retain only candidates meeting each independent constraint',()=>{
 const rows=[fixture('keep'),fixture('products',{5:7}),fixture('limbs',{4:2}),fixture('planes',{7:7}),
  fixture('denominator',{8:2}),fixture('weight',{10:[1,5,27],11:[1,5,27]}),fixture('k',{9:9}),fixture('mixed',{12:true})];
 const f={...filters,r:6,limbs:3,planes:12,denominator:1,weight:'2,31'};
 assert.deepEqual(integerRows(rows,f,10,dims,settings).map(r=>r[0]),['keep']);
 assert.equal(integerRows([fixture('boundary',{9:10})],f,10,dims,settings).length,1);
 assert.equal(integerRows([fixture('unbounded',{9:null})],f,100000,dims,settings).length,1);
 assert.equal(integerRows([fixture('mixed',{12:true})],{...f,mixed:true},10,dims,settings).length,1);
});

test('cost ranking includes plane and addition costs and puts unknown totals last',()=>{
 const rows=[fixture('fewer-products',{5:3,13:{add_a:30,add_b:30}}),
  fixture('lower-cost',{5:6,6:1,7:1,13:{add_a:0,add_b:0}}),fixture('unknown',{5:1,13:undefined})];
 const ranked=integerRows(rows,{...filters,sort:'cost'},10,dims,settings);
 assert.deepEqual(ranked.map(r=>r[0]),['lower-cost','fewer-products','unknown']);
 assert.equal(integerRowCost(rows[2],dims,settings).total,null);
 assert.deepEqual(integerRows(rows,filters,10,dims,settings).map(r=>r[0]),['unknown','fewer-products','lower-cost']);
 assert.deepEqual(integerRows(rows,{...filters,sort:'planes'},10,dims,settings).map(r=>r[0]),['lower-cost','unknown','fewer-products']);
});
