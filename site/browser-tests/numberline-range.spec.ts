import {test,expect} from '@playwright/test';
const setup=async(page:any)=>{await page.goto('/?crt=0&b=7&integer_weight=2,5,31&encode_integer=12');const line=page.locator('[data-number-line=awe] [data-range-line]');await expect(line).toBeVisible();return line;};
test('number line full contiguous positive ranges pan zoom wheel and URL are live',async({page})=>{
 test.setTimeout(90000);const line=await setup(page),full=[await line.getAttribute('data-range-left'),await line.getAttribute('data-range-right')];
 expect(Number(full[0])).toBeLessThan(-128);expect(Number(full[1])).toBeGreaterThan(127);
 await page.locator('[name=awe_line_range]').selectOption('contiguous');const contiguous=[await line.getAttribute('data-range-left'),await line.getAttribute('data-range-right')];expect(contiguous).not.toEqual(full);
 await page.locator('[name=awe_line_positive]').check();expect(Number(await line.getAttribute('data-range-left'))).toBeGreaterThan(0);
 await page.locator('[name=awe_line_positive]').uncheck();await page.locator('[name=awe_line_range]').selectOption('full');
 await page.locator('[name=awe_line_left]').fill('-100');await page.locator('[name=awe_line_right]').fill('100');await expect(line).toHaveAttribute('data-range-left','-100');await expect(line).toHaveAttribute('data-range-right','100');
 await page.locator('[name=awe_line_zoom]').fill('10');const beforeZoom=await line.getAttribute('data-range-left');const svg=line.locator('svg.range-density');await svg.hover();await page.mouse.wheel(0,-100);await expect(line).not.toHaveAttribute('data-range-left',beforeZoom!);
 await page.locator('[name=awe_line_pan]').fill('25');await expect(page).toHaveURL(/awe_line_pan=/);const prior=await line.getAttribute('data-range-left');
 const box=await svg.boundingBox();await page.mouse.move(box!.x+box!.width*.5,box!.y+80);await page.mouse.down();await page.mouse.move(box!.x+box!.width*.7,box!.y+80,{steps:8});await page.mouse.up();await expect(line).not.toHaveAttribute('data-range-left',prior!);
 const range=[await line.getAttribute('data-range-left'),await line.getAttribute('data-range-right')];await page.reload();await expect(line).toHaveAttribute('data-range-left',range[0]!);await expect(line).toHaveAttribute('data-range-right',range[1]!);
});

test('number line bins account for holes and counts, click zooms then shows every tuple',async({page})=>{
 test.setTimeout(90000);const line=await setup(page);
 await page.locator('[name=awe_line_left]').fill('-100000');await page.locator('[name=awe_line_right]').fill('100000');const bins=line.locator('[data-bin-left]');
 expect(await bins.count()).toBeLessThan(1500);const stats=await bins.evaluateAll(ns=>ns.map(n=>({l:Number(n.getAttribute('data-bin-left')),r:Number(n.getAttribute('data-bin-right')),holes:Number(n.getAttribute('data-holes')),mean:Number(n.getAttribute('data-mean')),max:Number(n.getAttribute('data-maximum'))})));
 expect(stats.reduce((s,b)=>s+b.r-b.l+1,0)).toBe(200001);expect(stats.reduce((s,b)=>s+b.holes,0)).toBeGreaterThan(190000);expect(stats.some(b=>b.max>b.mean&&b.mean>0)).toBe(true);
 const bin=bins.filter({has:page.locator('rect[data-density]:not([data-density="0"])')}).first(),l=await bin.getAttribute('data-bin-left');await bin.click();await expect(line).toHaveAttribute('data-range-left',l!);
 await page.locator('[name=awe_line_left]').fill('10');await page.locator('[name=awe_line_right]').fill('14');await line.locator('[data-value="12"]').click();await expect(page.locator('[name=encode_int]')).toHaveValue('12');
 const awe=page.locator('[data-number-line=awe]'),count=Number(await awe.locator('[data-enumeration-complete]').getAttribute('data-representations'));expect(count).toBeGreaterThan(0);await expect(awe.locator('[data-candidate]')).toHaveCount(count);await expect(line.locator('[data-value="12"]')).toHaveAttribute('aria-pressed','true');
 await page.locator('[name=example_construction]').selectOption('joint_edd3ca7b2994fc829408');await page.locator('[name=awe_line_left]').fill('100');await page.locator('[name=awe_line_right]').fill('105');await line.locator('[data-value="103"]').click();await expect(page.locator('[name=encode_int]')).toHaveValue('103');await expect(line.locator('[data-value="103"]')).toHaveAttribute('data-hole','true');await expect(awe.locator('[data-candidate]')).toHaveCount(0);
 await line.locator('[data-value="102"]').click();await expect(awe.locator('[data-candidate][data-adopted=true]')).toHaveCount(1);await expect(line.locator('[data-value="102"] [data-adopted=true]')).toHaveAttribute('stroke-dasharray','3 2');
 for(const lang of ['en','ja']){await page.locator('[name=lang]').selectOption(lang);await page.locator('.encoding-examples').screenshot({path:`build/screens/numberline-ranges-${lang}.png`});}
});
