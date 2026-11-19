import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {heldOn,usableOn} from '../src/modularForms.ts';
import {FORMAT_SETS,VALUE_SET_LABEL,pageFormat} from '../src/valueSets.ts';

/** The values of a format in units of its smallest subnormal; E4M3 has no infinities and one NaN pattern per sign. */
function values(ebits:number,mbits:number,nanTop=false){
 const out=new Set<number>([0]);
 for(let e=0;e<2**ebits;e++)for(let m=0;m<2**mbits;m++){
  if(nanTop&&e===2**ebits-1&&m===2**mbits-1)continue;
  const v=e===0?m:(2**mbits+m)*2**(e-1);
  if(v){out.add(v);out.add(-v);}
 }
 return out;
}
const SETS:Record<string,Set<number>>={'2xE2M1':values(2,1),'8xE2M3':values(2,3),'16xE3M2':values(3,2),'512xE4M3':values(4,3,true)};
const subset=(a:Set<number>,b:Set<number>)=>[...a].every(v=>b.has(v));
// The site reads the inclusion from the data files, as these tests do.
const INC=JSON.parse(readFileSync(new URL('../../data/modular/forms-index.json',import.meta.url),'utf8')).value_set_inclusion;

test('value sets are the scaled format values',()=>{
 assert.deepEqual(Object.fromEntries(Object.entries(SETS).map(([k,s])=>[k,s.size])),{'2xE2M1':15,'8xE2M3':63,'16xE3M2':63,'512xE4M3':253});
 assert.equal(Math.max(...SETS['512xE4M3']),448*512);
 assert.deepEqual(Object.values(FORMAT_SETS).flat().sort(),Object.keys(SETS).sort());
 for(const vs of Object.keys(SETS))assert.ok(VALUE_SET_LABEL[vs]);
});

test('the data lists exactly the integer inclusions between value sets',()=>{
 for(const a of Object.keys(SETS))for(const b of Object.keys(SETS)){
  if(a===b)continue;
  assert.equal(usableOn(a,b,INC),subset(SETS[a],SETS[b]),`${a} in ${b}`);
 }
});

test('a value set holds the constructions of every value set it contains',()=>{
 assert.deepEqual([...heldOn('8xE2M3',INC)].sort(),['2xE2M1','8xE2M3']);
 assert.deepEqual([...heldOn('16xE3M2',INC)].sort(),['16xE3M2','2xE2M1']);
 assert.deepEqual(heldOn('2xE2M1',INC),['2xE2M1']);
 assert.deepEqual([...heldOn('512xE4M3',INC)].sort(),Object.keys(SETS).sort());
 assert.equal(pageFormat('fp8'),'fp8');assert.equal(pageFormat('fp5'),'fp4');assert.equal(pageFormat(null),'fp4');
});
