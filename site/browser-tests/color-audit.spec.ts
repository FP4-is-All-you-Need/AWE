import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import {fromInteger,fromCanonical} from '../src/visual';
import {coefficientColor,productFillColor,textInk,miniWeightStyle,contrastRatio} from '../src/compact';
const target='awe1_1656e4b7feacd47cbaa916a1ab39ffcdaf195a7de5d6093418e13e4d0c5e4136';
const raw=JSON.parse(fs.readFileSync('../data/solutions/16.json','utf8')).find((r:any)=>r.id===target),c=fromInteger(raw);
for(const lang of ['en','ja'])test(`colour policy reaches five-product formulas and faces ${lang}`,async({page})=>{
 test.setTimeout(120000);
 await page.goto(`/?lang=${lang}&crt=0&b=6&integer_id=${target}&width_results=1`);
 const detail=page.locator('.integer-detail .construction-detail');await expect(detail).toBeVisible();
 const eq=detail.locator('.equation').first();await expect(eq).toContainText('455');
 const colors=c.products.map((_,i)=>coefficientColor(c,i));expect(new Set(colors).size).toBe(5);
 for(const color of colors){
  const matches=await eq.locator('[style*="color"]').evaluateAll((nodes,ink)=>nodes.some(n=>{const p=document.createElement('span');p.style.color=ink;return (n as HTMLElement).style.color===p.style.color;}),textInk(color));expect(matches).toBe(true);
 }
 const flow=detail.locator('details').filter({has:page.locator('[data-plane-flow=A]')}).first();
 if(await flow.getAttribute('open')===null)await flow.locator(':scope > summary').click();
 for(const plane of await detail.locator('[data-plane-flow=A] [data-flow-plane]').all()){
  const product=Number(await plane.getAttribute('data-product-index')),color=colors[product];
  await expect(plane).toHaveAttribute('data-block-color',color);
  const ink=await plane.locator('[data-flow-destination] .svg-math').evaluate(n=>getComputedStyle(n).color);
  const hex='#'+ink.match(/\d+/g)!.slice(0,3).map(v=>Number(v).toString(16).padStart(2,'0')).join('');
  expect(contrastRatio(hex,productFillColor(c,product))).toBeGreaterThanOrEqual(4.5);
 }
 for(const layout of ['compact','products']){await detail.locator('[name=expansion_layout]').selectOption(layout);expect(await detail.locator('.katex-error').count()).toBe(0);}
});
test('power miniature painted backgrounds and KaTeX inks use the same audited rule',async({page})=>{
 const set='awemps2_bcf56be798e6e87fa023964c76889cb177e2b5133d57217eb9cf9d9f66b9c5a1';
 await page.goto('/?b=53&modset_id='+set);
 const tile=page.locator('.paper-lane [data-tile-modulus="1331"]');await expect(tile).toBeVisible();
 const c=fromCanonical(JSON.parse(fs.readFileSync('../data/modular/powers.json','utf8')).solutions.find((r:any)=>r.modulus===1331));
 for(const side of ['A','B'] as const)for(let i=0;i<c.weights[side].length;i++){
  const label=tile.locator(`[data-weight-label=${side.toLowerCase()}${i}]`),style=miniWeightStyle(c,side,i);
  await expect(label).toHaveAttribute('data-weight-ink',style.ink);await expect(label.locator('rect')).toHaveAttribute('fill',style.background);
  const actual=await label.locator('.svg-math').evaluate(n=>getComputedStyle(n).color);
  const hex='#'+actual.match(/\d+/g)!.slice(0,3).map(v=>Number(v).toString(16).padStart(2,'0')).join('');
  expect(contrastRatio(hex,style.background)).toBeGreaterThanOrEqual(4.5);
 }
 await tile.click();await expect(page.locator('.paper-lane .construction-detail')).toBeVisible();
});
