import {test,expect,type Page} from '@playwright/test';
const boxes=(page:Page)=>page.evaluate(()=>{const r=(q:string)=>{const b=document.querySelector(q)!.getBoundingClientRect();return {left:b.left,top:b.top,right:b.right,bottom:b.bottom,width:b.width,height:b.height};};return {frame:r('.ribbon-frame'),chart:r('[data-ribbon-chart]'),legend:r('.ribbon-legend'),surface:r('.ribbon-surface')};});
for(const width of [1440,390])test(`spiral zoom keeps the chart at the frame's upper left and the frame's bottom edge can be dragged ${width}`,async({page})=>{
 await page.setViewportSize({width,height:1000});await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/?lang=ja&section=polar-periodic&polar_modulus=97');
 const chart=page.locator('[data-ribbon-chart]'),frame=page.locator('.ribbon-frame');await expect(chart.locator('[data-ribbon-modulus="97"]')).toBeVisible({timeout:20000});
 const one=await boxes(page);expect(Math.abs(one.chart.left-one.frame.left)).toBeLessThan(1);expect(Math.abs(one.chart.top-one.frame.top)).toBeLessThan(1);
 await page.locator('input[aria-label="polar zoom"]').fill('4');await expect(chart).toHaveAttribute('data-zoom','4');
 const four=await boxes(page);
 expect(Math.abs(four.chart.left-four.frame.left)).toBeLessThan(1);expect(Math.abs(four.chart.top-four.frame.top)).toBeLessThan(1);expect(Math.abs(four.chart.width-4*one.chart.width)).toBeLessThan(2);
 // The legend keeps its zoom-1 size inside the surface, including the line on the zoomed labels.
 expect(Math.abs(four.legend.width-one.legend.width)).toBeLessThan(1);expect(four.legend.right).toBeLessThanOrEqual(four.surface.right+1);
 await expect(page.locator('[data-ribbon-legend] [data-mark-legend]')).toContainText('2倍以上の拡大で積と面 A/B の数');await expect(page.locator('[data-ribbon-counts]').first()).toBeAttached();
 const start=Number(await frame.getAttribute('data-frame-height')),handle=page.locator('.ribbon-frame-resize');
 await handle.focus();for(let i=0;i<5;i++)await page.keyboard.press('ArrowDown');await expect(frame).toHaveAttribute('data-frame-height',String(start+50));
 await handle.evaluate(e=>e.scrollIntoView({block:'center'}));const b=(await handle.boundingBox())!;await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2,b.y+b.height/2+100,{steps:5});await page.mouse.up();
 await expect(frame).toHaveAttribute('data-frame-height',String(start+150));expect((await frame.boundingBox())!.height).toBeCloseTo(start+150,0);
 expect(new URL(page.url()).searchParams.get('polar_frame_height')).toBe(String(start+150));
 // Zooming to the selected modulus scrolls the frame to it.
 await page.getByRole('button',{name:'選択した法を拡大'}).click();await expect(chart).toHaveAttribute('data-zoom','8');
 const focus=await page.evaluate(()=>{const s=document.querySelector('[data-ribbon-selection]')!.getBoundingClientRect(),f=document.querySelector('.ribbon-frame')!.getBoundingClientRect();return {x:(s.left+s.right)/2,y:(s.top+s.bottom)/2,left:f.left,right:f.right,top:f.top,bottom:f.bottom};});
 expect(focus.x).toBeGreaterThan(focus.left);expect(focus.x).toBeLessThan(focus.right);expect(focus.y).toBeGreaterThan(focus.top);expect(focus.y).toBeLessThan(focus.bottom);
 await page.reload();await expect(frame).toHaveAttribute('data-frame-height',String(start+150));
});
