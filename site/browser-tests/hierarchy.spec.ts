import {test,expect} from '@playwright/test';
test('arxiv hierarchy uses four source scales and source carry steps for 1000',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/?encode_int=1000&section=numberline');
 const h=page.locator('.base13-hierarchy');await expect(h).toHaveAttribute('data-carry-result','12,-2,6');await expect(h.locator('[data-carry-stage]')).toHaveCount(3);
 for(const e of [0,1,2])expect(await h.locator(`[data-trace-exponent="${e}"]`).count()).toBeGreaterThan(0);
 const states=await h.locator('[data-trace-exponent]').evaluateAll(ns=>ns.map(n=>[n.getAttribute('data-trace-exponent'),n.getAttribute('data-trace-digit'),n.getAttribute('data-trace-kind')]));expect(states).toEqual([['2','5','digit'],['1','11','digit'],['0','12','digit'],['1','11','reverse'],['2','6','digit']]);
 await h.locator('[data-carry-stage="1"]').click();await expect(page.locator('[name=encode_step]')).toHaveValue('4');await expect(h.locator('[data-trace-kind=reverse]')).toHaveAttribute('data-active','true');
 await h.locator('[data-hierarchy-step="5"]').first().click();await expect(h.locator('[data-carry-stage="2"]')).toHaveAttribute('aria-pressed','true');await expect(page).toHaveURL(/encode_step=5/);
 await page.reload();await expect(page.locator('[name=encode_step]')).toHaveValue('5');await expect(h.locator('[data-carry-stage="2"]')).toHaveAttribute('aria-pressed','true');
 await page.locator('[name=encode_step]').selectOption('-1');await page.setViewportSize({width:2600,height:1000});await page.evaluate(()=>document.fonts.ready);await h.locator('[data-hierarchy]').screenshot({path:'build/screens/hierarchy-1000-en.png'});
 const sizes=await h.locator('[data-source-text]').evaluateAll(nodes=>nodes.map(n=>{const svg=n.closest('svg')!;return Number((n as HTMLElement).dataset.effectiveFont)*svg.getBoundingClientRect().width/svg.viewBox.baseVal.width;}));expect(Math.min(...sizes)).toBeGreaterThanOrEqual(13.9);
 await page.locator('[name=lang]').selectOption('ja');await h.locator('[data-hierarchy]').screenshot({path:'build/screens/hierarchy-1000-ja.png'});await expect(h.locator('.katex-error')).toHaveCount(0);expect(errors).toEqual([]);
});
test('hierarchy arbitrary negative and large inputs change carries and higher source rows',async({page})=>{
 await page.goto('/?encode_int=1000&section=numberline');const h=page.locator('.base13-hierarchy');await expect(h).toHaveAttribute('data-carry-result','12,-2,6');
 for(const value of ['5','-1000','10000','18446744073709551615']){
  await page.locator('[name=encode_int]').fill(value);await expect(h).toHaveAttribute('data-carry-input',value);
  const tuple=(await h.getAttribute('data-carry-result'))!.split(',').map(BigInt);expect(tuple.reduce((s,d,i)=>s+d*13n**BigInt(i),0n)).toBe(BigInt(value));expect(tuple.every(d=>[0n,1n,2n,3n,4n,6n,8n,12n].includes(d<0n?-d:d))).toBe(true);
  await expect(h.locator('.katex-error')).toHaveCount(0);await h.locator('[data-carry-stage]').last().click();await expect(h.locator('[data-trace-exponent][data-active=true]')).toHaveCount(1);
 }
 await h.locator('[data-hierarchy-value="5"][data-hierarchy-exponent="0"]').click();await expect(page.locator('[name=encode_int]')).toHaveValue('5');await expect(h).toHaveAttribute('data-carry-result','-8,1,0');
 await page.locator('[name=encode_int]').fill('2000');await page.setViewportSize({width:2600,height:1600});await h.locator('[data-hierarchy]').screenshot({path:'build/screens/hierarchy-2000.png'});await page.locator('[name=encode_int]').fill('10000');await h.screenshot({path:'build/screens/hierarchy-10000.png'});
 await page.setViewportSize({width:390,height:844});await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);expect(await h.locator('[data-hierarchy]').evaluate(e=>e.getBoundingClientRect().width)).toBeGreaterThan(390);
});

