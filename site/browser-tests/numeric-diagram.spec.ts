import {test,expect} from '@playwright/test';

const limbInk=['rgb(135, 17, 63)','rgb(98, 49, 111)','rgb(56, 63, 127)'];
const cellColors=['rgb(194, 24, 91)','rgb(74, 83, 168)','rgb(0, 137, 123)','rgb(136, 68, 153)','rgb(0, 151, 167)','rgb(124, 179, 66)','rgb(2, 119, 189)','rgb(67, 160, 71)','rgb(158, 157, 36)'];
const coloredSymbols=async(formula:import('@playwright/test').Locator)=>formula.locator('.katex-html [style]').evaluateAll(nodes=>nodes.filter(node=>(node as HTMLElement).style.color).map(node=>({text:node.textContent?.replace(/[\s\u200b]/g,''),color:getComputedStyle(node).color})));

test('base13 keeps its limb and cell colors when concrete values are shown',async({page})=>{
 await page.goto('/?lang=ja');const base=page.locator('[data-matrix-diagram=base13]');
 await expect(base.locator('[data-numeric-product]')).toHaveCount(9);
 for(let i=0;i<3;i++)for(const side of ['A','B']){
  const color=await base.locator(`[data-source-side=${side}] [data-limb=${side}${i}]`).evaluate(node=>getComputedStyle(node).color);
  expect(color).toBe(limbInk[i]);
  const axis=base.locator(`[data-numeric-axis=${side}${i}]`);
  await expect(axis).toContainText(`${side}${i}`);
  expect(await axis.evaluate(node=>getComputedStyle(node).color)).toBe(color);
 }
 for(let i=0;i<3;i++)for(let j=0;j<3;j++){
  const index=i*3+j,degree=i+j,tile=base.locator(`[data-numeric-product="${index}"]`);
  const glyphColors=await tile.locator('.numeric-plane-matrices .numeric-matrix-glyph').evaluateAll(nodes=>nodes.map(node=>getComputedStyle(node).color));
  expect(glyphColors).toEqual([limbInk[i],limbInk[j]]);
  const symbols=await coloredSymbols(tile.locator('.numeric-product-formula'));
  expect(symbols).toContainEqual({text:`A${i}`,color:limbInk[i]});
  expect(symbols).toContainEqual({text:`B${j}`,color:limbInk[j]});
  expect(await tile.evaluate(node=>getComputedStyle(node).borderTopColor)).toBe(cellColors[index]);
  const pale='rgb('+cellColors[index].match(/\d+/g)!.map(n=>Math.round(Number(n)*.30+255*.70)).join(', ')+')';
  expect(await tile.evaluate(node=>getComputedStyle(node).backgroundColor)).toBe(pale);
  const row=base.locator(`[data-numeric-reconstruction-row="${degree}"]`);
  const reconstruction=await coloredSymbols(row);
  expect(reconstruction).toContainEqual({text:`A${i}`,color:limbInk[i]});
  expect(reconstruction).toContainEqual({text:`B${j}`,color:limbInk[j]});
  await tile.click();await expect(row).toHaveAttribute('aria-pressed','true');
  expect(await row.evaluate(node=>getComputedStyle(node).borderTopColor)).toBe(cellColors[index]);

 }
});

const assertGlyphsFit=async(figure:import('@playwright/test').Locator)=>{
 const violations=await figure.locator('[data-numeric-product]').evaluateAll(buttons=>buttons.flatMap(button=>{
  const box=button.getBoundingClientRect();
  return [...button.querySelectorAll('.numeric-matrix-bracket')].flatMap(matrix=>{
   const glyph=matrix.getBoundingClientRect();
   return glyph.left<box.left||glyph.right>box.right||glyph.top<box.top||glyph.bottom>box.bottom?[button.getAttribute('data-numeric-product')]:[];
  });
 }));
 expect(violations).toEqual([]);
};

