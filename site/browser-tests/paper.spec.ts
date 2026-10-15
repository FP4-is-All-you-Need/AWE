import {openSwap} from './swap-test-helpers.ts';
import {test,expect} from '@playwright/test';
test('paper layout keeps all laws and the decomposition horizontal, with bundled formula fonts',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/?lang=ja');
 await expect(page.locator('[data-source-figure=laws-53]').first()).toBeVisible();
 await expect(page.locator('.paper-lane [data-expansion]')).toBeVisible();await page.evaluate(()=>document.fonts.ready);
 expect(await page.evaluate(()=>document.fonts.check('18px KaTeX_Main'))).toBe(true);
 expect(await page.locator('select[name=precision]').inputValue()).toBe('fp64');
 const check=await page.locator('[data-source-figure=laws-53]').first().evaluate(svg=>[...svg.querySelectorAll('rect')].every(n=>n.rx.baseVal.value===0));
 expect(check).toBe(true);expect(errors).toEqual([]);


});

 test('saved b and K switch with precision and survive URL reload',async({page})=>{
 await page.goto('/?lang=ja&b=54&K=8192');await expect(page.locator('.paper-lane h1')).toContainText('54 bit');
 await page.getByLabel('b 数値').fill('53');await expect(page.locator('.paper-lane h1')).toContainText('18法・62積');await expect(page.locator('select[name=precision]')).toHaveValue('fp64');
 await page.getByLabel('K 数値').fill('16384');await expect(page.locator('.paper-lane h1')).toContainText('21法・59積');
 await page.reload();await expect(page.locator('.paper-lane h1')).toContainText('21法・59積');expect(page.url()).toContain('K=16384');
 await page.getByLabel('K 数値').fill('65536');await expect(page.locator('.paper-lane [role=status]')).toHaveText('K範囲外');
 await page.getByLabel('b 数値').fill('85');await expect(page.locator('.workspace-main > p, [data-integer-unavailable]').filter({hasText:'未収録'})).toBeVisible();await page.reload();await expect(page.getByLabel('b 数値')).toHaveValue('85');
 await page.getByLabel('K 数値').fill('8192');await page.locator('select[name=precision]').selectOption('fp32');await expect(page.getByLabel('b 数値')).toHaveValue('24');await expect(page.locator('[name=crt]')).toHaveValue('1');await expect(page.locator('.paper-lane [data-tile-id]').first()).toBeVisible();
 });

test('map cells keep their square geometry and all formulae use bundled fonts',async({page})=>{
 const external:string[]=[];page.on('request',r=>{if(!r.url().startsWith('http://127.0.0.1:4174'))external.push(r.url());});
 await page.goto('/?lang=ja');await page.locator('[data-source-figure=figure4]').waitFor();await page.locator('.encoding-examples').waitFor();
 expect(await page.locator('.katex-error').count()).toBe(0);expect(external).toEqual([]);
 const dims=await page.locator('[data-source-figure=figure4]').evaluate(s=>({w:s.getBoundingClientRect().width,h:s.getBoundingClientRect().height,v:(s as SVGSVGElement).viewBox.baseVal.width/(s as SVGSVGElement).viewBox.baseVal.height}));
 const scaling=await page.locator('[data-source-figure=figure4]').evaluate(svg=>{const transform=(svg as SVGSVGElement).getScreenCTM()!;return {x:transform.a,y:transform.d};});
 expect(scaling.x).toBeCloseTo(scaling.y,7);
 const cells=await page.locator('[data-map-cell]').evaluateAll(nodes=>nodes.map(node=>{const box=node.getBoundingClientRect();return [box.width,box.height];}));expect(cells.every(([w,h])=>Math.abs(w-h)<.1)).toBe(true);
 await page.setViewportSize({width:390,height:844});const w=await page.locator('[data-source-figure=figure4]').evaluate(e=>e.getBoundingClientRect().width);expect(w).toBeLessThanOrEqual(dims.w);
});

test('source marker references render and controls retain the paper palette',async({page})=>{
 await page.goto('/?lang=ja');await page.locator('[data-source-figure=figure3]').waitFor();await page.evaluate(()=>document.fonts.ready);
 const markers=await page.locator('[data-source-figure=figure3] use').evaluateAll(nodes=>nodes.map(n=>{const b=(n as SVGGraphicsElement).getBBox();return Math.max(b.width,b.height);}));
 expect(markers.length).toBeGreaterThan(20);expect(markers.every(w=>w>0)).toBe(true);
});

