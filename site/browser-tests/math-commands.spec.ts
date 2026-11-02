import {test,expect} from '@playwright/test';
for(const lang of ['en','ja'])for(const crt of [true,false])test(`rendered mathematics has no escaped command words ${lang} ${crt?'CRT':'integer'}`,async({page})=>{
 await page.goto(`/?lang=${lang}&crt=${crt?1:0}${crt?'':'&b=7&integer_weight=2,5,31'}&open.numeric-matrix=1&open.base13-matrix=1&open.crt-example=1`);
 await expect(page.locator('[data-expansion]').first()).toBeVisible();
 // Inspect every disclosure, including off-screen diagrams and the repeated B side.
 await page.evaluate(()=>{for(const d of document.querySelectorAll('details'))d.open=true;});
 await expect(page.locator('[data-matrix-diagram=base13] [data-numeric-product]').first()).toBeVisible();
 await page.evaluate(()=>document.fonts.ready);
 // Command names count inside formulas; in plain text only their backslash form does, so words such as "sum" in prose pass.
 const scan=(selector:string)=>page.evaluate(selector=>{const inFormula=/\b(times|cdot|equiv|bmod|operatorname|frac|sum|le)\b/,inText=/\\(times|cdot|equiv|bmod|operatorname|frac|sum|le)\b/;const results:string[]=[];const walk=document.createTreeWalker(document.querySelector(selector)!,NodeFilter.SHOW_TEXT);let node:Node|null;while((node=walk.nextNode())){const parent=node.parentElement;if(!parent||parent.closest('.katex-mathml,script,style,textarea,option,[aria-hidden=true]'))continue;if(!parent.getClientRects().length||getComputedStyle(parent).visibility==='hidden')continue;const text=node.textContent??'';if((parent.closest('.katex,.math,[data-tex]')?inFormula:inText).test(text))results.push(text);}return results;},selector);
 await page.evaluate(()=>{const d=document.createElement('div');d.id='math-command-sample';d.innerHTML='<p>keep the sum of the products</p><p>leaked \\sum here</p><span class="math">sum</span>';document.body.append(d);});
 expect(await scan('#math-command-sample')).toEqual(['leaked \\sum here','sum']);await page.evaluate(()=>document.getElementById('math-command-sample')!.remove());
 const bad=await scan('body');
 expect(bad).toEqual([]);await expect(page.locator('.katex-error')).toHaveCount(0);
 await expect(page.locator('[data-matrix-diagram=base13] [data-numeric-product]').first().locator('.katex-html')).toContainText(['×']);
});
