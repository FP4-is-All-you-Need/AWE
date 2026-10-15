import {test,expect} from '@playwright/test';
for(const lang of ['en','ja'])for(const crt of [true,false])test(`rendered mathematics has no escaped command words ${lang} ${crt?'CRT':'integer'}`,async({page})=>{
 await page.goto(`/?lang=${lang}&crt=${crt?1:0}${crt?'':'&b=7&integer_weight=2,5,31'}`);
 await expect(page.locator('[data-expansion]').first()).toBeVisible();
 // Inspect every disclosure, including off-screen diagrams and the repeated B side.
 await page.evaluate(()=>{for(const d of document.querySelectorAll('details'))d.open=true;});
 await expect(page.locator('[data-matrix-diagram=base13] [data-numeric-product]').first()).toBeVisible();
 await page.evaluate(()=>document.fonts.ready);
 const bad=await page.evaluate(()=>{const results:string[]=[];const walk=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let node:Node|null;while((node=walk.nextNode())){const parent=node.parentElement;if(!parent||parent.closest('.katex-mathml,script,style,textarea,option,[aria-hidden=true]'))continue;if(!parent.getClientRects().length||getComputedStyle(parent).visibility==='hidden')continue;const text=node.textContent??'';if(/\b(times|cdot|equiv|bmod|operatorname|frac|sum|le)\b/.test(text))results.push(text);}return results;});
 expect(bad).toEqual([]);await expect(page.locator('.katex-error')).toHaveCount(0);
 await expect(page.locator('[data-matrix-diagram=base13] [data-numeric-product]').first().locator('.katex-html')).toContainText(['×']);
});
