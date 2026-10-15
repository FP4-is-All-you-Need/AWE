import {openSwap} from './swap-test-helpers.ts';
import {test,expect} from '@playwright/test';
test('shared input and saved AWE selection update two independent number lines',async({page})=>{
 await page.goto('/?lang=ja');const base=page.locator('[data-number-line=base13]'),awe=page.locator('[data-number-line=awe]');
 await expect(awe).toHaveAttribute('data-construction',/^awem1_/);
 await page.locator('[name=encode_int]').fill('23');
 await expect(base.locator('.encoding-equation')).toContainText('23');await expect(awe.locator('.awe-encoding-equation')).toContainText('23');
 await expect(awe.locator('[data-value="23"]')).toHaveAttribute('aria-pressed','true');
 await expect(awe.locator('.encoding-candidates')).toContainText('−8');
 await page.locator('[name=base13_line_left]').fill('20');await page.locator('[name=base13_line_right]').fill('26');await base.locator('[data-value="24"]').click();await expect(page.locator('[name=encode_int]')).toHaveValue('24');await expect(awe.locator('[data-value="24"]')).toHaveAttribute('aria-pressed','true');
 const old=await awe.getAttribute('data-construction');await page.locator('.paper-lane .law-button').nth(2).click();await expect(awe).not.toHaveAttribute('data-construction',old!);
 await page.locator('[name=encode_int]').fill('1000');await expect(base.locator('.encoding-equation')).toContainText('1000');await expect(awe.locator('.awe-encoding-equation')).toContainText('1000');
 await page.reload();await expect(page.locator('[name=encode_int]')).toHaveValue('1000');
 await page.locator('[name=encode_int]').fill('23');await page.locator('[data-section=previous-base13]').screenshot({path:'build/screens/hierarchy-base13-awe.png'});
});
test('editing matrices updates saved limbs, FP4 products and reconstruction',async({page})=>{
 await page.goto('/?lang=ja');const base=page.locator('[data-matrix-diagram=base13]'),awe=page.locator('[data-matrix-diagram=awe]');
 await expect(base.locator('[data-result]')).toHaveAttribute('data-result','12,11;6,13');await expect(awe.locator('[data-result]')).toHaveAttribute('data-result','12,11;6,13');
 await awe.locator('[data-limb=A0]').click();const old=await awe.locator('[data-limb=A0]').textContent();await page.locator('[name=example_matrix_a]').fill('20 2\n1 4');
 await expect(awe.locator('[data-limb=A0]')).not.toHaveText(old!);await expect(base.locator('[data-result]')).toHaveAttribute('data-result','42,26;6,13');await expect(awe.locator('[data-result]')).toHaveAttribute('data-matches','true');
 await awe.locator('[data-numeric-product="2"]').click();await expect(awe.locator('[data-numeric-product="2"]')).toHaveAttribute('aria-pressed','true');
 await expect(awe.locator('.numeric-selected')).toHaveAttribute('data-fp4-product-scale','4');
 await page.reload();await expect(page.locator('[name=example_matrix_a]')).toHaveValue('20 2\n1 4');await expect(awe.locator('[data-numeric-product="2"]')).toHaveAttribute('aria-pressed','true');
 await page.locator('.paper-lane .law-button').nth(2).click();await expect(awe).toHaveAttribute('data-construction',/^awem1_/);await expect(awe).toContainText('79');
 await page.locator('[name=example_matrix_a]').fill('1000 2\n1 4');await expect(base.locator('[data-result]')).toHaveAttribute('data-matches','true');await expect(awe.locator('[data-result]')).toHaveAttribute('data-matches','true');
 await page.locator('[name=example_matrix_a]').fill('20 2\n1 4');await page.locator('[data-section=numeric-matrix]').screenshot({path:'build/screens/numeric-matrix-base13-awe.png'});
 expect(await page.locator('.katex-error').count()).toBe(0);
});
test('integer residues, saved products and CRT follow the current modulus set and replacement',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/?lang=ja&crt_a=-103&crt_b=127');const crt=page.locator('.crt-example'),output=crt.locator('.crt-reconstruction');
 await expect(crt.locator('[data-crt-mod]')).toHaveCount(18);await expect(output).toHaveAttribute('data-result','-13081');await expect(output).toHaveAttribute('data-matches','true');
 await expect(crt.locator('[data-crt-mod="73"]')).toContainText('43');await expect(crt.locator('[data-crt-mod="73"]')).toContainText('54');
 await crt.locator('[data-crt-branch="81"]').click();await expect(page.locator('.paper-lane .law-button[aria-pressed=true]')).toHaveAttribute('aria-label','法 81 3積');await expect(crt.locator('.crt-selected')).toContainText('81');
 const oldP=await output.getAttribute('data-modulus-product');await page.locator('[name=K]').fill('16384');await expect(crt.locator('[data-crt-mod]')).toHaveCount(21);await expect(output).not.toHaveAttribute('data-modulus-product',oldP!);await expect(output).toHaveAttribute('data-result','-13081');
 await page.locator('[name=K]').fill('8192');await crt.locator('[data-crt-mod="73"] button').click();await openSwap(page);await page.locator('[name=same_modulus]').uncheck();
 const catalog=await (await page.request.get('/modular/catalog.json')).json();let replacement:any;
 for(const row of await page.locator('.candidate').all()){const id=await row.getAttribute('data-candidate'),c=catalog.solutions.find((s:any)=>s.id===id);if(c&&c.modulus!==73&&await row.getByRole('button').isEnabled()){replacement=c;await row.getByRole('button').click();break;}}
 expect(replacement).toBeTruthy();await expect(crt.locator(`[data-crt-mod="${replacement.modulus}"]`)).toHaveCount(1);await expect(output).not.toHaveAttribute('data-modulus-product',oldP!);await expect(output).toHaveAttribute('data-result','-13081');
 await page.locator('[name=crt_b]').fill('-12');await expect(output).toHaveAttribute('data-result','1236');await page.reload();await expect(output).toHaveAttribute('data-result','1236');await expect(crt.locator('[data-crt-mod]')).toHaveCount(18);
 await page.locator('[name=crt_a]').fill('1000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000');await expect(output).toHaveAttribute('data-matches','false');await expect(crt).toContainText('範囲外');
 await page.locator('[name=crt_a]').fill('-103');
 for(const caption of await crt.locator('[data-crt-caption] .katex').all()){const box=await caption.boundingBox(),container=await crt.locator('[data-crt-flow]').locator('..').boundingBox();expect(box!.x).toBeGreaterThanOrEqual(container!.x);expect(box!.x).toBeLessThan(container!.x+container!.width);}
 await crt.screenshot({path:'build/screens/crt-live-reconstruction.png'});expect(errors).toEqual([]);expect(await page.locator('.katex-error').count()).toBe(0);
});
test('saved hole construction shows actual missing values in both examples without inventing a correction',async({page})=>{
 await page.goto('/?lang=ja');await page.locator('[name=example_construction]').selectOption('joint_edd3ca7b2994fc829408');
 const line=page.locator('[data-number-line=awe]');await expect(line).toHaveAttribute('data-construction','joint_edd3ca7b2994fc829408');
 await page.locator('[name=encode_int]').fill('103');await expect(line.locator('[data-value="103"]')).toHaveAttribute('data-hole','true');await expect(line).toContainText('Hole');await page.locator('.encoding-examples').screenshot({path:'build/screens/encoding-hole-example.png'});
 await page.locator('[name=example_matrix_a]').fill('103 2\n1 4');await expect(page.locator('[data-section=numeric-matrix] [role=alert]')).toContainText('穴');
 await page.locator('[name=encode_int]').fill('102');await expect(line.locator('.awe-encoding-equation')).toContainText('102');await page.locator('[name=example_matrix_a]').fill('102 2\n1 4');await expect(page.locator('[data-matrix-diagram=awe] [data-result]')).toHaveAttribute('data-matches','true');
 await page.reload();await expect(page.locator('[name=example_construction]')).toHaveValue('joint_edd3ca7b2994fc829408');
 await page.locator('[name=example_construction]').selectOption('selected');await page.locator('[name=crt]').selectOption('0');await page.locator('[name=precision]').selectOption('fp16');await page.locator('[data-map-cell][data-row="12"][data-column="12"]').click();
 await expect(line).toHaveAttribute('data-construction','awe1_37e282e92ef5d7e7761ae3304ed06bc8e91ce78a9436d239851ebc3b0b2a9a07');await expect(line.locator('.awe-encoding-equation')).toContainText('102');
});
