import {test,expect} from '@playwright/test';
test('base-13 reference filters integer candidates, range sort and explicit product maximum survive reload',async({page})=>{
 test.setTimeout(90000);await page.goto('/?crt=0&b=7&lang=en');
 const count=page.locator('[data-integer-count]'),flag=page.locator('[name=show_worse_than_base13]');await expect(count).toBeVisible();await expect(flag).not.toBeChecked();
 const n=Number(await count.getAttribute('data-integer-count'));expect(Number(await count.getAttribute('data-hidden-count'))).toBeGreaterThan(0);await expect(count).toHaveAttribute('data-base13-products','9');
 expect(await page.locator('[data-integer-tile]').evaluateAll(nodes=>nodes.every(n=>Number(n.getAttribute('data-product-count'))<=9))).toBe(true);
 await flag.check();await expect.poll(async()=>Number(await count.getAttribute('data-integer-count'))).toBeGreaterThan(n);
 await page.locator('[name=integer_sort]').selectOption('range');
 await expect(page.locator('[data-integer-tile] .wider-range').first()).toBeVisible();
 const ranges=await page.locator('[data-integer-tile] [data-encoding-range]').evaluateAll(nodes=>nodes.map(n=>{const a=n.getAttribute('data-range-a')!.split(',').map(Number),b=n.getAttribute('data-range-b')!.split(',').map(Number);return (a[1]-a[0]+1)*(b[1]-b[0]+1);}));expect(ranges).toEqual([...ranges].sort((a,b)=>b-a));
 expect(await page.locator('[data-integer-tile]').evaluateAll(nodes=>nodes.every(n=>Number(n.getAttribute('data-product-count'))<=16))).toBe(true);
 await page.locator('.integer-results').screenshot({path:'build/screens/wider-range-en.png'});
 await page.reload();await expect(flag).toBeChecked();await expect(page.locator('[name=integer_sort]')).toHaveValue('range');
 await page.locator('[name=integer_products_max]').fill('24');await expect(page.locator('[data-integer-tile][data-product-count="24"]').first()).toBeVisible();
 await page.locator('[name=lang]').selectOption('ja');await expect(page.locator('.integer-filters')).toContainText('広い入力範囲用の構成も表示(16 積まで)');
});
test('CRT replacements use base-13 residue coverage and the same persistent flag',async({page})=>{
 await page.goto('/?lang=en');await page.locator('[name=swap_toggle]').click();const aside=page.locator('.candidates');await aside.locator('[name=same_modulus]').uncheck();
 await expect(aside.locator('[data-candidate]').first()).toBeVisible();expect(await aside.locator('[data-candidate]').evaluateAll(ns=>ns.every(n=>Number(n.getAttribute('data-product-count'))<=Number(n.getAttribute('data-base13-products'))))).toBe(true);
 const n=Number(await aside.locator('[data-candidate-count]').getAttribute('data-candidate-count'));await aside.locator('[name=show_worse_than_base13]').check();await expect.poll(async()=>Number(await aside.locator('[data-candidate-count]').getAttribute('data-candidate-count'))).toBeGreaterThanOrEqual(n);
 await page.reload();await expect(aside.locator('[name=show_worse_than_base13]')).toBeChecked();
});
test('M=11 includes the saved eleven-product construction within the sixteen-product figure reference',async({page})=>{
 test.setTimeout(90000);await page.goto('/?crt=0&b=10&lang=en');
 const count=page.locator('[data-integer-count]'),flag=page.locator('.integer-filters [name=show_worse_than_base13]');await expect(count).toBeVisible();await expect(count).toHaveAttribute('data-base13-products','16');
 await page.locator('[name=integer_weight]').fill('3,29,33,319');await page.locator('[name=integer_products_max]').fill('11');
 await flag.check();await expect(flag).toBeChecked();
 const tile=page.locator('[data-integer-tile="awe1_eaf15a3796a7864848862dd2f9b1f25b3887731e9f968cf4fbc99e18a4e9bc5f"]');
 await expect(tile).toBeVisible();await expect(tile).toHaveAttribute('data-product-count','11');await tile.click();await expect(tile).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('.integer-detail [data-limb-weights]')).toContainText('(3,29,33,319)');
 await page.reload();await expect(flag).toBeChecked();await expect(tile).toBeVisible();await expect(tile).toHaveAttribute('data-product-count','11');
});
