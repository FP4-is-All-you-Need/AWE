import {test,expect} from '@playwright/test';
import fs from 'node:fs';
const sets=JSON.parse(fs.readFileSync('../data/modular/powers.json','utf8')).sets;
// A saved set names the machines of the engines that use it where the data records a device, and nothing otherwise.
const devices=(set:{usage?:{device?:string}[]})=>[...new Set((set.usage??[]).flatMap(u=>u.device?[u.device.replace(/^NVIDIA /,'')]:[]))].sort();
for(const lang of ['en','ja'])test(`the machines of the engines that use a saved set survive selection and reload ${lang}`,async({page})=>{
 test.setTimeout(120000);
 for(const set of sets){
  await page.goto(`/?lang=${lang}&b=${set.magnitude_bits}&K=8192`);
  await page.locator('[data-section="modset-catalog"] > summary').click();
  await page.locator('[name="modset_id"]').selectOption(set.id);
  const served=(await (await page.request.get('/modular/powers.json')).json()).sets.find((s:{id:string})=>s.id===set.id);
  const named=devices(served),label=lang==='en'?`Set used by the ${named.join(' and ')} engine${named.length>1?'s':''}`:`${named.join('・')} で使う組`;
  const check=async()=>named.length?expect(page.locator('.paper-lane [data-set-engines]')).toHaveText(label):expect(page.locator('.paper-lane [data-set-engines]')).toHaveCount(0);
  await check();
  await expect(page.locator('.paper-lane [data-tile-id]')).toHaveCount(set.solution_ids.length);
  await page.reload();
  await check();
  if(named.length)await page.locator('.paper-lane').screenshot({path:`../build/screens/powers-usage-${set.magnitude_bits}-${set.verification.moduli[0]}-${lang}.png`});
 }
});
