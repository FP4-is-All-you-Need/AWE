import {test,expect} from '@playwright/test';

for(const [lang,width] of [['ja',1440],['en',390]] as const)test(`FP8 page uses 512×E4M3 and also shows FP4 and FP6 single constructions ${lang} ${width}`,async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width,height:1000});await page.goto(`/?prime_set=fp8&lang=${lang}`);
 await expect(page.locator('.periodic-format [data-value-set]')).toHaveText('FP8 · 512×E4M3');
 await expect(page.locator('.periodic-format button[aria-pressed=true]')).toHaveText('FP8');
 const table=page.locator('[data-section="prime-table"]');
 await expect(table.locator(':scope > summary')).toContainText('FP8');
 await expect(table.locator('[name=prime_set]')).toHaveValue('fp8');
 // 1303 is known from an 8×E2M3 construction and 1009 from a 2×E2M1 one; both hold on 512×E4M3.
 for(const m of [1303,1009])await expect(table.locator(`[data-prime-modulus="${m}"][data-products]`).first()).toBeAttached({timeout:30000});
 await page.locator('.periodic-format button',{hasText:'FP6'}).click();
 await expect(page.locator('.periodic-format button[aria-pressed=true]')).toHaveText('FP6');
 expect(errors).toEqual([]);
});

test('every view of the FP8 page shows the constructions that hold on 512×E4M3',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 // The modulo spiral and its candidates.
 await page.goto('/?prime_set=fp8&lang=en&section=polar-periodic&polar_modulus=1009');
 await expect(page.locator('[data-ribbon-cell]').first()).toBeAttached({timeout:30000});
 await expect(page.locator('.polar-candidates button').first()).toBeVisible({timeout:30000});
 // The composite table.
 const composite=page.locator('[data-section="composite-table"]');
 await composite.locator(':scope > summary').click();
 await expect(composite.locator('tbody tr').first()).toBeVisible({timeout:30000});
 // The construction list, with constructions checked on value sets that 512×E4M3 contains.
 await page.goto('/?prime_set=fp8&lang=en&section=modular-forms&open.modular-forms=1&forms_m=1009');
 const rows=page.locator('[data-forms-table] tbody tr');
 await expect(rows.first()).toBeVisible({timeout:30000});
 expect(await rows.count()).toBeGreaterThan(1);
 expect(errors).toEqual([]);
});

test('the FP8 page lists the GEMMul8 FP8 modulus sets as rows of modulus cards with their source',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/?prime_set=fp8&lang=en');
 const select=page.locator('[data-section="modset-catalog"] select[name=modset_id]');
 const options=select.locator('option',{hasText:'GEMMul8 FP8 (d8d3901, 2026-11-16)'});
 await expect(page.locator('select[name=prime_compare] option',{hasText:'GEMMul8 FP8 (d8d3901, 2026-11-16) · '})).not.toHaveCount(0,{timeout:30000});
 await expect(options).toHaveCount(19,{timeout:30000});
 await select.selectOption((await options.first().getAttribute('value'))!);
 const lane=page.locator('details[data-section="main"]');
 await expect(lane.locator(':scope > summary h1')).toContainText('GEMMul8 FP8 (d8d3901, 2026-11-16)');
 await expect(lane.locator('[data-set-source]')).toContainText('d8d3901, 2026-11-16');
 await expect(lane.locator('[data-set-source] a')).toHaveAttribute('href',/\/blob\/d8d390125964c7f1c60d5f1e0e5d9656e5614852\/src\/oz2\/common\/fp8_plan\.hpp#L\d+/);
 // The card opened under the set names the source of its construction.
 await expect(lane.locator('[data-construction-sources]').first()).toBeVisible({timeout:30000});
 await expect(lane.locator('[data-construction-sources]').first()).toContainText('d8d3901, 2026-11-16');
 expect(errors).toEqual([]);
});
