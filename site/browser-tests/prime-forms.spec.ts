import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
const index=JSON.parse(readFileSync(new URL('../../data/modular/forms-index.json',import.meta.url),'utf8'));
const best=(m:number,sets:string[],kind:string)=>index.prime_powers.filter((p:any)=>p.modulus===m&&sets.includes(p.value_set)&&p.kind===kind).map((p:any)=>p.products).sort((a:number,b:number)=>a-b)[0];
for(const lang of ['en','ja'])for(const width of [1440,390])test(`periodic table layers single constructions, FP6 tab and holes ${lang} ${width}`,async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width,height:1000});await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/?lang='+lang);
 const table=page.locator('.prime-table');await expect(table.locator('[name=prime_forms]')).toBeChecked();
 // 23^2 = 529 appears in the column of 23 with a single construction without holes
 const c529=table.locator('[data-prime-modulus="529"]');await expect(c529).toHaveAttribute('data-prime-base','23');await expect(c529).toHaveAttribute('data-exponent','2');
 await expect(c529).toHaveAttribute('data-forms','hole_free');await expect(c529.locator('[data-prime-forms-marker]')).toHaveCount(1);
 for(const m of [512,625])await expect(table.locator(`[data-prime-modulus="${m}"]`)).toHaveAttribute('data-forms-fewer','true');
 // 2401: the published single constructions do not have fewer products; one left out of the published data does
 await expect(table.locator('[data-prime-modulus="2401"]')).toHaveAttribute('data-forms-fewer','false');await expect(table.locator('[data-prime-modulus="2401"]')).toHaveAttribute('data-forms-excluded-fewer','true');
 await c529.click();await expect(table.locator('[data-prime-forms-detail] [data-kind=hole_free]').first()).toContainText(String(best(529,['2xE2M1'],'hole_free')));
 // primes above the last column are listed after the table; hiding holes removes the ones with holes only
 const beyond=table.locator('[data-prime-beyond-list]');await expect(beyond).not.toHaveAttribute('open','');await beyond.locator(':scope > summary').click();await expect(beyond.locator('[data-prime-beyond="1597"]')).toHaveCount(1);
 await expect(beyond.locator('[data-prime-beyond="163"]')).toHaveAttribute('data-forms','holes');
 await table.locator('[name=prime_holes]').uncheck();await expect(beyond.locator('[data-prime-beyond="163"]')).toHaveCount(0);
 expect(new URL(page.url()).searchParams.get('prime_holes')).toBe('0');await table.locator('[name=prime_holes]').check();
 // FP6: the union, with 1024 marked as hole-free only on FP6 and with a fewer-product construction outside the published data
 await table.locator('[name=prime_set]').selectOption('fp6');await expect(table.locator(':scope > summary')).toContainText('FP6');
 const c1024=table.locator('[data-prime-modulus="1024"]');await expect(c1024).toHaveAttribute('data-forms-only-wider','true');await expect(c1024).toHaveAttribute('data-forms-excluded-fewer','true');
 await expect(table.locator('[data-prime-modulus="529"]')).toHaveAttribute('data-forms','hole_free');
 await c1024.click();await expect(table.locator('[data-prime-form-reason]')).toHaveCount(1);
 await table.screenshot({path:`build/screens/prime-forms-fp6-${lang}-${width}.png`});
 await expect(table.locator('[data-prime-forms-detail] [data-kind=hole_free]').first()).toContainText(String(best(1024,['2xE2M1','8xE2M3','16xE3M2'],'hole_free')));
 await table.locator('[name=prime_forms]').uncheck();await expect(table.locator('[data-prime-forms-marker]')).toHaveCount(0);await expect(beyond).toHaveCount(0);
 await table.locator('[name=prime_forms]').check();await table.locator('[name=prime_set]').selectOption('fp4');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await table.screenshot({path:`build/screens/prime-forms-${lang}-${width}.png`});
 await expect(table.locator('.katex-error')).toHaveCount(0);expect(errors).toEqual([]);
});
