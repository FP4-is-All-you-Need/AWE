import test from 'node:test';
import assert from 'node:assert/strict';
import {angularProfile,angularWidth,powerInterval,turnInterval,modulusRibbonCell,RIBBON_DEFAULTS,TAU} from '../src/ribbonGeometry.ts';
import {constructionTier} from '../src/constructionTier.ts';
import {productBand,ribbonTier} from '../src/ribbonColors.ts';
import type {PolarRow} from '../src/polarModel.ts';
const near=(a:number,b:number)=>assert(Math.abs(a-b)<1e-9*Math.max(1,Math.abs(a),Math.abs(b)),`${a} != ${b}`);
test('all supported bases: positive widths, exact full turns, continuous boundaries',()=>{
 for(const base of Array.from({length:31},(_,i)=>i+2))for(const arc of ['arith','geom'] as const){
 const p={...RIBBON_DEFAULTS,spacing:'powers' as const,base,arc};for(let k=base===2?1:0;base**k<=65536;k++){
 const {lower,count}=powerInterval(k,base),a=angularProfile(k,p),next=angularProfile(k+1,p);
 assert(a.start>a.end&&a.end>0);near(a.end,next.start);
 near(count*(arc==='arith'?(a.start+a.end)/2:(a.start-a.end)/Math.log(a.start/a.end)),TAU);
 const m=lower+count,ms=[lower,m-1,m],first=modulusRibbonCell(lower,ms,p)!,last=modulusRibbonCell(m-1,ms,p)!,after=modulusRibbonCell(m,ms,p)!;
 near(first.angleStart,k*TAU);near(last.angleEnd,(k+1)*TAU);near(last.angleEnd,after.angleStart);near(last.innerEnd,after.innerStart);near(last.outerEnd,after.outerStart);
 for(const u of [.1,.3,.7,.9]){const x=lower+count*u;const w=angularWidth(x,p);assert(w>0);if(arc==='arith')near(w,a.start+(a.end-a.start)*u);else near(w,a.start*(a.end/a.start)**u);}
 }
 }
});
test('catalogue gaps never pack positions; adjacent cells share endpoints',()=>{
 for(const arc of ['arith','geom'] as const){const p={...RIBBON_DEFAULTS,arc};for(const m of [4,8,9,10,13,169,2197]){
 const a=modulusRibbonCell(m,[m],p)!,b=modulusRibbonCell(m,[2,m,m+1],p)!,next=modulusRibbonCell(m+1,[m+1],p)!;near(a.angleStart,b.angleStart);near(a.angleEnd,next.angleStart);near(a.innerEnd,next.innerStart);near(a.outerEnd,next.outerStart);
 }}
});
test('ribbon tiers reuse candidate precedence and never infer exact coverage from a bound',()=>{
 assert.equal(constructionTier(1,null,true,1),'率未測定');assert.equal(constructionTier(1,0,true,1),'穴・補正あり');assert.equal(constructionTier(1,0,false,1),'積数最少');assert.equal(constructionTier(2,0,false,1),'穴なし');
 assert.equal(ribbonTier({R:1,hA:0,hB:0,exact:false} as PolarRow,1),'率未測定');
 for(let r=1;r<=30;r++){const band=productBand(r);assert(r<=band.max);assert.notEqual(band.color,undefined);}
});

test('linear turn counts and smooth interpolation for every supported base',()=>{
 for(let base=2;base<=32;base++)for(const arc of ['arith','geom'] as const){const p={...RIBBON_DEFAULTS,base,arc};
  for(let k=0;turnInterval(k,p).lower<=65536;k++){
   const {lower,count}=turnInterval(k,p),a=angularProfile(k,p),b=angularProfile(k+1,p);
   assert.equal(count,base*(k+1));assert.equal(lower,2+base*k*(k+1)/2);assert(a.start>a.end&&a.end>0);near(a.end,b.start);
   near(count*(arc==='arith'?(a.start+a.end)/2:(a.start-a.end)/Math.log(a.start/a.end)),TAU);
   const ms=[lower,lower+count-1,lower+count],first=modulusRibbonCell(lower,ms,p)!,last=modulusRibbonCell(lower+count-1,ms,p)!,next=modulusRibbonCell(lower+count,ms,p)!;
   near(first.angleStart,k*TAU);near(last.angleEnd,(k+1)*TAU);near(last.innerEnd,next.innerStart);near(last.outerEnd,next.outerStart);
  }
 }
});
