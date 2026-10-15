import {test,expect} from '@playwright/test';
test('comparison lanes disclose independently with summaries, numbered contents and URL state',async({page})=>{
 await page.goto('/?lang=en');const lanes=page.locator('details[data-comparison-lane]');await expect(lanes).toHaveCount(4);
 const state=()=>lanes.evaluateAll(ns=>ns.map(n=>(n as HTMLDetailsElement).open));const initial=await state();expect(initial.filter(x=>!x)).toHaveLength(1);
 for(const lane of await lanes.all()){const summary=lane.locator(':scope > summary');await expect(summary).toContainText(/moduli/);await expect(summary).toContainText(/products/);await expect(summary).toContainText(/planes/);await expect(summary).toContainText('K');await expect(summary).toHaveAttribute('data-section-number',/\d+\.\d+/);await expect(lane.locator('details.lane-cost')).toHaveCount(1);}
 await page.locator('.paper-comparison').screenshot({path:'build/screens/comparison-default-other-open.png'});
 const old=await state();await lanes.nth(0).locator(':scope > summary').click();await expect.poll(state).toEqual(old.map((v,i)=>i===0?!v:v));
 const changed=await state();await page.reload();await expect.poll(state).toEqual(changed);
 for(const lane of await lanes.all())if(await lane.getAttribute('open')!==null)await lane.locator(':scope > summary').click();await expect.poll(state).toEqual([false,false,false,false]);
 await page.locator('.paper-comparison').screenshot({path:'build/screens/comparison-all-closed.png'});
});
