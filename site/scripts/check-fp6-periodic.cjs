// node scripts/check-fp6-periodic.cjs DIST OUTPUT; CHROME_BIN selects an installed Chrome.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('@playwright/test');
const dist=path.resolve(process.argv[2]),out=path.resolve(process.argv[3]);fs.mkdirSync(out,{recursive:true});
const data=JSON.parse(fs.readFileSync(path.join(dist,'visualization/fp6-periodic.json')));
const polar=JSON.parse(fs.readFileSync(path.join(dist,'visualization/polar-catalog.json')));
const composite=m=>{let factors=0;for(let p=2;p*p<=m;p++){if(m%p)continue;factors++;while(m%p===0)m/=p;}return factors+(m>1?1:0)>1;};
const server=http.createServer((req,res)=>{const name=decodeURIComponent(req.url.split('?')[0]),file=path.resolve(dist,'.'+(name==='/'?'/index.html':name));if(!file.startsWith(dist+path.sep)){res.writeHead(403).end();return;}fs.readFile(file,(err,bytes)=>{if(err){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.woff2':'font/woff2'})[path.extname(file)]||'application/octet-stream');res.end(bytes);});});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;const results=[],errors=[];
 try{
 browser=await chromium.launch({headless:true,...process.env.CHROME_BIN?{executablePath:process.env.CHROME_BIN}:{},args:['--renderer-process-limit=2','--num-raster-threads=1']});
 const base='http://127.0.0.1:'+server.address().port;
 for(const lang of ['ja','en'])for(const set of ['8xE2M3','16xE3M2']){
  const width=lang==='ja'?1440:390,page=await browser.newPage({viewport:{width,height:900}});page.on('pageerror',e=>errors.push(String(e)));
  console.log('checking',lang,set);
  const visit=async(query)=>{await page.goto(`${base}/?lang=${lang}&prime_set=fp6&periodic_fp6=${set}&${query}`);await page.locator(`[data-format-page="${set}"]`).waitFor();};
  await visit('section=fp6-families');
  const expected=data.rows.filter(r=>r.value_set===set).length;
  await page.locator(`[data-fp6-family-count="${expected}"]`).waitFor();
  assert(await page.locator('[data-section="fp6-families"]').evaluate(e=>e.open));
  assert(await page.locator('[data-fp6-family-row]').evaluateAll((els,set)=>els.every(e=>e.dataset.valueSet===set),set));
  await page.locator('[aria-label="FP6 family"]').selectOption('general_weight_2prime');
  await page.locator('[aria-label="FP6 modulus"]').fill('901');
  await page.locator('[data-fp6-summary="901"]').waitFor();
  assert.equal(await page.locator('[data-fp6-family-row]').count(),data.rows.filter(r=>r.value_set===set&&r.family==='general_weight_2prime'&&r.m===901).length);
  await page.reload();await page.locator('[data-fp6-summary="901"]').waitFor();
  assert.equal(await page.locator('[aria-label="FP6 family"]').inputValue(),'general_weight_2prime');
  const checked=data.rows.find(r=>r.value_set===set&&r.public_id&&r.family==='p3');
  await visit(`section=fp6-families&fp6_m=${checked.m}&fp6_family=p3`);
  const link=page.locator(`[data-fp6-family-row="${checked.id}"] a`);await link.waitFor();await link.click();
  await page.locator(`[data-selected-form="${checked.public_id}"]`).waitFor();
  assert.equal(new URL(page.url()).searchParams.get('periodic_fp6'),set);
  assert.equal(new URL(page.url()).searchParams.get('lang'),lang);
  assert.equal(await page.locator('[data-forms-value-set]').getAttribute('data-forms-value-set'),set);
  await visit('section=composite-table&molecule_modulus=901');
  await page.locator('[data-molecule-detail="901"] [data-molecule-grid="combined"]').waitFor();
  await page.locator('[data-molecule-reconstruction]').waitFor();
  assert.equal(await page.locator('[aria-label="molecule page size"]').inputValue(),'15');
  const expectedMolecules=Math.min(15,new Set(polar.rows.filter(r=>r.vs===set&&r.inCatalog&&r.m>=2&&r.m<=65536&&!r.hA&&!r.hB&&composite(r.m)).map(r=>r.m)).size);
  assert.equal(await page.locator('[data-composite]').count(),expectedMolecules);
  const expectedCells=new Set(polar.rows.filter(r=>r.vs===set&&r.m>=2&&r.m<=170&&!r.hA&&!r.hB).map(r=>r.m)).size;
  for(const mode of ['arc','powers']){
   await visit(`section=polar-periodic&polar_count=169&polar_spacing=${mode}`);
   await page.locator('[data-ribbon-cell]').first().waitFor();
   assert.equal(await page.locator('[data-ribbon-cell]').count(),expectedCells);
  }
  await page.getByRole('button',{name:'FP4',exact:true}).click();
  await page.locator('[data-section="map"]').waitFor();
  assert.equal(await page.locator('[data-section="fp6-families"]').count(),0);
  await page.getByRole('button',{name:'FP6',exact:true}).click();
  await page.locator(`[data-format-page="${set}"]`).waitFor();
  await page.locator(`[data-fp6-family-count="${expected}"]`).waitFor();
  if(set==='8xE2M3'){
   const source=data.rows.find(r=>r.value_set===set&&r.status==='source_only'&&r.recon==='d1_divide_d2_inverse');
   await visit(`section=fp6-families&fp6_m=${source.m}&fp6_family=toom`);
   const row=page.locator(`[data-fp6-family-row="${source.id}"]`);await row.waitFor();
   assert.equal(await row.getAttribute('data-status'),'source_only');
   assert.equal(await row.locator('a').count(),0);
   assert((await row.locator('[data-fp6-recon]').textContent()).includes('d2'));
   await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(300);
   await page.locator('[data-section="fp6-families"]').screenshot({path:path.join(out,`toom-${lang}.png`)});
  }
  await page.evaluate(()=>document.fonts.ready);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${lang}/${set} overflow`);
  results.push({lang,width,value_set:set,representatives:expected,whole_page_toggle:true,family_url_roundtrip:true,source_link:true,molecule_grid:true,both_ribbon_modes:expectedCells,source_reconstruction:set==='8xE2M3'});
  await page.close();
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'fp6-periodic-ui.json'),JSON.stringify({results,errors},null,2));console.log(JSON.stringify({results,errors}));
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
