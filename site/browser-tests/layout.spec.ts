import {test,expect} from '@playwright/test';
test('日本語の操作図は横一列と角の形・文字の下限を保つ',async({page})=>{
 await page.goto('/?lang=ja&crt=0&b=7&integer_id=awe1_d323a4454c50d58cb90ee4d3d062025fe616b2f994dfb6d7d579615c4858161d');
 await page.locator('.integer-detail [data-expansion]').waitFor();
 await page.locator('[data-source-figure=figure4]').waitFor();await page.evaluate(()=>document.fonts.ready);
 expect(await page.locator('.katex-error').count()).toBe(0);
 const result=await page.locator('.integer-detail [data-expansion]').evaluate(svg=>({text:[...svg.querySelectorAll('.svg-math')].map(e=>parseFloat(getComputedStyle(e).fontSize)),corners:[...svg.querySelectorAll('rect')].every(e=>e.rx.baseVal.value===0&&e.ry.baseVal.value===0),shadow:getComputedStyle(svg).boxShadow,positions:svg.hasAttribute('data-paper-difference')?[...svg.querySelectorAll('[data-grid-cell]')].filter((_,i)=>i%9===0).map(e=>e.getBoundingClientRect().y):[...svg.querySelectorAll(':scope > g[data-product]')].map(e=>e.getBoundingClientRect().y)}));
 expect(result.text.every(n=>n>=14)).toBe(true);expect(result.corners).toBe(true);expect(result.shadow).toBe('none');expect(new Set(result.positions.map(n=>Math.round(n))).size).toBe(1);
 expect(await page.locator('.integer-detail p').first().evaluate(e=>parseFloat(getComputedStyle(e).fontSize))).toBeGreaterThanOrEqual(16);
 await page.setViewportSize({width:390,height:844});const expansion=page.locator('.integer-detail [data-expansion]');
 expect(await expansion.evaluate(e=>e.getBoundingClientRect().width)).toBeGreaterThan(950);
 expect(await expansion.locator('..').evaluate(e=>e.scrollWidth>e.clientWidth)).toBe(true);
 const map=await page.locator('[data-map-cell]').first().evaluate(e=>({w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height}));expect(map.w).toBeCloseTo(map.h,1);
});
