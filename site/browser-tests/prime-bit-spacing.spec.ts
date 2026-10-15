import {test,expect} from '@playwright/test';
import {primeGeometry} from './primeGeometry.ts';
for(const lang of ['en','ja'])for(const width of [1440,390])test(`prime cells are square and keep number and bit labels close ${lang} ${width}`,async({page})=>{
 await page.setViewportSize({width,height:1000});await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/?lang='+lang);await expect(page.locator('[data-prime-bits]')).toHaveCount(58);await page.evaluate(()=>document.fonts.ready);
 const pairs=await page.locator('[data-prime-modulus]').evaluateAll(primeGeometry);
 for(const p of pairs){expect(p.overflow,JSON.stringify(p)).toEqual([]);expect(p.collisions,JSON.stringify(p)).toEqual([]);expect(p.numberBits).toBeGreaterThanOrEqual(0);expect(p.numberBits).toBeLessThanOrEqual(4);expect(p.bitsUnit).toBeGreaterThanOrEqual(0);expect(p.bitsUnit).toBeLessThanOrEqual(2);expect(p.centerOffset).toBeLessThan(.5);expect(p.height).toBe(60);expect(p.height/p.width).toBeLessThanOrEqual(1.1);expect(Math.min(...p.fonts)).toBeGreaterThanOrEqual(14);}
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.locator('[data-prime-modulus="343"]').click();await expect(page.locator('[data-prime-cards="343"] [data-prime-weight-card]')).toHaveCount(5);
 await page.locator('.prime-table-figure').screenshot({path:`build/screens/prime-compact-${lang}-${width}.png`});
});
