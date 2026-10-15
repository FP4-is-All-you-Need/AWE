import test from 'node:test';
import assert from 'node:assert/strict';
import {base13Carry,digitsValue,STORED_DIGITS,SIGNED_STORED_DIGITS,base13Alternatives,transfersTo,base13Greedy} from '../src/base13Carry.ts';
test('source 1000 carry is 12,-2,6 rather than nearest-residue encoding',()=>{
 const c=base13Carry(1000n);assert.deepEqual(c.raw,[12,11,5]);assert.deepEqual(c.digits,[12,-2,6]);assert.equal(c.events.length,1);assert.equal(c.events[0].exponent,1);assert.equal(c.events[0].upperBefore,5);
});
test('all small integers and arbitrary large signs preserve every carry identity',()=>{
 for(const n of [...Array.from({length:6001},(_,i)=>BigInt(i-3000)),2n**64n-1n,-(13n**50n+1000n)]){
 const c=base13Carry(n);assert.equal(digitsValue(c.raw)*BigInt(c.sign),n);assert.equal(digitsValue(c.digits)*BigInt(c.sign),n);assert.ok(c.digits.every(d=>STORED_DIGITS.has(Math.abs(d))));
 for(const e of c.events){assert.equal(digitsValue(e.before),digitsValue(e.after));assert.equal(e.digit,13+(e.after[e.exponent]));}
 }
});

test('fixed radix13 alternatives equal a full Cartesian enumeration',()=>{
 const values=new Map<bigint,number[][]>();
 for(const a of SIGNED_STORED_DIGITS)for(const b of SIGNED_STORED_DIGITS)for(const c of SIGNED_STORED_DIGITS){const tuple=[a,b,c],n=digitsValue(tuple);values.set(n,[...values.get(n)??[],tuple]);}
 for(const n of [-2197n,-2000n,-500n,0n,5n,127n,845n,1000n,2000n,2196n]){
  const rows=base13Alternatives(n,3);assert.deepEqual(rows,values.get(n)??[]);
  for(const target of rows){const events=transfersTo(n,target);for(const e of events){assert.equal(digitsValue(e.before),n);assert.equal(digitsValue(e.after),n);assert.equal(e.after[e.exponent]-e.before[e.exponent],-13*e.amount);assert.equal(e.after[e.exponent+1]-(e.before[e.exponent+1]??0),e.amount);}}
 }
 assert.ok(base13Alternatives(1000n,3).length>1);assert.ok(base13Alternatives(1000n,4).length>base13Alternatives(1000n,3).length);
});
test('a leading carry remains an explicit additional limb with either sign',()=>{
 for(const n of [845n,-845n,1690n,-1690n]){const c=base13Carry(n),target=c.digits.map(d=>d*c.sign),events=transfersTo(n,target);assert.ok(events.some(e=>e.exponent===2));assert.equal(digitsValue(target),n);}
});

test('preceding-paper greedy rule differs from the figure and preserves inputs',()=>{
 assert.deepEqual(base13Greedy(1000n),[-1,-1,6]);
 for(let i=-3000;i<=3000;i++){const t=base13Greedy(BigInt(i));assert.equal(digitsValue(t),BigInt(i));assert.ok(t.every(v=>Math.abs(v)<=8&&SIGNED_STORED_DIGITS.includes(v)));}
});
