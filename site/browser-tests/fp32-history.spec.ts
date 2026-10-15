import {test,expect} from '@playwright/test';
for(const width of [1440,390])for(const lang of ['en','ja'])test(`FP32 recorded sets retain conditions and select live tiles ${width} ${lang}`,async({page})=>{
 await page.setViewportSize({width,height:1000});await page.emulateMedia({reducedMotion:'reduce'});await page.goto(`/?lang=${lang}&b=24&precision=fp32&crt=1`);
 const panel=page.locator('.fp32-sets');await expect(panel.locator('[data-fp32-group]')).toHaveCount(16);
 const row=panel.locator('[data-fp32-engine="k64_s21"]'),group=panel.locator('[data-fp32-group]:has([data-fp32-engine="k64_s21"])');await group.locator(':scope>summary').click();
 await expect(group.locator('[data-fp32-engine="sg_0c209c711be0"]')).toContainText('SSYMM');await row.locator('[name=fp32_set]').click();
 await expect(page.locator('input[name=b]')).toHaveValue('21');await expect(page.locator('input[name=K]')).toHaveValue('4096');await expect(page.locator('.paper-lane [data-tile-id]')).toHaveCount(10);
 const id=await row.locator('[name=fp32_set]').getAttribute('value');await expect(page).toHaveURL(new RegExp('modset_id='+id));await page.reload();await expect(page.locator('.paper-lane [data-tile-id]')).toHaveCount(10);await expect(page.locator('input[name=b]')).toHaveValue('21');
 const failures=panel.locator('[data-fp32-failed]');await failures.locator(':scope>summary').click();await expect(failures.locator('li')).toHaveCount(4);await expect(failures).toContainText(lang==='en'?'Failed':'不合格');
 await page.locator('select[name=precision]').selectOption('fp32');await expect(panel.locator('[data-fp32-group]')).toHaveCount(16);
 const gemm=panel.locator('[data-fp32-engine="k96_s23_gemm"]');await panel.locator('[data-fp32-group]:has([data-fp32-engine="k96_s23_gemm"])').locator(':scope>summary').click();await expect(gemm).toContainText(lang==='en'?'Run link unconfirmed':'実行版との対応未確認');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await expect(page.locator('.katex-error')).toHaveCount(0);
});
