import {test,expect} from '@playwright/test';
const id='awems1_814e0b844feb5c85dc566f22969761d9eb4d67a022b76c6ad7f8068a65311468';
export const savedVisibilityURL='/?lang=ja&b=53&K=16384&modset_id='+id;
test('nineteen-law set uses distinct painted cells without changing products or weights',async({page})=>{
 await page.setViewportSize({width:1600,height:1100});await page.goto(savedVisibilityURL);const row=page.locator('.paper-lane .law-row');await expect(row.locator('[data-tile-id]')).toHaveCount(19);
 await expect(page.locator('.paper-lane h1')).toContainText('19法・71積 面 A 37 / B 37');
 const cells=await row.locator('[data-lattice-cell]').evaluateAll(nodes=>nodes.map(n=>({color:n.getAttribute('fill'),alpha:Number(n.getAttribute('fill-opacity')),direct:n.getAttribute('data-product-color')})));
 expect(cells.length).toBeGreaterThan(60);
 for(const c of cells.filter(c=>c.alpha>0)){expect([.3,.42]).toContain(c.alpha);const rgb=c.color!.match(/[0-9a-f]{2}/gi)!.map(x=>parseInt(x,16));expect(Math.max(...rgb.map(x=>(255-x)*c.alpha))).toBeGreaterThan(30);}
 expect(cells.some(c=>c.alpha===0)).toBe(true);
 await row.locator('[data-tile-modulus="103"]').click();await expect(page.locator('.paper-lane .construction-detail > summary')).toContainText('103');
 await row.locator('[data-tile-modulus="81"]').click();await page.evaluate(()=>{(document.activeElement as HTMLElement)?.blur();return document.fonts.ready;});await row.evaluate(n=>n.querySelector('.law-detail')?.setAttribute('style','display:none'));await row.screenshot({path:'build/screens/visibility-after-density-laws.png'});
});