test('sliders and direct b/K URLs reproduce the saved diagram and totals',async({page})=>{
 await page.goto('/?lang=ja&b=53&K=8192');await expect(page.locator('.paper-lane h1')).toContainText('18法・62積');
 await page.getByLabel('b スライダー',{exact:true}).focus();await page.keyboard.press('ArrowRight');
 await expect(page.getByLabel('b 数値')).toHaveValue('54');await expect(page.locator('.paper-lane [data-source-figure=laws-54]')).toBeVisible();
 const summary=await page.locator('.paper-lane h1').innerText();await page.reload();await expect(page.locator('.paper-lane h1')).toHaveText(summary);
 await page.goto('/?lang=ja&b=53&K=8192');await page.getByLabel('K スライダー',{exact:true}).focus();for(let i=0;i<4;i++)await page.keyboard.press('ArrowRight');
 await expect(page.getByLabel('K 数値')).toHaveValue('16384');await expect(page.locator('.paper-lane h1')).toContainText('21法・59積');
 await page.goto('/?lang=ja&b=85&K=65536');await expect(page.locator('.workspace-main > p, [data-integer-unavailable]').filter({hasText:'未収録'})).toBeVisible();await expect(page.locator('.paper-lane')).toHaveCount(0);
 await page.goto('/?lang=ja&b=53&K=65536');await expect(page.locator('.paper-lane [role=status]')).toHaveText('K範囲外');
});

test('every saved tier shows limb weights on both grid axes and face counts',async({page})=>{
 await page.goto('/?lang=ja&b=53&K=8192');await page.locator('.law-button').first().waitFor();
 const tiles=page.locator('.law-button');expect(await tiles.count()).toBeGreaterThan(40);
 const labels=await tiles.evaluateAll(nodes=>nodes.map(n=>({title:n.querySelector('title')?.textContent,weights:[...n.querySelectorAll('.svg-math')].map(x=>x.textContent).filter(x=>x?.includes('重み')).length,faces:[...n.querySelectorAll('text')].map(t=>t.textContent).find(t=>t?.includes('面 A'))})));
 expect(labels.every(t=>t.weights===1&&t.title?.includes('重み A')&&t.faces?.includes('面 A'))).toBe(true);
});

test('selected law expands its real coefficients, saved encoding and linked planes',async({page})=>{
 await page.goto('/?lang=ja');await page.locator('.paper-lane').getByRole('button',{name:'法 73 3積',exact:true}).click();
 await expect(page.locator('.construction-detail .equation')).toContainText('42');
 await expect(page.locator('[data-expansion] [data-product]')).toHaveCount(4);
 const tops=await page.locator('[data-expansion] [data-product]').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().top));expect(new Set(tops).size).toBe(1);
 await page.getByRole('button',{name:'積 3',exact:true}).click();await page.locator('input[name=plane_values]').check();
 await expect(page.locator('.selected-values')).toContainText('合同な剰余');
 await page.locator('.paper-lane summary').filter({hasText:'面を作る流れ（A / B）'}).click();await expect(page.getByRole('button',{name:'A の面 3',exact:true})).toHaveAttribute('aria-pressed','true');
 await page.locator('.paper-lane summary').filter({hasText:'保存LUTの符号化と数直線'}).click();await page.locator('input[name=encode_value]').fill('23');await expect(page.locator('.encoding')).toContainText('−8');
 await page.reload();await expect(page.locator('[data-expansion]')).toBeVisible();
 expect(await page.locator('.katex-error').count()).toBe(0);
});

