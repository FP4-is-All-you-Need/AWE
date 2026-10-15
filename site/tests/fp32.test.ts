import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mergeModularCatalogs,rankModular,modularInitial,type ModularCatalog} from '../src/modular.ts';
import {canonicalLane,totals} from '../src/visual.ts';
const read=(name:string)=>JSON.parse(readFileSync(new URL(`../../data/modular/${name}.json`,import.meta.url),'utf8')) as ModularCatalog;
const base=read('catalog'),powers=read('powers'),single=read('fp32');
test('FP32 measured set is ranked by actual products and retains CRT bounds and face counts',()=>{
 const all=mergeModularCatalogs([base,powers,single]);
 const best=rankModular(all.sets,{...modularInitial(new URLSearchParams()),bits:24})[0];
 assert.equal(best.id,single.sets[0].id);assert.equal(best.verification.products,28);
 assert.equal(best.usage?.[0].state,'measured');
 const lane=canonicalLane(all,best.id)!;const t=totals(lane.mods,24,8192);
 assert.equal(t.facesA,24);assert.equal(t.facesB,24);assert.equal(t.products,28);
 assert.equal(rankModular([best],{...modularInitial(new URLSearchParams()),bits:24,k:'9181'}).length,0);
 assert.equal(rankModular([best],{...modularInitial(new URLSearchParams()),bits:25}).length,0);
});
test('imported copies do not duplicate existing constructions or replace their values',()=>{
 const all=mergeModularCatalogs([base,powers,single,single]);
 assert.equal(all.solutions.length,new Set([...base.solutions,...powers.solutions,...single.solutions].map(s=>s.id)).size);
 assert.equal(all.sets.length,85);
 for(const before of base.solutions){const after=all.solutions.find(s=>s.id===before.id)!;
  const {provenance:p,...rest}=before,{provenance:q,...actual}=after;assert.deepEqual(actual,rest);
 }
});

test('recorded FP32 groups deduplicate copies and retain original values',()=>{
 const history=read('fp32-history');
 const all=mergeModularCatalogs([base,powers,single,history,history]);
 assert.equal(all.sets.length,100);assert.equal(all.solutions.length,120);assert.equal(all.fp32_groups?.length,16);
 for(const before of mergeModularCatalogs([base,powers,single]).solutions){
  const {provenance:p,...expected}=before;
  const {provenance:q,...actual}=all.solutions.find(s=>s.id===before.id)!;
  assert.deepEqual(actual,expected);
 }
 for(const group of all.fp32_groups!) for(const e of group.engines){
  assert.ok(all.sets.some(s=>s.id===e.set_id));
 }
});
