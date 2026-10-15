import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fromInteger,fromCanonical} from '../src/visual.ts';
import {coefficientColor,productFillColor,textInk,contrastRatio,miniWeightStyle,luminance} from '../src/compact.ts';
const read=(file:string)=>JSON.parse(readFileSync(new URL('../../data/'+file,import.meta.url),'utf8'));
test('five mixed products receive five distinct readable term colours',()=>{
 const c=fromInteger(read('solutions/16.json').find((r:any)=>r.id==='awe1_1656e4b7feacd47cbaa916a1ab39ffcdaf195a7de5d6093418e13e4d0c5e4136'));
 assert.deepEqual(c.weights.A,[9,15,28]);assert.equal(c.products.length,5);
 const strokes=c.products.map((_,i)=>coefficientColor(c,i));
 assert.equal(new Set(strokes).size,5);assert.equal(new Set(strokes.map(s=>textInk(s))).size,5);
 strokes.forEach((s,i)=>assert.ok(contrastRatio(textInk(s),productFillColor(c,i))>=4.5));
});
test('power miniature weights have distinct inks with readable pale backgrounds',()=>{
 for(const modulus of [125,343,512,729,1331,2197]){
  const raw=read('modular/powers.json').solutions.find((r:any)=>r.modulus===modulus||r.p===modulus);
  assert.ok(raw,`mod ${modulus}`);const c=fromCanonical(raw);
  const styles=c.weights.A.map((_,i)=>miniWeightStyle(c,'A',i));
  assert.equal(new Set(styles.map(s=>s.ink)).size,new Set(c.weights.A).size);
  styles.forEach(s=>assert.ok(contrastRatio(s.ink,s.background)>=4.5));
  if(modulus===1331){const eleven=styles[c.weights.A.indexOf(11)];assert.ok(luminance(eleven.ink)>luminance('#8E24AA'));}
 }
});
