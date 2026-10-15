import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {base13Spec,planeOnlySpec,enumerateRepresentations,representationSpec} from '../src/representations.ts';
import {FP4_VALUES} from '../src/encoding.ts';
import {fromCanonical,fromInteger} from '../src/visual.ts';
import {orderedConstruction} from '../src/limbOrder.ts';
const read=(file:string)=>JSON.parse(readFileSync(new URL('../../data/'+file,import.meta.url),'utf8'));
test('fixed base13 enumeration contains every tuple and every saved table choice',()=>{
 const spec=base13Spec([1,13,169]),r=enumerateRepresentations(spec);assert.equal(r.complete,true);assert.equal(r.combinations,3375);assert.equal(r.accepted,3375);
 const independent:Record<string,number[][]>={};for(const a of FP4_VALUES)for(const b of FP4_VALUES)for(const c of FP4_VALUES)(independent[a+13*b+169*c]??=[]).push([a,b,c]);
 assert.deepEqual({...r.values},independent);
 for(const t of read('visualization/encoding-examples.json').tables)for(const [n,tuple] of Object.entries(t.values))assert.ok(r.values[n].some(row=>JSON.stringify(row)===JSON.stringify(tuple)));
 assert.ok(r.values['12'].length>1);assert.equal(r.values['3000'],undefined);
});
test('all canonical modular LUT choices occur in exact residue enumeration on both sides',()=>{
 for(const s of read('modular/catalog.json').solutions)for(const side of ['A','B'] as const){const c=fromCanonical(s),r=enumerateRepresentations(representationSpec(c,side));assert.equal(r.complete,true);assert.equal(Object.keys(r.values).length,s.modulus);
 s.encoding[side].forEach((tuple:number[],n:number)=>assert.ok(r.values[n].some(row=>row.join()===tuple.join()),`${s.id} ${side} ${n}`));}
});
test('joint plane constraints retain actual holes including plus/minus103 and triple restrictions',()=>{
 const source=read('visualization/joint-examples.json');for(const r of source.references){
 const result=enumerateRepresentations(planeOnlySpec(r.weights,r.planes,r.planes.map(()=>FP4_VALUES)));assert.equal(result.complete,true);
 for(const h of r.holes)assert.equal(result.values[h],undefined);
 assert.equal(Object.keys(result.values).filter(n=>Number(n)>=-128&&Number(n)<=127).length,256-r.holes.length);
 if(r.id==='447479c194ae7d5efcc1'){
  const tuples:number[][]=[];for(const a of FP4_VALUES)for(let b=-24;b<=24;b++)for(const c of FP4_VALUES)if(r.planes.every((p:number[])=>FP4_VALUES.includes(p[0]*a+p[1]*b+p[2]*c)))tuples.push([a,b,c]);
  assert.equal(tuples.length,779);assert.deepEqual(Object.values(result.values).flat().map(t=>t.join()).sort(),tuples.map(t=>t.join()).sort());
 }
 for(const [value,tuple] of Object.entries(r.encoding))assert.ok(result.values[value].some(row=>row.join()===(tuple as number[]).join()));
 }
});
test('four-limb enumeration is invariant under display permutation and leaves canonical data unchanged',()=>{
 const s=read('solutions/37.json').find((s:any)=>s.id==='awe1_37e282e92ef5d7e7761ae3304ed06bc8e91ce78a9436d239851ebc3b0b2a9a07'),before=JSON.stringify(s),c=fromInteger(s);
 const r=enumerateRepresentations(representationSpec(c,'A')),sorted=enumerateRepresentations(representationSpec(orderedConstruction(c,'block'),'A'));
 assert.equal(r.combinations,50625);assert.equal(r.complete,true);assert.deepEqual(Object.fromEntries(Object.entries(r.values).map(([k,v])=>[k,v.length])),Object.fromEntries(Object.entries(sorted.values).map(([k,v])=>[k,v.length])));assert.equal(JSON.stringify(s),before);
});
test('unknown or excessive storage domains are uncomputed rather than holes',()=>{
 assert.equal(enumerateRepresentations(null).reason,'unknown');const large=enumerateRepresentations(base13Spec([1,13,169,2197,28561]));assert.equal(large.complete,false);assert.equal(large.reason,'limit');assert.equal(large.accepted,0);
});
