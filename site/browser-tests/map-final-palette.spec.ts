import {test,expect} from '@playwright/test';
import {writeFileSync} from 'node:fs';
test('final paper map paints all cells and its six-entry legend with the submitted palette',async({page})=>{
 await page.goto('/?lang=en');
 const figure=page.locator('[data-source-figure=figure4]');
 const paths=figure.locator('[data-map-paint-row]');await expect(paths).toHaveCount(289);
 const fills=await paths.evaluateAll(nodes=>nodes.reduce((counts:Record<string,number>,n)=>{const c=n.getAttribute('fill')!.toUpperCase();counts[c]=(counts[c]??0)+1;return counts;},{}));
 expect(fills).toEqual({'#F7E5ED':85,'#ED964F':62,'#DC92AE':57,'#9464CB':37,'#FCEBDB':30,'#EBE2F5':18});
 for(const label of ['Base-13 limbs: direct products','AWE: fewer products via weights','CRT (AWE per modulus)','AWE count obtained by lifting','reconstruction denominator 2','Pale: more products than'])await expect(figure.getByText(label,{exact:true})).toBeVisible();
 await expect(page.locator('[data-map-caption]')).toContainText('lower right: AWE · upper left: AWE + CRT');
 await expect(page.locator('body')).not.toContainText('Two colors on the diagonal');
 await figure.screenshot({path:'build/screens/map-final-palette-en.png'});
 writeFileSync('build/map-final-web.svg',await figure.evaluate(n=>new XMLSerializer().serializeToString(n)));
 await page.locator('[data-map-cell][data-row="8"][data-column="9"]').click();await expect(page.locator('[name=crt]')).toHaveValue('0');
 await page.locator('[data-map-cell][data-row="9"][data-column="8"]').click();await expect(page.locator('[name=crt]')).toHaveValue('1');
 await page.locator('select[name=lang]').selectOption('ja');await expect(page.locator('[data-map-caption]')).toContainText('右下：AWE・左上：AWE + CRT');
 await expect(page.locator('body')).not.toContainText('対角の二色');
 await figure.screenshot({path:'build/screens/map-final-palette-ja.png'});
});
