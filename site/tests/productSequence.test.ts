import {test} from 'node:test';
import assert from 'node:assert/strict';
import {productSequence} from '../src/productSequence.ts';
test('product labels list one and two terms and shorten only longer sequences',()=>{
 assert.equal(productSequence(1),'T_{0}');
 assert.equal(productSequence(2),'T_{0}, T_{1}');
 assert.equal(productSequence(3),'T_{0},\\ldots,T_{2}');
 assert.equal(productSequence(12),'T_{0},\\ldots,T_{11}');
 assert.equal(productSequence(0),'');
});
