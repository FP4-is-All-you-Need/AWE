import {test,expect} from '@playwright/test';
for(const lang of ['en','ja'])for(const width of [1440,390])test(`FP6 family rows show factor badges and card tiles, and a selected row opens its expansion ${lang} ${width}`,async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width,height:1000});await page.emulateMedia({reducedMotion:'reduce'});await page.goto(`/?prime_set=fp6&lang=${lang}`);
 const section=page.locator('[data-section="fp6-families"]'),rows=section.locator('[data-fp6-family-row]');
 await expect(rows.first()).toBeVisible({timeout:30000});expect(await rows.count()).toBeLessThanOrEqual(20);
 const first=rows.first();await expect(first.locator('[data-prime]').first()).toBeVisible();
 await expect(first.locator('.fp6-family-tile [data-tile-id]')).toHaveCount(1,{timeout:30000});
 await first.locator('.molecule-select').click();
 const detail=section.locator('[data-fp6-selected]');await expect(detail).toHaveAttribute('data-fp6-selected',await first.getAttribute('data-fp6-family-row')??'');
 await expect(detail.locator('details.construction-detail')).toBeVisible();await expect(first).toHaveAttribute('data-selected','true');
 if(lang==='en')expect(await detail.innerText()).not.toMatch(/リムの並び/);
 const id=new URL(page.url()).searchParams.get('fp6_form');expect(id).toBe(await first.getAttribute('data-fp6-family-row'));
 await page.reload();await expect(section.locator('[data-fp6-selected] details.construction-detail')).toBeVisible({timeout:30000});
 // A row known only from its source report has no construction to draw.
 await section.locator('input[aria-label="FP6 modulus"]').fill('64');const only=section.locator('[data-fp6-family-row][data-status="source_only"]').first();
 await expect(only).toBeVisible();await expect(only.locator('[data-tile-id]')).toHaveCount(0);await only.locator('.molecule-select').click();
 await expect(section.locator('[data-fp6-selected]')).toContainText(lang==='en'?'no construction data':'構成のデータがありません');
 // A row counts the products of the construction it draws, without unused limbs.
 await section.locator('input[aria-label="FP6 modulus"]').fill('4');const p2=section.locator('[data-fp6-family-row][data-family="p2"]').first();
 await expect(p2).toHaveAttribute('data-value-set','8xE2M3');await expect(p2).toHaveAttribute('data-products','1');
 await expect(p2.locator('[data-omitted-limbs]')).toHaveText(lang==='en'?'Unused limbs are omitted.':'使われないリムを省いて表示しています。');
 const summary=section.locator('[data-fp6-summary="4"]');await expect(summary).toContainText(': 1 (');
 await expect(summary.locator('[data-fp6-source-holefree]')).toContainText(lang==='en'?'Source report: 2 products':'出所の報告では 2 積');
 await p2.locator('.molecule-select').click();
 const drawn=section.locator('[data-fp6-selected] [data-product-index]');await expect(drawn.first()).toBeAttached();
 expect(await drawn.evaluateAll(n=>new Set(n.map(e=>e.getAttribute('data-product-index'))).size)).toBe(1);
 expect(errors).toEqual([]);
});
