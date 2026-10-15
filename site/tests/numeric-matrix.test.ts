import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {base13Plan,constructionPlan,computeMatrix,multiply,inverse,type Matrix} from '../src/numericExample.ts';
import {fromCanonical} from '../src/visual.ts';
import {scaledEntry,scaledEntries,scaledMatrixTex,FP4_SCALE_COLOR} from '../src/numericMatrix.ts';

const tables=JSON.parse(readFileSync(new URL('../../data/visualization/encoding-examples.json',import.meta.url),'utf8')).tables;
const modular=JSON.parse(readFileSync(new URL('../../data/modular/catalog.json',import.meta.url),'utf8')).solutions;
const quarters=(values:string[][]):Matrix=>values.map(row=>row.map(value=>BigInt(Number(value)*4)));

test('FP4 displays preserve signed halves and quarter products exactly',()=>{
 assert.equal(FP4_SCALE_COLOR,'#6B9E23');
 assert.equal(scaledEntry(-3n),'-1.5');assert.equal(scaledEntry(-1n,4n),'-0.25');
 assert.equal(scaledEntry(7n,4n),'1.75');assert.equal(scaledEntry(0n),'0');
 assert.equal(scaledMatrixTex([[1n,-3n]]),'\\begin{bmatrix}0.5&-1.5\\end{bmatrix}');
 const a=[[1n,2n,-3n],[4n,-5n,6n]],b=[[7n,-8n],[9n,10n],[-11n,12n]];
 const base=base13Plan(tables[0]);
 const plans=[...tables.map(base13Plan),{...base,denominator:2,products:base.products.map(p=>({...p,numerator:2*p.numerator}))},constructionPlan(fromCanonical(modular.find((s:any)=>s.modulus===73)))];
 for(const plan of plans){
  const result=computeMatrix(plan,a,b);
  for(const side of ['A','B'] as const){
   const limbs=side==='A'?result.la:result.lb,input=side==='A'?a:b;
   const displayed=limbs.map(matrix=>quarters(scaledEntries(matrix)));
   input.forEach((row,i)=>row.forEach((value,j)=>{
    const doubledSum=displayed.reduce((sum,m,k)=>sum+BigInt(plan.weights[side][k])*m[i][j],0n);
    // Display entries use quarters; the green source factor 2 divides this sum by 2.
    assert.equal(doubledSum%2n,0n);
    assert.equal(plan.modulus?(doubledSum/2n-value)%BigInt(plan.modulus):doubledSum/2n-value,0n);
   }));
  }
  plan.products.forEach((product,index)=>{
   const shownA=quarters(scaledEntries(result.fa[product.a])),shownB=quarters(scaledEntries(result.fb[product.b]));
   const shownProduct=multiply(shownA,shownB);
   const printedProduct=quarters(scaledEntries(result.products[index],4n));
   shownProduct.forEach((row,i)=>row.forEach((numerator,j)=>{
    // Two quarter-denominator matrices have denominator 16; the green 2² restores S products.
    assert.equal(numerator,4n*result.products[index][i][j]);
    assert.equal(printedProduct[i][j],result.products[index][i][j]);
   }));
  });
  const printed= result.products.map(matrix=>quarters(scaledEntries(matrix,4n)));
  result.reference.forEach((row,i)=>row.forEach((_,j)=>{
   const numerator=printed.reduce((sum,m,index)=>sum+BigInt(plan.products[index].numerator)*m[i][j],0n);
   const d=BigInt(plan.denominator),p=BigInt(plan.modulus);
   const restored=p?((numerator*inverse(d,p))%p+p)%p:numerator/d;
   assert.equal(restored,result.reconstructed[i][j]);
  }));
  assert.equal(result.matches,true);
  assert.deepEqual(result.reference,multiply(a,b));
 }
});
