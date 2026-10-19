import {test,expect} from '@playwright/test';
const id='awemps2_bcf56be798e6e87fa023964c76889cb177e2b5133d57217eb9cf9d9f66b9c5a1';
for(const width of [1440,390])for(const lang of ['en','ja'])test(`FP4 periodic table includes measured cubes ${width} ${lang}`,async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width,height:1000});await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto(`/?prime_forms=0&lang=${lang}&b=53&modset_id=${id}`);const table=page.locator('.prime-table');await expect(table.locator('[data-prime-modulus]')).toHaveCount(58);
 await expect(table.locator(':scope > summary')).toContainText(lang==='en'?'FP4 periodic table':'FP4 の周期表');await expect(table.locator('.prime-intro')).toContainText('FP4');
 for(const m of [343,512,625,729,1331,2197,2401])await expect(table.locator(`[data-prime-modulus="${m}"]`)).toHaveAttribute('data-recorded','true');
 const cube=table.locator('[data-prime-modulus="343"]');await expect(cube).toHaveAttribute('data-in-set','true');await expect(cube.locator('[data-measured-marker]')).toHaveCount(0);
 await cube.click();await expect(table.locator('.prime-inspection .construction-detail')).toBeVisible();await expect(table.locator('[data-weight-variant]')).toHaveCount(5);
 await table.locator('.prime-set-history > summary').click();await expect(table.locator(`[data-prime-set="${id}"]`)).toHaveAttribute('data-use','measured');
 await expect(table.locator('[data-prime-set="awemps2_4c16afaa19d827808a3c443104b95481f7fd92f64472802415d76c8e369367f2"]')).toHaveAttribute('data-use','catalog-only');
 const figure=table.locator('.prime-table-figure');expect(await figure.evaluate(n=>n.scrollHeight<=n.clientHeight)).toBe(true);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 if(width===390){await table.locator('[data-prime-modulus="157"]').scrollIntoViewIfNeeded();await figure.evaluate(n=>n.scrollLeft=n.scrollWidth);await expect(table.locator('[data-prime-modulus="157"]')).toBeInViewport();}
 await expect(table.locator('.katex-error')).toHaveCount(0);expect(errors).toEqual([]);
});
