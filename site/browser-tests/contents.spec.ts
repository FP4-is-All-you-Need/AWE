import {test,expect} from '@playwright/test';

for(const lang of ['en','ja'])test(`contents follows disclosure hierarchy and selected construction ${lang}`,async({page},info)=>{
 test.setTimeout(120000);await page.goto(`/?crt=1&lang=${lang}`);
 const panel=page.locator('.contents-panel');await expect(panel).toBeVisible();
 await expect(panel).toHaveAttribute('aria-label',lang==='ja'?'目次':'Contents');
 await expect(panel.locator('[data-contents-target=main]')).toBeVisible();
 await expect(panel.locator('[data-contents-target=precision]')).toBeVisible();
 await expect(panel.locator('[data-contents-target=settings]')).toBeVisible();
 await expect(page.locator('.paper-lane [data-tile-id]')).toHaveCount(18);await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:info.outputPath(`contents_${lang}.png`),fullPage:true});
 await page.locator('.paper-lane [data-tile-id]').nth(1).click();
 const selected=page.locator('.paper-lane .construction-detail');
 const section=(await selected.getAttribute('data-section'))!;
 const selectedLink=panel.locator(`[data-contents-target="${section}"]`);
 await expect.poll(async()=> (await selectedLink.innerText()).replace(/\s+/g,' ').replace(/\bmod(?=\d)/g,'mod ').trim()).toBe((await selected.locator(':scope > summary').innerText()).replace(/\s+/g,' ').replace(/\bmod(?=\d)/g,'mod ').trim());
 const hierarchy=await selectedLink.evaluate(n=>{let depth=0,parent=n.parentElement;while(parent){if(parent.tagName==='OL')depth++;parent=parent.parentElement;}return depth;});
 expect(hierarchy).toBeGreaterThanOrEqual(2);
 const flow=selected.locator('details[data-section^="flow."]');
 const flowSection=(await flow.getAttribute('data-section'))!;
 await page.locator('.paper-lane').evaluate(n=>{(n as HTMLDetailsElement).open=false;});
 await selected.evaluate(n=>{(n as HTMLDetailsElement).open=false;});
 await flow.evaluate(n=>{(n as HTMLDetailsElement).open=false;});
 const flowLink=panel.locator(`[data-contents-target="${flowSection}"]`);
 await flowLink.click();
 await expect(page.locator('.paper-lane')).toHaveAttribute('open','');await expect(selected).toHaveAttribute('open','');await expect(flow).toHaveAttribute('open','');
 await expect.poll(()=>flow.evaluate(n=>Math.abs(n.getBoundingClientRect().top))).toBeLessThanOrEqual(5);
 await expect(flowLink).toHaveAttribute('aria-current','location');
 await page.locator('.paper-lane').evaluate(n=>n.scrollIntoView({block:'start'}));await expect(panel.locator('[data-contents-target=main]')).toHaveAttribute('aria-current','location');
 await page.locator('.paper-lane [data-tile-id]').first().click();
 await expect(selectedLink).toHaveCount(0);
 const next=(await page.locator('.paper-lane .construction-detail').getAttribute('data-section'))!;
 await expect(panel.locator(`[data-contents-target="${next}"]`)).toHaveCount(1);
 await panel.locator('[data-contents-target=share]').click();
 await expect(page.locator('[data-section=share]')).toHaveAttribute('open','');
 await expect(panel.locator('[data-contents-target=share]')).toHaveAttribute('aria-current','location');
});

test('contents drag and keyboard width bounds and open state survive reload',async({page},info)=>{
 await page.goto('/');const panel=page.locator('.contents-panel'),handle=page.locator('.contents-resize');
 await expect(panel).toBeVisible();const bounds=await handle.boundingBox();expect(bounds).toBeTruthy();
 await page.mouse.move(bounds!.x+bounds!.width/2,100);await page.mouse.down();await page.mouse.move(650,100);await page.mouse.up();
 await expect(handle).toHaveAttribute('aria-valuenow','420');expect(await panel.evaluate(n=>n.getBoundingClientRect().width)).toBe(420);
 await page.reload();await expect(handle).toHaveAttribute('aria-valuenow','420');
 const resized=await handle.boundingBox();await page.mouse.move(resized!.x+resized!.width/2,100);await page.mouse.down();await page.mouse.move(0,100);await page.mouse.up();
 await expect(handle).toHaveAttribute('aria-valuenow','180');
 await handle.focus();await page.keyboard.press('ArrowRight');await expect(handle).toHaveAttribute('aria-valuenow','190');
 await page.locator('[name=contents_toggle]').click();await expect(panel).toHaveCount(0);await page.reload();await expect(panel).toHaveCount(0);
 await page.locator('[name=contents_toggle]').click();await page.reload();await expect(panel).toBeVisible();await expect(handle).toHaveAttribute('aria-valuenow','190');
});

test('mobile contents defaults closed and opens as an overlay without page overflow',async({page},info)=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/?crt=1');const toggle=page.locator('[name=contents_toggle]');
 await expect(toggle).toHaveAttribute('aria-expanded','false');await expect(page.locator('.contents-panel')).toHaveCount(0);
 await toggle.click();await expect(page.locator('.contents-panel')).toBeVisible();await expect(page.locator('.contents-overlay')).toBeVisible();await page.screenshot({path:info.outputPath('contents_mobile.png')});
 expect(await page.locator('.contents-panel').evaluate(n=>n.getBoundingClientRect().width)).toBeLessThanOrEqual(356);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
 await page.locator('.contents-panel [data-contents-target=main]').click();await expect(toggle).toHaveAttribute('aria-expanded','false');await expect(page.locator('.paper-lane')).toHaveAttribute('open','');
 await toggle.click();await page.locator('.contents-overlay').click({position:{x:380,y:300}});await expect(toggle).toHaveAttribute('aria-expanded','false');
 await toggle.click();await page.keyboard.press('Escape');await expect(toggle).toHaveAttribute('aria-expanded','false');
});

test('contents remains usable when local storage throws',async({page},info)=>{
 await page.addInitScript(()=>{Storage.prototype.getItem=()=>{throw Error('storage unavailable');};Storage.prototype.setItem=()=>{throw Error('storage unavailable');};});
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/');await expect(page.locator('.contents-panel')).toBeVisible();
 await page.locator('[name=contents_toggle]').click();await expect(page.locator('.contents-panel')).toHaveCount(0);
 await page.locator('[name=contents_toggle]').click();await expect(page.locator('.contents-panel')).toBeVisible();
 expect(errors.filter(error=>error.includes('storage unavailable'))).toEqual([]);
});


test('mobile contents restores the saved open preference and width',async({page},info)=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');
 await expect(page.locator('[name=contents_toggle]')).toHaveAttribute('aria-expanded','false');
 await page.evaluate(()=>{localStorage.setItem('awe.contents.open','1');localStorage.setItem('awe.contents.width','420');});
 await page.reload();await expect(page.locator('[name=contents_toggle]')).toHaveAttribute('aria-expanded','true');
 await expect(page.locator('.contents-panel')).toBeVisible();await expect(page.locator('.contents-overlay')).toBeVisible();
 await expect(page.locator('.contents-resize')).toHaveAttribute('aria-valuenow','420');
 expect(await page.locator('.contents-panel').evaluate(n=>n.getBoundingClientRect().width)).toBe(356);
 await page.locator('[name=contents_toggle]').click();await page.reload();
 await expect(page.locator('[name=contents_toggle]')).toHaveAttribute('aria-expanded','false');
 await expect(page.locator('.contents-panel')).toHaveCount(0);
});
