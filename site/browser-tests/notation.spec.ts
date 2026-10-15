import {test,expect} from '@playwright/test';

test('CRT indices above nine remain wholly inside the rendered subscript',async({page})=>{
 await page.goto('/?lang=ja&crt_a=5&crt_b=2');
 const rows=page.locator('.crt-example [data-crt-mod]');
 await expect(rows).toHaveCount(18);
 for(const index of [10,17]){
  const row=rows.nth(index);
  // Reading the subscript group catches r_10 rendering as subscript 1 plus baseline 0.
  for(const cell of [3,4]){
   const formula=row.locator('td').nth(cell-1).locator('.katex').first();
   await expect(formula.locator('.msupsub').first()).toHaveText(String(index));
  }
 }
 await expect(page.locator('.katex-error')).toHaveCount(0);
});

test('modulus labels use spacing without a visible comma',async({page})=>{
 await page.goto('/?lang=ja');
 const labels=page.locator('.crt-example [data-crt-mod] th .katex');
 await expect(labels).toHaveCount(18);
 for(const label of await labels.all()){
  await expect(label).toHaveText(/^mod\s*\d+$/);
  expect(await label.textContent()).not.toContain(',');
  expect(await label.locator('.mpunct').count()).toBe(0);
 }
 await page.locator('.paper-lane .law-button[data-tile-modulus="79"]').click();
 await expect(page.locator('[data-number-line=awe] h3 .katex')).toHaveText(/^mod\s*79$/);
 const tileLabels=page.locator('.paper-lane .law-button .katex').filter({hasText:/^mod/});
 expect(await tileLabels.count()).toBeGreaterThan(0);
 for(const label of await tileLabels.all())expect(await label.textContent()).not.toContain(',');
});
