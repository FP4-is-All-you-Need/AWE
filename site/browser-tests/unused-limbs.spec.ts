import {test,expect} from '@playwright/test';
import fs from 'node:fs';
// Constructions on 2xE2M1 taken from the data: mod 4 and mod 5 with limbs of weight 0 that the site leaves out, and mod 289
// with a limb of weight 0 on side A that a plane uses, so it stays.
type Form={id:string;modulus:number;weights:{A:number[];B:number[]};plane_sets:{A:string[]}};
const forms:Form[]=JSON.parse(fs.readFileSync('../data/modular/forms-index.json','utf8')).chunks
 .flatMap((c:{path:string})=>JSON.parse(fs.readFileSync('../data/modular/'+c.path,'utf8')).solutions);
const pick=(m:number,zero:(f:Form)=>boolean)=>forms.filter(f=>f.modulus===m&&f.plane_sets.A[0]==='2xE2M1'&&zero(f)).map(f=>f.id).sort()[0];
const MOD4=pick(4,f=>[...f.weights.A,...f.weights.B].some(w=>w%4===0));
const MOD5=pick(5,f=>[...f.weights.A,...f.weights.B].some(w=>w%5===0));
const MOD289=pick(289,f=>f.weights.A[0]%289===0);
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
 const row=page.locator('[data-prime-forms-detail] tr[data-prime-form]').first();await expect(row.locator('td').nth(2)).toHaveText('1');await row.locator('button').click();
 await expect(page.locator('[data-section^="prime.form.detail."]').first().locator('select[name=product_index] option')).toHaveCount(2);
 const tip=lang==='en'?'Products 1 · Planes A / B 1 / 1':'積 1 · 面 A / B 1 / 1';
 for(const query of ['prime_set=fp6&periodic_fp6=8xE2M3&',''] as const){
  await page.goto(`/?lang=${lang}&${query}section=polar-periodic&polar_modulus=4`);
  const detail=page.locator('[data-polar-form-detail] [data-section^="polar.detail."]');await expect(detail).toHaveCount(1,{timeout:30000});
  await expect(detail.locator('select[name=product_index] option')).toHaveCount(2);
  await expect(page.locator('[data-ribbon-modulus="4"] title').first()).toContainText(tip);
 }
 // FP4 mod 4: the row that equals another once its unused limbs are left out is not a separate candidate.
 await page.locator('aside.polar-detail input[type=checkbox]').first().check();
 await expect(page.locator(`.polar-candidates button[data-polar-candidate="${MOD4}"]`)).toHaveCount(0);
 await expect(page.locator('.polar-candidates button')).not.toHaveCount(0);
 expect(errors).toEqual([]);
});
