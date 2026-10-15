import {test,expect} from '@playwright/test';

test('all representations, saved dashed choice, density, holes and A/B URL update',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/?lang=ja&encode_integer=12');
 const base=page.locator('[data-number-line=base13]'),awe=page.locator('[data-number-line=awe]');
 await page.locator('[name=encode_scale]').fill('60');
 await expect(base.locator('[data-enumeration-complete]')).toHaveAttribute('data-enumerated','3375');await page.locator('[name=base13_line_left]').fill('8');await page.locator('[name=base13_line_right]').fill('18');
 const count=Number(await base.locator('[data-enumeration-complete]').getAttribute('data-representations'));expect(count).toBeGreaterThan(1);
 await expect(base.locator('[data-candidate]')).toHaveCount(count);await expect(base.locator('[data-value="12"] [data-representation]')).toHaveCount(count);
 await expect(base.locator('[data-value="12"] [data-adopted=true]')).toHaveAttribute('stroke-dasharray','3 2');
 const chosen=await base.locator('[data-candidate][data-adopted=true]').getAttribute('data-candidate');
 await page.locator('[name=encode_method]').selectOption('frozen_residue');await expect(base.locator('[data-candidate][data-adopted=true]')).not.toHaveAttribute('data-candidate',chosen!);await expect(base.locator('[data-candidate]')).toHaveCount(count);
 const density=await base.locator('[data-density]').evaluateAll(nodes=>[...new Set(nodes.map(n=>n.getAttribute('fill-opacity')))]);expect(density.length).toBeGreaterThan(1);
 await page.locator('[name=encode_scale]').fill('60');expect(await base.locator('[data-value]').count()).toBeLessThan(41);
 await base.locator('[data-value="13"]').click();await expect(page.locator('[name=encode_int]')).toHaveValue('13');await expect(awe.locator('[data-value="13"]')).toHaveAttribute('aria-pressed','true');
 await page.locator('[name=encode_example_side]').selectOption('B');await page.reload();await expect(page.locator('[name=encode_example_side]')).toHaveValue('B');await expect(page.locator('[name=encode_scale]')).toHaveValue('60');
 await page.locator('[name=example_construction]').selectOption('joint_edd3ca7b2994fc829408');await page.locator('[name=encode_int]').fill('103');await expect(awe.locator('[data-value="103"]')).toHaveAttribute('data-hole','true');await expect(awe.locator('[data-candidate]')).toHaveCount(0);
 await page.locator('[name=awe_line_left]').fill('100');await page.locator('[name=awe_line_right]').fill('105');await page.locator('[name=encode_int]').fill('102');await expect(awe.locator('[data-value="102"]')).toHaveAttribute('data-hole','false');await expect(awe.locator('[data-value="102"] [data-adopted=true]')).toHaveAttribute('stroke-dasharray','3 2');
 await page.locator('[name=example_construction]').selectOption('joint_447479c194ae7d5efcc1');await page.locator('[name=encode_int]').fill('93');await expect(awe.locator('[data-candidate="-3,9,3"]')).toHaveAttribute('data-adopted','true');await expect(awe.locator('[role=alert]')).toHaveCount(0);
 await page.locator('[name=encode_scale]').fill('28');await page.locator('[name=example_construction]').selectOption('selected');await page.locator('[name=encode_int]').fill('12');
 await page.locator('.encoding-examples').screenshot({path:'build/screens/hierarchy-representations.png'});
 expect(errors).toEqual([]);
});

test('four limbs show all representations without inventing an unrecorded LUT choice',async({page})=>{
 await page.goto('/?lang=en');await page.locator('[name=crt]').selectOption('0');await page.locator('[name=precision]').selectOption('fp16');await page.locator('[data-map-cell][data-row="12"][data-column="12"]').click();
 const awe=page.locator('[data-number-line=awe]');await expect(awe.locator('[data-enumeration-complete]')).toHaveAttribute('data-enumerated','50625');
 await page.locator('[name=encode_int]').fill('1');await page.locator('[name=awe_line_left]').fill('0');await page.locator('[name=awe_line_right]').fill('5');await expect(awe.locator('[data-value="1"]')).toHaveAttribute('data-hole','false');expect(await awe.locator('[data-candidate]').count()).toBeGreaterThan(0);await expect(awe.locator('[data-adopted=true]')).toHaveCount(0);await expect(awe).toContainText('LUT unavailable');
});
