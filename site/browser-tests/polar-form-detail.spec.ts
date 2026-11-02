import {test,expect} from '@playwright/test';
for(const width of [1440,390])test(`the spiral detail opens the selected construction's expansion on the paper figure ${width}`,async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width,height:1000});
 await page.goto('/?lang=ja&section=polar-periodic&polar_modulus=343&polar_count=400');
 const detail=page.locator('[data-polar-form-detail]');await expect(detail).toHaveCount(1,{timeout:30000});
 const id=(await detail.getAttribute('data-polar-form-detail'))!;
 await expect(page.locator('.polar-candidates button.selected')).toHaveAttribute('title',new RegExp('^'+id));
 const expansion=page.locator(`[data-section="polar.detail.${id}"]`);await expect(expansion).toHaveCount(1);
 await expect(expansion.locator('select[name=expansion_layout]')).toHaveValue('paper');
 const boards=expansion.locator('[data-coverage-figure] [data-coverage-product]');
 const products=Number((await expansion.locator(':scope > summary').innerText()).match(/(\d+)積/)![1]);
 await expect(boards).toHaveCount(products);
 // Every board fits inside the figure: the boards wrap instead of running past the right edge.
 const right=await expansion.locator('[data-coverage-figure]').evaluate(e=>e.getBoundingClientRect().right);
 for(const box of await boards.evaluateAll(es=>es.map(e=>e.getBoundingClientRect().right)))expect(box).toBeLessThanOrEqual(right+1);
 // A composite that needs fewer products than its CRT components keeps that split above the detail.
 await page.goto('/?lang=ja&section=polar-periodic&polar_modulus=6');
 await expect(page.locator('[data-composite-split="6"]')).toHaveCount(1,{timeout:30000});
 await expect(page.locator('[data-polar-form-detail]')).toHaveCount(1);
 expect(await page.evaluate(()=>Boolean(document.querySelector('[data-composite-split]')!.compareDocumentPosition(document.querySelector('[data-polar-form-detail]')!)&Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 expect(errors).toEqual([]);
});
test('expansions outside the spiral keep their own default view',async({page})=>{
 await page.goto('/?lang=ja');
 await page.locator('.prime-table [data-prime-modulus="343"]').click();
 const select=page.locator('[data-section^="prime.detail."] select[name=expansion_layout]').first();
 await expect(select).toHaveCount(1,{timeout:30000});
 await expect(select).not.toHaveValue('paper');
 await expect(select.locator('option[value=paper]')).toHaveCount(1);
});
