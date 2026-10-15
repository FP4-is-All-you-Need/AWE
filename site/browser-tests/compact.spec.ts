import {test,expect} from '@playwright/test';
const fullCompactScreenshot=async(page:import('@playwright/test').Page,figure:import('@playwright/test').Locator,path:string)=>{
 const width=Number(await figure.getAttribute('width'));
 await page.setViewportSize({width:Math.ceil(width+600),height:1100});
 await figure.evaluate(n=>{let parent=n.parentElement;while(parent&&parent!==document.body){parent.style.maxWidth='none';parent.style.width='max-content';parent.style.overflow='visible';parent=parent.parentElement;}});
 await figure.screenshot({path});
};
const id='awe1_37e282e92ef5d7e7761ae3304ed06bc8e91ce78a9436d239851ebc3b0b2a9a07';
test('four-limb construction defaults to grouped lattices and toggles live products with position colours',async({page})=>{
 await page.goto(`/?crt=0&lang=ja&b=11&width_results=1&integer_id=${id}`);const detail=page.locator('.integer-results .construction-detail');
 await expect(detail.locator('[data-expansion]')).toHaveAttribute('data-expansion',id);
 const menu=detail.locator('[name=expansion_layout]');await expect(menu).toHaveValue('compact');await expect(detail.locator('[data-compact-grid]')).toHaveCount(6);
 const colours=await detail.locator('[data-compact-product]').evaluateAll(nodes=>nodes.map(n=>({c:n.getAttribute('data-coefficient'),colour:getComputedStyle(n).borderTopColor})));expect(new Set(colours.map(c=>c.colour)).size).toBeGreaterThan(3);
 await detail.locator('[data-compact-product="9"]').click();await expect(detail.locator('[name=product_index]')).toHaveValue('9');await expect(detail.locator('[data-compact-cell][aria-pressed=true]')).not.toHaveCount(0);
 await menu.selectOption('products');await expect(detail.locator('[data-product]')).toHaveCount(13);await expect(detail.locator('[data-product="9"]')).toHaveAttribute('aria-pressed','true');
 await menu.selectOption('compact');await page.reload();await expect(menu).toHaveValue('compact');await expect(detail.locator('[name=product_index]')).toHaveValue('9');
 await detail.screenshot({path:'build/screens/position_palette_compact-four-limb.png'});
});
test('limb ordering updates the axes, coefficients and Karatsuba block labels while preserving the construction',async({page})=>{
 await page.goto(`/?crt=0&lang=ja&b=11&width_results=1&integer_id=${id}`);const detail=page.locator('.integer-results .construction-detail'),menu=detail.locator('[name=limb_order]');
 await expect(menu).toHaveValue('block');await expect(detail.locator('[data-limb-weights]')).toContainText('(1,9,71,639)');
 const tile=page.locator(`[data-integer-tile="${id}"] [data-construction-tile]`);await expect(tile.locator('[data-lattice-weights-a]')).toHaveAttribute('data-lattice-weights-a','1,9,71,639');await expect(tile.locator('[data-tile-block-label]')).toContainText('4 組');await expect(page.locator(`[data-integer-tile="${id}"][aria-pressed=true]`)).toContainText('(1,9,71,639)');
 await detail.locator(`details[data-section="flow.${id}"] > summary`).click();const flow=detail.locator('[data-plane-flow=A]');
 await expect(flow).toHaveAttribute('data-flow-weights','1,9,71,639');await expect(flow.locator('[data-flow-limb="1"]')).toHaveAttribute('data-original-index','2');
 await expect(detail.locator('[data-original-product="1:1"]')).toHaveAttribute('data-stored-product','2:2');
 await expect(flow.locator('[data-flow-plane="5"]')).toContainText('a0+2a1');
 const orderedSupport=await tile.locator('[data-lattice-support]').first().getAttribute('data-lattice-support');
 await menu.selectOption('stored');await expect(detail.locator('[data-limb-weights]')).toContainText('(1,71,9,639)');
 await expect(tile.locator('[data-lattice-weights-a]')).toHaveAttribute('data-lattice-weights-a','1,71,9,639');await expect(tile.locator('[data-lattice-support]').first()).not.toHaveAttribute('data-lattice-support',orderedSupport!);
 await expect(flow).toHaveAttribute('data-flow-weights','1,71,9,639');await expect(flow.locator('[data-flow-plane="5"]')).toContainText('a0+2a2');
 await page.locator('.integer-results').screenshot({path:'build/screens/position_palette_limb-order-stored.png'});
 await menu.selectOption('weight');await expect(tile.locator('[data-lattice-weights-a]')).toHaveAttribute('data-lattice-weights-a','1,9,71,639');
 await menu.selectOption('stored');
 const old=await detail.locator('[data-compact-cell="0:1:0"]').textContent();
 await menu.selectOption('block');await expect(detail.locator('[data-limb-weights]')).toContainText('(1,9,71,639)');await expect(detail.locator('[data-block-label]')).toContainText('4×3=12');await expect(detail.locator('[data-compact-cell="0:1:0"]')).not.toHaveText(old!);
 await expect(detail.locator('[data-expansion]')).toHaveAttribute('data-expansion',id);await expect(detail).not.toContainText('係数式のずれ');
 await page.reload();await expect(menu).toHaveValue('block');await detail.screenshot({path:'build/screens/position_palette_compact-block-order.png'});await page.locator('.integer-results').screenshot({path:'build/screens/position_palette_limb-order-block.png'});await expect(tile.locator('[data-lattice-weights-a]')).toHaveAttribute('data-lattice-weights-a','1,9,71,639');
 await page.locator('[name=lang]').selectOption('en');await expect(detail.locator('[data-block-label]')).toContainText('Block Karatsuba: 4 blocks');expect(await detail.locator('.katex-error').count()).toBe(0);
});

