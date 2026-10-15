import {test,expect} from '@playwright/test';
import fs from 'node:fs';
const sets=JSON.parse(fs.readFileSync('../data/modular/powers.json','utf8')).sets;
for(const lang of ['en','ja'])test(`saved set run evidence badges survive selection and reload ${lang}`,async({page})=>{
 test.setTimeout(120000);
 for(const set of sets){
  await page.goto(`/?lang=${lang}&b=${set.magnitude_bits}&K=8192`);
  await page.locator('[data-section="modset-catalog"] > summary').click();
  await page.locator('[name="modset_id"]').selectOption(set.id);
  const measured=set.verification.moduli[0]!==107;
  const label=measured?(lang==='en'?'Used in measurements':'測定で使用'):(lang==='en'?'Build only':'build だけ');
  await expect(page.locator('.paper-lane [data-set-usage]')).toHaveText(label);
  await expect(page.locator('.paper-lane [data-tile-id]')).toHaveCount(set.solution_ids.length);
  await page.reload();
  await expect(page.locator('.paper-lane [data-set-usage]')).toHaveText(label);
  if(measured)await page.locator('.paper-lane').screenshot({path:`../build/screens/powers-usage-${set.magnitude_bits}-${set.verification.moduli[0]}-${lang}.png`});
 }
});
