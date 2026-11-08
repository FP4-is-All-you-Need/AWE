import {test,expect} from '@playwright/test';
const MOD4='awem2_9fa03837b87f9434b814387179b281d44d91951eaf444ae48f1f34cfe6732435';
const MOD5='awem2_50b57013f125cde2ff48befffb30ec4fb9e4912029b5561c36f8ee9d45adf909';
const MOD289='awem2_643f91c4502d4b84a002bd62bc59067a05e1428d003b770e47089314c1faefab';
const open=(lang:string,m:number,id:string)=>`/?lang=${lang}&section=modular-forms&open.modular-forms=1&forms_m=${m}&forms_id=${id}`;
for(const lang of ['en','ja'])test(`a selected construction leaves out unused limbs of weight 0 and notes the kept ones (${lang})`,async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 for(const [m,id] of [[4,MOD4],[5,MOD5]] as const){
  await page.goto(open(lang,m,id));
  const detail=page.locator(`[data-selected-form="${id}"]`);await expect(detail).toHaveCount(1,{timeout:30000});
  await expect(detail.locator('[data-limb-weights]')).toHaveCount(1);
  await expect(detail.locator('[data-limb-weights]')).not.toContainText('0');
  await expect(detail.locator('[data-omitted-limbs]')).toHaveText(lang==='en'?'Unused limbs are omitted.':'使われないリムを省いて表示しています。');
  await expect(detail.locator('[data-zero-weight]')).toHaveCount(0);
  await expect(detail.locator('select[name=product_index] option')).toHaveCount(2);
 }
 // The omitted form of mod 4 equals a listed one, so the list shows it once; its id still opens it.
 await page.goto(open(lang,4,MOD4));
 await expect(page.locator('[data-forms-table] tbody tr').first()).toBeVisible({timeout:30000});
 await expect(page.locator(`[data-form="${MOD4}"]`)).toHaveCount(0);
 await expect(page.locator(`[data-selected-form="${MOD4}"]`)).toHaveCount(1);
 await page.goto(open(lang,289,MOD289));
 const detail=page.locator(`[data-selected-form="${MOD289}"]`);await expect(detail).toHaveCount(1,{timeout:30000});
 await expect(detail.locator('[data-limb-weights]')).toContainText('0');
 await expect(detail.locator('[data-zero-weight]')).toHaveAttribute('data-zero-weight','a_{0}');
 await expect(detail.locator('[data-zero-weight]')).toContainText(lang==='en'?'stands for a multiple of the modulus':'の重み 0 は法の倍数を表します');
 await expect(detail.locator('[data-omitted-limbs]')).toHaveCount(0);
 expect(errors).toEqual([]);
});
for(const lang of ['en','ja'])test(`periodic cells and the spiral count a construction as it opens (${lang})`,async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 // FP6 mod 4 needs one product once the limb that is always 0 is left out.
 await page.goto(`/?lang=${lang}&prime_set=fp6&periodic_fp6=8xE2M3`);
 const cell=page.locator('.prime-table [data-prime-modulus="4"]').first();await expect(cell).toHaveCount(1,{timeout:30000});
 await expect(cell.locator('title')).toContainText(lang==='en'?'single construction 1 products':'単独の法の構成 1積');
 await cell.click();
 await expect(page.locator('[data-prime-forms-detail] tr[data-prime-form] td').nth(2)).toHaveText('1');
 await expect(page.locator('[data-section^="prime.detail."]').first().locator('select[name=product_index] option')).toHaveCount(2);
 const tip=lang==='en'?'Products 1 · Planes A / B 1 / 1':'積 1 · 面 A / B 1 / 1';
 for(const query of ['prime_set=fp6&periodic_fp6=8xE2M3&',''] as const){
  await page.goto(`/?lang=${lang}&${query}section=polar-periodic&polar_modulus=4`);
  const detail=page.locator('[data-polar-form-detail] [data-section^="polar.detail."]');await expect(detail).toHaveCount(1,{timeout:30000});
  await expect(detail.locator('select[name=product_index] option')).toHaveCount(2);
  await expect(page.locator('[data-ribbon-modulus="4"] title').first()).toContainText(tip);
 }
 // FP4 mod 4: the row that equals another once its unused limbs are left out is not a separate candidate.
 await page.locator('aside.polar-detail input[type=checkbox]').first().check();
 await expect(page.locator('.polar-candidates button[title^="awem2_9fa03837"]')).toHaveCount(0);
 await expect(page.locator('.polar-candidates button')).not.toHaveCount(0);
 expect(errors).toEqual([]);
});
