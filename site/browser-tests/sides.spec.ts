import {test,expect} from '@playwright/test';

const same='awe1_0004438bb043e0f33e557acff5a0c30b97a42c32e3f97f54a1e21dc715f7e62e';
const different='awe1_133d38be9b31e5c3deeef7544b97fc8b71bf422c315b23db42b5d0963d5f2432';
const selected=(page:import('@playwright/test').Page)=>page.locator('.integer-results .construction-detail');
const openFlow=async(detail:import('@playwright/test').Locator,id:string)=>{
 await detail.locator(`details[data-section="flow.${id}"] > summary`).click();
};

for(const lang of ['ja','en'])test(`identical canonical sides disclose B on demand ${lang}`,async({page})=>{
 await page.goto(`/?lang=${lang}&crt=0&b=7&same_inputs=1&width_results=1&integer_id=${same}`);
 const detail=selected(page);await expect(detail).toBeVisible();await openFlow(detail,same);
 const a=detail.locator('[data-plane-flow=A]'),b=detail.locator('[data-plane-flow=B]');
 const disclosure=detail.locator('details[data-side-details=B][data-side-kind=flow]');
 await expect(a).toBeVisible();await expect(b).not.toBeVisible();
 await expect(disclosure).toHaveAttribute('data-sides-identical','true');
 await expect(disclosure.locator(':scope > summary')).toHaveText(lang==='ja'?'B（A と同じ）':'B (same as A)');
 await disclosure.locator(':scope > summary').click();await expect(b).toBeVisible();
 expect(await b.locator('[data-flow-plane]').count()).toBe(await a.locator('[data-flow-plane]').count());
 expect(await b.getAttribute('data-flow-weights')).toBe(await a.getAttribute('data-flow-weights'));
 const formulae=async(flow:import('@playwright/test').Locator)=>flow.locator('[data-flow-destination] .katex-html').allTextContents();
 expect((await formulae(a)).length).toBeGreaterThan(0);
 expect((await formulae(a)).map(s=>s.replaceAll('a','b'))).toEqual(await formulae(b));
});

test('different canonical sides keep both flows visible',async({page})=>{
 await page.goto(`/?lang=ja&crt=0&b=7&same_inputs=1&width_results=1&integer_id=${different}`);
 const detail=selected(page);await expect(detail).toBeVisible();await openFlow(detail,different);
 const disclosure=detail.locator('details[data-side-details=B][data-side-kind=flow]');
 await expect(disclosure).toHaveAttribute('data-sides-identical','false');
 await expect(detail.locator('[data-plane-flow=A]')).toBeVisible();
 await expect(detail.locator('[data-plane-flow=B]')).toBeVisible();
});

test('separate inputs keep identical sides open',async({page})=>{
 await page.goto(`/?lang=ja&crt=0&b=7&same_inputs=0&width_results=1&integer_id=${same}`);
 const detail=selected(page);await expect(detail).toBeVisible();await openFlow(detail,same);
 await expect(detail.locator('[data-plane-flow=A]')).toBeVisible();
 await expect(detail.locator('[data-plane-flow=B]')).toBeVisible();
});
