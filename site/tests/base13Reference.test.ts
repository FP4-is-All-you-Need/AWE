import {test} from 'node:test';import assert from 'node:assert/strict';
import {base13Width,base13Products,base13ModProducts,withinReference} from '../src/base13Reference.ts';
test('paper base-13 width bounds and true residue coverage differ at modulus169',()=>{assert.deepEqual(base13Width(8),{limbs:3,radius:732n});assert.equal(base13Products(8,8),9);assert.equal(base13Products(12,12),16);for(const [p,r]of [[8,1],[13,1],[73,4],[169,4]])assert.equal(base13ModProducts(p),r);});
test('wider-range ceiling and explicit override',()=>{assert.equal(withinReference(10,9,false),false);assert.equal(withinReference(16,9,true),true);assert.equal(withinReference(17,9,true),false);assert.equal(withinReference(17,9,false,17),true);assert.equal(withinReference(25,36,true),true);});
