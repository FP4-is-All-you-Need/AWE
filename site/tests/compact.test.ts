import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fromInteger} from '../src/visual.ts';
import {compactGroups,coefficientColor,productCells,blockPosition,productBaseColor} from '../src/compact.ts';
const shard=JSON.parse(readFileSync(new URL('../../data/solutions/37.json',import.meta.url),'utf8'));
const raw=(Array.isArray(shard)?shard:shard.solutions).find((s:any)=>s.id==='awe1_37e282e92ef5d7e7761ae3304ed06bc8e91ce78a9436d239851ebc3b0b2a9a07');
const c=fromInteger(raw);
test('compact view partitions twelve saved products into eight direct and four plane products without changing any coefficient',()=>{
 const groups=compactGroups(c);assert.deepEqual(groups.map(g=>g.length),[8,4]);assert.equal(new Set(groups.flat()).size,12);
 for(let i=0;i<4;i++)for(let j=0;j<4;j++){
 const sum=groups.flat().reduce((s,k)=>s+productCells(c,k).filter(p=>p.i===i&&p.j===j).reduce((s,p)=>s+p.n!,0n),0n);
 assert.equal(sum,BigInt(c.denominator)*BigInt(c.weights.A[i])*BigInt(c.weights.B[j]));
 }
 // Saved products 6,7,10,11 have support centres at sorted-axis
 // positions (2.5,2.5), (2.5,.5), (.5,2.5), (.5,.5).
 assert.deepEqual(groups[1],[6,7,10,11]);
 assert.deepEqual(groups[1].map(i=>blockPosition(c,i)),[5,2,2,0]);
 assert.deepEqual(groups[1].map(i=>coefficientColor(c,i)),['#9CCC65','#A0825E','#4FC3F7','#E8710A']);
 assert.deepEqual(groups[1].map(i=>productBaseColor(c,i)),['#9CCC65','#CCAA88','#4FC3F7','#E8710A']);
});

import {blockPairs,orderedConstruction,defaultLimbOrder,originalIndices} from '../src/limbOrder.ts';
import {residual} from '../src/visual.ts';
import {savedTuple,weightedTuple} from '../src/savedEncoding.ts';
test('limb permutation moves weights, plane columns and saved tuples together without changing the stored construction',()=>{
 const input={...c,saved_encoding:{A:{'2726':[1,2,3,4]},B:{'2726':[1,2,3,4]}}},before=JSON.stringify(input);
 const weights=orderedConstruction(input,'weight'),blocks=orderedConstruction(input,'block');
 assert.equal(defaultLimbOrder(c),'block');assert.equal(defaultLimbOrder({...c,weights:{A:[1,5,27],B:[1,5,27]}}),'weight');
 assert.deepEqual(originalIndices(weights,'A'),[0,2,1,3]);assert.deepEqual(originalIndices(input,'A'),[0,1,2,3]);
 assert.deepEqual(weights.weights.A,[1,9,71,639]);assert.deepEqual(blocks.weights,weights.weights);
 assert.deepEqual(blockPairs(c),{A:[[0,2],[1,3]],B:[[0,2],[1,3]]});
 for(const view of [weights,blocks]){assert.equal(view.id,input.id);assert.ok(residual(view)!.every(row=>row.every(v=>v==='0')));assert.deepEqual(savedTuple(view,2726n,'A'),[1,3,2,4]);assert.equal(weightedTuple(savedTuple(view,2726n,'A')!,view.weights.A),weightedTuple([1,2,3,4],input.weights.A));}
 assert.equal(JSON.stringify(input),before);
 assert.equal(orderedConstruction(input,'stored'),input);
 assert.equal(blockPairs({...c,products:c.products.slice(1)}),null);
});

import {compactBlocks,blockFormula,weightScale} from '../src/compactBlocks.ts';
test('paper compact rewrite preserves every polynomial coefficient and derives cancellation terms from saved planes',()=>{
 const ordered=orderedConstruction(c,'weight'),blocks=compactBlocks(ordered)!;assert.equal(blocks.length,4);
 assert.equal(blocks.flatMap(b=>b.direct).length,8);
 assert.deepEqual(blocks.map(b=>b.direct.map(t=>String(t.subtract))),Array.from({length:4},()=>['1','4']));
 for(const b of blocks){
  for(const t of b.direct){const saved=productCells(ordered,t.product)[0].n!;assert.equal(b.denominator*t.scale-b.numerator*t.subtract,saved);}
  for(const t of b.cross)assert.equal(b.numerator*t.factor,b.denominator*t.scale);
 }
 assert.deepEqual(blocks.map(b=>({product:b.product,color:b.color})),[
  {product:11,color:'#E8710A'},{product:7,color:'#A0825E'},
  {product:10,color:'#4FC3F7'},{product:6,color:'#9CCC65'},
 ]);
 assert.equal(weightScale(ordered,639n*639n),'9^{2}\\cdot 71^{2}');
 const formula=blockFormula(ordered,blocks[2]);assert.equal(formula[0],'Q_{01}=(a_{0}+2a_{1})(b_{2}+2b_{3})');assert.ok(formula[3].includes('\\frac{9\\cdot 71}{2}'));
 const changed={...ordered,products:ordered.products.map((p,i)=>({...p,numerator:p.numerator!+(i===0?1:0)}))};
 assert.equal(compactBlocks(changed),null);assert.equal(compactBlocks({...changed,modulus:2}),null);
 assert.equal(compactBlocks(c),null); // Noncontiguous pairs use the general grouped view.
});
