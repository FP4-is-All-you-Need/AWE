import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {mergeModularCatalogs} from '../src/modular.ts';
import {connect,pool} from '../src/visual.ts';
import {storedModulusLanes,modulusComparisonLanes} from '../src/modulusLanes.ts';
const read=(name:string)=>JSON.parse(fs.readFileSync(new URL('../../data/'+name,import.meta.url),'utf8'));
const catalog=mergeModularCatalogs(['catalog','powers','fp32','fp32-history'].map(n=>read('modular/'+n+'.json')));
const visual=connect(read('visualization/modsets.json'),catalog),stored=storedModulusLanes(catalog,visual),choices=modulusComparisonLanes(stored,visual);
const fp32=new Set(catalog.fp32_groups!.flatMap(g=>g.set_ids));
test('all sixteen FP32 sets remain available for comparison at their recorded widths and K',()=>{
 assert.equal(fp32.size,16);assert.equal(stored.filter(l=>l.format==='FP32').length,16);
 for(const id of fp32){const s=catalog.sets.find(s=>s.id===id)!,l=choices.find(l=>l.id===id)!;assert.ok(l);assert.equal(l.bits,s.magnitude_bits);assert.equal(l.plan_k,s.k);assert.equal(l.k_max,s.verification.max_k);assert.deepEqual(l.moduli,s.verification.moduli);assert.deepEqual(l.mods.map(c=>c.id),s.solution_ids);assert.equal(l.faces_a,l.mods.reduce((n,c)=>n+c.faces_a,0));}
 assert.equal(new Set(choices.map(l=>l.id)).size,choices.length);
 // Eligibility for the current operands is deliberately narrower than comparison.
 assert.equal(stored.filter(l=>fp32.has(l.id)&&l.bits!>=24&&BigInt(l.k_max)>=8192n).length,2);
});
test('FP64 sets and saved figure rows remain in the same comparison catalog',()=>{
 for(const s of catalog.sets.filter(s=>!fp32.has(s.id)))assert.ok(choices.some(l=>l.id===s.id));
 for(const w of visual.widths)for(const r of w.rows)assert.ok(choices.some(l=>l.id===r.id&&l.bits===w.bits));
});
test('every FP32 construction is available to tiles, details and periodic-table cards',()=>{
 const records=pool(visual,catalog),ids=new Set(records.map(c=>c.id));
 for(const l of stored.filter(l=>l.format==='FP32'))for(const c of l.mods)assert.ok(ids.has(c.id),c.id);
});
