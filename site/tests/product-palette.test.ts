import test from 'node:test';
import assert from 'node:assert/strict';
import {directPalette,DIRECT_COLORS} from '../src/productPalette.ts';
import {readFileSync} from 'node:fs';
import {fromInteger,type Construction} from '../src/visual.ts';
import {orderedConstruction} from '../src/limbOrder.ts';
import {orderedPlaneProducts,coefficientColor,directColor,productBaseColor,blockPosition} from '../src/compact.ts';
test('direct colours retain all nine exact anchors without interpolation',()=>{
 assert.deepEqual(DIRECT_COLORS,['#C2185B','#884499','#4A53A8','#0277BD','#0097A7','#00897B','#43A047','#7CB342','#9E9D24']);
 for(const n of [0,1,3,9,13,32]){assert.deepEqual(directPalette(n).slice(0,9),DIRECT_COLORS.slice(0,n));assert.equal(new Set(directPalette(n)).size,n);}
});
test('blocks inherit actual direct positions and distinguish beige paint from its outline',()=>{
 const c={weights:{A:[1,13,169],B:[1,13,169]},planes:{A:[[1,0,0],[0,1,0],[0,0,1],[1,1,0]],B:[[1,0,0],[0,1,0],[0,0,1],[1,1,0]]},products:[{a:0,b:1,numerator:13},{a:1,b:0,numerator:13},{a:2,b:2,numerator:28561},{a:3,b:3,numerator:1}]} as Construction;
 assert.equal(blockPosition(c,3),1);assert.equal(coefficientColor(c,3),'#A0825E');assert.equal(productBaseColor(c,3),'#CCAA88');
 // Adding a smaller nearby direct position changes the block's anchor; no block-count renumbering.
 const changed={...c,products:[{a:0,b:0,numerator:1},...c.products]};
 assert.equal(blockPosition(changed,4),0);assert.equal(coefficientColor(changed,4),'#E8710A');
});
test('position colours survive all display permutations',()=>{
 for(const prefix of ['00','37']){
  const records=JSON.parse(readFileSync(new URL(`../../data/solutions/${prefix}.json`,import.meta.url),'utf8'));
  const raw=records.find((r:any)=>prefix==='00'?r.id==='awe1_002b0cddfc3729fdb06a905e402dc9c2e9b5be0d8c4222c10571bc9a5cacc3bb':r.id==='awe1_37e282e92ef5d7e7761ae3304ed06bc8e91ce78a9436d239851ebc3b0b2a9a07');
  const c=fromInteger(raw),order=orderedPlaneProducts(c),colors=c.products.map((_,i)=>coefficientColor(c,i)),fills=c.products.map((_,i)=>productBaseColor(c,i));
  for(const mode of ['weight','block','stored'] as const){const view=orderedConstruction(c,mode);assert.deepEqual(orderedPlaneProducts(view),order);assert.deepEqual(view.products.map((_,i)=>coefficientColor(view,i)),colors);assert.deepEqual(view.products.map((_,i)=>productBaseColor(view,i)),fills);const points=new Map(c.weights.A.flatMap((a,i)=>c.weights.B.map((b,j)=>[`${a}:${b}`,directColor(c,i,j)] as const)));view.weights.A.forEach((a,i)=>view.weights.B.forEach((b,j)=>assert.equal(directColor(view,i,j),points.get(`${a}:${b}`))));}
 }
});
