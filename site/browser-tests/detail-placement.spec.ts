import {test,expect,type Locator} from '@playwright/test';

const positions=async(tiles:Locator)=>tiles.evaluateAll(nodes=>nodes.map(node=>{
 const region=node.matches('.law-button')?[...node.children].find(child=>child.tagName.toLowerCase()==='rect')!:node;
 const box=region.getBoundingClientRect(), origin=node.closest('.law-row,.integer-grid')!.getBoundingClientRect();return {id:node.getAttribute('data-tile-id')??node.getAttribute('data-integer-tile'),x:box.x-origin.x,y:box.y-origin.y,width:box.width,height:box.height};
}));
const assertPositions=async(tiles:Locator,before:Awaited<ReturnType<typeof positions>>)=>{
 const after=await positions(tiles);expect(after.map(box=>box.id)).toEqual(before.map(box=>box.id));
 after.forEach((box,index)=>{for(const key of ['x','y','width','height'] as const)expect(Math.abs(box[key]-before[index][key])).toBeLessThan(.1);});
};
const belowTiles=async(container:Locator,tiles:Locator)=>{
 const bottom=await tiles.evaluateAll(nodes=>Math.max(...nodes.map(node=>node.getBoundingClientRect().bottom+window.scrollY)));
 const top=await container.locator('[data-selected-detail]').evaluate(node=>node.getBoundingClientRect().top+window.scrollY);
 expect(top).toBeGreaterThanOrEqual(bottom-1);
};

for(const k of [8192,16384])test(`CRT ${k} selection retains every tile position and places detail after all rows`,async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto(`/?lang=ja&crt=1&b=53&K=${k}`);
 const row=page.locator('.paper-lane .law-row'),tiles=row.locator('.law-button');
 await expect(tiles).toHaveCount(k===8192?18:21);
 await belowTiles(row,tiles);const before=await positions(tiles);
 await tiles.last().click();await belowTiles(row,tiles);
 await assertPositions(tiles,before);
 await tiles.first().click();await belowTiles(row,tiles);
 await assertPositions(tiles,before);
 if(k===8192)await row.screenshot({path:'build/screens/detail-after-crt18-tiles.png'});
 const comparisons=page.locator('[data-comparison-lane] .law-row');
 for(const comparison of await comparisons.all()){
  const parent=comparison.locator('..');if(await parent.evaluate(n=>n.tagName==='DETAILS')&&await parent.getAttribute('open')===null)await parent.locator(':scope > summary').click();
  const choices=comparison.locator('.law-button');if(await choices.count()<2)continue;
  const initial=await positions(choices);await choices.last().click();
  await belowTiles(comparison,choices);await assertPositions(choices,initial);
 }
});

test('integer selected detail follows the whole grid without moving tile rows',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto('/?lang=ja&crt=0&b=7');
 const list=page.locator('.integer-main'),tiles=list.locator('[data-integer-tile]');
 await expect(tiles).toHaveCount(12);await expect(list.locator('[data-selected-detail]')).toBeVisible();
 const before=await positions(tiles);await belowTiles(list,tiles);
 await tiles.last().click();await belowTiles(list,tiles);await assertPositions(tiles,before);
 await tiles.first().click();await belowTiles(list,tiles);await assertPositions(tiles,before);
 await list.screenshot({path:'build/screens/detail-after-integer-tiles.png'});
});

test('only a tile click scrolls an off-screen selected heading',async({page})=>{
 await page.setViewportSize({width:1440,height:400});
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.addInitScript(()=>{
  const original=Element.prototype.scrollIntoView;
  (window as any).selectedDetailScrolls=[];
  Element.prototype.scrollIntoView=function(options){
   if(this.closest('[data-selected-detail]'))(window as any).selectedDetailScrolls.push(options);
   original.call(this,options);
  };
 });
 await page.goto('/?lang=ja&crt=1&b=53');
 const row=page.locator('.paper-lane .law-row'),tiles=row.locator('.law-button');await expect(tiles).toHaveCount(18);
 expect(await page.evaluate(()=>(window as any).selectedDetailScrolls)).toEqual([]);
 await tiles.first().evaluate(node=>{const top=node.getBoundingClientRect().top+window.scrollY;window.scrollTo({top:top-8,behavior:'instant'});});
 const heading=row.locator('[data-selected-detail] > details > summary');
 expect(await heading.evaluate(node=>node.getBoundingClientRect().top)).toBeGreaterThan(400);
 await tiles.first().click();
 await expect.poll(()=>page.evaluate(()=>(window as any).selectedDetailScrolls.length)).toBeGreaterThan(0);
 expect(await page.evaluate(()=>(window as any).selectedDetailScrolls.at(-1).behavior)).toBe('instant');
});
