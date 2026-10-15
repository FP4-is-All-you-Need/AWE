import {test,expect} from '@playwright/test';
for(const lang of ['en','ja'])test(`cost breakdown is removed but cost inputs remain ${lang}`,async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto(`/?lang=${lang}&swap=1`);await expect(page.locator('.paper-lane [data-tile-id]')).toHaveCount(18);await page.evaluate(()=>document.querySelectorAll('details').forEach(d=>d.open=true));
 await expect(page.locator('.cost-breakdown,.cost-bars,[data-cost-term],[data-section^="construction-cost"],.lane-cost')).toHaveCount(0);await expect(page.locator('main')).not.toContainText('Cost breakdown');await expect(page.locator('main')).not.toContainText('費用の内訳');
 await expect(page.locator('[name=cost_product]')).toBeVisible();await page.locator('[name=cost_product]').fill('1');await expect(page.locator('[name=cost_product]')).toHaveValue('1');
});
