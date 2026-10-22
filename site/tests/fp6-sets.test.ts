import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {mergeModularCatalogs} from '../src/modular.ts';
import {connect,pool,factors} from '../src/visual.ts';
import {storedModulusLanes} from '../src/modulusLanes.ts';
const read=(name:string)=>JSON.parse(fs.readFileSync(new URL('../../data/'+name,import.meta.url),'utf8'));
const fp6=read('modular/fp6-sets.json');
const catalog=mergeModularCatalogs(['catalog','powers','fp32','fp32-history','fp6-sets'].map(n=>read('modular/'+n+'.json')));
const visual=connect(read('visualization/modsets.json'),catalog),stored=storedModulusLanes(catalog,visual);
test('the FP6 sets are saved lanes with their recorded widths, K and constructions',()=>{
 const lanes=stored.filter(l=>l.format==='FP6 (8×E2M3)');
 assert.equal(lanes.length,fp6.sets.length);
 for(const s of fp6.sets){const l=lanes.find(l=>l.id===s.id)!;assert.ok(l);
  assert.equal(l.bits,s.magnitude_bits);assert.equal(l.plan_k,s.k);assert.equal(l.k_max,s.verification.max_k);
  assert.deepEqual(l.moduli,s.verification.moduli);assert.deepEqual(l.mods.map(c=>c.id),s.solution_ids);
  assert.equal(l.products,l.mods.reduce((n,c)=>n+c.products.length,0));
  // Pairwise coprime, so each prime appears in one modulus only.
  const primes=l.mods.flatMap(c=>factors(c.modulus).map(f=>f.prime));assert.equal(new Set(primes).size,primes.length);}
 assert.deepEqual(lanes.map(l=>[l.bits,l.mods.length,l.products]).sort((a,b)=>a[0]-b[0]),[[53,20,30],[72,22,41]]);
});
test('FP4 sets keep their formats when the FP6 file is added',()=>{
 const without=storedModulusLanes(mergeModularCatalogs(['catalog','powers','fp32','fp32-history'].map(n=>read('modular/'+n+'.json'))),visual);
 for(const l of without)assert.equal(stored.find(s=>s.id===l.id)!.format,l.format);
});
test('every FP6 construction reaches tiles, details and periodic-table cards',()=>{
 const ids=new Set(pool(visual,catalog).map(c=>c.id));
 for(const s of fp6.solutions)assert.ok(ids.has(s.id),s.id);
});
