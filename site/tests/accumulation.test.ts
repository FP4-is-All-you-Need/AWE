import test from 'node:test';
import assert from 'node:assert/strict';
import {accumulable} from '../src/accumulation.ts';
import {componentComparison,DEFAULT_COEFFICIENTS,groupRows,pick,type PolarRow} from '../src/polarModel.ts';
import {formCells,fp4Fewest,type PrimeForm} from '../src/primeTable.ts';
import type {Construction} from '../src/visual.ts';

const row=(id:string,m:number,R:number,maxK:number|null):PolarRow=>({id,m,vs:'2xE2M1',R,FA:2,FB:2,hA:0,hB:0,exact:true,weights:{A:[1,2],B:[1,2]},maxK,model:null,origin:null,inCatalog:true,source:''});
const saved=(id:string,m:number,R:number,maxK:number|null):Construction=>({id,modulus:m,weights:{A:[1,2],B:[1,2]},planes:null,products:Array.from({length:R},()=>({a:0,b:0,group:null,numerator:null})),denominator:1,shape:'saved',faces_a:2,faces_b:2,holes:{count:0,share:0},carry:false,block_shift:false,source_sha256:'',max_k:maxK});

test('max_k of at least 2, or unknown, counts; 0 and 1 do not',()=>{
 assert.deepEqual([null,undefined,2,8192,1,0].map(accumulable),[true,true,true,true,false,false]);
});

test('the spiral and the composite table count only rows that can be accumulated',()=>{
 const rows=[row('one',6,2,1),row('free',6,3,null),row('p',2,1,1),row('q',3,1,8192)];
 assert.equal(pick(rows.filter(r=>r.m===6),DEFAULT_COEFFICIENTS,'products')?.id,'free');
 assert.equal(pick([row('one',6,2,1)],DEFAULT_COEFFICIENTS,'products'),undefined);
 const c=componentComparison(6,groupRows(rows),DEFAULT_COEFFICIENTS);
 assert.equal(c.best?.R,3);assert.equal(c.sum,null);
});

test('the periodic table compares only with saved constructions that can be accumulated',()=>{
 const constructions=[saved('one',7,2,1),saved('four',7,4,null)];
 assert.equal(fp4Fewest(constructions,[]).get(7),4);
 const form:PrimeForm={modulus:7,prime:7,exponent:1,value_set:'2xE2M1',kind:'hole_free',products:3,planes:[2,2],id:'example'};
 assert.equal(formCells([form],'fp4',['2xE2M1'],false,new Map([[7,constructions]])).get(7)!.fewer,true);
});
