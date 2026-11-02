import {test,expect} from '@playwright/test';
for(const width of [1440,390])test(`the spiral's side panel folds and keeps its width ${width}`,async({page})=>{
 await page.setViewportSize({width,height:1000});await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/?lang=ja&section=polar-periodic&polar_modulus=260');
 const layout=page.locator('.polar-layout'),side=layout.locator('.polar-detail'),toggle=layout.locator('.side-toggle');
 await expect(side).toBeVisible({timeout:20000});await expect(side.locator('h3')).toContainText('260');await expect(layout).toHaveAttribute('data-side-open','true');
 const chartWidth=async()=>(await layout.locator('.star-map').boundingBox())!.width;
 const narrower=await chartWidth();await toggle.click();
 await expect(layout).toHaveAttribute('data-side-open','false');await expect(side).toBeHidden();await expect(toggle).toHaveAttribute('aria-expanded','false');
 if(width===1440)expect(await chartWidth()).toBeGreaterThan(narrower+200);
 expect(new URL(page.url()).searchParams.get('polar_side')).toBe('0');
 await page.reload();await expect(layout).toHaveAttribute('data-side-open','false');await expect(side).toBeHidden({timeout:20000});
 await toggle.click();await expect(side).toBeVisible();
 if(width===1440){
  const handle=layout.locator('.side-resize'),start=(await side.boundingBox())!.width;
  await handle.focus();for(let i=0;i<4;i++)await page.keyboard.press('ArrowLeft');await expect(handle).toHaveAttribute('aria-valuenow','380');
  // The handle is as tall as the panel; press the middle of its visible part, below the sticky format bar.
  const b=(await handle.boundingBox())!,y=(Math.max(b.y,120)+Math.min(b.y+b.height,980))/2;await page.mouse.move(b.x+b.width/2,y);await page.mouse.down();await page.mouse.move(b.x+b.width/2-100,y,{steps:5});await page.mouse.up();
  await expect(handle).toHaveAttribute('aria-valuenow','480');expect((await side.boundingBox())!.width).toBeCloseTo(start+140,0);
  expect(new URL(page.url()).searchParams.get('polar_side_width')).toBe('480');
  // Without the URL parameters, the stored width and open state return.
  await page.goto('/?lang=ja&section=polar-periodic&polar_modulus=260');await expect(side).toBeVisible({timeout:20000});await expect(layout.locator('.side-resize')).toHaveAttribute('aria-valuenow','480');
 }else await expect(layout.locator('.side-resize')).toBeHidden();
});
