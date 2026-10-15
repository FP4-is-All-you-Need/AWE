import {test,expect} from '@playwright/test';
for(const width of [1280,1440,1920])for(const colorScheme of ['light','dark'] as const)test(`swap tab clears map and all comparison lanes ${width} ${colorScheme}`,async({page},info)=>{
 await page.setViewportSize({width,height:1000});await page.emulateMedia({colorScheme,reducedMotion:'reduce'});await page.goto('/?lang=en&swap=0');await expect(page.locator('.map-section')).toBeVisible();await page.evaluate(()=>document.fonts.ready);
 const lanes=page.locator('[data-comparison-lane]');await expect(lanes).toHaveCount(4);
 for(const lane of await lanes.all())if(!await lane.evaluate(e=>(e as HTMLDetailsElement).open))await lane.locator(':scope>summary').click();
 const measurements=[];
 for(const target of [page.locator('.map-section'),...await lanes.all()]){
  await target.evaluate(e=>window.scrollTo(0,Math.max(0,e.getBoundingClientRect().top+scrollY-80)));
  const result=await page.evaluate(()=>{
   const tab=document.querySelector('.swap-tab')!.getBoundingClientRect();
   const candidates=[...document.querySelectorAll('.paper-app svg,.paper-app .katex-html,.paper-app [data-comparison-lane],.paper-app .map-section,.paper-app .paper-lane,.paper-app text')].filter(e=>!e.closest('.swap-shell'));
   // SVGs can extend past an intentional horizontal scroll viewport. Compare painted rectangles.
   const visibleRect=(e:Element)=>{const b=e.getBoundingClientRect(),r={left:b.left,right:b.right,top:b.top,bottom:b.bottom};for(let p=e.parentElement;p;p=p.parentElement){const s=getComputedStyle(p),a=p.getBoundingClientRect();if(/auto|scroll|hidden|clip/.test(s.overflowX)){r.left=Math.max(r.left,a.left+p.clientLeft);r.right=Math.min(r.right,a.left+p.clientLeft+p.clientWidth);}if(/auto|scroll|hidden|clip/.test(s.overflowY)){r.top=Math.max(r.top,a.top+p.clientTop);r.bottom=Math.min(r.bottom,a.top+p.clientTop+p.clientHeight);}}return r;};
   const overlaps=candidates.filter(e=>{const r=visibleRect(e);return r.right>r.left&&r.bottom>r.top&&Math.min(r.right,tab.right)-Math.max(r.left,tab.left)>.1&&Math.min(r.bottom,tab.bottom)-Math.max(r.top,tab.top)>.1;}).map(e=>({tag:e.tagName,text:e.textContent?.slice(0,80)}));
   return {tab:tab.toJSON(),overlaps};
  });expect(result.overlaps).toEqual([]);measurements.push(result);
 }
 const tab=page.locator('[name=swap_toggle]'),panel=page.locator('#swap-panel');await tab.click();await expect(panel).toBeVisible();
 expect((await panel.boundingBox())!.x+(await panel.boundingBox())!.width).toBeLessThan((await tab.boundingBox())!.x);
 await tab.click();await expect(panel).toBeHidden();await expect(tab).toHaveAttribute('aria-expanded','false');
 await info.attach('tab-rectangles.json',{body:JSON.stringify(measurements),contentType:'application/json'});
});
