import {test,expect} from '@playwright/test';
for(const width of [1440,390])for(const lang of ['en','ja'])test(`weight candidate cards change with modulus ${width} ${lang}`,async({page})=>{
 await page.setViewportSize({width,height:1000});await page.emulateMedia({reducedMotion:'reduce'});await page.goto(`http://127.0.0.1:4173/?prime_forms=0&lang=${lang}`);
 const table=page.locator('.prime-table');await expect(table.locator('[data-prime-modulus]')).toHaveCount(58);
 for(const [m,n] of [[343,5],[8,1]]){
  await table.locator(`[data-prime-modulus="${m}"]`).click();const cards=table.locator('[data-prime-weight-card]');await expect(cards).toHaveCount(n);await expect(table.locator('[data-prime-cards]')).toHaveAttribute('data-inline',String(width===1440));
  for(let i=0;i<n;i++){const tile=cards.nth(i).locator('[data-tile-id]');await tile.click();await expect(table.locator('select[name=prime_construction]')).toHaveValue(await tile.getAttribute('data-tile-id')??'');await expect(tile.locator('[data-plane-total]')).toHaveText(lang==='en'?'Planes':'面');}
  if(width===1440){const collisions=await table.evaluate(t=>{const cards=t.querySelector('[data-prime-cards]')!.getBoundingClientRect();return [...t.querySelectorAll('[data-prime-frame]')].filter(n=>{const r=n.getBoundingClientRect();return r.left<cards.right&&r.right>cards.left&&r.top<cards.bottom&&r.bottom>cards.top;}).length;});expect(collisions).toBe(0);}
 }
 await page.locator('select[name=precision]').selectOption('fp32');await table.locator('[data-prime-modulus="73"]').click();await expect(table.locator('[data-prime-weight-card]')).not.toHaveCount(0);await expect(table.locator('[data-prime-enlarged]')).toHaveCount(0);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
