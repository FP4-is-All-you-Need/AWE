import assert from 'node:assert/strict';
import test from 'node:test';
import {productCoverage} from '../src/coverage.ts';
import type {Construction} from '../src/visual.ts';

// Weights (1, 29, 37): P_ii = a_i b_i, then P_01, P_02, P_12 = (a_i + a_j)(b_i + b_j), as in the paper's coverage figure.
const planes=[[1,0,0],[0,1,0],[0,0,1],[1,1,0],[1,0,1],[0,1,1]];
const c={id:'test',modulus:0,weights:{A:[1,29,37],B:[1,29,37]},planes:{A:planes,B:planes},products:planes.map((_,t)=>({a:t,b:t,group:null,numerator:null})),denominator:1,shape:'published',faces_a:6,faces_b:6,holes:{count:0,share:0},carry:false,block_shift:false,source_sha256:''} as Construction;
test('each product keeps the terms no product with fewer terms contains, with the scales of those terms',()=>{
 const cover=productCoverage(c);
 assert.deepEqual(cover[0].kept,[[0,0]]);assert.deepEqual(cover[0].scales,['1×1']);
 assert.deepEqual(cover[3].terms,[[0,0],[0,1],[1,0],[1,1]]);
 assert.deepEqual(cover[3].kept,[[0,1],[1,0]]);assert.deepEqual(cover[3].scales,['1×29']);
 assert.deepEqual(cover[4].kept,[[0,2],[2,0]]);assert.deepEqual(cover[4].scales,['1×37']);
 assert.deepEqual(cover[5].kept,[[1,2],[2,1]]);assert.deepEqual(cover[5].scales,['29×37']);
 assert.deepEqual(productCoverage({...c,planes:null}),[]);
});
