import {test,expect} from '@playwright/test';

const sets=[
 {id:'',count:18},
 {id:'awemps2_bcf56be798e6e87fa023964c76889cb177e2b5133d57217eb9cf9d9f66b9c5a1',count:16},
 {id:'awemps2_5edebd055ede8f40fd489202d6d0ea01fd6fd0e1a713766755117d4bd0c74564',count:15},
];
for(const width of [1280,1440,1920])for(const colorScheme of ['light','dark'] as const)
 test(`modulus labels clear the weight backgrounds ${width} ${colorScheme}`,async({page},info)=>{
  test.setTimeout(60000);
  await page.setViewportSize({width,height:1000});await page.emulateMedia({colorScheme,reducedMotion:'reduce'});
  const measurements=[];
  for(const [index,set] of sets.entries()){
   await page.goto(`/?b=53&lang=${index===1?'ja':'en'}&modset_id=${set.id}`);
   const row=page.locator('.paper-lane .law-row');await expect(row.locator('[data-tile-id]')).toHaveCount(set.count);
   // Include the normally collapsed comparison row: measure every rendered mini, not just the selected row.
   for(const summary of await page.locator('[data-comparison-lane]:not([open]) > summary').all())await summary.click();
   await page.evaluate(()=>document.fonts.ready);
   for(const selected of [row.locator('[data-tile-id]').first(),row.locator('[data-tile-id]').last()]){
    await selected.click();await expect(selected).toHaveAttribute('aria-pressed','true');
    const boxes=await page.locator('.law-row [data-tile-id]').evaluateAll(nodes=>nodes.map(n=>{
     const label=n.querySelector(':scope > foreignObject .katex-html')!.getBoundingClientRect();
     const weights=[...n.querySelectorAll('[data-weight-label^="b"] > rect')].map(e=>e.getBoundingClientRect().top);
     const grid=n.querySelector('[data-lattice-weights-a] > rect')!.getBoundingClientRect();
     const band=n.querySelector('[data-selection-band] > rect')?.getBoundingClientRect();
     const frame=n.querySelector(':scope > rect')!.getBoundingClientRect();
     return {mod:n.getAttribute('data-tile-modulus'),reduced:n.getAttribute('data-mini-reduced')==='true',
      gap:Math.min(...weights,grid.top)-label.bottom,above:label.top-(band?.bottom??frame.top),
      font:parseFloat(getComputedStyle(n.querySelector(':scope > foreignObject .svg-math')!).fontSize)};
    }));
    expect(boxes.length).toBeGreaterThanOrEqual(set.count);
    for(const box of boxes){
     expect(box.gap,JSON.stringify(box)).toBeGreaterThan(0);
     // Plane-count headings now occupy the space between modulus and weights.
     expect(box.above,JSON.stringify(box)).toBeGreaterThan(0);expect(box.font).toBe(18);
    }
    measurements.push({set:set.id,boxes});
   }
   expect(await row.locator(':scope > svg').count()).toBeLessThanOrEqual(3);
   if(index===2)expect(await row.locator('[data-mini-reduced="true"]').count()).toBeGreaterThan(0);
  }
  // The integer list has no modulus heading. Its four-limb thumbnails retain their compact size.
  const id='awe1_37e282e92ef5d7e7761ae3304ed06bc8e91ce78a9436d239851ebc3b0b2a9a07';
  await page.goto(`/?crt=0&b=11&width_results=1&integer_id=${id}`);
  const mini=page.locator(`[data-integer-tile="${id}"] [data-construction-tile]`);
  await expect(mini).toHaveAttribute('data-mini-reduced','true');
  expect(Number(await mini.locator(':scope > svg').getAttribute('width'))).toBeLessThanOrEqual(174);
  expect(Number(await mini.locator(':scope > svg').getAttribute('height'))).toBeLessThanOrEqual(130);
  await info.attach('label-gaps.json',{body:JSON.stringify(measurements),contentType:'application/json'});
 });