const fullFigureScreenshot=async(figure:import('@playwright/test').Locator,path:string)=>{
 await figure.evaluate(node=>{
  const diagram=node.querySelector<HTMLElement>('.numeric-matrix-figure')!;
  const width=diagram.scrollWidth+16;
  diagram.style.width=width+'px';diagram.style.maxWidth='none';diagram.style.overflow='visible';
  let element=node as HTMLElement|null;
  while(element&&element!==document.body){element.style.maxWidth='none';element.style.width='max-content';element.style.overflow='visible';element=element.parentElement;}
 });
 await figure.screenshot({path});
};

test('slide-style FP4 matrix decomposition reveals correctly scaled limbs and preserves products',async({page})=>{
 await page.goto('/?lang=ja');
 const base=page.locator('[data-matrix-diagram=base13]'),awe=page.locator('[data-matrix-diagram=awe]');
 await expect(base.locator('[data-fp4-scale]')).toHaveAttribute('data-fp4-scale','2');
 await expect(base.locator('[data-source-side=A] [data-limb]')).toHaveCount(3);
 const first=base.locator('[data-limb=A0]');
 await expect(first).toHaveAttribute('aria-pressed','true');
 await expect(first.locator('[data-matrix-rows]')).toHaveAttribute('data-matrix-rows','2');
 await expect(first.locator('[data-matrix-columns]')).toHaveAttribute('data-matrix-columns','2');
 await expect(first).not.toContainText('·');await first.click();await first.click();
 await expect(first).toHaveAttribute('aria-pressed','true');
 const entries=await first.locator('[data-entry-value]').evaluateAll(nodes=>nodes.map(n=>({value:n.getAttribute('data-entry-value'),text:n.textContent})));
 expect(entries.every(e=>e.value===e.text)).toBe(true);
 await expect(base.locator('[data-numeric-product]')).toHaveCount(9);
 await expect(base.locator('[data-numeric-times] .katex-html').first()).toHaveText('×');
 await expect(base.locator('[data-numeric-times] .katex-html').first()).not.toContainText('times');
 await assertGlyphsFit(base);await assertGlyphsFit(awe);
 await expect(base.locator('[data-fp4-product-scale]')).toHaveAttribute('data-fp4-product-scale','4');
 await expect(base.locator('[data-numeric-grouped-reconstruction]')).toContainText('13');
 await expect(base.locator('[data-result]')).toHaveAttribute('data-result','12,11;6,13');
 await expect(awe.locator('[data-result]')).toHaveAttribute('data-matches','true');
 await page.locator('[name=example_matrix_a]').fill('1 2 3\n4 5 6');
 await page.locator('[name=example_matrix_b]').fill('7 8\n9 10\n11 12');
 await expect(base.locator('[data-limb=A0] [data-matrix-columns]')).toHaveAttribute('data-matrix-columns','3');
 await expect(base.locator('[data-limb=B0] [data-matrix-rows]')).toHaveAttribute('data-matrix-rows','3');
 await expect(base.locator('[data-result]')).toHaveAttribute('data-result','58,64;139,154');
 await expect(awe.locator('[data-result]')).toHaveAttribute('data-matches','true');
 await awe.locator('[data-numeric-product="2"]').click();
 await expect(awe.locator('[data-numeric-product="2"]')).toHaveAttribute('aria-pressed','true');
 await expect(awe.locator('[data-numeric-reconstruction-row="2"]')).toHaveAttribute('aria-pressed','true');
 await awe.locator('[data-numeric-reconstruction-row="1"]').click();
 await expect(awe.locator('[data-numeric-product="1"]')).toHaveAttribute('aria-pressed','true');
 await expect(awe.locator('[data-numeric-reconstruction-row="1"]')).toHaveAttribute('aria-pressed','true');
 await awe.locator('[data-numeric-product="2"]').click();
 await page.reload();
 await expect(first).toHaveAttribute('aria-pressed','true');
 await expect(awe.locator('[data-numeric-product="2"]')).toHaveAttribute('aria-pressed','true');
 expect(await page.locator('.katex-error').count()).toBe(0);
 await assertGlyphsFit(base);await assertGlyphsFit(awe);
 await page.setViewportSize({width:1600,height:1100});
 await fullFigureScreenshot(base,'build/screens/numeric-slide18-base13.png');
 await fullFigureScreenshot(awe,'build/screens/numeric-slide18-awe.png');
});
