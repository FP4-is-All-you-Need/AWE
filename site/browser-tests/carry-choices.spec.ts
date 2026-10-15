import {test,expect} from '@playwright/test';
import {base13Alternatives,base13Carry} from '../src/base13Carry.ts';
for(const lang of ['en','ja'])test(`carry alternatives and signed leading transfers ${lang}`,async({page})=>{
 await page.goto(`/?lang=${lang}&section=numberline&encode_int=1000`);
 const panel=page.locator('.base13-carry-choices'),input=page.locator('[name=encode_int]');
 await expect(panel.locator('[data-carry-candidate-count]')).toHaveText(String(base13Alternatives(1000n,3).length));
 await expect(panel.locator('[data-carry-choice-result]')).toHaveAttribute('data-carry-choice-result','12,-2,6');
 await expect(panel.locator('[data-transfer-diagram]')).toHaveAttribute('data-transfer-exponent','1');
 await panel.locator('[data-carry-transfer="0"]').click();await expect(page.locator('[name=encode_step]')).toHaveValue('5');
 await expect(panel.locator('[data-carry-candidate="-1,-1,6"]')).toContainText(lang==='en'?'Greedy rule':'貪欲法');
 const alternate=base13Alternatives(1000n,3).find(r=>r.join()!=='12,-2,6')!;
 await panel.locator(`[data-carry-candidate="${alternate.join()}"]`).click();await expect(panel.locator('[data-carry-choice-result]')).toHaveAttribute('data-carry-choice-result',alternate.join());
 await expect.poll(()=>new URL(page.url()).searchParams.get('encode_representation')).toBe(alternate.join());
 await page.reload();await expect(panel.locator('select[name=encode_representation]')).toHaveValue(alternate.join());
 await panel.locator('[name=encode_limbs]').selectOption('4');await expect(panel.locator('[data-carry-candidate-count]')).toHaveText(String(base13Alternatives(1000n,4).length));
 await panel.locator('[name=encode_limbs]').selectOption('3');
 for(const n of ['845','2000','-500']){await input.fill(n);await expect(panel.locator('[data-carry-candidate-count]')).toHaveText(String(base13Alternatives(BigInt(n),3).length));await expect(panel.locator('[data-carry-choice-result]')).toHaveAttribute('data-carry-choice-result',base13Carry(BigInt(n)).digits.map(d=>d*(BigInt(n)<0n?-1:1)).join());}
 await input.fill('845');await expect(panel.locator('[data-leading-carry]')).toBeVisible();await expect(panel.locator('[data-transfer-diagram]')).toHaveAttribute('data-transfer-q','1');
 await panel.screenshot({path:`build/screens/carry-leading-${lang}.png`});
 await input.fill('-845');await expect(panel.locator('[data-transfer-diagram]')).toHaveAttribute('data-transfer-q','-1');
 await input.fill('1000');await panel.screenshot({path:`build/screens/carry-alternatives-${lang}.png`});
 await input.fill('5');await expect(panel.locator('[data-carry-candidate][data-adopted=true]')).toHaveCount(1);
 await panel.locator('[data-carry-candidate][data-adopted=true]').click();await expect(panel.locator('select[name=encode_representation]')).not.toHaveValue('figure');
 await page.locator('[name=encode_method]').selectOption('frozen_residue');await expect(panel.locator('[data-carry-candidate][data-adopted=true]')).toHaveCount(1);
 await expect(panel.locator('.katex-error')).toHaveCount(0);
 await page.setViewportSize({width:390,height:844});
 await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
 const frames=await panel.locator('.paper-scroll').evaluateAll(ns=>ns.map(n=>({h:n.scrollHeight,c:n.clientHeight})));for(const f of frames)expect(f.h).toBeLessThanOrEqual(f.c);
});
