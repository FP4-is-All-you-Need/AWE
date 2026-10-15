import {test,expect,type Locator} from '@playwright/test';
const paint=(stroke:string)=>stroke==='#A0825E'?'#CCAA88':stroke;
const four='awe1_37e282e92ef5d7e7761ae3304ed06bc8e91ce78a9436d239851ebc3b0b2a9a07';
const six='awe1_002b0cddfc3729fdb06a905e402dc9c2e9b5be0d8c4222c10571bc9a5cacc3bb';

async function painted(rects:Locator,color:string,opacity:string){
 expect(await rects.count()).toBeGreaterThan(0);
 for(const rect of await rects.all()){
  await expect(rect).toHaveAttribute('fill',color);
  await expect(rect).toHaveAttribute('fill-opacity',opacity);
 }
}

for(const kind of ['six','mod73','four_limb'])test(`plane fill follows the common product color ${kind}`,async({page})=>{
 test.setTimeout(120000);
 await page.goto(kind==='four_limb'?`/?crt=0&b=11&width_results=1&integer_id=${four}&lang=en`:kind==='six'?`/?crt=0&b=7&integer_weight=2,5,31&lang=en`:'/?crt=1&lang=en');
 const tile=kind==='four_limb'?page.locator(`[data-integer-tile="${four}"]`):kind==='six'?page.locator(`[data-integer-tile="${six}"]`):page.locator('.paper-lane [data-tile-modulus="73"]');
 await expect(tile).toBeVisible();await tile.click();await expect(tile).toHaveAttribute('aria-pressed','true');
 if(kind==='mod73')expect(await page.locator('.paper-lane [data-tile-id]').nth(1).getAttribute('data-tile-modulus')).toBe('73');
 const id=(await tile.getAttribute(kind!=='mod73'?'data-integer-tile':'data-tile-id'))!;
 const detail=page.locator(kind!=='mod73'?'.integer-detail .construction-detail':'.paper-lane .construction-detail');
 await expect(detail.locator('[data-expansion]')).toHaveAttribute('data-expansion',id);
 const supports=tile.locator('[data-lattice-support][data-product-index][data-block-color]');
 await expect(supports).toHaveCount(kind==='four_limb'?4:kind==='six'?3:1);
 const products=await supports.evaluateAll(nodes=>nodes.map(n=>({index:n.getAttribute('data-product-index')!,color:n.getAttribute('data-block-color')!})));
 if(kind==='mod73')expect(products[0].color).toBe('#E8710A');
 for(const {index,color} of products){
  const outline=tile.locator(`[data-lattice-support][data-product-index="${index}"]`);
  await expect(outline).toHaveAttribute('stroke',color);await expect(outline).toHaveAttribute('fill','none');
 }
 const cells=await tile.locator('[data-lattice-cell]').evaluateAll(nodes=>nodes.map(n=>({fill:n.getAttribute('fill'),color:n.getAttribute('data-block-color'),product:n.getAttribute('data-lattice-product'),alpha:n.getAttribute('fill-opacity')})));
 for(const cell of cells.filter(c=>c.alpha!=='0')){expect(cell.fill).toBe(paint(cell.color!));expect(cell.product).not.toBeNull();expect(['0.3','0.42']).toContain(cell.alpha);}
 expect(cells.some(c=>c.alpha==='0.3')).toBe(true);
 const flowDisclosure=detail.locator('details').filter({has:page.locator('[data-plane-flow=A]')});
 const matrixDisclosure=detail.locator('details').filter({has:page.locator('[data-matrix-size]')});
 for(const disclosure of [flowDisclosure,matrixDisclosure])if(await disclosure.getAttribute('open')===null)await disclosure.locator(':scope > summary').click();
 const bSide=detail.locator('details[data-side-details=B][data-side-kind=flow]');if(await bSide.count()&&await bSide.getAttribute('open')===null)await bSide.locator(':scope > summary').click();
 for(const {index,color} of products){
  await detail.locator('[name=expansion_layout]').selectOption('products');
  await detail.locator('[name=product_index]').selectOption(index);
  const expansion=detail.locator(`[data-expansion] g[data-product="${index}"][data-product-index="${index}"][data-block-color]`);
  await expect(expansion).toHaveAttribute('data-block-color',color);
  await painted(tile.locator(`[data-lattice-product="${index}"]`),paint(color),'0.42');
  await painted(expansion.locator(`rect[fill="${paint(color)}"][fill-opacity]:not([fill-opacity="0"])`),paint(color),'0.42');
  expect(await expansion.locator(`[stroke="${color}"]`).count()).toBeGreaterThan(0);
  for(const side of ['A','B']){
   const plane=detail.locator(`[data-plane-flow="${side}"] g[data-flow-plane][data-product-index="${index}"]`);
   await expect(plane).toHaveAttribute('data-block-color',color);
   const box=plane.locator(':scope > [data-flow-paint]');await expect(box).toHaveAttribute('stroke',color);await painted(box,paint(color),'0.42');
  }
  const covered=detail.locator('[data-matrix-term][data-covered=true] > rect');
  expect(await covered.count()).toBeGreaterThan(0);
  await painted(covered,paint(color),'0.42');await painted(detail.locator('[data-matrix-size] [data-matrix-sum] > rect'),paint(color),'0.42');for(const box of await covered.all())await expect(box).toHaveAttribute('stroke',color);
  await detail.locator('[name=expansion_layout]').selectOption('compact');
  if(kind==='four_limb'){
   const cell=detail.locator(`[data-paper-compact] [data-compact-grid] [data-compact-cell][role="button"][data-product-index="${index}"]`).first();await cell.click();await expect(cell).toHaveAttribute('aria-pressed','true');
  }else{
   await detail.locator(`[name=compact_product][value="${index}"]`).click();
   await expect(detail.locator(`[name=compact_product][value="${index}"]`)).toHaveAttribute('aria-pressed','true');
  }
  const compact=detail.locator('[data-expansion][data-compact-expansion]');
  const compactCells=compact.locator(`[data-compact-cell][aria-pressed=true] > rect[fill="${paint(color)}"][fill-opacity]:not([fill-opacity="0"])`);
  await painted(compactCells,paint(color),'0.42');
  expect(await compact.locator(`rect[stroke="${color}"]`).count()).toBeGreaterThan(0);
 }
 // Direct products use a lighter fill than combined planes. Select the real
 // product control to compare this across the tile, expansion and matrix.
 const record=await (await page.request.get(kind!=='mod73'?`/solutions/${id.slice(5,7)}.json`:'/modular/catalog.json')).json();
 const c=(kind!=='mod73'?record:record.solutions).find((entry:any)=>entry.id===id);
 const directIndex=c.products.findIndex((p:any)=>c.planes.A[p.a].filter(Boolean).length*c.planes.B[p.b].filter(Boolean).length===1);
 expect(directIndex).toBeGreaterThanOrEqual(0);
 await detail.locator('[name=expansion_layout]').selectOption('products');
 await detail.locator('[name=product_index]').selectOption(String(directIndex));
 const direct=detail.locator(`[data-expansion] g[data-product="${directIndex}"][data-product-index="${directIndex}"][data-block-color]`);
 const directColor=(await direct.getAttribute('data-block-color'))!;
 await painted(direct.locator(`rect[fill="${directColor}"][fill-opacity]:not([fill-opacity="0"])`),directColor,'0.3');
 await painted(tile.locator(`[data-lattice-product="${directIndex}"]`),directColor,'0.3');
 await painted(detail.locator('[data-matrix-term][data-covered=true] > rect'),directColor,'0.3');
 for(const side of ['A','B']){
  const plane=detail.locator(`[data-plane-flow="${side}"] g[data-flow-plane][data-product-index="${directIndex}"]`);
  await expect(plane).toHaveCount(1);
  const color=(await plane.getAttribute('data-block-color'))!;await painted(plane.locator(':scope > [data-flow-paint]'),color,'0.3');await expect(plane.locator(':scope > [data-flow-paint]')).toHaveAttribute('stroke',color);
 }
 await detail.locator('[name=expansion_layout]').selectOption('products');
 await detail.locator('[name=product_index]').selectOption(products[0].index);
 await page.evaluate(()=>document.fonts.ready);
 await tile.screenshot({path:`build/screens/plane_fill_new_${kind}_tile.png`});
 await flowDisclosure.screenshot({path:`build/screens/plane_fill_new_${kind}_flow.png`});
 await detail.locator('[data-expansion]').screenshot({path:`build/screens/plane_fill_new_${kind}_expansion.png`});
});
