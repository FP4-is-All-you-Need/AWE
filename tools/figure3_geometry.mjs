/** Verify translated labels against the painted geometry of the source SVG. */
export async function checkFigure3Geometry(page) {
 return page.evaluate(async () => {
  await document.fonts.ready;
  const svg=document.querySelector('[data-source-figure="figure3"]');
  if(!svg)throw new Error('Figure3 is not mounted');
  const scene=await (await fetch(new URL('visualization/figure3.json',document.baseURI))).json();
  const rect=svg.getBoundingClientRect(),v=svg.viewBox.baseVal,s=rect.width/v.width;
  const box=node=>{const r=node.getBoundingClientRect();return [(r.left-rect.left)/s+v.x,(r.top-rect.top)/s+v.y,r.width/s,r.height/s];};
  const rows=scene.labels.filter(l=>l.painted_box_pt).map(l=>{
   const node=svg.querySelector(`[data-source-text="${l.gid}"]`),actual=box(node),expected=l.painted_box_pt;
   const inside=actual[0]>=expected[0]-.1&&actual[1]>=expected[1]-.1&&actual[0]+actual[2]<=expected[0]+expected[2]+.1&&actual[1]+actual[3]<=expected[1]+expected[3]+.1;
   const font=Number(node.dataset.effectiveFont)*s;
   if(!inside||font<13.99)throw new Error(`Source label ${l.gid} violates its painted box or font floor: ${JSON.stringify({actual,expected,font})}`);
   return {id:l.gid,text:node.textContent,bounds:actual,font};
  });
  const bottom=rows.filter(r=>r.id==='source_text_1'||r.id==='source_text_49');
  if(bottom[0].bounds[0]+bottom[0].bounds[2]>=bottom[1].bounds[0])throw new Error('Bottom labels overlap');
  return {scale:s,sourceLegendBounds:scene.legend.bounds_pt,labels:rows};
 });
}
