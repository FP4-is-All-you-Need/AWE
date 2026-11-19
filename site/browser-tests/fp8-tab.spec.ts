import {test,expect} from '@playwright/test';

for(const [lang,width] of [['ja',1440],['en',390]] as const)test(`FP8 page uses 512×E4M3 and also shows FP4 and FP6 single constructions ${lang} ${width}`,async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width,height:1000});await page.goto(`/?prime_set=fp8&lang=${lang}`);
 await expect(page.locator('.periodic-format [data-value-set]')).toHaveText('FP8 · 512×E4M3');
 await expect(page.locator('.periodic-format button[aria-pressed=true]')).toHaveText('FP8');
 const table=page.locator('[data-section="prime-table"]');
 await expect(table.locator(':scope > summary')).toContainText('FP8');
 await expect(table.locator('[name=prime_set]')).toHaveValue('fp8');
 // 1303 is known from an 8×E2M3 construction and 1009 from a 2×E2M1 one; both hold on 512×E4M3.
 for(const m of [1303,1009])await expect(table.locator(`[data-prime-modulus="${m}"][data-products]`).first()).toBeAttached({timeout:30000});
 await page.locator('.periodic-format button',{hasText:'FP6'}).click();
 await expect(page.locator('.periodic-format button[aria-pressed=true]')).toHaveText('FP6');
 expect(errors).toEqual([]);
});
