import {test,expect} from '@playwright/test';
test('the spiral reading notes sit closed right under the zoom row and open from the URL',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/?lang=ja&section=polar-periodic');
 const map=page.locator('[data-section="polar-periodic"] .star-map'),reading=map.locator('details[data-section="polar-reading"]');
 await expect(map.locator('[data-ribbon-chart]')).toBeVisible({timeout:20000});
 await expect(reading).not.toHaveAttribute('open');await expect(reading.locator('summary')).toHaveText(/図の読み方/);
 await expect(map.locator('.star-actions + details[data-section="polar-reading"]')).toHaveCount(1);
 for(const text of ['素数の法だけを','2倍以上に拡大すると','r 周目に'])await expect(reading.locator('p',{hasText:text})).toHaveCount(1);
 await expect(reading.locator('[data-power-boundaries]')).toHaveCount(1);await expect(map.locator(':scope>p.star-description')).toHaveCount(1);
 await page.goto('/?lang=ja&section=polar-periodic&open.polar-reading=1');await expect(map.locator('[data-ribbon-chart]')).toBeVisible({timeout:20000});
 await expect(reading).toHaveAttribute('open','');await expect(reading.locator('[data-options-description]')).toBeVisible();
});
