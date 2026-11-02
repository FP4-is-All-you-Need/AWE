import {test,expect} from '@playwright/test';
test('the cheapest undominated candidate is the default; a pick moves the list, the zoomed band and the URL together',async({page})=>{
 await page.goto('/?lang=ja&section=polar-periodic&polar_modulus=343&polar_count=400');
 const buttons=page.locator('.polar-candidates button');
 await expect(buttons.first()).toHaveClass(/selected/,{timeout:30000});
 const first=(await buttons.first().getAttribute('title'))!.split(' ')[0];
 const zoom=page.getByRole('button',{name:'選択した法を拡大'});await zoom.click();await zoom.click();
 await expect(page.locator('[data-ribbon-option][data-active="true"]')).toHaveAttribute('data-form',first);
 const second=(await buttons.nth(1).getAttribute('title'))!.split(' ')[0];
 await buttons.nth(1).click();
 await expect(buttons.nth(1)).toHaveClass(/selected/);
 await expect(page.locator('[data-ribbon-option][data-active="true"]')).toHaveAttribute('data-form',second);
 expect(new URL(page.url()).searchParams.get('polar_form')).toBe(second);
});
