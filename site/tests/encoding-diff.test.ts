import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fromInteger,fromCanonical} from '../src/visual.ts';
import {measurePlaneDistribution} from '../src/planeDistribution.ts';
import {encodingDiff,parseExclusions} from '../src/encodingDiff.ts';
const c=fromInteger(JSON.parse(fs.readFileSync(new URL('../../data/solutions/16.json',import.meta.url),'utf8')).find((s:any)=>s.id.endsWith('e4136')));
const base=measurePlaneDistribution(c,'A');
test('removing a plane value re-encodes the whole covered domain with coupled plane changes',()=>{
 const initial=encodingDiff(c,'A',base,[]);assert.ok(initial.diff.removable.length);
 for(const remove of initial.diff.removable){
  const {result,diff}=encodingDiff(c,'A',base,[remove]);assert.equal(diff.blocked,false);assert.ok(!result.planes[remove.plane].values.includes(remove.value));
  assert.deepEqual(Object.keys(result.chosen),Object.keys(base.chosen));
  for(const [n,t] of Object.entries(result.chosen)){assert.equal(t.reduce((s,v,i)=>s+v*c.weights.A[i],0),Number(n));assert.ok(base.alternatives[n].some(a=>a.join()===t.join()));}
  result.planes.forEach((p,i)=>{const hist:Record<string,number>={};for(const t of Object.values(result.chosen)){const v=c.planes!.A[i].reduce((s,k,j)=>s+k*t[j],0);hist[v]=(hist[v]??0)+1;}assert.deepEqual(p.histogram,hist);});
 }

});
test('incompatible exclusions retain the encoding and report that the value cannot be removed',()=>{
 const {result,diff}=encodingDiff(c,'A',base,base.planes[0].values.map(value=>({plane:0,value})));assert.ok(diff.blocked);assert.equal(result,base);
 assert.deepEqual(parseExclusions('0:8,0:8,bad,2:-6'),[{plane:0,value:8},{plane:2,value:-6}]);
});

test('mod 79 shows the values gained on other planes when a value is removed',()=>{
 const c=fromCanonical(JSON.parse(fs.readFileSync(new URL('../../data/modular/catalog.json',import.meta.url),'utf8')).solutions.find((s:any)=>s.id.startsWith('awem1_005e636')));
 const base=measurePlaneDistribution(c,'A'),{result,diff}=encodingDiff(c,'A',base,[{plane:0,value:-3}]);
 assert.equal(diff.blocked,false);assert.ok(!result.planes[0].values.includes(-3));assert.ok(result.planes.slice(1).some((p,j)=>p.values.some(v=>!base.planes[j+1].values.includes(v))));
});
