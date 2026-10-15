import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {base13Plan,constructionPlan,computeMatrix,parseMatrix,crt} from '../src/numericExample.ts';
import {fromCanonical} from '../src/visual.ts';
const tables=JSON.parse(readFileSync(new URL('../../data/visualization/encoding-examples.json',import.meta.url),'utf8')).tables;
const catalog=JSON.parse(readFileSync(new URL('../../data/modular/catalog.json',import.meta.url),'utf8'));
const source=JSON.parse(readFileSync(new URL('../../data/visualization/numeric-example.json',import.meta.url),'utf8'));
const a=source.A.map((r:number[])=>r.map(BigInt)),b=source.B.map((r:number[])=>r.map(BigInt));
test('saved slide matrices reconstruct with both base13 LUTs and mod73',()=>{
 const plans=[...tables.map(base13Plan),constructionPlan(fromCanonical(catalog.solutions.find((c:any)=>c.modulus===73)))];
 for(const p of plans){const r=computeMatrix(p,a,b);assert.deepEqual(r.reconstructed,[[12n,11n],[6n,13n]]);assert.equal(r.matches,true);}
});
test('examples preserve identity failures and refuse unsaved input and dimensions',()=>{
 const plan=base13Plan(tables[0]);
 assert.throws(()=>computeMatrix(plan,[[1000n]],[[1n]]),/符号化表未収録/);
 assert.throws(()=>computeMatrix(plan,[[1n,2n]],[[1n]]),/次元不一致/);
 assert.throws(()=>parseMatrix('1 2\n3'),/整数/);
 assert.throws(()=>parseMatrix('1.5'),/整数/);
 assert.equal(computeMatrix({...plan,products:plan.products.map(p=>({...p,numerator:0}))},a,b).matches,false);
});
test('CRT preserves negative signs, exact BigInt precision and coprimality',()=>{
 assert.equal(crt([2n,3n],[3n,5n]).centered,-7n);
 const r=crt([12n,12n],[1000000007n,1000000009n]);assert.equal(r.P,1000000016000000063n);assert.equal(r.centered,12n);
 assert.throws(()=>crt([0n,0n],[3n,9n]),/互いに素/);
});
