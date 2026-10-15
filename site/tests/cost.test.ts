import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {fromCanonical} from '../src/visual.ts';import {constructionCost,defaultCostSettings} from '../src/cost.ts';
const rows=JSON.parse(readFileSync(new URL('../../data/modular/catalog.json',import.meta.url),'utf8')).solutions;
const c=fromCanonical(rows.find((r:any)=>r.modulus===73)),dims={m:64,n:64,k:64};
const settings={...defaultCostSettings,product:'1',plane:'2',add:'1',frequency:'0',correction:'0',modulus:'5',output:'3',additionModel:'naive' as const};
test('cost keeps unknowns and explicit correction assumptions distinct',()=>{
 assert.equal(constructionCost(c,dims,defaultCostSettings).total,null);
 const result=constructionCost(c,dims,settings);assert.notEqual(result.total,null);assert.equal(result.terms.product.value,3*64**3);assert.equal(result.terms.plane.value,2*6*64**2);
 const pending=constructionCost({...c,carry:true},dims,{...settings,frequency:''});assert.equal(pending.total,null);assert.equal(pending.terms.correction.value,null);
 const scaled={...c,planes:{...c.planes!,A:c.planes!.A.map(p=>p.map(n=>n*3))}};assert.equal(constructionCost(scaled,dims,settings).terms.add.value,null);
});
test('stage overlap is explicit, has serial and maximum endpoints, and scales by dimensions',()=>{
 const serial=constructionCost(c,dims,settings),max=constructionCost(c,dims,{...settings,model:'max',overlaps:{'1':'1'}});
 assert.equal(max.total,serial.total!-Math.min(serial.terms.product.value!,serial.terms.plane.value!));
 assert.equal(constructionCost(c,dims,{...settings,model:'max',overlaps:{'1':'0'}}).total,serial.total);
 assert.equal(constructionCost(c,dims,{...settings,model:'max',overlaps:{'1':''}}).total,null);
 const doubled=constructionCost(c,{m:128,n:128,k:128},settings);assert.equal(doubled.terms.product.value,serial.terms.product.value!*8);assert.equal(doubled.terms.plane.value,serial.terms.plane.value!*4);
});
