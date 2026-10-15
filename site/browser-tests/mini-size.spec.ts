import {test,expect} from '@playwright/test';
for(const width of [1280,1440,1920])for(const lang of ['en','ja'])test(`compact modulus tiles retain every item and readable labels ${width} ${lang}`,async({page})=>{
 await page.setViewportSize({width,height:1000});await page.goto(`/?b=53&lang=${lang}`);
 const row=page.locator('.paper-lane .law-row');await expect(row.locator('[data-tile-id]')).toHaveCount(18);await page.evaluate(()=>document.fonts.ready);
 expect(await row.locator(':scope > svg').count()).toBeLessThanOrEqual(3);
 for(const tile of await row.locator('[data-tile-id]').all()){
  const measurements=await tile.evaluate(n=>{const frame=n.querySelector(':scope > rect')!.getBoundingClientRect(),svg=n.closest('svg')!.getBoundingClientRect();return {inside:frame.x>=svg.x&&frame.right<=svg.right,labels:[...n.querySelectorAll('foreignObject .svg-math,text')].map(t=>{const r=t.getBoundingClientRect();return {size:parseFloat(getComputedStyle(t).fontSize),left:r.left,right:r.right,frameLeft:frame.left,frameRight:frame.right,text:t.textContent};})};});
  expect(measurements.inside).toBe(true);
  for(const label of measurements.labels){expect(label.size).toBeGreaterThanOrEqual(14);expect(label.left,label.text??'').toBeGreaterThanOrEqual(label.frameLeft-5);expect(label.right,label.text??'').toBeLessThanOrEqual(label.frameRight+5);}
 }
 const ids=await row.locator('[data-tile-id]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-tile-id')));
 await row.locator('[data-tile-id]').last().click();await expect(row.locator('[data-tile-id]').last()).toHaveAttribute('aria-pressed','true');
 expect(await row.locator('[data-tile-id]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-tile-id')))).toEqual(ids);
});
test('four-limb thumbnail fits the three-limb frame and still opens the full expansion',async({page})=>{
 const id='awe1_37e282e92ef5d7e7761ae3304ed06bc8e91ce78a9436d239851ebc3b0b2a9a07';
 await page.goto(`/?crt=0&b=11&width_results=1&integer_id=${id}`);
 const tile=page.locator(`[data-integer-tile="${id}"]`),mini=tile.locator('[data-construction-tile]');await expect(mini).toHaveAttribute('data-mini-reduced','true');
 const svg=mini.locator(':scope > svg');expect(Number(await svg.getAttribute('width'))).toBeLessThanOrEqual(174);expect(Number(await svg.getAttribute('height'))).toBeLessThanOrEqual(130);
 await tile.click();const expansion=page.locator(`.integer-detail [data-expansion="${id}"]`);await expect(expansion).toBeVisible();expect(Number(await expansion.getAttribute('width'))).toBeGreaterThan(500);

});
test('three-limb power tiles keep all weights legible inside the compact list',async({page})=>{
 await page.setViewportSize({width:1280,height:1000});await page.goto('/?b=53&modset_id=awemps2_bcf56be798e6e87fa023964c76889cb177e2b5133d57217eb9cf9d9f66b9c5a1');
 const row=page.locator('.paper-lane .law-row');await expect(row.locator('[data-tile-id]')).toHaveCount(16);expect(await row.locator(':scope > svg').count()).toBeLessThanOrEqual(3);
 for(const modulus of [125,343,512,729,1331,2197]){
  const tile=row.locator(`[data-tile-modulus="${modulus}"]`);await expect(tile).toHaveAttribute('data-mini-reduced','false');await expect(tile.locator('[data-weight-label]')).toHaveCount(6);
  const sizes=await tile.locator('[data-weight-label] .svg-math').evaluateAll(ns=>ns.map(n=>parseFloat(getComputedStyle(n).fontSize)));expect(Math.min(...sizes)).toBe(14);
  const boxes=await tile.locator('[data-weight-label]').evaluateAll(ns=>ns.map(n=>{const bg=n.querySelector('rect')!.getBoundingClientRect(),text=n.querySelector('.katex-html')!.getBoundingClientRect();return {width:bg.width,textWidth:text.width};}));for(const box of boxes)expect(box.textWidth).toBeLessThanOrEqual(box.width+1);
 }
});
