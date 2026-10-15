import test from 'node:test';
import assert from 'node:assert/strict';
import {inputReducer,readInputs,writeInputs,selectedMapCell,mapAction} from '../src/InputSelection.ts';

test('input URL uses b as its authority and rewrites conflicting width and format fields',()=>{
 const state=readInputs(new URLSearchParams('b=24&precision=fp64&input_ma=54&input_mb=54&same_inputs=1&b_b=7'));
 assert.equal(state.a,24);assert.equal(state.b,24);assert.equal(state.precisionA,'fp32');assert.equal(state.precisionB,'fp32');
 assert.deepEqual(selectedMapCell(state),[24,24]);
 const q=new URLSearchParams();writeInputs(q,state);assert.equal(q.get('input_ma'),'25');assert.equal(q.get('input_mb'),'25');assert.deepEqual(readInputs(q),state);
});
test('upper CRT selection retains the same width pair when switching to AWE, and equal inputs share precision',()=>{
 const initial=readInputs(new URLSearchParams());const crt=inputReducer(initial,mapAction(24,9));
 assert.equal(crt.a,8);assert.equal(crt.b,24);assert.equal(crt.precisionA,'bf16');assert.equal(crt.precisionB,'fp32');assert.equal(crt.same,false);assert.deepEqual(selectedMapCell(crt),[24,9]);
 const awe=inputReducer(crt,mapAction(9,24));assert.equal(awe.a,crt.a);assert.equal(awe.b,crt.b);assert.deepEqual(selectedMapCell(awe),[9,24]);
 const equal=inputReducer(awe,{type:'same',value:true});assert.equal(equal.b,8);assert.equal(equal.precisionB,'bf16');assert.deepEqual(selectedMapCell(equal),[9,9]);
});

test('a precision-only URL selects its default bit count and figure reference',()=>{
 const s=readInputs(new URLSearchParams('precision=fp32'));assert.equal(s.a,24);assert.equal(s.precisionA,'fp32');assert.deepEqual(selectedMapCell(s),[24,24]);
});

test('explicit crt URL overrides map_method and an empty URL defaults to CRT',()=>{
 assert.equal(readInputs(new URLSearchParams()).method,'crt');
 assert.equal(readInputs(new URLSearchParams('crt=0&map_method=crt')).method,'awe');
 assert.equal(readInputs(new URLSearchParams('crt=1&map_method=awe')).method,'crt');
 assert.equal(readInputs(new URLSearchParams('map_method=awe')).method,'crt');
});

test('method toggle preserves widths and updates the selected triangle and URL together',()=>{
 const initial=inputReducer(readInputs(new URLSearchParams()),mapAction(24,9));
 for(const method of ['awe','crt'] as const){
  const next=inputReducer(initial,{type:'method',value:method});
  assert.equal(next.a,initial.a);assert.equal(next.b,initial.b);assert.equal(next.showResults,true);
  assert.deepEqual(selectedMapCell(next),method==='awe'?[9,24]:[24,9]);
  const q=new URLSearchParams();writeInputs(q,next);
  assert.equal(q.get('crt'),method==='awe'?'0':'1');assert.deepEqual(readInputs(q),next);
 }
});
