import {test,expect} from '@playwright/test';
const set='awemfs2_901e24fa7687e5a9a64a46546750a6550eb05bd56e94ca605d683a925a3869d3';
for(const lang of ['en','ja'])for(const width of [1440,390])test(`the selected FP6 set is drawn as a row of modulus cards like the FP4 sets ${lang} ${width}`,async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width,height:1000});await page.goto(`/?prime_set=fp6&fp6_modset_id=${set}&lang=${lang}`);
 const lane=page.locator('[data-section="main"].paper-lane'),tiles=lane.locator('[data-tile-id]'),detail=lane.locator('details.construction-detail');
 await expect(tiles).toHaveCount(19,{timeout:30000});
 const moduli=await tiles.evaluateAll(n=>n.map(e=>Number(e.getAttribute('data-tile-modulus'))));expect(moduli).toEqual([...moduli].sort((a,b)=>a-b));
 const lefts=await tiles.evaluateAll(n=>new Set(n.map(e=>Math.round(e.getBoundingClientRect().left))).size);expect(lefts).toBeGreaterThan(1);
 await expect(detail).toBeVisible();await expect(detail.locator('summary').first()).toContainText(String(moduli[0]));
 // K 8192 is accumulated in segments of at most the FP32 limit 4660 of the constructions.
 await expect(lane.locator('[data-k-segments="2"]')).toContainText(lang==='en'?'accumulates K = 8192 in 2 segments of at most 4660':'K = 8192 を、4660 以下の 2 区切り');
 await tiles.nth(15).click();await expect(page).toHaveURL(/fp6_slot=15/);await expect(detail.locator('summary').first()).toContainText(String(moduli[15]));
 // Choosing another set opens its first card again, as on the FP4 page.
 await page.locator(`[data-saved-modset]:not([data-saved-modset="${set}"]) [name=modset_choice]`).first().click();await expect(page).toHaveURL(/fp6_slot=0/);
 const first=await tiles.first().getAttribute('data-tile-modulus');await expect(detail.locator('summary').first()).toContainText(first!);
 expect(errors).toEqual([]);
});