test('paper layout contains scaled direct products and interactive cancelled Karatsuba blocks',async({page})=>{
 await page.goto(`/?crt=0&b=11&width_results=1&integer_id=${id}`);const detail=page.locator('.integer-results .construction-detail'),figure=detail.locator('[data-paper-compact]');
 await expect(figure).toBeVisible();await expect(figure.locator('[data-direct-scale]')).toHaveCount(8);await expect(figure.locator('[data-cancelled-term]')).toHaveCount(8);await expect(figure.locator('[data-compact-block]')).toHaveCount(4);
 await expect(figure.locator('[data-compact-formula][data-formula-block="0:1"]')).toHaveCount(1);
 await expect(figure.locator('[data-compact-grid]')).toHaveCount(6);await expect(figure.locator('[data-compact-formula]')).toHaveCount(4);
 for(const grid of await figure.locator('[data-compact-grid]').all()){const number=Number(await grid.getAttribute('data-compact-grid'));if(number<2)continue;const fills=await grid.locator('[data-compact-fill]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('fill')));expect(new Set(fills).size).toBe(1);const strokes=await grid.locator('[data-cancelled-term]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('stroke')));expect(new Set(strokes)).toEqual(new Set([await grid.locator('[data-compact-block]').getAttribute('stroke')]));await expect(grid.locator('[data-compact-block]')).toHaveCount(1);await expect(grid.locator('[data-cancelled-term]')).toHaveCount(2);}
 const geometry=await figure.locator('[data-compact-grid]').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y}}));expect(geometry[1].x).toBeGreaterThan(geometry[0].x);expect(geometry[2].x).toBeGreaterThan(geometry[1].x);
 const colors=await figure.locator('[data-compact-fill]').evaluateAll(nodes=>nodes.map(n=>({scale:n.getAttribute('data-scale'),coefficient:n.getAttribute('data-coefficient'),color:n.getAttribute('fill')})));
 const direct=colors.filter(c=>c.coefficient===null);expect(new Set(direct.map(c=>c.color)).size).toBe(direct.length);
 const blockColors=await figure.locator('[data-compact-block]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('stroke')));expect(blockColors).toEqual(['#E8710A','#A0825E','#4FC3F7','#9CCC65']);
 const scaleFits=await figure.locator('[data-direct-scale] foreignObject').evaluateAll(nodes=>nodes.every(n=>{const box=n.getBoundingClientRect(),text=n.querySelector('.katex-html')!.getBoundingClientRect();return text.left>=box.left-1&&text.right<=box.right+1;}));expect(scaleFits).toBe(true);
 await figure.screenshot({path:'build/screens/position_palette_compact-paper-web.png'});
 await figure.locator('[data-compact-cell="2:0:0"]').click();await expect(detail.locator('[name=product_index]')).toHaveValue('11');await expect(figure.locator('[data-compact-formula][data-formula-block="0:0"]')).toHaveCount(1);
 await expect(figure.locator('[data-compact-formula][data-formula-block="0:0"]')).toContainText('Q00');
 await detail.locator('[name=expansion_layout]').selectOption('products');await expect(detail.locator('[data-product="11"]')).toHaveAttribute('aria-pressed','true');
 await detail.locator('[name=expansion_layout]').selectOption('compact');await page.reload();await expect(figure.locator('[data-compact-formula][data-formula-block="0:0"]')).toHaveCount(1);
 await page.locator('[name=lang]').selectOption('ja');await expect(figure.locator('[data-compact-caption=direct]')).toContainText('直接積');expect(await figure.locator('.katex-error').count()).toBe(0);
 await figure.screenshot({path:'build/screens/position_palette_compact-paper-selected.png'});await fullCompactScreenshot(page,figure,'build/screens/compact-separated-four.png');
});

