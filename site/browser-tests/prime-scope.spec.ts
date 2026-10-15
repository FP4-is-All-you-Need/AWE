import {test,expect} from '@playwright/test';
for(const lang of ['en','ja'])for(const width of [1440,390])test(`prime table bounds distinguish 2x2 search from other constructions ${lang} ${width}`,async({page})=>{
 await page.setViewportSize({width,height:1000});await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/?lang='+lang);
 const table=page.locator('.prime-table');await expect(table.locator('[data-prime-modulus]')).toHaveCount(58);
 await expect(table.locator('[data-prime-modulus="163"], [data-prime-modulus="167"]')).toHaveCount(0);
 await expect(table.locator('.prime-table-legend')).toContainText('2–157');
 const scope=table.locator('.prime-search-scope');await expect(scope).toContainText('2×2');await expect(scope).toContainText(lang==='en'?'two limbs on both A and B':'A・Bとも2リム');await expect(scope).toContainText(lang==='en'?'unequal limb counts':'A・Bでリム数が違う');await expect(scope).toContainText(lang==='en'?'not searched for every modulus':'全ての法で調べたものではありません');
 await table.locator('[data-prime-modulus="169"]').click();await expect(table.locator('.prime-inspection h3')).toContainText('169');await expect(table.locator('[data-prime-modulus="169"]')).toHaveAttribute('data-prime-base','13');
 await table.locator('[data-prime-modulus="343"]').click();await expect(table.locator('[data-prime-weight-card]')).toHaveCount(5);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
