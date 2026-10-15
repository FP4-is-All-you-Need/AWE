import {test,expect} from '@playwright/test';
const six='awe1_002b0cddfc3729fdb06a905e402dc9c2e9b5be0d8c4222c10571bc9a5cacc3bb';
const four='awe1_37e282e92ef5d7e7761ae3304ed06bc8e91ce78a9436d239851ebc3b0b2a9a07';

for(const lang of ['en','ja'])for(const [kind,id,b] of [['six',six,'7'],['four',four,'11']])test(`flow endpoint labels and separated arrowheads ${kind} ${lang}`,async({page})=>{
 test.setTimeout(120000);
 await page.goto(`/?crt=0&b=${b}&integer_id=${id}&lang=${lang}${kind==='six'?'&integer_weight=2,5,31':''}`);
 const detail=page.locator('.integer-detail .construction-detail');
 await expect(detail.locator('[data-expansion]')).toHaveAttribute('data-expansion',id);
 const disclosure=detail.locator('details').filter({has:page.locator('[data-plane-flow=A]')});
 if(await disclosure.getAttribute('open')===null)await disclosure.locator(':scope > summary').click();
 await page.evaluate(()=>document.fonts.ready);
 for(const side of ['A','B']){
  const flow=detail.locator(`[data-plane-flow="${side}"]`);
  if(side==='B'){const bSide=detail.locator('details[data-side-details=B][data-side-kind=flow]');if(await bSide.count()&&await bSide.getAttribute('open')===null)await bSide.locator(':scope > summary').click();}await expect(flow).toBeVisible();
  await expect(flow.locator('[data-flow-box=plane]')).toHaveCount(0);for(const destination of await flow.locator('[data-flow-destination] .katex-html').all()){const value=(await destination.innerText()).replace(/[\s\u200b]/g,'');expect(value.startsWith('{')&&value.endsWith('}')).toBe(true);}await expect(flow.locator('[data-flow-destination]')).toHaveCount(kind==='six'?6:6);await expect(flow.locator('button[data-flow-plane]')).toHaveCount(0);await expect(flow).not.toContainText(lang==='en'?'Unknown':'未測定');
  const height=Number(await flow.locator('svg').first().getAttribute('height'));expect(height).toBeLessThan(kind==='six'?372:322);
  const columnRows=(await flow.getAttribute('data-flow-column-rows'))!.split(',').map(Number);expect(height).toBe(62+Math.max((kind==='six'?2:3)*56+36,Math.max(...columnRows)*68)+28);
  const labels=flow.locator('[data-flow-label]');expect(await labels.count()).toBeGreaterThan(0);
  if(kind==='four')expect(await flow.locator('[data-flow-label][data-flow-coefficient="2"]').count()).toBeGreaterThan(0);
  for(const label of await labels.all()){
   const coefficient=Number(await label.getAttribute('data-flow-coefficient'));
   const expected=coefficient===1?'+':coefficient===-1?'-':coefficient>0?`+${coefficient}`:String(coefficient);
   await expect(label).toHaveAttribute('data-flow-label-tex',expected);
   expect((await label.locator('.katex-html').innerText()).replace(/[\s\u200b]/g,'').replaceAll('−','-')).toBe(expected);
  }
  const failures=await flow.evaluate(section=>{
   const errors:string[]=[],svg=section.querySelector('svg')!,matrix=svg.getScreenCTM()!;
   const point=(x:number,y:number)=>new DOMPoint(x,y).matrixTransform(matrix);
   const overlap=(a:DOMRect|{left:number;right:number;top:number;bottom:number},b:DOMRect|{left:number;right:number;top:number;bottom:number})=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
   const links=[...section.querySelectorAll<SVGGElement>('[data-flow-link]')];
   const lines=links.map(link=>{const n=link.querySelector('line')!;return {start:point(n.x1.baseVal.value,n.y1.baseVal.value),end:point(n.x2.baseVal.value,n.y2.baseVal.value)};});
   const rects=links.map(link=>link.querySelector('.svg-math')!.getBoundingClientRect());
   const boxes=[...section.querySelectorAll('[data-flow-box], [data-flow-destination], [data-flow-plane-label]')].map(n=>n.getBoundingClientRect());
   // Clip a straight segment against the label rectangle rather than comparing
   // its much larger bounding box with the label.
   const intersects=(line:typeof lines[number],r:DOMRect)=>{
    let low=0,high=1;const dx=line.end.x-line.start.x,dy=line.end.y-line.start.y;
    for(const [p,q] of [[-dx,line.start.x-r.left],[dx,r.right-line.start.x],[-dy,line.start.y-r.top],[dy,r.bottom-line.start.y]]){
     if(p===0){if(q<0)return false;continue;}
     const t=q/p;if(p<0)low=Math.max(low,t);else high=Math.min(high,t);if(low>high)return false;
    }
    return true;
   };
   rects.forEach((rect,i)=>{
    if(rect.height>38)errors.push(`label ${i} taller than port pitch`);
    const end=lines[i].end;
    if(Math.hypot((rect.left+rect.right)/2-end.x,(rect.top+rect.bottom)/2-end.y)>50)errors.push(`label ${i} is away from endpoint`);
    if(lines.some(line=>intersects(line,rect)))errors.push(`label ${i} intersects a line`);
    if(boxes.some(box=>overlap(rect,box)))errors.push(`label ${i} intersects a box`);
    if(rects.some((other,j)=>j!==i&&overlap(rect,other)))errors.push(`label ${i} intersects another label`);
   });
   const arrows=links.map((link,i)=>{
    const line=link.querySelector('line')!,markerId=line.getAttribute('marker-end')!.slice(5,-1),marker=svg.querySelector<SVGMarkerElement>(`[id="${markerId}"]`)!;
    if(marker.getAttribute('markerUnits')!=='userSpaceOnUse'||marker.getAttribute('viewBox')!=='0 0 8 8'||marker.getAttribute('markerWidth')!=='8'||marker.getAttribute('markerHeight')!=='8'||marker.getAttribute('refX')!=='8'||marker.getAttribute('refY')!=='4'||marker.querySelector('path')?.getAttribute('d')!=='M 0 0 L 8 4 L 0 8 z')errors.push(`arrow ${i} is not the requested 8 by 8 triangle`);
    const dx=line.x2.baseVal.value-line.x1.baseVal.value,dy=line.y2.baseVal.value-line.y1.baseVal.value,length=Math.hypot(dx,dy),ux=dx/length,uy=dy/length;
    const x=line.x2.baseVal.value,y=line.y2.baseVal.value;
    const points=[point(x,y),point(x-8*ux+4*uy,y-8*uy-4*ux),point(x-8*ux-4*uy,y-8*uy+4*ux)];
    return {left:Math.min(...points.map(p=>p.x)),right:Math.max(...points.map(p=>p.x)),top:Math.min(...points.map(p=>p.y)),bottom:Math.max(...points.map(p=>p.y))};
   });
   arrows.forEach((arrow,i)=>{if(arrows.some((other,j)=>j!==i&&overlap(arrow,other)))errors.push(`arrow ${i} intersects another arrow`);});
   const planes=[...new Set(links.map(n=>n.getAttribute('data-flow-link')))];
   for(const plane of planes){const incoming=links.filter(n=>n.getAttribute('data-flow-link')===plane).sort((a,b)=>Number(a.getAttribute('data-flow-source'))-Number(b.getAttribute('data-flow-source')));incoming.forEach((link,i)=>{if(Number(link.getAttribute('data-flow-port'))!==i)errors.push(`plane ${plane} ports are not sorted by source`);if(i&&Number(link.getAttribute('data-flow-end-y'))-Number(incoming[i-1].getAttribute('data-flow-end-y'))!==32)errors.push(`plane ${plane} ports are not 32 pixels apart`);});}
   return errors;
  });
  expect(failures).toEqual([]);
  const geometry=await flow.evaluate(section=>{
   const svg=section.querySelector('svg')!,width=svg.width.baseVal.value,height=svg.height.baseVal.value;
   const destinations=[...section.querySelectorAll<SVGForeignObjectElement>('[data-flow-destination]')];
   const end=Math.max(...destinations.map(node=>node.x.baseVal.value+node.width.baseVal.value));
   const matrix=svg.getScreenCTM()!,viewport=svg.getBoundingClientRect();
   const overflow=[...section.querySelectorAll('[data-flow-paint], [data-flow-plane-label], [data-flow-destination]')].filter(node=>{
    const box=node.getBoundingClientRect();return box.left<viewport.left-.1||box.right>viewport.right+.1||box.top<viewport.top-.1||box.bottom>viewport.bottom+.1;
   }).length;
   return {padding:width-end,overflow,height,scale:matrix.a};
  });
  expect(geometry.padding).toBe(12);expect(geometry.overflow).toBe(0);expect(geometry.scale).toBeGreaterThan(0);
  await flow.screenshot({path:`build/screens/flow_inline_${kind}_${lang}_${side}.png`});
 }
});

 test('flow values are optional inline measured sets without adding rows',async({page})=>{
 await page.goto(`/?crt=0&b=7&integer_weight=2,5,31&integer_id=${six}&lang=en`);
 const detail=page.locator('.integer-detail .construction-detail'),disclosure=detail.locator('details').filter({has:page.locator('[data-plane-flow=A]')});
 if(await disclosure.getAttribute('open')===null)await disclosure.locator(':scope > summary').click();
 const flow=detail.locator('[data-plane-flow=A]'),svg=flow.locator('svg').first();
 const initialHeight=await svg.getAttribute('height');
 await expect(flow.locator('[data-flow-measured-values]')).toHaveCount(0);
 await detail.locator('[name=plane_values]').check();
 await expect(svg).toHaveAttribute('height',initialHeight!);
 await expect(flow).not.toContainText('Unknown');await expect(flow).not.toContainText('not measured');
 await expect(flow.locator('[data-flow-box=plane]')).toHaveCount(0);
 await flow.locator('g[data-flow-plane]').first().click();await expect(flow.locator('g[data-flow-plane][aria-pressed=true] > [data-flow-paint]')).toHaveAttribute('stroke-width','3');
 await page.setViewportSize({width:1700,height:900});
 await svg.screenshot({path:'build/screens/flow-inline-measured-six.png'});
 });
