import {test,expect} from '@playwright/test';
import {DIRECT_COLORS} from '../src/productPalette.ts';
for(const lang of ['en','ja'])test(`higher base13 rows follow the fixed level palette ${lang}`,async({page})=>{
 await page.setViewportSize({width:1600,height:1100});await page.goto(`/?lang=${lang}&section=numberline&encode_int=1000`);
 const h=page.locator('[data-hierarchy]');await expect(h).toBeVisible();await page.evaluate(()=>document.fonts.ready);
 const original=await h.locator('[data-source-text]').evaluateAll(ns=>ns.filter(n=>/scale|段/.test(n.textContent??'')).map(n=>({id:n.getAttribute('data-source-text'),color:getComputedStyle(n).color})));
 if(lang==='ja')await h.screenshot({path:'build/screens/visibility-after-numberline-1000.png'});
 await page.locator('[name=encode_int]').fill('1000000');await expect(page.locator('.base13-hierarchy')).toHaveAttribute('data-carry-input','1000000');
 const expected=DIRECT_COLORS.slice(0,7).map(h=>`rgb(${[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)).join(', ')})`);
 await expect.poll(async()=>h.locator('[data-source-text]').evaluateAll(ns=>ns.filter(n=>/scale|段/.test(n.textContent??'')).map(n=>getComputedStyle(n).color))).toEqual(expect.arrayContaining(expected));
 // Inspect actual painted paths in each cloned row, not only the exponent attributes.
 for(const e of [3,4,5,6]){
  const colors=await h.locator(`[data-hierarchy-layer-exponent="${e}"]`).evaluateAll(ns=>ns.flatMap(n=>[...n.querySelectorAll('path,use')].flatMap(p=>[getComputedStyle(p).stroke,getComputedStyle(p).fill])));
  expect(colors).toContain(expected[e]);
 }
 const result=(await page.locator('.base13-hierarchy').getAttribute('data-carry-result'))!.split(',').map(BigInt);expect(result.reduce((s,d,i)=>s+d*13n**BigInt(i),0n)).toBe(1000000n);
 await h.locator('[data-carry-stage]').last().click();await expect(h.locator('[data-trace-exponent][data-active=true]')).toHaveCount(1);await page.reload();await expect(page.locator('[name=encode_int]')).toHaveValue('1000000');
 await page.locator('[name=encode_step]').selectOption('-1');await page.evaluate(()=>document.fonts.ready);
 await h.screenshot({path:`build/screens/visibility-after-numberline-high${lang==='en'?'-en':''}.png`});
 await page.locator('[name=encode_int]').fill('1000');await expect.poll(()=>h.locator('[data-source-text]').evaluateAll(ns=>ns.filter(n=>/scale|段/.test(n.textContent??'')).map(n=>({id:n.getAttribute('data-source-text'),color:getComputedStyle(n).color})))).toEqual(original);
 await expect(h.locator('.katex-error')).toHaveCount(0);
});
