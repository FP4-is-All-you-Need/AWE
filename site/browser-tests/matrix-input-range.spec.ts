import {test,expect} from '@playwright/test';

for(const lang of ['en','ja'])for(const width of [1440,390])test(`matrix input ranges and errors stay visible ${lang} ${width}`,async({page})=>{
 await page.setViewportSize({width,height:1000});
 await page.goto(`/?lang=${lang}&crt=0&input_ma=12&input_mb=12&b=11&example_matrix_a=500&example_matrix_b=2`);
 const awe=page.locator('[data-section=numeric-matrix]'),base=page.locator('[data-section=base13-matrix]');
 await expect(awe.locator('[data-input-range=A]')).toContainText('2160');
 await expect(awe.locator('[data-input-range=B]')).toContainText('2160');
 await expect(awe.locator('[data-result]')).toHaveAttribute('data-result','1000');
 const input=page.locator('[name=example_matrix_a]');
 for(const value of ['2161','-2161']){
  await input.fill(value);await expect(input).toHaveValue(value);
  await expect(awe.locator('[role=alert]')).toContainText(lang==='en'?'Out of range':'範囲外');
  await expect(awe.locator('[role=alert]')).toContainText(value.replace('-','−'));
  await expect(awe.locator('[data-result]')).toHaveCount(0);
 }
 await expect(base.locator('[data-input-range=A]')).toContainText('2196');
 await page.locator('[name=base13_matrix_a]').fill('2197');await expect(base.locator('[role=alert]')).toContainText(lang==='en'?'Out of range':'範囲外');
 await page.locator('[name=base13_matrix_a]').fill('845');await expect(base.locator('[role=alert]')).toContainText(lang==='en'?'Uncovered values':'穴');
 await page.locator('[name=example_encoding]').selectOption('frozen_residue');
 await expect(base.locator('[data-input-range=A]')).toContainText('1464');
 await page.locator('[name=base13_matrix_a]').fill('2000');await expect(base.locator('[role=alert]')).toContainText(lang==='en'?'Out of range':'範囲外');
 await input.fill('9'.repeat(101));await expect(input).toHaveValue('9'.repeat(101));await expect(awe.locator('[role=alert]')).toContainText('100');
 await input.fill('1.5');await expect(awe.locator('[role=alert]')).toContainText(lang==='en'?'Enter integers':'整数を入力');
 await input.fill('500');await expect(awe.locator('[data-result]')).toHaveAttribute('data-result','1000');
 await page.reload();await expect(input).toHaveValue('500');await expect(base.locator('[data-input-range=A]')).toContainText('1464');
 await expect(awe).not.toContainText(/Base-13|基数13/);
 expect(await base.evaluate(el=>!!el.closest('[data-section=previous-base13]'))).toBe(true);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.locator('[name=crt]').selectOption('1');await page.locator('[name=precision]').selectOption('fp64');
 await expect(awe.locator('[data-input-range=A]')).toContainText('mod');await expect(awe.locator('[data-input-range=A]')).toContainText('100');
 await expect(awe.locator('[data-result]')).toHaveAttribute('data-matches','true');
});
