import {test,expect} from '@playwright/test';
for(const lang of ['en','ja'])test(`saved comparisons precede independent number lines ${lang}`,async({page})=>{
 await page.setViewportSize({width:1600,height:1100});await page.goto('/?lang='+lang+'&b=78');
 const comparison=page.locator('[data-section=comparison]'),numberline=page.locator('#numberline'),main=page.locator('.paper-lane');
 await expect(comparison).toHaveJSProperty('open',true);await expect(numberline).toHaveJSProperty('open',true);await expect(main).toContainText('78');await expect(comparison).toContainText('78');
 const order=async()=>{
  const boxes=await page.locator('.paper-lane,[data-section=comparison],#numberline').evaluateAll(ns=>ns.map(n=>({id:n.id,section:n.getAttribute('data-section'),top:n.getBoundingClientRect().top,bottom:n.getBoundingClientRect().bottom})));
  expect(boxes.map(b=>b.section)).toEqual(['main','comparison','encoding-example']);expect(boxes[0].bottom).toBeLessThanOrEqual(boxes[1].top);expect(boxes[1].bottom).toBeLessThanOrEqual(boxes[2].top);
  await expect(comparison.locator('[data-hierarchy], [data-number-line]')).toHaveCount(0);
 };
 await order();await page.evaluate(()=>document.fonts.ready);
 await page.screenshot({path:`build/screens/comparison-order-after-${lang}.png`,fullPage:true});
 const lane=comparison.locator('[data-comparison-lane]').first(),summary=lane.locator(':scope > summary'),others=await comparison.locator('[data-comparison-lane]').evaluateAll(ns=>ns.slice(1).map(n=>(n as HTMLDetailsElement).open));
 await summary.click();await expect(lane).toHaveJSProperty('open',false);await order();
 expect(await comparison.locator('[data-comparison-lane]').evaluateAll(ns=>ns.slice(1).map(n=>(n as HTMLDetailsElement).open))).toEqual(others);
 await comparison.locator('[data-comparison-lane]').first().locator(':scope > summary').click();
 await comparison.locator('[data-comparison-lane][open] [data-tile-id]').first().click();await expect(comparison.locator('.law-detail')).toBeVisible();await order();
 await page.goto('/?lang='+lang+'&b=78&section=numberline&encode_int=845');await expect(numberline).toHaveJSProperty('open',true);await expect(page.locator('[name=encode_int]')).toHaveValue('845');await expect(page.locator('.base13-hierarchy')).toHaveAttribute('data-carry-input','845');await order();
 await page.reload();await expect(page.locator('[name=encode_int]')).toHaveValue('845');await order();
 await page.locator('[name=crt]').selectOption('0');await expect(comparison).toHaveCount(0);await expect(numberline).toBeVisible();await expect(page.locator('[name=encode_int]')).toHaveValue('845');
});
