import {test,expect} from '@playwright/test';
for(const width of [1280,1440,1920])for(const colorScheme of ['light','dark'] as const)for(const lang of ['en','ja'])test(`all modulus miniatures fit their frames ${width} ${colorScheme} ${lang}`,async({page},info)=>{
 await page.setViewportSize({width,height:1000});await page.emulateMedia({colorScheme,reducedMotion:'reduce'});
 await page.goto('/browser-fixtures/law-layout.html?lang='+lang);await expect(page.locator('[data-all-count]')).toBeVisible();await page.evaluate(()=>document.fonts.ready);
 const count=Number(await page.locator('[data-all-count]').getAttribute('data-all-count'));await expect(page.locator('[data-tile-id]')).toHaveCount(count);
 const rows=await page.locator('[data-tile-id]').evaluateAll(ns=>ns.map(n=>{
 const frame=n.querySelector(':scope>rect')!.getBoundingClientRect(),label=n.querySelector(':scope>foreignObject .katex-html')!.getBoundingClientRect(),grid=n.querySelector('[data-lattice-weights-a]>rect')!.getBoundingClientRect();
 const text=[...n.querySelectorAll('text,.katex-html')].map(e=>{const r=e.getBoundingClientRect();return {text:e.textContent,left:r.left-frame.left,right:frame.right-r.right,bottom:frame.bottom-r.bottom};});
 const product=n.querySelector('[data-tile-products]')!.getBoundingClientRect();
 return {id:n.getAttribute('data-tile-id'),text,above:label.top-frame.top,gridProduct:product.top-grid.bottom,bottom:Math.min(...text.map(t=>t.bottom))};
 }));
 expect(count).toBeGreaterThan(200);
 for(const row of rows){expect(row.above,JSON.stringify(row)).toBeGreaterThan(0);expect(row.above).toBeLessThanOrEqual(4);expect(row.gridProduct).toBeGreaterThanOrEqual(0);expect(row.gridProduct).toBeLessThan(2);expect(row.bottom).toBeGreaterThan(0);expect(row.bottom).toBeLessThan(8);
  for(const text of row.text){expect(text.left,JSON.stringify({id:row.id,...text})).toBeGreaterThanOrEqual(2.45);expect(text.right,JSON.stringify({id:row.id,...text})).toBeGreaterThanOrEqual(2.45);expect(text.bottom).toBeGreaterThanOrEqual(0);}
 }
 await info.attach('all-miniatures.json',{body:JSON.stringify(rows),contentType:'application/json'});
});
