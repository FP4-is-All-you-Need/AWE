import {test,expect} from '@playwright/test';
for(const width of [1280,1440,1920])for(const colorScheme of ['light','dark'] as const)test(`comparison and modulus boundaries ${width} ${colorScheme}`,async({page})=>{
 await page.setViewportSize({width,height:1000});await page.emulateMedia({colorScheme,reducedMotion:'reduce'});await page.goto('/?lang=en');
 expect(await page.locator('.map-section').evaluate(e=>e.querySelector('summary')!.getBoundingClientRect().top-e.getBoundingClientRect().top)).toBeLessThan(10);
 const lanes=page.locator('[data-comparison-lane]');await expect(lanes).toHaveCount(4);
 for(const lane of await lanes.all()){
  if(await lane.getAttribute('open')===null)await lane.locator(':scope>summary').click();
  const result=await lane.evaluate(el=>{
   const summary=el.querySelector(':scope>summary')!,svg=el.querySelector('svg')!,s=getComputedStyle(el),box=el.getBoundingClientRect();
   return {border:[s.borderTopWidth,s.borderRightWidth,s.borderBottomWidth,s.borderLeftWidth],color:s.borderTopColor,summaryHeight:summary.getBoundingClientRect().height,gap:svg.getBoundingClientRect().top-summary.getBoundingClientRect().bottom,
    children:[...el.children].map(c=>c.getBoundingClientRect()).every(c=>c.bottom<=box.bottom&&c.left>=box.left&&c.right<=box.right),
    tiles:[...el.querySelectorAll('[data-tile-modulus]')].map(t=>{const r=t.querySelector(':scope>rect')!,style=getComputedStyle(r);return {stroke:style.stroke,width:style.strokeWidth,cells:[...t.querySelectorAll('[data-lattice-cell]')].map(c=>({w:c.getBoundingClientRect().width,h:c.getBoundingClientRect().height}))};})};
  });
  expect(result.border).toEqual(['1px','1px','1px','1px']);expect(result.color).toBe('rgb(0, 0, 0)');expect(result.children).toBe(true);expect(result.gap).toBeLessThanOrEqual(2);expect(result.gap).toBeGreaterThanOrEqual(0);
  expect(result.tiles).toHaveLength(Number(await lane.getAttribute('data-moduli-count')));
  for(const tile of result.tiles){expect(tile.stroke).toBe('rgb(0, 0, 0)');expect(tile.width).toBe('1px');for(const cell of tile.cells)expect(Math.abs(cell.w-cell.h)).toBeLessThan(.05);}
  await lane.locator(':scope>summary').click();await expect(lane).not.toHaveAttribute('open');await expect(lane.locator('svg').first()).not.toBeVisible();await lane.locator(':scope>summary').click();
 }
 // A selection retains the existing purple band and does not move the tile grid.
 const first=lanes.first(),tile=first.locator('[data-tile-modulus]').first();await tile.click();await expect(tile).toHaveAttribute('aria-pressed','true');const positions=await first.locator('[data-tile-modulus]').evaluateAll(ns=>ns.map(n=>{const b=n.querySelector('[data-lattice-cell]')!.getBoundingClientRect();return {x:b.x,y:b.y};}));
 await first.locator('[data-tile-modulus]').last().click();await tile.click();await expect(tile).toHaveAttribute('aria-pressed','true');
 const after=await first.locator('[data-tile-modulus]').evaluateAll(ns=>ns.map(n=>{const b=n.querySelector('[data-lattice-cell]')!.getBoundingClientRect();return {x:b.x,y:b.y};}));expect(after.map(n=>n.x)).toEqual(positions.map(n=>n.x));
 // Scrolling to the detail moves all rows together, without rearranging them.
 for(let i=1;i<after.length;i++)expect(after[i].y-after[0].y).toBeCloseTo(positions[i].y-positions[0].y,1);
 expect(await tile.locator(':scope>rect').evaluate(e=>getComputedStyle(e).stroke)).toBe('rgb(136, 68, 153)');
});
for(const lang of ['en','ja'])test(`no empty line before headings or figures ${lang}`,async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/?lang='+lang);await expect(page.locator('.map-section')).toBeVisible();
 await page.evaluate(()=>document.querySelectorAll('details').forEach(e=>e.open=true));
 const blank=await page.evaluate(()=>[...document.querySelectorAll('p,div,br')].filter(el=>{
  const r=el.getBoundingClientRect();return r.height>0&&r.width>0&&!el.textContent?.trim()&&!el.querySelector('svg,img,canvas,button,input,select,textarea,hr')&&(el.nextElementSibling?.matches('h1,h2,h3,summary,svg,figure,.paper-scroll')||el.tagName==='BR');
 }).map(el=>el.outerHTML));expect(blank).toEqual([]);
 expect(await page.locator('.map-section').evaluate(e=>e.querySelector('summary')!.getBoundingClientRect().top-e.getBoundingClientRect().top)).toBeLessThan(10);
});
