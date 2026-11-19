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
