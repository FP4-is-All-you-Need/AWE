import {test,expect,type Page} from '@playwright/test';

async function thinPaths(page:Page){
 const braces=page.locator('[data-group-brace]');await expect(braces).toHaveCount(8);
 const paths=await braces.locator('path').evaluateAll(nodes=>nodes.map(n=>({stroke:getComputedStyle(n).strokeWidth,fill:getComputedStyle(n).fill,vector:n.getAttribute('vector-effect'),color:getComputedStyle(n).stroke,parentColor:getComputedStyle(n.closest('[data-group-brace]')!).color})));
 for(const p of paths){expect(Number.parseFloat(p.stroke)).toBe(1.1);expect(p.fill).toBe('none');expect(p.vector).toBe('non-scaling-stroke');expect(p.color).toBe(p.parentColor);}
 await expect(braces.first().locator('.brace-metric')).toHaveCSS('visibility','hidden');
}

test('symbolic and concrete braces use constant thin strokes',async({page})=>{
 await page.goto('/?lang=en');await page.locator('[data-group-brace]').first().waitFor();await page.evaluate(()=>document.fonts.ready);await thinPaths(page);
 const geometry=await page.locator('[data-group-brace]').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect(),c=getComputedStyle(n);return {width:r.width,height:r.height,color:c.color,weight:c.fontWeight};}));
 expect(geometry).toHaveLength(8);
 for(const g of geometry){expect(g.width).toBeGreaterThan(0);expect(g.height).toBeGreaterThan(0);expect(g.weight).toBe('400');}
 for(const kind of ['base13','awe'])await page.locator(`[data-matrix-diagram=${kind}]`).screenshot({path:`build/screens/braces-after-${kind}.png`});
 await page.locator('[data-matrix-diagram=awe] [data-numeric-reconstruction-row="1"]').click();await expect(page.locator('[data-matrix-diagram=awe] [data-numeric-product="1"]')).toHaveAttribute('aria-pressed','true');await thinPaths(page);
});

test('more reconstruction rows and narrow screens do not thicken braces',async({page})=>{
 await page.goto('/?lang=ja');await page.locator('.paper-lane [data-tile-modulus="103"]').click();await thinPaths(page);
 const awe=page.locator('[data-matrix-diagram=awe]');await expect(awe.locator('[data-numeric-reconstruction-row]')).toHaveCount(4);
 await expect(awe.locator('[data-group-brace]').first()).toHaveCSS('font-size','152px');
 await page.locator('[name=contents_toggle]').click();await page.setViewportSize({width:390,height:844});await thinPaths(page);
 await page.locator('[name=example_matrix_a]').fill('1 2\n3 4');await expect(awe.locator('[data-result]')).toHaveAttribute('data-matches','true');await thinPaths(page);
});

test('flow braces and compact sum braces use normal math weight',async({page})=>{
 await page.goto('/?lang=en');await page.locator('.paper-lane details[data-section^="flow."] > summary').click();
 const flow=page.locator('[data-plane-flow=A]');await expect(flow).toBeVisible();
 const inspect=async(selector:string)=>page.locator(selector).evaluateAll(nodes=>nodes.filter(n=>n.textContent==='{'||n.textContent==='}').map(n=>({weight:getComputedStyle(n).fontWeight,stroke:getComputedStyle(n).webkitTextStrokeWidth})));
 const braces=await inspect('[data-plane-flow=A] .katex .mopen,[data-plane-flow=A] .katex .mclose');expect(braces.length).toBeGreaterThanOrEqual(6);
 for(const b of braces){expect(b.weight).toBe('400');expect(b.stroke).toBe('0px');}
 await flow.screenshot({path:'build/screens/braces-after-flow.png'});
 await page.locator('.paper-lane [name=expansion_layout]').selectOption('compact');
 const sum=await inspect('[data-compact-expansion] .katex .mopen,[data-compact-expansion] .katex .mclose');
 expect(sum.length).toBeGreaterThan(0);for(const b of sum){expect(b.weight).toBe('400');expect(b.stroke).toBe('0px');}
 await expect(page.locator('.katex-error')).toHaveCount(0);
});
