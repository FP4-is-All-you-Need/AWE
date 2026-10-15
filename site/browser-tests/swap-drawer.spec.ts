import {test,expect} from '@playwright/test';
for(const width of [1440,390])test(`swap drawer reserves tab space, replacement and persistent sizing ${width}`,async({page},info)=>{
 await page.setViewportSize({width,height:1000});await page.goto('/?lang=en');
 const shell=page.locator('.swap-shell'),tab=page.locator('[name=swap_toggle]'),panel=page.locator('#swap-panel');
 await expect(shell).toHaveAttribute('data-swap-open','false');
 const right=await page.locator('.workspace-main').evaluate(n=>n.getBoundingClientRect().right),tabLeft=(await tab.boundingBox())!.x;expect(tabLeft-right).toBeGreaterThan(0);expect(tabLeft-right).toBeLessThanOrEqual(24);
 await tab.click();await expect(panel).toBeVisible();
 await expect(page.locator('[data-candidate]').first()).toBeVisible();
 const candidate=page.locator('[name=replacement_id]:enabled').first(),id=await candidate.getAttribute('value');await candidate.click();
 await expect(page.locator('.paper-lane [data-tile-id][aria-pressed=true]')).toHaveAttribute('data-tile-id',id!);await expect(panel).toBeVisible();
 const edge=page.locator('.swap-resize'),box=(await edge.boundingBox())!;const before=Number(await edge.getAttribute('aria-valuenow'));
 await page.mouse.move(box.x+5,box.y+100);await page.mouse.down();await page.mouse.move(box.x-30,box.y+100);await page.mouse.up();await expect(edge).toHaveAttribute('aria-valuenow',String(before+35));
 const after=await edge.getAttribute('aria-valuenow');await page.reload();await expect(panel).toBeVisible();await expect(edge).toHaveAttribute('aria-valuenow',after!);
 await page.locator('[name=swap_close]').click();await expect(panel).toBeHidden();
 await page.locator('.paper-lane [aria-label="Swap candidates"]').click();await expect(panel).toBeVisible();
 await page.screenshot({path:info.outputPath(`swap-drawer-${width}.png`)});
 await page.goto('/?lang=ja&swap=1');await expect(panel).toBeVisible();await expect(tab).toContainText('入れ替え候補');
});
