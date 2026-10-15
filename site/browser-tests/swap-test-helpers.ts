import type {Page} from '@playwright/test';
export async function openSwap(page:Page){
 const toggle=page.locator('[name=swap_toggle]');
 if(await toggle.getAttribute('aria-expanded')!=='true')await toggle.click();
}
