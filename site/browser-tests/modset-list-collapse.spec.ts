import {test,expect} from '@playwright/test';
for(const lang of ['en','ja'])for(const width of [1440,390])test(`modulus candidates stay visible while each text list uses one line ${lang} ${width}`,async({page})=>{
 await page.setViewportSize({width,height:1000});await page.emulateMedia({reducedMotion:'reduce'});await page.goto(`/?lang=${lang}`);
 const outer=page.locator('.modset-catalog');await expect(outer).toHaveAttribute('open','');const candidates=outer.locator('[data-saved-modset]');await expect(candidates).toHaveCount(8);
 for(const candidate of await candidates.all()){
  await expect(candidate.locator('[name=modset_choice]')).toBeVisible();const row=candidate.locator('.modset-text-row');await expect(row).toHaveAttribute('data-expanded','false');
  const sizes=await row.evaluate(n=>{const text=n.querySelector('.modset-weights')!.getBoundingClientRect(),button=n.querySelector('button')!.getBoundingClientRect(),r=n.getBoundingClientRect();return {height:r.height,text:text.height,delta:Math.abs(text.top-button.top),button:button.height};});expect(sizes.height).toBeLessThanOrEqual(31);expect(sizes.delta).toBeLessThan(1);expect(sizes.text).toBe(30);
 }
 const first=candidates.first(),second=candidates.nth(1);await first.locator('[name=modset_expand]').click();await expect(first.locator('.modset-text-row')).toHaveAttribute('data-expanded','true');expect((await first.locator('.modset-weights').boundingBox())!.height).toBeGreaterThan(31);await expect(second.locator('.modset-text-row')).toHaveAttribute('data-expanded','false');await page.reload();await expect(first.locator('[name=modset_expand]')).toHaveAttribute('aria-expanded','true');await first.locator('[name=modset_expand]').click();await expect(first.locator('.modset-text-row')).toHaveAttribute('data-expanded','false');
 await first.locator('[name=modset_choice]').click();await expect(page.locator('.paper-lane [data-tile-id]').first()).toBeVisible();
});
