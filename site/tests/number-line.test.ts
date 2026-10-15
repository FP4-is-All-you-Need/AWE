import test from 'node:test';
import assert from 'node:assert/strict';
import {coverageInterval,densityBins,zoomInterval,type CountPoint} from '../src/numberLine.ts';
const points:CountPoint[]=[[-10n,1],[-9n,2],[-2n,1],[-1n,1],[0n,1],[1n,4],[2n,1],[4n,1],[5n,1],[6n,1]].map(([value,count])=>({value:BigInt(value),count:Number(count)}));
test('full range largest contiguous run and positive-only have exact independent bounds',()=>{
 assert.deepEqual(coverageInterval(points,'full',false),{left:-10n,right:6n});assert.deepEqual(coverageInterval(points,'contiguous',false),{left:-2n,right:2n});
 assert.deepEqual(coverageInterval(points,'contiguous',true),{left:4n,right:6n});assert.deepEqual(coverageInterval(points,'full',true),{left:1n,right:6n});assert.equal(coverageInterval([],'full',false),null);
});
test('binned count maximum mean and holes agree with direct per-integer sums',()=>{
 for(const pixels of [1,2,3,8,20]){const bins=densityBins(points,{left:-12n,right:8n},pixels);assert.equal(bins[0].left,-12n);assert.equal(bins.at(-1)!.right,8n);
 for(const b of bins){const counts:number[]=[];for(let n=b.left;n<=b.right;n++)counts.push(points.find(p=>p.value===n)?.count??0);assert.equal(b.maximum,Math.max(...counts));assert.equal(b.mean,counts.reduce((a,b)=>a+b,0)/counts.length);assert.equal(b.holes,BigInt(counts.filter(n=>!n).length));}
 }
});
test('very wide integer holes are counted without scanning or rounding exact endpoints',()=>{
 const n=10n**22n,b=densityBins([{value:n,count:2},{value:n+100n,count:3}],{left:n,right:n+1000n},2);
 assert.equal(b.reduce((s,b)=>s+b.holes,0n),999n);assert.equal(b[0].left,n);assert.equal(b[1].right,n+1000n);assert.equal(b[0].maximum,3);
 assert.deepEqual(zoomInterval({left:0n,right:99n},2),{left:25n,right:74n});
});
