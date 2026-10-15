import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fromInteger,type Construction} from '../src/visual.ts';
import {orderedConstruction} from '../src/limbOrder.ts';
import {measurePlaneDistribution,setTex} from '../src/planeDistribution.ts';
const read=(name:string)=>JSON.parse(readFileSync(new URL('../../data/'+name,import.meta.url),'utf8'));
const c=fromInteger(read('solutions/16.json').find((s:any)=>s.id.endsWith('e4136')));
test('all 169 integers give exact plane sets and frequencies, distinct from storage set',()=>{
 const r=measurePlaneDistribution(c,'A');assert.ok(r.complete);assert.equal(Object.keys(r.chosen).length,169);assert.deepEqual(r.holes,[]);
 assert.deepEqual(r.planes.map(p=>p.extra),[[-8],[6],[],[12],[12]]);
 for(const p of r.planes)assert.equal(Object.values(p.histogram).reduce((a,b)=>a+b,0),169);
 assert.deepEqual(r.planes[0].values,[-6,-4,-3,-2,-1,0,1,2,3,4,6,8]);
 assert.equal(setTex([0,-2,-1,1,2]),'\\{0\\}\\cup \\pm\\{1,2\\}');assert.equal(setTex([-2,0,1]),'\\{-2,0,1\\}');
});
test('alternative witnesses preserve the integer and list every affected plane; override changes the measured distribution',()=>{
 const r=measurePlaneDistribution(c,'A');
 for(const p of r.planes)for(const w of p.witnesses){assert.equal(w.delta.reduce((n,v,i)=>n+v*c.weights.A[i],0),0);assert.equal(w.tuple.reduce((n,v,i)=>n+v*c.weights.A[i],0),w.input);for(const change of w.changes){const plane=c.planes!.A[change.plane];assert.equal(plane.reduce((n,v,i)=>n+v*w.delta[i],0),change.to-change.from);}}
 const w=r.planes[0].witnesses[0],changed=measurePlaneDistribution(c,'A',{input:w.input,tuple:w.tuple});assert.ok(changed.planes[0].values.includes(-8));assert.equal(changed.planes[0].histogram['-8'],1);
 const invalid=measurePlaneDistribution(c,'A',{input:0,tuple:[99,99,99]});assert.deepEqual(invalid.chosen,r.chosen);
});
test('limb display order does not change the verifier encoding policy or distributions',()=>{
 const shuffled={...c,weights:{A:[28,9,15],B:[28,9,15]},planes:{A:c.planes!.A.map(p=>[p[2],p[0],p[1]]),B:c.planes!.B.map(p=>[p[2],p[0],p[1]])},display_indices:{A:[2,0,1],B:[2,0,1]}};
 const summary=(v:Construction)=>measurePlaneDistribution(v,'A').planes.map(({values,histogram,extra})=>({values,histogram,extra}));assert.deepEqual(summary(shuffled),summary(orderedConstruction(shuffled,'weight')));
});
test('saved six-product encoding has a three-times plane and retains its actual LUT choices',()=>{
 const r=read('visualization/joint-examples.json').references.find((r:any)=>r.weights.join(',')==='1,5,27');
 const c={id:'joint_'+r.id,modulus:0,weights:{A:r.weights,B:r.weights},planes:{A:r.planes,B:r.planes},saved_encoding:{A:r.encoding,B:r.encoding},encoding_domain:r.domain} as Construction;
 const d=measurePlaneDistribution(c,'A');assert.ok(d.complete);assert.equal(Object.keys(d.chosen).length,230);assert.equal(d.holes.length,26);assert.deepEqual(d.chosen,r.encoding);assert.deepEqual(d.planes[2].values,[-12,-6,-3,0,3,6,12]);assert.deepEqual(d.planes[5].extra,[-12,-8,8,12]);
});
test('paper INT8 six products measure all 265 inputs; unavailable domains are not empty measured sets',()=>{
 const paper=fromInteger(read('solutions/d3.json').find((s:any)=>s.id==='awe1_d323a4454c50d58cb90ee4d3d062025fe616b2f994dfb6d7d579615c4858161d'));
 const r=measurePlaneDistribution(paper,'A');assert.ok(r.complete);assert.equal(Object.keys(r.chosen).length,265);assert.deepEqual(r.planes.map(p=>p.extra),[[-6],[12],[12],[12],[8,12],[8,12]]);
 const bad=measurePlaneDistribution({...paper,integer:undefined,encoding_domain:[3,1]},'A');assert.equal(bad.complete,false);assert.equal(bad.reason,'limit_or_unknown');
});
