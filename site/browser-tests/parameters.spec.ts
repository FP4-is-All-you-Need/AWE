import {openSwap} from './swap-test-helpers.ts';
import {test,expect} from '@playwright/test';
test('named controls and every slider restore selected detail, encoding and sections from URL',async({page})=>{
 await page.goto('/?lang=ja');await page.locator('.paper-lane').getByRole('button',{name:'法 81 3積',exact:true}).click();
 const detail=page.locator('.paper-lane .construction-detail');await detail.locator('select[name=product_index]').selectOption('2');await detail.locator('input[name=plane_values]').check();
 await detail.locator('.encoding > summary').click();await detail.locator('[name=encode_value]').fill('103');await detail.locator('[name=encode_side]').selectOption('B');await detail.locator('[name=encode_zoom]').fill('70');
 await openSwap(page);await page.locator('[name=same_modulus]').uncheck();await page.locator('select[name=prime]').selectOption('3');
 await page.locator('.coverage-controls > summary').click();await page.locator('[name=hole_pct_max]').fill('2.25');
 const id=await detail.locator('[data-expansion]').getAttribute('data-expansion');const url=page.url();expect(url).toContain('encode_zoom.'+id+'=70');
 await page.reload();await expect(detail.locator('[data-expansion]')).toHaveAttribute('data-expansion',id!);await expect(detail.locator('select[name=product_index]')).toHaveValue('2');await expect(detail.locator('[name=plane_values]')).toBeChecked();
 await expect(detail.locator('.encoding')).toHaveAttribute('open','');await expect(detail.locator('[name=encode_value]')).toHaveValue('103');await expect(detail.locator('[name=encode_side]')).toHaveValue('B');await expect(detail.locator('[name=encode_zoom]')).toHaveValue('70');await expect(page.locator('[name=same_modulus]')).not.toBeChecked();await expect(page.locator('select[name=prime]')).toHaveValue('3');await expect(page.locator('[name=hole_pct_max]')).toHaveValue('2.25');
 await detail.screenshot({path:'build/screens/url.png'});
 await page.evaluate(()=>document.querySelectorAll('details').forEach(d=>d.open=true));
 const missing=await page.locator('input,select,button').evaluateAll(nodes=>nodes.filter(n=>!(n as HTMLInputElement).name||!(n as HTMLInputElement).form).map(n=>n.outerHTML));expect(missing).toEqual([]);
 const unpaired=await page.locator('input[type=range]').evaluateAll(nodes=>nodes.filter(n=>{const input=n as HTMLInputElement;const name=input.name.replace(/_range$/,'');return !input.form?.querySelector(`input[type=number][name="${name}"]`);}).map(n=>(n as HTMLInputElement).name));expect(unpaired).toEqual([]);
});
