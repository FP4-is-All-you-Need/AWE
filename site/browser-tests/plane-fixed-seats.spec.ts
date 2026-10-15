import {test,expect} from '@playwright/test';
const id='awe1_1656e4b7feacd47cbaa916a1ab39ffcdaf195a7de5d6093418e13e4d0c5e4136';
for(const lang of ['en','ja'])for(const width of [1440,390])test(`plane values keep eight signed seats ${lang} ${width}`,async({page})=>{
 test.setTimeout(120000);await page.setViewportSize({width,height:1000});await page.emulateMedia({reducedMotion:'reduce'});await page.goto(`/?crt=0&b=6&integer_id=${id}&lang=${lang}`);
 const detail=page.locator('.integer-detail .construction-detail');await expect(detail).toBeVisible({timeout:30000});await detail.locator('details[data-section^="flow."] > summary').click();const sets=detail.locator('[data-plane-sets=A]');await expect(sets).toHaveAttribute('data-plane-sets-complete','true');
 const geometry=()=>sets.locator('[data-plane-sign]').evaluateAll(ns=>ns.map(n=>[...n.querySelectorAll('[data-value-seat]')].map(e=>{const r=e.getBoundingClientRect();return{value:Number(e.getAttribute('data-value-seat')),x:r.x,width:r.width};})));
 const before=await geometry();expect(before).toHaveLength(10);for(const row of before){expect(row.map(s=>s.value)).toEqual([0,1,2,3,4,6,8,12]);for(let i=0;i<8;i++){expect(row[i].width).toBe(28);expect(Math.abs(row[i].x-before[0][i].x)).toBeLessThan(.5);}}
 // This saved encoder uses +8 on F1, but not -8: the two seats must differ.
 await expect(sets.locator('[data-plane-diff="0"] [data-value="8"]')).toHaveAttribute('data-diff','same');await expect(sets.locator('[data-plane-diff="0"] [data-value="-8"]')).toHaveAttribute('data-diff','absent');
 await sets.locator('[name=plane_remove_value][value="0:8"]').click();await expect(sets.locator('[data-plane-diff="0"] [data-value="8"]')).toHaveAttribute('data-diff','removed');expect(await geometry()).toEqual(before);await expect(sets.locator('[data-plane-diff="0"] [data-value="8"] .mord')).toHaveCSS('text-decoration-line','line-through');
 expect(await sets.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await sets.screenshot({path:`build/screens/plane-fixed-seats-${lang}-${width}.png`});await page.reload();await expect(detail).toBeVisible({timeout:30000});await expect(sets.locator('[data-plane-diff="0"] [data-value="8"]')).toHaveAttribute('data-diff','removed');
});
