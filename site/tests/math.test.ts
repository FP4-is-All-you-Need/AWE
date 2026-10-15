import assert from 'node:assert/strict';
import test from 'node:test';
import {contribution, fraction, identity} from '../src/math.ts';
import type {Solution} from '../src/types.ts';

function sixProducts(): Solution {
 const planes=[[1,0,0],[0,1,0],[0,0,1],[1,1,0],[1,0,1],[0,1,1]];
 return {weights:{A:[1,29,37],B:[1,29,37]},planes:{A:planes,B:planes},denominator:1,
  products:[-65,-261,259,29,37,1073].map((numerator,i)=>({a:i,b:i,numerator}))} as Solution;
}
test('six products reconstruct every weighted tile cell',()=>{
 const s=sixProducts();
 const target=[[1n,29n,37n],[29n,841n,1073n],[37n,1073n,1369n]];
 for(let i=0;i<3;i++)for(let j=0;j<3;j++){
  const sum=s.products.reduce((total,_,k)=>total+contribution(s,k,i,j),0n);
  assert.equal(sum,target[i][j]);
 }
 assert.deepEqual(s.products.map((_,k)=>contribution(s,k,0,0)),[-65n,0n,0n,29n,37n,0n]);
 assert.deepEqual(s.products.map((_,k)=>contribution(s,k,1,2)),[0n,0n,0n,0n,0n,1073n]);
 assert.equal(identity(s),true);
 s.products[0].numerator++;
 assert.equal(identity(s),false);
});
test('identity keeps integer precision beyond floating point accumulation',()=>{
 const s={weights:{A:[9007199254740991],B:[2]},planes:{A:[[1]],B:[[2]]},
  denominator:1,products:[{a:0,b:0,numerator:9007199254740991}]} as Solution;
 assert.equal(contribution(s,0,0,0),18014398509481982n);
 assert.equal(identity(s),true);
 s.products[0].numerator--;
 assert.equal(identity(s),false);
 assert.equal(fraction(-130n,2n),'-65');
 assert.equal(fraction(58n,6n),'29/3');
 assert.equal(fraction(0n,7n),'0');
});
