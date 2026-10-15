import {test,expect} from '@playwright/test';
test('nineteen-law set has white tile backgrounds while retaining selected borders',async({page})=>{
 await page.setViewportSize({width:1600,height:1100});await page.goto('/?lang=ja&b=53&K=16384&modset_id=awems1_814e0b844feb5c85dc566f22969761d9eb4d67a022b76c6ad7f8068a65311468');
 const row=page.locator('.paper-lane .law-row');await expect(row.locator('[data-tile-id]')).toHaveCount(19);
 expect(await row.locator('[data-tile-id] > rect').evaluateAll(ns=>ns.every(n=>n.getAttribute('fill')==='#FFFFFF'))).toBe(true);
 await expect(row.locator('[data-tile-id][aria-pressed=true] > rect')).toHaveAttribute('stroke','#884499');
 await expect(page.locator('[data-comparison-reference]')).toHaveCount(0);
 await page.evaluate(()=>document.fonts.ready);await row.evaluate(n=>n.querySelector('.law-detail')?.setAttribute('style','display:none'));await row.screenshot({path:'build/screens/visibility-after-no-yellow-laws.png'});
});
