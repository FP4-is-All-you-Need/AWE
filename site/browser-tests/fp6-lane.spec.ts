import {test,expect} from '@playwright/test';
const set='awemfs2_901e24fa7687e5a9a64a46546750a6550eb05bd56e94ca605d683a925a3869d3';
for(const lang of ['en','ja'])test(`the selected FP6 set is drawn as a row of modulus cards like the FP4 sets ${lang}`,async({page})=>{
 await page.goto(`/?prime_set=fp6&fp6_modset_id=${set}&lang=${lang}`);
 const lane=page.locator('[data-section="main"].paper-lane'),tiles=lane.locator('[data-tile-id]');
 await expect(tiles).toHaveCount(19,{timeout:30000});
 const lefts=await tiles.evaluateAll(n=>new Set(n.map(e=>Math.round(e.getBoundingClientRect().left))).size);expect(lefts).toBeGreaterThan(1);
 await expect(lane.locator('details.construction-detail')).toBeVisible();
 await tiles.nth(15).click();await expect(page).toHaveURL(/fp6_slot=15/);await expect(lane.locator('details.construction-detail')).toContainText('1319');
});
