import {test,expect} from '@playwright/test';

test('English default, Japanese menu and URL preserve live construction details',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');
 const lang=page.locator('select[name=lang]'),detail=page.locator('.paper-lane .construction-detail');
 await expect(lang).toHaveValue('en');await expect(page.locator('html')).toHaveAttribute('lang','en');
 await expect(page.locator('.paper-controls').first()).toContainText('Precision');
 await expect(detail.locator('summary').first()).toContainText('details');
 const before=await detail.locator('.equation .katex').textContent();
 await lang.selectOption('ja');await expect(page.locator('html')).toHaveAttribute('lang','ja');
 await expect(page.locator('.paper-controls').first()).toContainText('精度');await expect(detail.locator('summary').first()).toContainText('の詳細');
 expect(page.url()).toContain('lang=ja');expect(await detail.locator('.equation .katex').textContent()).toBe(before);
 await page.locator('.paper-lane').getByRole('button',{name:'法 81 3積',exact:true}).click();await expect(detail.locator('summary').first()).toContainText('81');
 await lang.selectOption('en');await expect(detail.locator('summary').first()).toContainText('details');
 await page.locator('input[name=b]').fill('85');await expect(page.locator('.workspace-main > p').filter({hasText:'Not recorded'})).toContainText('Not recorded');
 await page.goto('/?lang=ja&b=53');await expect(lang).toHaveValue('ja');await expect(page.locator('.paper-controls').first()).toContainText('精度');
 await lang.selectOption('en');await page.locator('input[name=plane_values]').check();
 await page.evaluate(()=>document.querySelectorAll('details').forEach(d=>d.open=true));
 await expect.poll(()=>page.evaluate(()=>{const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT),bad:string[]=[];while(w.nextNode()){const n=w.currentNode;if(!n.parentElement?.closest('[data-no-i18n],script,style')&&/[\u3041-\u3096\u30a1-\u30fa\u3400-\u9fff]/.test(n.textContent??''))bad.push(n.textContent??'');}return [...new Set(bad)];})).toEqual([]);
 expect(errors).toEqual([]);
});
