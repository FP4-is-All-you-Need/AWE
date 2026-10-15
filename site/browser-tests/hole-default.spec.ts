import {test,expect} from '@playwright/test';
for(const lang of ['en','ja'])test(`one percent default and explicit URL values ${lang}`,async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto(`/?lang=${lang}`);await expect(page.locator('.paper-lane [data-tile-id]')).toHaveCount(18);await page.locator('.coverage-controls > summary').click();const input=page.locator('[name=hole_pct_max]');await expect(input).toHaveValue('1');await expect(page.locator('[name=hole_pct_max_range]')).toHaveValue('1');await expect(page.locator('.joint-comparison > summary')).toContainText('1');
 await page.locator('.joint-comparison > summary').click();await expect(page.locator('[name=joint_id]')).toHaveCount(1);await expect(page.locator('[name=joint_id]')).toContainText('103');
 await input.fill('5');await expect(page.locator('[name=joint_id]')).toHaveCount(1);await input.fill('10');await expect(page.locator('[name=joint_id]')).toHaveCount(2);await page.reload();await expect(input).toHaveValue('10');
 for(const value of ['0','1','5','10','2.5']){await page.goto(`/?lang=${lang}&hole_pct_max=${value}&open.coverage=1`);await expect(input).toHaveValue(value);await expect(page.locator('[name=hole_pct_max_range]')).toHaveValue(value);}
});