test('replacement candidates show prime collisions and update totals and URL',async({page})=>{
 await page.goto('/?lang=ja');await page.locator('.paper-lane').getByRole('button',{name:'法 73 3積',exact:true}).click();
 await openSwap(page);await expect(page.locator('.candidates')).toContainText('使用中の素因数');await page.locator('.paper-lane').getByRole('button',{name:'法 81 3積',exact:true}).click();await expect(page.locator('.candidates h2')).toContainText('81');await page.locator('.paper-lane').getByRole('button',{name:'法 73 3積',exact:true}).click();await expect(page.locator('.candidates h2')).toContainText('73');await page.locator('input[name=same_modulus]').uncheck();
 const blocked=page.locator('.candidate').filter({hasText:'素因数の衝突'});expect(await blocked.count()).toBeGreaterThan(0);await expect(blocked.first().getByRole('button')).toBeDisabled();
 const candidates=page.locator('.candidate');let replacement;
 for(let i=0;i<await candidates.count();i++){const row=candidates.nth(i),text=await row.innerText(),button=row.getByRole('button');if(await button.isEnabled()&&!text.includes('入替え後 62積')){replacement=row;break;}}
 expect(replacement).toBeTruthy();const text=await replacement!.innerText();const expected=text.match(/入替え後 (\d+)積/)![1];const faces=text.match(/入替え後 \d+積・面 (\d+) \/ (\d+)/)!;await replacement!.getByRole('button').click();
 await expect(page.locator('.paper-lane h1')).toContainText(expected+'積');await expect(page.locator('.paper-lane h1')).toContainText(`面 A ${faces[1]} / B ${faces[2]}`);await expect(page.locator('.paper-lane h1')).toContainText('利用者が作った組');expect(page.url()).toContain('replace=');
 await page.reload();await expect(page.locator('.paper-lane h1')).toContainText(expected+'積');
});

test('default selection and three tile clicks update the actual details',async({page})=>{
 await page.goto('/?lang=ja');const selected=page.locator('.paper-lane .law-button[aria-pressed=true]');await expect(selected).toHaveCount(1);await expect(selected).toHaveAttribute('aria-label','法 73 3積');
 const results:string[]=[];for(const [mod,r] of [[73,3],[81,3],[103,4]]){await page.locator('.paper-lane').getByRole('button',{name:`法 ${mod} ${r}積`,exact:true}).click();await expect(selected).toHaveAttribute('aria-label',`法 ${mod} ${r}積`);await expect(page.locator('.selected-mod')).toContainText(String(mod));await expect(page.locator('[data-expansion] [data-product]')).toHaveCount(r+1);results.push(await page.locator('.construction-detail .equation').innerText());}
 expect(new Set(results).size).toBe(3);expect(await selected.locator(':scope > rect').first().getAttribute('stroke-width')).toBe('5');
});
test('initial 18 tiles carry mod labels, weights and counts',async({page})=>{
 await page.goto('/?lang=ja');const tiles=page.locator('.paper-lane .law-button');await expect(tiles).toHaveCount(18);await expect(page.locator('.paper-lane h1')).toContainText('18法・62積');
 const strings=await tiles.allTextContents();expect(strings.every(s=>s.includes('mod')&&s.includes('重み')&&s.includes('面 A')&&!s.includes('p='))).toBe(true);
});

test('precision, bit slider, numeric input and URL synchronize at 53 47 24',async({page})=>{
 await page.goto('/?lang=ja&b=53');await expect(page.locator('select[name=precision]')).toHaveValue('fp64');await page.getByLabel('b スライダー',{exact:true}).focus();for(let i=0;i<6;i++)await page.keyboard.press('ArrowLeft');await expect(page.getByLabel('b 数値')).toHaveValue('47');await expect(page.locator('select[name=precision]')).toHaveValue('custom');await expect(page.locator('.paper-lane [data-source-figure=laws-47] [data-tile-id]').first()).toBeVisible();await page.reload();await expect(page.getByLabel('b 数値')).toHaveValue('47');await page.screenshot({path:'build/screens/saved-set-for-b47.png'});
 await page.getByLabel('b 数値').fill('24');await expect(page.locator('select[name=precision]')).toHaveValue('fp32');await page.reload();await expect(page.getByLabel('b 数値')).toHaveValue('24');await expect(page.locator('select[name=precision]')).toHaveValue('fp32');await page.locator('select[name=precision]').selectOption('fp64');await expect(page.getByLabel('b 数値')).toHaveValue('53');await expect(page.locator('.paper-lane h1')).toContainText('18法・62積');
});

test('square map cells select canonical width groups and change their details',async({page})=>{
 await page.goto('/?lang=ja');const cells=page.locator('[data-map-cell]');await expect(cells).toHaveCount(289);
 const dimensions=await cells.evaluateAll(nodes=>nodes.map(n=>[(n as SVGRectElement).width.baseVal.value,(n as SVGRectElement).height.baseVal.value]));expect(dimensions.every(([w,h])=>Math.abs(w-h)<1e-7)).toBe(true);
 await page.locator('[name=crt]').selectOption('0');
 await page.getByRole('button',{name:'4 × 4 幅',exact:true}).click();await expect(page.locator('.integer-results [data-expansion]')).toBeVisible();const first=await page.locator('.integer-results [data-expansion]').getAttribute('data-expansion');
 await page.getByRole('button',{name:'8 × 8 幅',exact:true}).click();await expect(page.locator('.integer-results [data-expansion]')).not.toHaveAttribute('data-expansion',first!);await expect(page.locator('.integer-results h2')).toContainText('8');expect(page.url()).toContain('input_ma=8');
});

