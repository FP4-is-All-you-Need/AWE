import {test,expect} from '@playwright/test';
import {textInk} from '../src/compact';
const target='awe1_002b0cddfc3729fdb06a905e402dc9c2e9b5be0d8c4222c10571bc9a5cacc3bb';

for(const lang of ['en','ja'])test(`block colors follow the selected six-product construction ${lang}`,async({page})=>{
 test.setTimeout(120000);
 await page.goto(`/?crt=0&b=7&integer_weight=2,5,31&lang=${lang}`);
 const tile=page.locator(`[data-integer-tile="${target}"]`);
 await expect(tile).toBeVisible();await tile.click();
 const detail=page.locator('.integer-detail .construction-detail');
 await expect(detail.locator('[data-expansion]')).toHaveAttribute('data-expansion',target);
 const support=tile.locator('[data-lattice-support][data-product-index]');
 await expect(support).toHaveCount(3);
 const read=()=>support.evaluateAll(nodes=>nodes.map(n=>({product:n.getAttribute('data-product-index')!,color:n.getAttribute('stroke')!})).sort((a,b)=>Number(a.product)-Number(b.product)));
 const colors=await read();expect(colors.every(c=>['#E8710A','#A0825E','#4FC3F7','#9CCC65','#D4A017'].includes(c.color))).toBe(true);
 const flow=detail.locator('details').filter({has:page.locator('[data-plane-flow=A]')});
 if(await flow.getAttribute('open')===null)await flow.locator(':scope > summary').click();
 const bSide=detail.locator('details[data-side-details=B][data-side-kind=flow]');if(await bSide.count()&&await bSide.getAttribute('open')===null)await bSide.locator(':scope > summary').click();
 const candidate=page.locator(`.integer-candidates [name=integer_candidate][value="${target}"]`);
 for(const order of ['stored','weight','block']){
  await detail.locator('[name=limb_order]').selectOption(order);
  expect(await read()).toEqual(colors);
  for(const layout of ['products','compact']){
   await detail.locator('[name=expansion_layout]').selectOption(layout);
   for(const {product,color} of colors){
    if(layout==='products'){
     const outline=detail.locator(`[data-difference-support][data-product-index="${product}"]`);
     await expect(outline).toHaveAttribute('stroke',color);
    }else{
     // Compact construction supports may overlap; the coefficient color still
     // identifies its outline independently of cell selection.
     expect(await detail.locator(`[data-expansion] rect[stroke="${color}"][fill="none"]`).count()).toBeGreaterThan(0);
    }
    for(const side of ['A','B']){
     const plane=detail.locator(`[data-plane-flow="${side}"] g[data-flow-plane][data-product-index="${product}"]`);
     await expect(plane).toHaveCount(1);await expect(plane).toHaveAttribute('data-block-color',color);
     await expect(plane.locator(':scope > [data-flow-paint]')).toHaveAttribute('stroke',color);
     const links=detail.locator(`[data-plane-flow="${side}"] [data-flow-link][data-product-index="${product}"]`);
     await expect(links).toHaveCount(2);
     for(const link of await links.all()){
      await expect(link.locator('line')).toHaveAttribute('stroke',color);
      expect(await link.evaluate(n=>{
       const line=n.querySelector('line')!,marker=line.getAttribute('marker-end')!.slice(5,-1);
       return n.ownerDocument.getElementById(marker)?.querySelector('path')?.getAttribute('fill');
      })).toBe(color);
      expect(await link.locator('.svg-math').evaluate((n,hex)=>{
       const probe=document.createElement('span');probe.style.color=hex;document.body.append(probe);
       const expected=getComputedStyle(probe).color;probe.remove();return getComputedStyle(n).color===expected;
      },textInk(color))).toBe(true);
     }
    }
    await expect(candidate.locator(`[data-block-swatch][data-product-index="${product}"]`)).toHaveAttribute('data-block-color',color);
   }
  }
 }
 await page.evaluate(()=>document.fonts.ready);
 await tile.screenshot({path:`build/screens/blocks_tile_${lang}.png`});
 await detail.screenshot({path:`build/screens/blocks_detail_${lang}.png`});
 await candidate.screenshot({path:`build/screens/blocks_candidate_${lang}.png`});
});
