import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PRIME_COLORS} from '../src/primeColors.ts';
import {textInk,whiteFill,contrastRatio} from '../src/compact.ts';
test('all primes through 65536 have distinct swatches and readable labels',()=>{
 assert.equal(PRIME_COLORS.size,6542);
 assert.equal(new Set(PRIME_COLORS.values()).size,6542);
 assert.deepEqual([2,3,5,7,11,13].map(p=>PRIME_COLORS.get(p)),
  ['#C2185B','#884499','#9E9D24','#0277BD','#E8710A','#43A047']);
 for(const color of PRIME_COLORS.values()){
  const background=whiteFill(color,.3);
  assert(contrastRatio(textInk(color,background),background)>=4.5);
 }
});