test('independent A B precision controls and ranges survive URL reload',async({page})=>{
 await page.goto('/?lang=ja');await expect(page.locator('select[name=precision_b]')).toHaveCount(0);await page.locator('input[name=same_inputs]').uncheck();await expect(page.locator('select[name=precision_b]')).toBeVisible();await page.locator('select[name=precision_b]').selectOption('int8');await expect(page.getByLabel('B の b 数値',{exact:true})).toHaveValue('7');await expect(page.getByLabel('b 数値',{exact:true})).toHaveValue('53');await page.reload();await expect(page.locator('input[name=same_inputs]')).not.toBeChecked();await expect(page.getByLabel('B の b 数値',{exact:true})).toHaveValue('7');await page.screenshot({path:'build/screens/independent.png'});await page.locator('input[name=same_inputs]').check();await expect(page.locator('select[name=precision_b]')).toHaveCount(0);
});

test('equal-width sEM bands select precision and show the moving b marker',async({page})=>{
 await page.goto('/?lang=ja');const svg=page.getByLabel('入力形式の符号、指数、仮数のビット配置',{exact:true});await expect(svg.getByRole('button')).toHaveCount(7);
 await svg.getByRole('button',{name:'FP32：符号 1、指数 8、仮数 23 ビット',exact:true}).click();await expect(page.locator('select[name=precision]')).toHaveValue('fp32');await expect(page.getByLabel('b 数値',{exact:true})).toHaveValue('24');await expect(svg.locator('[data-b-marker]')).toHaveAttribute('data-b','24');
 await svg.getByRole('button',{name:'FP64：符号 1、指数 11、仮数 52 ビット',exact:true}).click();await expect(page.getByLabel('b 数値',{exact:true})).toHaveValue('53');await expect(svg.locator('[data-b-marker]')).toHaveAttribute('data-b','53');
 const widths=await svg.locator('[data-bit] rect').evaluateAll(nodes=>nodes.map(n=>Number(n.getAttribute('width'))));expect(new Set(widths).size).toBe(1);expect(widths[0]).toBeGreaterThan(0);expect(widths[0]).toBeLessThan(36);await page.getByLabel('b 数値',{exact:true}).fill('52');await expect(svg.locator('[data-b-marker]')).toHaveAttribute('data-b','52');
});

test('integer input changes encoding and a staircase point selects its width',async({page})=>{
 await page.goto('/?lang=ja');await page.locator('input[name=encode_int]').fill('12');const before=await page.locator('.encoding-equation').innerText();await page.locator('input[name=encode_int]').fill('100');await expect(page.locator('.encoding-equation')).not.toHaveText(before);await expect(page.locator('.encoding-equation')).toContainText('100');await expect(page.locator('[data-number-line=base13] .encoding-candidates.all-representations')).toContainText('−4');
 await page.getByRole('button',{name:'幅 8 の構成へ',exact:true}).click();await expect(page.getByLabel('b 数値',{exact:true})).toHaveValue('7');await expect(page.locator('.integer-results [data-expansion]')).toBeVisible();await expect(page.locator('.integer-results h2')).toContainText('8');await expect(page.getByRole('button',{name:'幅 8 の構成へ',exact:true})).toHaveAttribute('aria-pressed','true');
});

test('plane columns and product selection highlight each other',async({page})=>{
 await page.goto('/?lang=ja');await page.locator('.paper-lane summary').filter({hasText:'面を作る流れ（A / B）'}).click();await expect(page.getByLabel('A 側のリムから面への流れ',{exact:true})).toContainText('2 リムの面（1 面）');
 const bSide=page.locator('.paper-lane details[data-side-details=B][data-side-kind=flow]');if(await bSide.getAttribute('open')===null)await bSide.locator(':scope > summary').click();
 await page.getByRole('button',{name:'積 3',exact:true}).click();await expect(page.getByRole('button',{name:'A の面 3',exact:true})).toHaveAttribute('aria-pressed','true');await expect(page.getByRole('button',{name:'B の面 3',exact:true})).toHaveAttribute('aria-pressed','true');
 await page.getByLabel('A 側のリムから面への流れ',{exact:true}).getByRole('button',{name:'A の面 1',exact:true}).click();await expect(page.getByRole('button',{name:'積 1',exact:true})).toHaveAttribute('aria-pressed','true');
});

