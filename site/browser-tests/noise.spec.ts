import {test,expect} from '@playwright/test';
for(const lang of ['en','ja'])test(`labels replace policy and explanatory prose ${lang}`,async({page})=>{
 await page.goto(`/?crt=0&b=7&lang=${lang}`);await expect(page.locator('.integer-detail [data-expansion]')).toBeVisible();
 await page.evaluate(()=>document.querySelectorAll('details').forEach(d=>d.open=true));
 const body=page.locator('body');for(const phrase of ['存在しない構成の探索','No new constructions','All bits have the same width','片側の最大の割合','Limb indices follow the displayed order','各積を個別に累積し','Model accumulating each product','上部の操作と共通','0は指定なし','この表の採用値を点線の丸で示します','全表現の列挙とは区別します','保存された構成とIDは変えません'])await expect(body).not.toContainText(phrase);
 await page.locator('.integer-results').screenshot({path:`build/screens/short-labels-${lang}.png`});
});
