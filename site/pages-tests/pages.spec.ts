import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const root=path.resolve(import.meta.dirname,'../..');
const out=path.join(root,'build/pages-check');
fs.mkdirSync(out,{recursive:true});fs.mkdirSync(path.join(root,'build/screens'),{recursive:true});
for(const lang of ['en','ja'])for(const width of [1440,390])test(`Pages prefix, initial traffic and interactive data ${lang} ${width}`,async({page,context})=>{
 await page.setViewportSize({width,height:1000});await page.emulateMedia({reducedMotion:'reduce'});
 const responses:{url:string;status:number;type:string;bytes:number;order:number}[]=[],failures:string[]=[],errors:string[]=[],pending:Promise<void>[]=[];
 let order=0,receivedBodyBytes=0;let firstJsonTraffic:{url:string;received_body_bytes:number}|undefined;const urls=new Map<string,string>();
 const cdp=await context.newCDPSession(page);await cdp.send('Network.enable');
 // Worker startup requests can remain open in the page CDP session. Wait for
 // rendered data, loaded fonts and a stable response count instead of networkidle.
 const settled=async()=>{await page.evaluate(()=>document.fonts.ready);let last=-1,stable=0;await expect.poll(()=>{const n=responses.length;stable=n===last?stable+1:0;last=n;return stable;},{timeout:15000,intervals:[250,250,500,500]}).toBeGreaterThanOrEqual(3);await Promise.all(pending);};
 cdp.on('Network.responseReceived',e=>urls.set(e.requestId,new URL(e.response.url).pathname));
 cdp.on('Network.dataReceived',e=>receivedBodyBytes+=e.dataLength);
 cdp.on('Network.loadingFinished',e=>{const url=urls.get(e.requestId);if(!firstJsonTraffic&&url?.endsWith('.json'))firstJsonTraffic={url,received_body_bytes:receivedBodyBytes};});
 page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>failures.push(new URL(r.url()).pathname));
 // Use declared body lengths when present: worker sizes can be negative in CDP.
 // Cached responses can omit that header; a 304 has no response body.
 page.on('requestfinished',r=>{const position=order++;pending.push((async()=>{const response=await r.response();if(!response)return;const length=response.headers()['content-length'];const bytes=response.status()===304?0:length===undefined?(await r.sizes()).responseBodySize:Number(length);expect(Number.isFinite(bytes)).toBeTruthy();expect(bytes).toBeGreaterThanOrEqual(0);responses.push({url:new URL(r.url()).pathname,status:response.status(),type:r.resourceType(),bytes,order:position});})().catch(e=>{errors.push(String(e));}));});
 await page.goto(lang==='en'?'./':'?lang=ja');
 await expect(page.locator('[name=lang]')).toHaveValue(lang);
 await expect(page.locator('.paper-lane [data-tile-id]')).toHaveCount(18);
 await expect(page.locator('.paper-lane .construction-detail')).toBeVisible();
 await settled();
 const initial=[...responses].sort((a,b)=>a.order-b.order),first=initial.find(r=>r.url.endsWith('.json'))!;
 expect(firstJsonTraffic).toBeTruthy();
 const initialReport={lang,first_json_traffic:firstJsonTraffic,requests:initial.length,body_bytes:initial.reduce((n,r)=>n+r.bytes,0),first_json:first,body_bytes_through_first_json:initial.filter(r=>r.order<=first.order).reduce((n,r)=>n+r.bytes,0),resources:initial};
 fs.writeFileSync(path.join(out,`initial-${lang}-${width}.json`),JSON.stringify(initialReport,null,2)+'\n');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:path.join(root,`build/screens/pages-${lang}-${width}.png`)});
 const last=page.locator('.paper-lane [data-tile-id]').last(),lastId=await last.getAttribute('data-tile-id');await last.click();
 await expect(page.locator('.paper-lane [data-expansion]')).toHaveAttribute('data-expansion',lastId!);
 await page.locator('.paper-lane details[data-section^="flow."] > summary').click();
 await expect(page.locator('.paper-lane [data-plane-sets=A]')).toHaveAttribute('data-plane-sets-complete','true');
 await page.locator('[name=precision]').selectOption('int8');await page.locator('[name=crt]').selectOption('0');
 await expect(page.locator('.integer-grid > button')).not.toHaveCount(0);
 await page.locator('.integer-grid > button').last().click();await expect(page.locator('.integer-detail [data-expansion]')).toBeVisible();
 await settled();
 await page.reload();await expect(page.locator('[name=crt]')).toHaveValue('0');await expect(page.locator('.integer-detail [data-expansion]')).toBeVisible();
 await settled();
 expect(failures).toEqual([]);expect(errors).toEqual([]);
 expect(responses.filter(r=>r.status!==200&&r.status!==304)).toEqual([]);
 expect(responses.filter(r=>!r.url.startsWith('/AWE/'))).toEqual([]);
 expect(responses.some(r=>r.url.includes('/solutions/'))).toBeTruthy();
 expect(responses.some(r=>r.url.includes('planeDistribution.worker'))).toBeTruthy();
 fs.writeFileSync(path.join(out,`requests-${lang}-${width}.json`),JSON.stringify({lang,requests:responses.length,failures,errors,unexpected_status:responses.filter(r=>r.status!==200&&r.status!==304),outside_prefix:responses.filter(r=>!r.url.startsWith('/AWE/')),resources:responses},null,2)+'\n');
});
test('every published file is served under /AWE/ with matching bytes',async({request})=>{
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'site/dist/manifest.json'),'utf8'));
 let count=0,bytes=0;
 for(const [name,entry] of Object.entries(manifest.files) as [string,{sha256:string;bytes:number}][]){
  const response=await request.get(name);expect(response.status(),name).toBe(200);const body=await response.body();expect(body.length,name).toBe(entry.bytes);expect(crypto.createHash('sha256').update(body).digest('hex'),name).toBe(entry.sha256);count++;bytes+=body.length;await response.dispose();
 }
 const response=await request.get('manifest.json');expect(response.status()).toBe(200);
 fs.writeFileSync(path.join(out,'all-files.json'),JSON.stringify({manifest_sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'site/dist/manifest.json'))).digest('hex'),files:count+1,body_bytes:bytes+(await response.body()).length,non_200:0,hash_mismatches:0},null,2)+'\n');
});
