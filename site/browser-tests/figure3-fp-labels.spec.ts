import {test,expect} from '@playwright/test';
import {checkFigure3Geometry} from '../../tools/figure3_geometry.mjs';
for(const lang of ['en','ja'])test(`figure3 format labels clear numeric ticks without changing fonts ${lang}`,async({page})=>{
 await page.setViewportSize({width:1600,height:1100});await page.goto('/?b=78&lang='+lang);
 const svg=page.locator('[data-source-figure=figure3]');await expect(svg).toBeVisible();await page.evaluate(()=>document.fonts.ready);
 const scene=await (await page.request.get('/visualization/figure3.json')).json();
 const formats=scene.labels.filter(l=>/^(?:FP\d+|BF16|INT)$/.test(l.text));expect(formats).toHaveLength(9);
 const labels=await svg.locator('[data-source-text]').evaluateAll(ns=>ns.map(n=>({id:n.getAttribute('data-source-text'),box:n.getBoundingClientRect().toJSON(),font:parseFloat(getComputedStyle(n).fontSize),y:Number(n.closest('g')!.getAttribute('transform')!.match(/translate\([^ ]+ ([^)]+)\)/)![1])})));
 const box=(id:string)=>labels.find(l=>l.id===id)!;
 const numbers=scene.labels.filter(l=>/^\d+(\.\d+)?$/.test(l.text));
 for(const f of formats){
  const actual=box(f.gid);expect(actual.font).toBe(f.fontsize);expect(actual.y).toBeCloseTo(f.anchor_pt[1]+15,5);
  for(const n of numbers){const a=actual.box,b=box(n.gid).box;expect(a.right<=b.left||b.right<=a.left||a.bottom<=b.top||b.bottom+1<=a.top,`${f.text} / ${n.text}`).toBe(true);}
 }
 const axis=box('source_text_50').box;for(const f of formats)expect(box(f.gid).box.bottom).toBeLessThan(axis.top);
 // Earlier source-geometry checks for the legend and bottom annotations remain valid.
 await checkFigure3Geometry(page);
 await svg.screenshot({path:`build/screens/figure3-fp-after-${lang}.png`});
 // Clicking a width still selects its constructions after the label-only movement.
 await svg.getByRole('button',{name:/\b8\b/}).click();await expect(page.locator('[name=input_ma]')).toHaveValue('8');await expect(page.locator('[name=crt]')).toHaveValue('0');
 await expect(page.locator('.katex-error')).toHaveCount(0);
});
