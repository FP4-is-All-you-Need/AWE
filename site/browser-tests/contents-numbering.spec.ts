import {test,expect,type Page} from '@playwright/test';
async function numbered(page:Page){
 await expect.poll(()=>page.evaluate(()=>{
  const errors:string[]=[];
  for(const button of document.querySelectorAll<HTMLElement>('[data-contents-target]')){
   const summary=document.querySelector<HTMLElement>(`.paper-app summary[data-contents-key="${button.dataset.contentsKey}"]`);if(!summary){errors.push('missing summary');continue;}
   const number=button.dataset.sectionNumber!,depth=Number(button.dataset.sectionDepth);
   if(!number||number!==summary.dataset.sectionNumber)errors.push('number mismatch');
   if(number.replace(/\.$/,'').split('.').length!==depth)errors.push('depth mismatch');
   if(getComputedStyle(button,'::before').content!==JSON.stringify(number)||getComputedStyle(summary,'::after').content!==JSON.stringify(number))errors.push('missing visible number');
   if(getComputedStyle(summary,'::before').content!=='"▶"')errors.push('missing disclosure arrow');
   if(!getComputedStyle(button,'::before').fontVariantNumeric.includes('tabular-nums'))errors.push('non-tabular number');
  }
  return errors;
 })).toEqual([]);
}
test('contents and summaries share hierarchical numbers through toggles and new sections',async({page})=>{
 await page.goto('/?crt=1&lang=en');await expect(page.locator('[data-contents-target=main]')).toBeVisible();await numbered(page);
 const initial=await page.locator('[data-contents-target=precision]').getAttribute('data-section-number');
 const settings=page.locator('details[data-section=settings]');await settings.evaluate(n=>{(n as HTMLDetailsElement).open=false;});await numbered(page);await settings.evaluate(n=>{(n as HTMLDetailsElement).open=true;});await expect(page.locator('[data-contents-target=precision]')).toHaveAttribute('data-section-number',initial!);
 await settings.evaluate(n=>{const d=document.createElement('details');d.dataset.section='numbering-added';const s=document.createElement('summary');s.textContent='Added section';d.append(s);n.append(d);});
 await expect(page.locator('[data-contents-target=numbering-added]')).toHaveCount(1);await numbered(page);
 await page.locator('[data-contents-target=numbering-added]').click();await expect(page.locator('[data-section=numbering-added]')).toHaveAttribute('open','');
 const widths=await page.locator('[data-contents-target], .paper-app summary[data-section-number]').evaluateAll(nodes=>nodes.map(n=>({depth:(n as HTMLElement).dataset.sectionDepth,width:getComputedStyle(n,n.tagName==='SUMMARY'?'::after':'::before').width})));for(const a of widths)for(const b of widths)if(a.depth===b.depth)expect(Math.abs(parseFloat(a.width)-parseFloat(b.width))).toBeLessThan(.1);
 await page.locator('[data-section=numbering-added]').evaluate(n=>n.remove());await expect(page.locator('[data-contents-target=numbering-added]')).toHaveCount(0);await numbered(page);
 await page.locator('[name=lang]').selectOption('ja');await numbered(page);
 // Generated numbers are CSS content, so repeated refreshes never enter labels.
 const label=await page.locator('[data-contents-target=precision]').innerText();await settings.evaluate(n=>{(n as HTMLDetailsElement).open=false;});await settings.evaluate(n=>{(n as HTMLDetailsElement).open=true;});await expect(page.locator('[data-contents-target=precision]')).toHaveText(label);
});
test('construction detail kinds keep their numbered slots after values and selection changes',async({page})=>{
 await page.goto('/?crt=1&lang=en');const lane=page.locator('.paper-lane'),detail=lane.locator('.construction-detail');await expect(detail).toBeVisible();await numbered(page);
 const read=()=>detail.locator(':scope > details[data-section] > summary').evaluateAll(nodes=>Object.fromEntries(nodes.map(n=>{const section=(n.parentElement as HTMLElement).dataset.section!;return [section.split('.')[0],(n as HTMLElement).dataset.sectionNumber];})));
 const before=await read();expect(Object.keys(before)).toEqual(expect.arrayContaining(['flow','matrix','encoding','construction-cost']));
 await detail.locator('[name=plane_values]').check();await numbered(page);expect(await read()).toEqual(before);
 await lane.locator('[data-tile-id]').nth(1).click();await numbered(page);await expect.poll(read).toEqual(before);
 const flow=detail.locator('details[data-section^="flow."]');await flow.locator(':scope > summary').click();await numbered(page);const side=flow.locator('details[data-side-details=B] > summary');const preceding=await side.evaluate(n=>{const parent=n.parentElement!.parentElement;return [...parent!.querySelectorAll('details')].filter(d=>d.parentElement?.closest('details')===parent?.closest('details')&&(d.compareDocumentPosition(n.parentElement!)&Node.DOCUMENT_POSITION_FOLLOWING)).length;});await expect(side).toHaveAttribute('data-section-number',`${before.flow}.${preceding+1}`);
});