test('plane bands show the actual saved FP4 values rather than the ambient set',async({page})=>{
 await page.goto('/?lang=ja');await page.locator('.paper-lane').getByRole('button',{name:'法 8 1積',exact:true}).click();await expect(page.locator('.selected-values')).toHaveCount(0);await page.locator('input[name=plane_values]').check();
 const band=page.locator('.selected-values [aria-label^="保存済み符号化の実値"]').first();await expect(band.locator('[data-fp4-value]')).toHaveCount(15);const used=await band.locator('[data-used=true]').evaluateAll(nodes=>nodes.map(n=>Number(n.getAttribute('data-fp4-value'))));expect(used).toEqual([-4,-3,-2,-1,0,1,2,3]);await expect(band.locator('[data-fp4-value="12"]')).toHaveAttribute('data-used','false');await page.locator('input[name=plane_values]').uncheck();await expect(page.locator('.selected-values')).toHaveCount(0);
});

test('matrix size and selected limb construction change the decomposition',async({page})=>{
 await page.goto('/?lang=ja');await page.locator('.paper-lane summary').filter({hasText:'行列の分解と行列サイズ'}).click();const matrix=page.locator('[data-matrix-size]');await expect(matrix).toHaveAttribute('data-matrix-size','8192 8192 8192');await page.getByLabel('M の行列サイズ',{exact:true}).fill('64');await page.getByLabel('N の行列サイズ',{exact:true}).fill('128');await expect(matrix).toHaveAttribute('data-matrix-size','64 128 8192');await expect(matrix.getByRole('button')).toHaveCount(4);
 await page.locator('.paper-lane').getByRole('button',{name:'法 8 1積',exact:true}).click();await page.locator('.paper-lane summary').filter({hasText:'行列の分解と行列サイズ'}).click();await expect(page.locator('[data-matrix-size]').getByRole('button')).toHaveCount(1);await expect(page.locator('[data-matrix-size]')).toHaveAttribute('data-matrix-size','64 128 8192');await page.reload();await page.locator('.paper-lane summary').filter({hasText:'行列の分解と行列サイズ'}).click();await expect(page.locator('[data-matrix-size]')).toHaveAttribute('data-matrix-size','64 128 8192');
});

test('sections collapse',async({page})=>{
 await page.goto('/?lang=ja');await page.locator('.paper-lane>summary').click();await expect(page.locator('.paper-lane .law-row')).not.toBeVisible();await page.locator('.paper-lane>summary').click();await expect(page.locator('.paper-lane .law-row')).toBeVisible();
 await page.locator('.paper-comparison>summary').click();await expect(page.locator('.paper-comparison .law-row').first()).not.toBeVisible();await page.locator('.paper-comparison>summary').click();await expect(page.locator('.paper-comparison .law-row').first()).toBeVisible();
});

test('hole histogram, fractional limit, map and saved correction update together',async({page})=>{
 await page.goto('/?lang=ja&hole_pct_max=2');
 await page.locator('.coverage-controls > summary').click();await page.locator('.joint-comparison > summary').click();
 const input=page.locator('input[name=hole_pct_max]'),slider=page.locator('input[name=hole_pct_max_range]');
 await expect(input).toHaveValue('2');await expect(slider).toHaveValue('2');
 const choices=page.locator('.joint-comparison button[name=joint_id]');await expect(choices).toHaveCount(1);
 await expect(choices.first()).toContainText('-103, 103');await choices.first().click();
 await expect(page.locator('.joint-comparison .construction-detail')).toContainText('最近接ずらし ±1');
 await input.fill('0');await expect(choices).toHaveCount(0);
 await expect(page.locator('[data-map-cell][aria-label="8 × 8 幅"]')).toHaveAttribute('data-hole-candidates','0');
 await input.fill('10');await expect(choices).toHaveCount(2);await expect(slider).toHaveValue('10');
 await expect(page.locator('[data-map-cell][aria-label="8 × 8 幅"]')).toHaveAttribute('data-hole-candidates','2');
 await slider.focus();await page.keyboard.press('ArrowRight');await expect(input).toHaveValue('10.1');
 await expect(page.locator('[data-hole-max]')).toHaveAttribute('data-hole-max','10.1');
 expect(page.url()).toContain('hole_pct_max=10.1');await page.reload();await expect(input).toHaveValue('10.1');
});
