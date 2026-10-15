import {test,expect} from '@playwright/test';

for(const lang of ['en','ja'])for(const width of [1440,390])test(`numeric values follow input and previous work is separate ${lang} ${width}`,async({page})=>{
 await page.setViewportSize({width,height:1000});
 await page.goto(`/?lang=${lang}&example_matrix_a=500&example_matrix_b=2`);
 const awe=page.locator('[data-matrix-diagram=awe]'),base=page.locator('[data-matrix-diagram=base13]');
 await expect(awe.locator('[data-result]')).toHaveAttribute('data-matches','true');
 await expect(base.locator('[data-result]')).toHaveAttribute('data-result','1000');
 await expect(awe.locator('[data-source-side=A]')).toContainText('500');
 await expect(awe.locator('[data-concrete-row]')).toHaveCount(3);
 await expect(awe.locator('[data-concrete-reconstruction]')).toContainText('51');
 const visibleEntries=await awe.locator('[data-entry-value]').evaluateAll(nodes=>nodes.map(n=>({value:n.getAttribute('data-entry-value'),shown:n.textContent})));
 expect(visibleEntries.length).toBeGreaterThan(0);expect(visibleEntries.every(n=>n.value===n.shown)).toBe(true);
 const previous=page.locator('[data-section=previous-base13]');
 await expect(previous.locator('[data-number-line=base13]')).toHaveCount(1);
 await expect(previous.locator('[data-hierarchy]')).toHaveCount(1);
 await expect(previous.locator('[data-matrix-diagram=base13]')).toHaveCount(1);
 await expect(page.locator('[data-section=numeric-matrix]')).not.toContainText(/Base 13|Base-13|基数13/);
 await expect(page.locator('[data-section=encoding-example]')).not.toContainText(/Base 13|Base-13|基数13/);
 expect(await previous.evaluate(el=>el.parentElement!.lastElementChild===el)).toBe(true);
 await page.locator('[name=example_matrix_a]').fill('-500');
 await expect(awe.locator('[data-source-side=A]')).toContainText('−500');
 await expect(awe.locator('[data-result]')).toHaveAttribute('data-result','22');
 await expect(base.locator('[data-result]')).toHaveAttribute('data-result','-1000');
 await expect(page.locator('[name=base13_matrix_a]')).toHaveValue('-500');
 // All concrete cards must equal the product of the displayed plane values.
 const products=await awe.locator('[data-numeric-product]').evaluateAll(nodes=>nodes.map(n=>({a:n.getAttribute('data-plane-a')!,b:n.getAttribute('data-plane-b')!,p:n.getAttribute('data-value')!})));
 for(const p of products)expect(BigInt(p.a)*BigInt(p.b)).toBe(BigInt(p.p));
 const before=await awe.locator('[data-concrete-reconstruction]').textContent();
 await page.locator('[name=example_matrix_b]').fill('3');
 await expect(awe.locator('[data-result]')).toHaveAttribute('data-result','33');
 await expect(awe.locator('[data-concrete-reconstruction]')).not.toHaveText(before!);
 await page.reload();await expect(awe.locator('[data-result]')).toHaveAttribute('data-result','33');
 await page.locator('[name=example_matrix_a]').fill('500');await page.locator('[name=example_matrix_b]').fill('2');
 await page.locator('[name=awe_encode_int]').fill('500');
 await expect(page.locator('[data-number-line=awe] .awe-encoding-equation')).toContainText('500');
 await expect(page.locator('[name=encode_int]')).toHaveValue('500');
 await expect(previous.locator('.encoding-equation')).toContainText('500');
 await expect(page.locator('.katex-error')).toHaveCount(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('integer AWE encodes 500 with its own limbs and reports its boundary',async({page})=>{
 await page.goto('/?lang=en&crt=0&input_ma=12&input_mb=12&b=11&example_matrix_a=500&example_matrix_b=2');
 const awe=page.locator('[data-matrix-diagram=awe]');
 await expect(awe.locator('[data-result]')).toHaveAttribute('data-result','1000');
 await expect(awe.locator('[data-result]')).toHaveAttribute('data-matches','true');
 await expect(awe.locator('[data-source-side=A]')).toContainText('500');
 await page.locator('[name=example_matrix_a]').fill('100000000000000000');
 await expect(page.locator('[data-section=numeric-matrix] [role=alert]')).toContainText('Out of range');
 await expect(awe).toHaveCount(0);
 await page.locator('[name=example_matrix_a]').fill('500');
 await expect(awe.locator('[data-result]')).toHaveAttribute('data-result','1000');
});

for(const bits of [53,78,24])test(`comparison defaults follow roles for ${bits} bits and retain URL choices`,async({page})=>{
 await page.goto('/?lang=en&b='+bits);const rows=page.locator('[data-comparison-lane]');
 await expect(rows.first()).toBeVisible();
 const roles=await rows.evaluateAll(nodes=>nodes.map(n=>({title:n.querySelector('summary')!.textContent!,open:(n as HTMLDetailsElement).open})));
 expect(roles.length).toBeGreaterThan(1);
 for(const row of roles)expect(row.open,row.title).toBe(/Fewest products|larger limb grids/.test(row.title));
 const index=roles.findIndex(r=>!r.open),id=await rows.nth(index).getAttribute('data-section');
 await rows.nth(index).locator(':scope > summary').click();await expect(rows.nth(index)).toHaveAttribute('open','');
 await page.reload();await expect(page.locator(`[data-section="${id}"]`)).toHaveAttribute('open','');
 const openIndex=roles.findIndex(r=>r.open);
 if(openIndex>=0){const openId=await rows.nth(openIndex).getAttribute('data-section');await rows.nth(openIndex).locator(':scope > summary').click();await expect(rows.nth(openIndex)).not.toHaveAttribute('open','');await page.reload();await expect(page.locator(`[data-section="${openId}"]`)).not.toHaveAttribute('open','');}
});

for(const lang of ['en','ja'])for(const width of [1440,390])test(`top headings have a distinct level without shrinking subheadings ${lang} ${width}`,async({page})=>{
 await page.setViewportSize({width,height:1000});await page.goto('/?lang='+lang);
 const top=page.locator('[data-section=settings] > summary');await expect(top).toHaveAttribute('data-section-depth','1');
 await expect(top).toHaveCSS('font-size','22px');await expect(top).toHaveCSS('font-weight','700');
 const nested=page.locator('[data-section=precision] > summary');await expect(nested).toHaveCSS('font-size','16px');await expect(nested).toHaveCSS('font-weight','600');
 const prime=page.locator('.prime-table > summary');await expect(prime).toHaveCSS('font-size','22px');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('both reconstruction braces contain every term of a twelve-product construction',async({page})=>{
 await page.goto('/?lang=en&crt=0&input_ma=12&input_mb=12&b=11&example_matrix_a=500&example_matrix_b=2');
 const awe=page.locator('[data-matrix-diagram=awe]');await expect(awe.locator('[data-numeric-product]')).toHaveCount(12);
 await page.evaluate(()=>document.fonts.ready);
 const positions=await awe.locator('.numeric-brace-formula').evaluateAll(forms=>forms.map(form=>{
  const rows=form.querySelector('.numeric-reconstruction-rows')!.getBoundingClientRect();
  return [...form.querySelectorAll('[data-group-brace]>svg')].map(svg=>{const r=svg.getBoundingClientRect();return {top:r.top,bottom:r.bottom,first:rows.top,last:rows.bottom};});
 }));
 expect(positions).toHaveLength(2);
 for(const braces of positions)for(const r of braces){expect(r.top).toBeLessThanOrEqual(r.first+1);expect(r.bottom).toBeGreaterThanOrEqual(r.last-1);}
});
