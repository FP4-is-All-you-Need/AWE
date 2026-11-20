import {test,expect,type Page} from '@playwright/test';
// The FP4 and FP6 pages draw the periodic table, its cards and the set row with the same parts, and show readers only
// what they look at: no states of the data handling and no internal ids.
const words=[/\bpublished\b/i,/\bfocus\b/i,/quarantin/i,/\bawem?\d?_[0-9a-f]{6,}/i,/\bc0\d{4}\b/,/source report/i,/出所の報告/,/公開の data/,/forms-excluded/i,/未確認/,/未測定/,/unconfirmed/i,/not measured/i];
const screenText=(p:Page)=>p.evaluate(()=>{const out:string[]=[];const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;while((n=w.nextNode())){const t=n.textContent!.trim();if(t&&!n.parentElement!.closest('script,style,.katex-mathml'))out.push(t);}
 for(const el of document.querySelectorAll('[title],[aria-label]'))for(const a of ['title','aria-label'])if(el.getAttribute(a))out.push(el.getAttribute(a)!);return out;});
for(const format of ['fp4','fp6'])for(const lang of ['en','ja'])test(`the ${format} page shows the periodic table, cards and set row without internal labels ${lang}`,async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`/?prime_set=${format}&lang=${lang}`);
 const lane=page.locator('[data-section="main"].paper-lane'),tiles=lane.locator('[data-tile-id]');await expect(tiles.first()).toBeVisible({timeout:30000});
 const moduli=await tiles.evaluateAll(n=>n.map(e=>Number(e.getAttribute('data-tile-modulus'))));expect(moduli).toEqual([...moduli].sort((a,b)=>a-b));
 const cell=page.locator('[data-prime-modulus][data-recorded="true"]').nth(8);await cell.click();await expect(page.locator('.prime-inspection')).toBeVisible();await page.waitForTimeout(1500);
 const found=(await screenText(page)).filter(t=>words.some(w=>w.test(t)));expect(found).toEqual([]);
 expect(errors).toEqual([]);
});
// Cards come from the saved constructions on both pages: on FP6 the saved sets; on FP4 the saved sets and the catalog files,
// marked as the fewest products of their modulus where they are.
// A row of the single constructions opens its expansion with the same parts on both pages.
for(const format of ['fp4','fp6'])test(`the ${format} periodic table draws cards from saved constructions and opens a single construction from its row`,async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`/?prime_set=${format}&lang=en`);
 const table=page.locator('[data-section="prime-table"]'),cells=table.locator('[data-prime-modulus]:not([data-variant-count="0"])');
 await expect(cells.first()).toBeVisible({timeout:30000});
 // A cell without a construction is not a button and opens nothing.
 const empty=table.locator('[data-prime-modulus][data-recorded="false"]');
 if(await empty.count()){await expect(empty.first()).not.toHaveAttribute('role','button');await empty.first().click({force:true});await expect(page.locator('.prime-inspection')).toHaveCount(0);}
 const sources=new Set<string>();
 for(const m of await cells.evaluateAll(n=>n.map(e=>e.getAttribute('data-prime-modulus')!))){
  const cell=table.locator(`[data-prime-modulus="${m}"]`);await cell.click();
  const cards=table.locator(`[data-prime-cards="${m}"] [data-prime-weight-card]`);await expect(cards).toHaveCount(Number(await cell.getAttribute('data-variant-count')));
  for(const s of await cards.evaluateAll(n=>n.map(e=>e.getAttribute('data-card-source')!)))sources.add(s);
 }
 expect(sources.size).toBeGreaterThan(0);
 for(const s of sources)expect(format==='fp6'?['set']:['set','minimum','catalog']).toContain(s);
 await table.locator('[data-prime-modulus][data-forms="hole_free"]').first().click();
 const row=table.locator('[data-prime-forms-detail] [data-prime-form]').first(),id=await row.getAttribute('data-prime-form');
 await row.locator('td').nth(2).click();
 await expect(row).toHaveAttribute('data-opened','true');await expect(row.locator('button')).toHaveAttribute('aria-pressed','true');
 await expect(table.locator(`[data-prime-form-expansion="${id}"] [data-section="prime.form.detail.${id}"]`)).toBeVisible({timeout:30000});
 expect(errors).toEqual([]);
});
