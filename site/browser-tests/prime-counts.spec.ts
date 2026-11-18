import {test,expect} from '@playwright/test';
import {primeGeometry} from './primeGeometry.ts';
for(const [page,lang,width] of [['fp4','ja',1440],['fp4','en',390],['fp6','ja',1280],['fp6','en',768]] as const)test(`periodic cells are filled by product count, and the count is written in taller cells on request ${page} ${lang} ${width}`,async({page:p})=>{
 const open=async(counts:string)=>{await p.setViewportSize({width,height:1000});await p.goto(`/?prime_set=${page}&prime_counts=${counts}&lang=${lang}`);await expect(p.locator('[data-prime-modulus][data-products]').first()).toBeAttached({timeout:30000});await p.evaluate(()=>document.fonts.ready);};
 const cells=()=>p.locator('[data-prime-modulus]').evaluateAll(primeGeometry);
 await open('0');
 await expect(p.locator('.prime-table-legend [data-legend-band]')).toHaveCount(9);await expect(p.locator('[data-prime-products]')).toHaveCount(0);
 const fills=await p.locator('[data-prime-modulus][data-product-band]').evaluateAll(n=>n.map(g=>[g.getAttribute('data-product-band'),g.querySelector('[data-prime-frame]')!.getAttribute('fill')]));
 const byBand=new Map<string,Set<string>>();for(const [b,f] of fills){if(!byBand.has(b!))byBand.set(b!,new Set());byBand.get(b!)!.add(f!);}
 expect(byBand.size).toBeGreaterThan(1);for(const s of byBand.values())expect(s.size).toBe(1);expect(new Set([...byBand.values()].map(s=>[...s][0])).size).toBe(byBand.size);
 for(const c of await cells())expect([c.width,c.height]).toEqual([60,60]);
 await open('1');
 expect(await p.locator('[data-prime-modulus][data-products] [data-prime-products]').count()).toBe(await p.locator('[data-prime-modulus][data-products]').count());
 const unit=lang==='en'?' prod':'積';
 for(const c of await cells()){expect([c.width,c.height]).toEqual([60,74]);const count=c.collisions.concat(c.overflow.map(t=>[t])).filter(x=>x.some(t=>t.endsWith(unit)));expect(count,JSON.stringify(c)).toEqual([]);}
});
