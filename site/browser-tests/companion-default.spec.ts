import {test,expect} from '@playwright/test';
for(const origin of ['http://127.0.0.1:5173','http://127.0.0.1:4174'])for(const lang of ['en','ja'])test(`default comparison companions and periodic table ${origin} ${lang}`,async({page})=>{
 for(const path of ['visualization/modsets.json','modular/catalog.json','modular/powers.json']){const r=await page.request.get(origin+'/'+path);expect(r.status()).toBe(200);expect(typeof await r.json()).toBe('object');}
 await page.goto(origin+'/?lang='+lang);const comparison=page.locator('[data-section=comparison]');await expect(comparison).toHaveAttribute('open','');await expect(comparison.locator('[data-comparison-lane][open]')).toHaveCount(3);
 for(const row of await comparison.locator('[data-comparison-lane][open]').all())expect(await row.locator('[data-tile-modulus]:visible').count()).toBe(Number(await row.getAttribute('data-moduli-count')));
 const table=page.locator('.prime-table');await expect(table).toHaveAttribute('open','');expect(await table.evaluate(n=>!!(document.querySelector('[data-section=comparison]')!.compareDocumentPosition(n)&Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
});