for(const lang of ['en','ja'])test(`numberline opens with 1000 and preserves exact edited integers ${lang}`,async({page})=>{
 await page.goto(`/?lang=${lang}`);
 const section=page.locator('#numberline'),input=section.locator('[name=encode_int]'),h=section.locator('.base13-hierarchy');
 await expect(section).toBeVisible();await expect(h.locator('[data-hierarchy]')).toBeVisible();
 expect(await section.evaluate(n=>{const disclosure=n.closest('details');return !disclosure||disclosure.open;})).toBe(true);
 await expect(input).toHaveValue('1000');
 await expect(h).toHaveAttribute('data-carry-input','1000');await expect(h).toHaveAttribute('data-carry-result','12,-2,6');
 await expect(h.locator('[name=encode_step] option')).toHaveCount(6);
 expect(await h.locator('[name=encode_step] option').evaluateAll(nodes=>nodes.map(n=>(n as HTMLOptionElement).value))).toEqual(['-1','1','2','3','4','5']);
 await expect(h.locator('[data-carry-stage]')).toHaveCount(3);
 const bounds=await input.evaluate(n=>({bottom:n.getBoundingClientRect().bottom}));
 expect(bounds.bottom).toBeLessThanOrEqual(await h.locator('[data-hierarchy]').evaluate(n=>n.getBoundingClientRect().top));
 for(const value of ['845','2000','-500']){
  await input.fill(value);await expect(h).toHaveAttribute('data-carry-input',value);
  const tuple=(await h.getAttribute('data-carry-result'))!.split(',').map(BigInt);
  expect(tuple.reduce((sum,d,i)=>sum+d*13n**BigInt(i),0n)).toBe(BigInt(value));
  await expect(h.locator('.katex-error')).toHaveCount(0);
  await expect.poll(()=>new URL(page.url()).searchParams.get('encode_int')).toBe(value);
  await expect.poll(()=>new URL(page.url()).searchParams.get('section')).toBe('numberline');
  await expect(section.locator('[name=awe_encode_int]')).toHaveValue(value);
  await page.reload();await expect(input).toHaveValue(value);await expect(h).toHaveAttribute('data-carry-input',value);
  await expect(section.locator('[name=awe_encode_int]')).toHaveValue(value);
 }
});

test('numberline shared and separate controls restore both inputs from the URL',async({page})=>{
 await page.goto('/?section=numberline');
 const section=page.locator('#numberline'),base=section.locator('[name=encode_int]'),awe=section.locator('[name=awe_encode_int]'),shared=section.locator('[name=encode_shared]'),h=section.locator('.base13-hierarchy');
 await expect(shared).toHaveValue('1');await expect(base).toHaveValue('1000');await expect(awe).toHaveValue('1000');
 await expect(awe).toBeVisible();
 const aweFigure=section.locator('[data-number-line=awe] svg').first();
 await expect(aweFigure).toBeVisible();
 expect(await awe.evaluate(n=>n.getBoundingClientRect().bottom)).toBeLessThanOrEqual(await aweFigure.evaluate(n=>n.getBoundingClientRect().top));
 await awe.fill('845');await expect(base).toHaveValue('845');await expect(h).toHaveAttribute('data-carry-input','845');
 await expect.poll(()=>new URL(page.url()).searchParams.get('encode_int')).toBe('845');
 await shared.selectOption('0');await base.fill('2000');await awe.fill('-500');
 await expect(base).toHaveValue('2000');await expect(awe).toHaveValue('-500');await expect(h).toHaveAttribute('data-carry-input','2000');
 await expect.poll(()=>new URL(page.url()).searchParams.get('encode_shared')).toBe('0');
 await expect.poll(()=>new URL(page.url()).searchParams.get('encode_int')).toBe('2000');
 await expect.poll(()=>new URL(page.url()).searchParams.get('awe_encode_int')).toBe('-500');
 const independentURL=page.url();await page.reload();
 await expect(shared).toHaveValue('0');await expect(base).toHaveValue('2000');await expect(awe).toHaveValue('-500');
 // Loading the copied URL must restore the same state independently of the
 // previous component instance and its in-memory input values.
 await page.goto('/');await page.goto(independentURL);
 await expect(shared).toHaveValue('0');await expect(base).toHaveValue('2000');await expect(awe).toHaveValue('-500');
 await shared.selectOption('1');await base.fill('845');await expect(awe).toHaveValue('845');
 await awe.fill('-500');await expect(base).toHaveValue('-500');await expect(h).toHaveAttribute('data-carry-input','-500');
 await page.reload();await expect(shared).toHaveValue('1');await expect(base).toHaveValue('-500');await expect(awe).toHaveValue('-500');
});
