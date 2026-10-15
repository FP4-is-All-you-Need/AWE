import {openSwap} from './swap-test-helpers.ts';
import {test,expect} from '@playwright/test';
test('costs change candidate order and explicit overlap with URL persistence',async({page})=>{
 await page.goto('/?lang=ja&matrix_m=64&matrix_n=64&K=64');await page.locator('.cost-controls > summary').click();
 await openSwap(page);await page.locator('input[name=same_modulus]').uncheck();
 for(const key of ['product','plane','add','correction','frequency','modulus','output'])await page.locator(`input[name=cost_${key}]`).fill(key==='product'?'1':'0');
 await page.locator('select[name=cost_addition_model]').selectOption('naive');
 const a='awem1_5e3289496ecd591f833bfb95d336ceb9ae018c4888c08cfe2ede554d884a32b1',b='awem1_3b16c4ca9fbcb32e6a1f17c00ecafeb39647cbcf4843e5347d763951487bb694';
 const order=()=>page.locator('[data-candidate]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-candidate')));
 const first=await order();expect(first.indexOf(a)).toBeGreaterThanOrEqual(0);expect(first.indexOf(a)).toBeLessThan(first.indexOf(b));
 const target=page.locator(`[data-candidate="${a}"] [data-cost-total]`);const before=Number(await target.getAttribute('data-cost-total'));
 await page.locator('input[name=cost_plane]').fill('1000');const next=await order();expect(next.indexOf(a)).toBeGreaterThan(next.indexOf(b));expect(Number(await target.getAttribute('data-cost-total'))).toBeGreaterThan(before);
 await page.locator('select[name=cost_model]').selectOption('max');await page.locator('input[name=cost_overlap_1]').fill('1');
 expect(Number(await target.getAttribute('data-cost-total'))).toBeGreaterThan(0);
 await expect(page.locator('.cost-breakdown,[data-cost-term]')).toHaveCount(0);
 await page.reload();await expect(page.locator('input[name=cost_plane]')).toHaveValue('1000');await expect(page.locator('select[name=cost_model]')).toHaveValue('max');await expect(page.locator('input[name=cost_overlap_1]')).toHaveValue('1');
});
