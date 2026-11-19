import assert from 'node:assert/strict';
import test from 'node:test';
import {VALUE_SET_INCLUSION,heldOn,usableOn} from '../src/modularForms.ts';

/** The values of a format in units of its smallest subnormal. */
function values(ebits:number,mbits:number){
 const out=new Set<number>([0]);
 for(let e=0;e<2**ebits;e++)for(let m=0;m<2**mbits;m++){
  const v=e===0?m:(2**mbits+m)*2**(e-1);
  if(v){out.add(v);out.add(-v);}
 }
 return out;
}
const SETS:Record<string,Set<number>>={'2xE2M1':values(2,1),'8xE2M3':values(2,3),'16xE3M2':values(3,2)};
const subset=(a:Set<number>,b:Set<number>)=>[...a].every(v=>b.has(v));

test('value sets are the scaled format values',()=>{
 assert.deepEqual(Object.fromEntries(Object.entries(SETS).map(([k,s])=>[k,s.size])),{'2xE2M1':15,'8xE2M3':63,'16xE3M2':63});
});

test('the inclusion map lists exactly the integer inclusions between value sets',()=>{
 for(const a of Object.keys(SETS))for(const b of Object.keys(SETS)){
  if(a===b)continue;
  assert.equal(usableOn(a,b),subset(SETS[a],SETS[b]),`${a} in ${b}`);
 }
 for(const [small,bigs] of Object.entries(VALUE_SET_INCLUSION))for(const big of bigs)if(SETS[big])assert.ok(subset(SETS[small],SETS[big]));
});

test('a value set holds the constructions of every value set it contains',()=>{
 assert.deepEqual(heldOn('8xE2M3'),['8xE2M3','2xE2M1']);
 assert.deepEqual(heldOn('16xE3M2'),['16xE3M2','2xE2M1']);
 assert.deepEqual(heldOn('2xE2M1'),['2xE2M1']);
});
