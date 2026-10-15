import {test,expect} from '@playwright/test';
for(const lang of ['en','ja'])for(const crt of [true,false])test(`resumed queue current preview ${lang} ${crt?'CRT':'integer'}`,async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`/?lang=${lang}&crt=${crt?1:0}&b=${crt?53:7}`);
 const tiles=page.locator(crt?'.paper-lane [data-tile-id]':'[data-integer-tile]');
 await expect(tiles).toHaveCount(crt?18:12);
 await expect(page.locator(crt?'.paper-lane .construction-detail':'.integer-detail .construction-detail')).toBeVisible();
 await expect(page.locator('details[data-section=map]')).toHaveAttribute('open','');
 await page.evaluate(()=>document.fonts.ready);
 await page.screenshot({path:`build/screens/${crt?'crt':'integer'}_${lang}.png`,fullPage:true});
 expect(errors).toEqual([]);await expect(page.locator('.katex-error')).toHaveCount(0);
});
