import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {base13Plan,constructionPlan,computeMatrix,parseMatrix,crt,MatrixInputError} from '../src/numericExample.ts';
import {fromCanonical} from '../src/visual.ts';
const tables=JSON.parse(readFileSync(new URL('../../data/visualization/encoding-examples.json',import.meta.url),'utf8')).tables;
const catalog=JSON.parse(readFileSync(new URL('../../data/modular/catalog.json',import.meta.url),'utf8'));
const source=JSON.parse(readFileSync(new URL('../../data/visualization/numeric-example.json',import.meta.url),'utf8'));
const a=source.A.map((r:number[])=>r.map(BigInt)),b=source.B.map((r:number[])=>r.map(BigInt));
test('saved slide matrices reconstruct with both base13 LUTs and mod73',()=>{
 const plans=[...tables.map(base13Plan),constructionPlan(fromCanonical(catalog.solutions.find((c:any)=>c.modulus===73)))];
 for(const p of plans){const r=computeMatrix(p,a,b);assert.deepEqual(r.reconstructed,[[12n,11n],[6n,13n]]);assert.equal(r.matches,true);}
});
test('examples preserve identity failures and reject out-of-range inputs and invalid dimensions',()=>{
 const plan=base13Plan(tables[0]);
 assert.throws(()=>computeMatrix(plan,[[3000n]],[[1n]]),/範囲外/);
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

test('500 and signed larger inputs reconstruct from fixed base13 weights and modular AWE',()=>{
  for(const plan of [...tables.map(base13Plan),constructionPlan(fromCanonical(catalog.solutions.find((c:any)=>c.modulus===73)))]){
   for(const value of [500n,-500n,1000n,2000n]){
    if(plan.inputRanges?.A&&value>plan.inputRanges.A[1]){assert.throws(()=>computeMatrix(plan,[[value]],[[2n]]),/範囲外/);continue;}
    const result=computeMatrix(plan,[[value]],[[2n]]);
    assert.equal(result.matches,true);
    assert.equal(result.reconstructed[0][0],plan.modulus?((value*2n)%BigInt(plan.modulus)+BigInt(plan.modulus))%BigInt(plan.modulus):value*2n);
   }
  }
 });

test('a hole in fixed three-limb base13 is not a made-up encoding',()=>{
 assert.throws(()=>computeMatrix(base13Plan(tables[0]),[[845n]],[[1n]]),/穴/);
});

test('integer construction encodes 500 from its declared storage and rejects outside its domain',async()=>{
 const {fromInteger}=await import('../src/visual.ts');
 const records=JSON.parse(readFileSync(new URL('../../data/solutions/37.json',import.meta.url),'utf8'));
 const list=Array.isArray(records)?records:records.solutions;
 const source=list.find((c:any)=>c.id==='awe1_37e282e92ef5d7e7761ae3304ed06bc8e91ce78a9436d239851ebc3b0b2a9a07');
 assert.ok(source);const c=fromInteger(source),plan=constructionPlan(c);
 const {orderedConstruction}=await import('../src/limbOrder.ts');
 const reordered=orderedConstruction(c,'weight'),encoded=constructionPlan(reordered).encode(500n,'A');
 assert.deepEqual(encoded,reordered.display_indices!.A.map(i=>plan.encode(500n,'A')![i]));
 const result=computeMatrix(plan,[[500n]],[[2n]]);
 assert.equal(result.matches,true);assert.deepEqual(result.reconstructed,[[1000n]]);
 assert.throws(()=>computeMatrix(plan,[[BigInt(source.domain.A[1])+1n]],[[2n]]),/範囲外/);
});


test('input limits keep exact values and identify the failing matrix entry',()=>{
 const frozen=base13Plan(tables.find((t:any)=>t.method==='frozen_residue'));
 const full=base13Plan(tables.find((t:any)=>t.method==='min_nonzero'));
 assert.deepEqual(frozen.inputRanges!.A,[-1464n,1464n]);assert.deepEqual(full.inputRanges!.A,[-2196n,2196n]);
 assert.equal(computeMatrix(full,[[2196n]],[[1n]]).matches,true);
 assert.throws(()=>computeMatrix(full,[[0n,2197n]],[[1n],[1n]]),(e:unknown)=>e instanceof MatrixInputError&&e.side==='A'&&e.column===1&&e.value===2197n&&e.range?.[1]===2196n);
 assert.throws(()=>computeMatrix(frozen,[[2000n]],[[1n]]),/範囲外/);
 assert.throws(()=>parseMatrix('9'.repeat(101)),/100/);
 assert.equal(parseMatrix('-'+'9'.repeat(100))[0][0],-BigInt('9'.repeat(100)));
 const modular=constructionPlan(fromCanonical(catalog.solutions.find((c:any)=>c.modulus===73))),large=BigInt('9'.repeat(100));
 const result=computeMatrix(modular,[[large]],[[2n]]);assert.deepEqual(result.reference,[[large*2n]]);assert.deepEqual(result.reconstructed,[[large*2n%73n]]);assert.equal(result.matches,true);
 assert.throws(()=>computeMatrix({...full,inputRanges:{A:[-100n,100n],B:[-1n,1n]}},[[2n]],[[2n]]),(e:unknown)=>e instanceof MatrixInputError&&e.side==='B'&&e.value===2n);
});
