import {test,expect} from '@playwright/test';

test('日本語の構成一覧は途中の高さを経て開閉する',async({page})=>{
 await page.goto('/?lang=ja');
 const details=page.locator('details.paper-lane').first(),summary=details.locator(':scope > summary');
 await expect(details).toHaveClass(/animated-details/);
 if(await details.evaluate(d=>(d as HTMLDetailsElement).open)){await summary.click();await expect(details).not.toHaveAttribute('open','');}
 const closed=await details.evaluate(d=>d.getBoundingClientRect().height);
 const heights=await summary.evaluate(async s=>{const d=s.parentElement!; (s as HTMLElement).click();const first=d.getBoundingClientRect().height;await new Promise(r=>setTimeout(r,70));const middle=d.getBoundingClientRect().height;const t=new DOMMatrix(getComputedStyle(s,'::before').transform),angle=Math.atan2(t.b,t.a)*180/Math.PI;await new Promise(r=>setTimeout(r,160));return [first,middle,d.getBoundingClientRect().height,angle];});
 expect(heights[3]).toBeGreaterThan(0);expect(heights[3]).toBeLessThan(90);expect(heights[0]).toBeCloseTo(closed,0);expect(heights[1]).toBeGreaterThan(closed);expect(heights[1]).toBeLessThan(heights[2]);
 const closing=await summary.evaluate(async s=>{const d=s.parentElement!;(s as HTMLElement).click();const open=(d as HTMLDetailsElement).open;await new Promise(r=>setTimeout(r,70));const middle=d.getBoundingClientRect().height;await new Promise(r=>setTimeout(r,160));return {open,middle,height:d.getBoundingClientRect().height,finished:(d as HTMLDetailsElement).open};});
 expect(closing.open).toBe(true);expect(closing.middle).toBeGreaterThan(closed);expect(closing.finished).toBe(false);expect(closing.height).toBeCloseTo(closed,0);
});

test('動きを減らす設定では日本語の構成一覧が即時に開閉する',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/?lang=ja');
 const details=page.locator('details.paper-lane').first();await expect(details).toHaveClass(/animated-details/);
 const state=await details.locator(':scope > summary').evaluate(s=>{const d=s.parentElement as HTMLDetailsElement,before=d.open;(s as HTMLElement).click();const after=d.open,animations=d.getAnimations().length;(s as HTMLElement).click();return {before,after,end:d.open,animations};});
 expect(state.after).toBe(!state.before);expect(state.end).toBe(state.before);expect(state.animations).toBe(0);
});
