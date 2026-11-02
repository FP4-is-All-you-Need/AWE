import {test,expect} from '@playwright/test';
for(const lang of ['en','ja'])for(const width of [1440,390])test(`each modulus set shows its choice and the entries that fit whole on one line ${lang} ${width}`,async({page})=>{
 await page.setViewportSize({width,height:1000});await page.emulateMedia({reducedMotion:'reduce'});await page.goto(`/?lang=${lang}`);
 const outer=page.locator('.modset-catalog');await expect(outer).toHaveAttribute('open','');const candidates=outer.locator('[data-saved-modset]');await expect(candidates).toHaveCount(8);
 for(const candidate of await candidates.all()){
  await expect(candidate.locator('[name=modset_choice]')).toBeVisible();const row=candidate.locator('.line-fold');await expect(row).toHaveAttribute('data-expanded','false');
  const s=await row.evaluate(n=>{const box=(e:Element)=>{const r=e.getBoundingClientRect();return {top:r.top,bottom:r.bottom,right:r.right,height:r.height};};
   const list=n.querySelector('.line-fold-items')!,items=box(list),choice=box(n.querySelector('[name=modset_choice]')!),toggle=n.querySelector('.line-fold-toggle')!;
   const entries=[...list.children].map(c=>({shown:getComputedStyle(c).visibility!=='hidden',right:c.getBoundingClientRect().right}));
   return {items:items.height,delta:Math.abs(items.top-box(toggle).top),sameLine:choice.bottom>items.top&&items.bottom>choice.top,shown:entries.filter(e=>e.shown).length,cut:entries.filter(e=>e.shown&&e.right>items.right+.5).length,total:entries.length,more:getComputedStyle(toggle).visibility!=='hidden'};});
  expect(s.items).toBe(30);expect(s.delta).toBeLessThan(1);expect(s.cut).toBe(0);expect(s.more).toBe(s.shown<s.total);
  if(width===1440){expect(s.sameLine).toBe(true);expect(s.shown).toBeGreaterThan(0);}
 }
 const first=candidates.first(),second=candidates.nth(1),row=first.locator('.line-fold');
 await first.locator('[name=modset_expand]').click();await expect(row).toHaveAttribute('data-expanded','true');await expect(first.locator('[data-beyond-line]')).toHaveCount(0);
 const open=await row.evaluate(n=>{const items=n.querySelector('.line-fold-items')!.getBoundingClientRect(),lead=n.querySelector('.line-fold-lead')!.getBoundingClientRect();return {height:items.height,top:items.top,lead:lead.bottom};});
 expect(open.height).toBeGreaterThan(31);expect(open.top).toBeGreaterThanOrEqual(open.lead-1);await expect(second.locator('.line-fold')).toHaveAttribute('data-expanded','false');
 await page.reload();await expect(first.locator('[name=modset_expand]')).toHaveAttribute('aria-expanded','true');await first.locator('[name=modset_expand]').click();await expect(row).toHaveAttribute('data-expanded','false');
 const hidden=await row.getAttribute('data-hidden-count');await page.setViewportSize({width:width===1440?390:1440,height:1000});await expect(row).not.toHaveAttribute('data-hidden-count',hidden!);await page.setViewportSize({width,height:1000});
 await first.locator('[name=modset_choice]').click();await expect(page.locator('.paper-lane [data-tile-id]').first()).toBeVisible();
});
