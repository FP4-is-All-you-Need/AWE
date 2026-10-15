import {test,expect} from '@playwright/test';

test('precision controls and figure 4 share the same selected input pair',async({page})=>{
 await page.goto('/?lang=ja');
 const selected=page.locator('[data-map-cell][aria-pressed=true]');
 for(const [precision,bit,axis,width] of [['fp64',53,53,54],['fp32',24,24,25],['bf16',8,9,9],['int8',7,8,8]] as const){
  await page.locator('select[name=precision]').selectOption(precision);
  await expect(page.locator('input[name=b]')).toHaveValue(String(bit));
  await expect(page.locator('input[name=input_ma]')).toHaveValue(String(width));
  await expect(page.locator('input[name=input_mb]')).toHaveValue(String(width));
  await expect(selected).toHaveCount(1);await expect(selected).toHaveAttribute('data-row',String(axis));await expect(selected).toHaveAttribute('data-column',String(axis));
  if(precision==='fp64')await expect(page.locator('.paper-lane h1')).toContainText('18法・62積');
  else await expect(page.locator('.paper-lane')).toHaveCount(0);
 }
 await expect(page.locator('.map-selection-note')).toContainText('図の札は b、本文の整数幅は b + 1');
 await page.locator('[data-map-cell][data-row="53"][data-column="53"]').click();
 await expect(page.locator('select[name=precision]')).toHaveValue('fp64');await expect(page.locator('input[name=b]')).toHaveValue('53');await expect(page.locator('.paper-lane h1')).toContainText('62積');
 await page.locator('input[name=same_inputs]').uncheck();await page.locator('select[name=precision_b]').selectOption('int8');
 await expect(page.locator('[name=crt]')).toHaveValue('1');await expect(selected).toHaveAttribute('data-row','53');await expect(selected).toHaveAttribute('data-column','8');await expect(page.locator('.paper-lane')).toHaveCount(0);
 await page.reload();await expect(selected).toHaveAttribute('data-row','53');await expect(page.locator('input[name=b]')).toHaveValue('53');await expect(page.locator('input[name=b_b]')).toHaveValue('7');
 await page.locator('[data-map-cell][data-row="24"][data-column="9"]').click();
 await expect(page.locator('select[name=precision]')).toHaveValue('bf16');await expect(page.locator('select[name=precision_b]')).toHaveValue('fp32');await expect(selected).toHaveAttribute('data-method','crt');
 await expect(page.locator('input[name=same_inputs]')).not.toBeChecked();await expect(page.locator('input[name=b_b]')).toHaveValue('24');
 await page.locator('input[name=same_inputs]').check();await expect(selected).toHaveAttribute('data-row','9');await expect(selected).toHaveAttribute('data-column','9');
 await page.locator('input[name=b]').fill('20');await expect(selected).toHaveCount(0);await expect(page.getByText('この整数幅のセルは図では省略されています。',{exact:true})).toBeVisible();
 await page.locator('select[name=precision]').selectOption('fp64');await page.locator('.map-section').scrollIntoViewIfNeeded();await page.screenshot({path:'build/screens/map-synchronized-fp64.png'});
 const figure=page.locator('[data-source-figure=figure4]');await expect(figure.locator('[data-source-text=source_reference_FP32]')).toContainText('FP32');await expect(figure.locator('[data-source-text=source_reference_FP64]')).toContainText('FP64');
 const desktop=await figure.boundingBox();await page.setViewportSize({width:390,height:844});const narrow=await figure.boundingBox();expect(narrow!.width).toBeLessThan(desktop!.width);expect(narrow!.width/narrow!.height).toBeCloseTo(desktop!.width/desktop!.height,4);
 const squares=await page.locator('[data-map-cell]').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect()).every(r=>Math.abs(r.width-r.height)<.01));expect(squares).toBe(true);
 await figure.screenshot({path:'build/screens/map-synchronized-narrow.png'});
});

test('all 289 saved map cells select their width pair and triangle without adding omitted widths',async({page})=>{
 test.setTimeout(180000);await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/?lang=en&open.precision-bands=0&open.map=1');
 const cells=page.locator('[data-map-cell]');await expect(cells).toHaveCount(289);
 const pairs=await cells.evaluateAll(nodes=>nodes.map(n=>[Number(n.getAttribute('data-row')),Number(n.getAttribute('data-column'))]));
 expect(new Set(pairs.map(p=>p[0]))).toEqual(new Set([4,5,6,7,8,9,10,11,12,13,14,15,16,17,24,32,53]));
 for(let i=0;i<pairs.length;i++){
  const [row,column]=pairs[i],width=(n:number)=>n===53?54:n===24?25:n;
  await cells.nth(i).click();
  await expect(cells.nth(i)).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('input[name=input_ma]')).toHaveValue(String(width(Math.min(row,column))));
  await expect(page.locator('input[name=input_mb]')).toHaveValue(String(width(Math.max(row,column))));
  await expect(page.locator('input[name=b]')).toHaveValue(String(width(Math.min(row,column))-1));
 }
});
