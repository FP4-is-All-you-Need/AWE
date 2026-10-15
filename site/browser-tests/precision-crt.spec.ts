import {test,expect} from '@playwright/test';
test('precision changes restore saved CRT sets and explicit no-CRT retains a recovery button',async({page})=>{
 await page.goto('/?lang=en');await expect(page.locator('[name=crt]')).toHaveValue('1');await expect(page.locator('.paper-lane [data-tile-id]')).toHaveCount(18);
 for(const precision of ['fp32','fp64']){
  await page.locator('[name=crt]').selectOption('0');await expect(page.locator('[data-integer-unavailable]')).toContainText('Not recorded');
  await page.locator('[name=precision]').selectOption(precision);await expect(page.locator('[name=crt]')).toHaveValue('1');await expect(page.locator('.paper-lane [data-tile-id]').first()).toBeVisible();
 }
 await page.locator('.paper-lane').screenshot({path:'build/screens/precision-restores-fp64.png'});
 await page.reload();await expect(page.locator('[name=crt]')).toHaveValue('1');await expect(page.locator('.paper-lane [data-tile-id]')).toHaveCount(18);
 await page.locator('[name=crt]').selectOption('0');await page.reload();await expect(page.locator('[name=crt]')).toHaveValue('0');await expect(page.locator('[data-integer-unavailable]')).toContainText('Not recorded');await page.locator('[name=show_crt_sets]').click();await expect(page.locator('.paper-lane [data-tile-id]')).toHaveCount(18);
 await page.locator('[name=precision]').selectOption('int8');await page.locator('[data-map-cell][data-row="8"][data-column="9"]').click();await expect(page.locator('[name=crt]')).toHaveValue('0');await expect(page.locator('[data-integer-tile]').first()).toBeVisible();
 await page.goto('/?crt=0&b=7');await page.locator('[name=b]').fill('53');await expect(page.locator('[name=crt]')).toHaveValue('1');await expect(page.locator('.paper-lane [data-tile-id]')).toHaveCount(18);
});
