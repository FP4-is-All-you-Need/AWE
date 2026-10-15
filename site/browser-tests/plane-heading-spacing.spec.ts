import {test,expect} from '@playwright/test';
for(const width of [1440,390])for(const lang of ['en','ja'])test(`modulus heading and plane arrows fit compact cards ${width} ${lang}`,async({page})=>{
 await page.setViewportSize({width,height:1000});await page.emulateMedia({reducedMotion:'reduce'});
 for(const set of ['', 'awemps2_5edebd055ede8f40fd489202d6d0ea01fd6fd0e1a713766755117d4bd0c74564']){
  await page.goto(`/?lang=${lang}&modset_id=${set}`);await expect(page.locator('.paper-lane [data-tile-id]')).toHaveCount(set?15:18);await page.evaluate(()=>document.fonts.ready);
  const metrics=await page.locator('.paper-lane [data-tile-id]').evaluateAll(ns=>ns.map(n=>{
   const ink=(el:SVGTextElement)=>{const ctx=document.createElement('canvas').getContext('2d')!,s=getComputedStyle(el);ctx.font=`${s.fontWeight} ${s.fontSize} ${s.fontFamily}`;const m=ctx.measureText(el.textContent!),p=el.getStartPositionOfChar(0),ctm=el.getScreenCTM()!;return {top:new DOMPoint(p.x,p.y-m.actualBoundingBoxAscent).matrixTransform(ctm).y,bottom:new DOMPoint(p.x,p.y+m.actualBoundingBoxDescent).matrixTransform(ctm).y};};
   const title=n.querySelector(':scope > foreignObject .katex-html')!,strut=title.querySelector('.katex-strut')!,titleBottom=strut.getBoundingClientRect().bottom+(parseFloat(getComputedStyle(strut).verticalAlign)||0),count=ink(n.querySelector('[data-plane-plus]')!),b=ink(n.querySelector('[data-plane-side=B]')!),arrow=n.querySelector('[data-plane-arrow=B]')!.getBoundingClientRect(),weight=n.querySelector('[data-weight-label=b0] rect')?.getBoundingClientRect(),frame=n.querySelector(':scope>rect')!.getBoundingClientRect();
   const outside=[...n.querySelectorAll('[data-plane-headers] text,[data-plane-arrow],.katex-html,[data-tile-products]')].filter(el=>{const r=el.getBoundingClientRect();return r.top<frame.top-.2||r.left<frame.left-.2||r.right>frame.right+.2||r.bottom>frame.bottom+.2;}).map(el=>el.textContent);
   return {mod:n.getAttribute('data-tile-modulus'),gap:count.top-titleBottom,bTop:b.top-count.top,arrowTop:arrow.top-count.top,weightGap:weight?weight.top-b.bottom:null,outside};
  }));
  for(const m of metrics){expect(m.gap,JSON.stringify(m)).toBeGreaterThanOrEqual(1.8);expect(m.gap,JSON.stringify(m)).toBeLessThanOrEqual(8);expect(m.bTop,JSON.stringify(m)).toBeGreaterThanOrEqual(0);expect(m.arrowTop,JSON.stringify(m)).toBeGreaterThanOrEqual(0);if(m.weightGap!==null)expect(m.weightGap,JSON.stringify(m)).toBeGreaterThanOrEqual(.5);expect(m.outside,JSON.stringify(m)).toEqual([]);}
 }
});