test('small constructions default to weight order and unavailable blocks remain visible',async({page})=>{
 await page.goto('/?lang=ja');await page.locator('.law-row [data-tile-weights-a="1"]').first().click();
 const detail=page.locator('.paper-lane .construction-detail'),menu=detail.locator('[name=limb_order]');await expect(menu).toHaveValue('weight');
 await menu.selectOption('block');await expect(detail).toContainText('ブロック未収録');await expect(detail.locator('[data-expansion]')).toBeVisible();
 await page.reload();await expect(menu).toHaveValue('block');await expect(detail).toContainText('ブロック未収録');
});

 test('compact splits the 8x8 six-product construction into direct and three mixed grids',async({page})=>{
 const target='awe1_002b0cddfc3729fdb06a905e402dc9c2e9b5be0d8c4222c10571bc9a5cacc3bb';
 await page.goto(`/?crt=0&b=7&integer_weight=2,5,31&integer_id=${target}`);
 const detail=page.locator('.integer-detail .construction-detail');
 await expect(detail.locator('[data-expansion]')).toHaveAttribute('data-expansion',target);
 await detail.locator('[name=expansion_layout]').selectOption('compact');
 await expect(detail.locator('[data-compact-grid]')).toHaveCount(5);await expect(detail.locator('[data-cancelled-term]')).toHaveCount(6);
 for(const grid of await detail.locator('[data-compact-grid]').all()){if(Number(await grid.getAttribute('data-compact-grid'))<2)continue;await expect(grid.locator('[data-cancelled-term]')).toHaveCount(2);}
 for(const grid of await detail.locator('[data-compact-grid]').all()){if(Number(await grid.getAttribute('data-compact-grid'))<2)continue;const colors=await grid.locator('rect[fill]:not([fill="none"])').evaluateAll(nodes=>nodes.filter(n=>Number(n.getAttribute('fill-opacity'))>0).map(n=>n.getAttribute('fill')));expect(new Set(colors).size).toBe(1);}
 await fullCompactScreenshot(page,detail.locator('[data-expansion]'),'build/screens/compact-separated-six.png');
 });
