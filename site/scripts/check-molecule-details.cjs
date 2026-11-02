// Run against a built site: node scripts/check-molecule-details.cjs DIST OUTPUT.
// CHROME_BIN optionally selects an installed browser; otherwise Playwright uses its browser.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('@playwright/test');
const dist=path.resolve(process.argv[2]||'dist'),out=path.resolve(process.argv[3]||'../build/molecule-ui');
fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{const name=decodeURIComponent(req.url.split('?')[0]),file=path.resolve(dist,'.'+(name==='/'?'/index.html':name));if(!file.startsWith(dist+path.sep)){res.writeHead(403).end();return;}fs.readFile(file,(err,bytes)=>{if(err){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.woff2':'font/woff2'})[path.extname(file)]||'application/octet-stream');res.end(bytes);});});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;const rows=[],errors=[];
 try{
 browser=await chromium.launch({headless:true,...(process.env.CHROME_BIN?{executablePath:process.env.CHROME_BIN}:{}),args:['--renderer-process-limit=2','--num-raster-threads=1']});
 const base='http://127.0.0.1:'+server.address().port;
 for(const [lang,width,height] of [['ja',1920,1080],['en',390,844]])for(const [m,format] of [[6,'fp4'],[510,'fp4'],[901,'fp6']]){
  if(process.env.MOLECULE_TEST_CASE&&process.env.MOLECULE_TEST_CASE!==`${lang}-${m}`)continue;const page=await browser.newPage({viewport:{width,height}});page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(`${base}/?lang=${lang}&section=composite-table&molecule_modulus=${m}&prime_set=${format}`);
  const detail=page.locator(`[data-molecule-detail="${m}"]`),grid=detail.locator('[data-molecule-grid="combined"]');await grid.waitFor();
  assert.equal(await detail.locator('[aria-label="molecule grid color"]').inputValue(),'components');
  assert.equal(await detail.locator('[data-molecule-flow]').evaluate(e=>e.open),false);
  assert.equal(await detail.locator('[data-molecule-expansion]').evaluate(e=>e.open),false);
  assert(await detail.locator('[data-shared-counts]').isVisible());
  assert.equal(await page.locator('[data-composite]').count(),15);
  const sourceURL=new URL(await detail.locator('a').last().getAttribute('href'),page.url()).href;
  const id=(await detail.locator('a').last().textContent()).trim();
  const sourceData=await (await page.request.get(sourceURL)).json(),source=sourceData.solutions.find(r=>r.id===id);assert(source);assert.equal(source.modulus,m);
  assert.equal(await grid.locator('[data-molecule-cell]').count(),source.weights.A.length*source.weights.B.length);
  assert(source.plane_sets.A.every(s=>s===(format==='fp4'?'2xE2M1':'8xE2M3')));
  const first=detail.locator('[data-molecule-product="0"]');assert.equal((await first.textContent()).trim(),'T0');await first.click();
  const panel=detail.locator('[data-molecule-selected-product="0"]');await panel.waitFor();
  const p=source.products[0];assert.equal(await panel.locator(`[data-molecule-selected-plane="A:${p.a}"]`).count(),1);assert.equal(await panel.locator(`[data-molecule-selected-plane="B:${p.b}"]`).count(),1);
  if(m===6){assert.equal((await panel.locator('[data-selected-product-components]').textContent()).trim(),'2, 3');assert.equal(await grid.locator('[data-shared-product="true"]').count(),1);}
  await detail.locator('[aria-label="molecule grid color"]').selectOption('products');
  for(let t=0;t<source.products.length;t++){
   const p=source.products[t],expected=source.planes.A[p.a].filter(Boolean).length*source.planes.B[p.b].filter(Boolean).length;
   assert.equal(await grid.locator(`[data-grid-product-color="${t}"]`).count(),expected);
  }
  await detail.locator('[data-molecule-expansion] > summary').click();
  const expansion=detail.locator('[data-molecule-expansion] [data-compact-product="0"]');
  assert((await expansion.locator('[data-tex]').getAttribute('data-tex')).includes('T_{0}'));
  const style=el=>({background:getComputedStyle(el).backgroundColor,border:getComputedStyle(el).borderTopColor});
  assert.deepEqual(await first.evaluate(style),await expansion.evaluate(style));
  await detail.locator('[data-molecule-expansion] > summary').click();
  await grid.locator('[data-covering-products]').filter({has:page.locator('[data-grid-product-color="0"]')}).first().click();
  assert(await detail.locator('[data-molecule-selected-product]').isVisible());
  await page.locator('[aria-label="molecule page size"]').fill('7');assert.equal(await page.locator('[data-composite]').count(),7);
  assert.equal(new URL(page.url()).searchParams.get('molecule_page_size'),'7');
  if(width===1920&&m===510){if(await first.getAttribute('aria-pressed')!=='true')await first.click();await detail.locator('[aria-label="molecule grid color"]').selectOption('components');await page.evaluate(()=>document.fonts.ready);await grid.screenshot({path:path.join(out,'molecule-510-grid.png')});await panel.screenshot({path:path.join(out,'molecule-510-selected.png')});}
  await page.reload();await detail.locator('[data-molecule-grid="combined"]').waitFor();assert.equal(await page.locator('[data-composite]').count(),7);assert.equal(await detail.locator('[data-molecule-flow]').evaluate(e=>e.open),false);
  await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(1000);const scrollWidth=await page.evaluate(()=>document.documentElement.scrollWidth);if(scrollWidth>width){const nodes=await page.evaluate(()=>[...document.querySelectorAll('body *')].flatMap(el=>{if(!el.checkVisibility())return [];for(let a=el.parentElement;a;a=a.parentElement){if(a.tagName==='DETAILS'&&!a.open&&!a.querySelector(':scope > summary')?.contains(el))return [];if(['auto','hidden','scroll','clip'].includes(getComputedStyle(a).overflowX)&&a.getBoundingClientRect().right<=innerWidth+1)return [];}const b=el.getBoundingClientRect();return b.width&&(b.right>innerWidth+1||(el.scrollWidth>el.clientWidth+1&&getComputedStyle(el).overflowX==='visible'))?[{tag:el.tagName,cls:el.getAttribute('class'),right:b.right,width:b.width,scrollWidth:el.scrollWidth,clientWidth:el.clientWidth,text:el.textContent.slice(0,100),overflow:getComputedStyle(el).overflowX,parent:el.parentElement.tagName+'.'+el.parentElement.className,parentOverflow:getComputedStyle(el.parentElement).overflowX}]:[]}).slice(-30));fs.writeFileSync(path.join(out,'overflow.json'),JSON.stringify({lang,m,width,scrollWidth,nodes},null,2));await page.screenshot({path:path.join(out,'overflow.png')});console.log(JSON.stringify({lang,m,width,scrollWidth,nodes}));}assert(scrollWidth<=width,`${lang} mod${m}: ${scrollWidth} > ${width}`);
  rows.push({lang,width,m,format,source_id:id,rows:source.weights.A.length,columns:source.weights.B.length,product_indices_match_expansion:true,selected_planes_match_source:true,page_size_roundtrip:true});
  if(lang==='ja'&&m===6){
   // Browser-only fixture: make both component projections unconfirmed. Catalog files stay untouched.
   const fixture=structuredClone(sourceData);fixture.solutions.find(r=>r.id===id).denominator=6;
   await page.route(sourceURL,route=>route.fulfill({contentType:'application/json',body:JSON.stringify(fixture)}));
   await page.goto(`${base}/?lang=ja&section=composite-table&molecule_modulus=6&molecule_grid_color=products`);
   await grid.waitFor();assert.equal(await grid.locator('[data-grid-product-color="0"]').count(),1);assert.equal(await grid.locator('[data-shared-product="true"]').count(),0);
   await first.click();assert.equal((await panel.locator('[data-selected-product-components]').textContent()).trim(),'—');
   rows.push({fixture:'nonunit denominator 6, both components unconfirmed',saved_product_visible:true,no_invented_sharing:true});
  }
  await page.close();
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'molecule-details.json'),JSON.stringify({rows,errors},null,2));console.log(JSON.stringify({rows,errors}));
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
