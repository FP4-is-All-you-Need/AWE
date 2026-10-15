import assert from 'node:assert/strict';
import test from 'node:test';
import {eligible, filterRows} from '../src/catalog.ts';
import type {Filters, Group, Row} from '../src/types.ts';

const defaults:Filters={a:8,b:8,r:0,limbs:0,planes:0,denominator:0,minK:0,weight:'',mixed:true,costProduct:1,costPlane:0};
const row=(id:string,r:number,planes:number):Row=>[id,8,9,3,3,r,planes,planes,1,100,[1,29,37],[1,29,37],false];
test('cost changes ranking and ties are deterministic without mutating input',()=>{
 const rows=[row('c',4,6),row('b',6,2),row('a',6,2)];
 assert.deepEqual(filterRows(rows,defaults).map(x=>x[0]),['c','a','b']);
 assert.deepEqual(filterRows(rows,{...defaults,costPlane:1}).map(x=>x[0]),['a','b','c']);
 assert.deepEqual(rows.map(x=>x[0]),['c','b','a']);
});
test('all detailed constraints narrow the candidate set',()=>{
 const good=row('good',6,6);
 const cases: [string,number,unknown][]=[['widthA',1,7],['widthB',2,7],['limbsA',3,2],
  ['limbsB',4,2],['products',5,7],['planes',6,7],['denominator',8,2],['accumulation',9,99],
  ['mixed',12,true]];
 const rows:Row[]=[good];
 for(const [id,index,value] of cases){const bad=[...good] as Row;bad[0]=id;(bad as unknown[])[index]=value;rows.push(bad);}
 const weights=[...good] as Row;weights[0]='weights';weights[10]=[1,29];weights[11]=[1,29];rows.push(weights);
 assert.deepEqual(filterRows(rows,{...defaults,r:6,limbs:3,planes:12,denominator:1,minK:100,weight:'29, 37',mixed:false}).map(x=>x[0]),['good']);
 const unlimited=[...good] as Row;unlimited[0]='unlimited';unlimited[9]=null;
 assert.deepEqual(filterRows([unlimited],{...defaults,minK:100000}).map(x=>x[0]),['unlimited']);
});
test('group filtering admits wider groups but rejects mixed and excessive products',()=>{
 const group:Group={path:'search/example.json',sha256:'',count:1,width_a:9,width_b:8,r:6,mixed:false};
 assert.equal(eligible(group,{...defaults,r:6,mixed:false}),true);
 assert.equal(eligible({...group,width_b:7},defaults),false);
 assert.equal(eligible({...group,r:7},{...defaults,r:6}),false);
 assert.equal(eligible({...group,mixed:true},{...defaults,mixed:false}),false);
});
