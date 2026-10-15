import type {Construction} from './visual.ts';
import {directPalette} from './productPalette.ts';
export {DIRECT_COLORS} from './productPalette.ts';
// Colour policy: direct cells sort by weight, then sorted B/A positions;
// products keep that preference but never reuse a swatch inside a construction.
// Mixed products take the nearest unused block anchor. Repeated references to
// the same product intentionally retain its colour across all views.
const cellColors=new WeakMap<Construction,Map<string,string>>();
export function directColor(c:Construction,i:number,j:number):string{
 let colors=cellColors.get(c);if(!colors){
  const cells=c.weights.A.flatMap((a,i)=>c.weights.B.map((b,j)=>({i,j,a,b,w:BigInt(a)*BigInt(b)}))).sort((a,b)=>a.w<b.w?-1:a.w>b.w?1:a.b-b.b||a.a-b.a||a.j-b.j||a.i-b.i);
  const palette=directPalette(cells.length);colors=new Map(cells.map((v,rank)=>[`${v.i}:${v.j}`,palette[rank]]));cellColors.set(c,colors);
 }return colors.get(`${i}:${j}`)!;
}
export function luminance(color:string){const values=[1,3,5].map(i=>parseInt(color.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return values[0]*.2126+values[1]*.7152+values[2]*.0722;}
export function contrastRatio(a:string,b:string){return (Math.max(luminance(a),luminance(b))+.05)/(Math.min(luminance(a),luminance(b))+.05);}
// Conservative background bound for all white-composited cell washes.
const inkCache=new Map<string,string>();
export function textInk(color:string,background='#B2B2B2'){
 const key=color+background,cached=inkCache.get(key);if(cached)return cached;
 const rgb=[1,3,5].map(i=>parseInt(color.slice(i,i+2),16));let ink=color,factor=1;
 while(contrastRatio(ink,background)<4.5&&factor>.01){factor*=.98;ink='#'+rgb.map(v=>Math.round(v*factor).toString(16).padStart(2,'0')).join('');}
 inkCache.set(key,ink);return ink;
}
export function miniWeightStyle(c:Construction,side:'A'|'B',index:number){
 const sorted=[...new Set([...c.weights.A,...c.weights.B])].sort((a,b)=>a-b),rank=sorted.indexOf(c.weights[side][index]);
 const base=directPalette(sorted.length)[rank],background=whiteFill(base,.08);
 return {ink:textInk(base,background),background};
}
export const DIRECT_FILL_OPACITY=.30,PLANE_FILL_OPACITY=.42;
export function productFillOpacity(c:Construction,index:number){return productCells(c,index).length>1?PLANE_FILL_OPACITY:DIRECT_FILL_OPACITY;}
export function productFillColor(c:Construction,index:number){return whiteFill(productBaseColor(c,index),productFillOpacity(c,index));}
export function whiteFill(color:string,alpha:number){return '#'+[1,3,5].map(i=>Math.round(255*(1-alpha)+parseInt(color.slice(i,i+2),16)*alpha).toString(16).padStart(2,'0')).join('');}
// Position is measured in the grid with both weight axes sorted ascending.
// It stays attached to the saved product when the display order changes.
export function orderedPlaneProducts(c:Construction):number[]{
 const rank=(weights:number[])=>{const sorted=[...new Set(weights)].sort((a,b)=>a-b);return weights.map(w=>sorted.indexOf(w));};
 const a=rank(c.weights.A),b=rank(c.weights.B);
 const rows=c.products.flatMap((p,index)=>{const cells=productCells(c,index);if(cells.length<=1)return [];
  const ai=[...new Set(cells.map(t=>t.i))],bi=[...new Set(cells.map(t=>t.j))];
  const column=ai.reduce((sum,i)=>sum+a[i],0)/(ai.length*Math.max(1,...a)),row=bi.reduce((sum,j)=>sum+b[j],0)/(bi.length*Math.max(1,...b));
  const signature=cells.map(t=>`${c.weights.A[t.i]}:${c.weights.B[t.j]}:${c.planes!.A[p.a][t.i]}:${c.planes!.B[p.b][t.j]}`).sort().join(';');
  return [{index,column,row,signature}];
 });
 return rows.sort((a,b)=>(a.column+a.row)-(b.column+b.row)||a.row-b.row||a.column-b.column||a.signature.localeCompare(b.signature)).map(r=>r.index);
}
// A block inherits the nearest direct-product position on sorted weight axes.
// Equal distances choose the smaller weight, independently of display order.
export function blockPosition(c:Construction,index:number):number{
 const cells=productCells(c,index),sortedA=[...c.weights.A].sort((a,b)=>a-b),sortedB=[...c.weights.B].sort((a,b)=>a-b);
 const x=(Math.min(...cells.map(t=>sortedA.indexOf(c.weights.A[t.i])))+Math.max(...cells.map(t=>sortedA.indexOf(c.weights.A[t.i]))))/2;
 const y=(Math.min(...cells.map(t=>sortedB.indexOf(c.weights.B[t.j])))+Math.max(...cells.map(t=>sortedB.indexOf(c.weights.B[t.j]))))/2;
 let points=c.products.flatMap((_,k)=>{const p=productCells(c,k);return p.length===1?p:[];});
 if(!points.length)points=c.weights.A.flatMap((_,i)=>c.weights.B.map((_,j)=>({i,j,n:null})));
 const weights=[...new Set(c.weights.A.flatMap(a=>c.weights.B.map(b=>BigInt(a)*BigInt(b))))].sort((a,b)=>a<b?-1:a>b?1:0);
 const ranked=points.map(t=>({distance:(sortedA.indexOf(c.weights.A[t.i])-x)**2+(sortedB.indexOf(c.weights.B[t.j])-y)**2,rank:weights.indexOf(BigInt(c.weights.A[t.i])*BigInt(c.weights.B[t.j]))})).sort((a,b)=>a.distance-b.distance||a.rank-b.rank);
 return ranked[0]?.rank??0;
}
const BLOCK_ANCHORS=[{rank:0,fill:'#E8710A',stroke:'#E8710A'},{rank:1,fill:'#CCAA88',stroke:'#A0825E'},{rank:3,fill:'#4FC3F7',stroke:'#4FC3F7'},{rank:6,fill:'#9CCC65',stroke:'#9CCC65'},{rank:7,fill:'#D4A017',stroke:'#D4A017'}];
const styleCache=new WeakMap<Construction,{fill:string;stroke:string}[]>();
function productStyles(c:Construction){
 let styles=styleCache.get(c);if(styles)return styles;
 styles=Array.from({length:c.products.length},()=>({fill:'#1A1A1A',stroke:'#1A1A1A'}));
 const used=new Set<string>();
 const direct=c.products.flatMap((_,i)=>productCells(c,i).length<=1?[i]:[]);
 for(const i of direct){const cell=productCells(c,i)[0],preferred=cell?directColor(c,cell.i,cell.j):'#1A1A1A';
  const color=[preferred,...directPalette(c.weights.A.length*c.weights.B.length+c.products.length)].find(v=>!used.has(v))!;
  used.add(color);styles[i]={stroke:color,fill:color};
 }
 for(const i of orderedPlaneProducts(c)){
  const rank=blockPosition(c,i),anchors=[...BLOCK_ANCHORS,{rank:9,fill:'#B25000',stroke:'#B25000'}];
  const sorted=anchors.sort((a,b)=>Math.abs(a.rank-rank)-Math.abs(b.rank-rank)||a.rank-b.rank);
  let style=sorted.find(v=>!used.has(v.stroke));
  if(!style){const color=directPalette(c.products.length*2).find(v=>!used.has(v))!;style={rank,fill:color,stroke:color};}
  used.add(style.stroke);styles[i]=style;
 }
 styleCache.set(c,styles);return styles;
}
export function coefficientColor(c:Construction,index:number):string{return productStyles(c)[index].stroke;}
export function productBaseColor(c:Construction,index:number):string{return productStyles(c)[index].fill;}
export function planeColor(c:Construction,side:'A'|'B',index:number):string{
 const field=side==='A'?'a':'b',k=c.products.findIndex(p=>p[field]===index);
 if(k>=0)return coefficientColor(c,k);
 const occupied=new Set(c.products.map((_,i)=>coefficientColor(c,i))),unused=c.planes![side].map((_,i)=>i).filter(i=>!c.products.some(p=>p[field]===i));
 return directPalette(c.products.length+c.planes![side].length+20).filter(color=>!occupied.has(color))[unused.indexOf(index)];
}
export function productCells(c:Construction,index:number):{i:number;j:number;n:bigint|null}[]{
 const p=c.products[index],a=c.planes?.A[p.a],b=c.planes?.B[p.b];if(!a||!b)return [];
 return b.flatMap((v,j)=>a.flatMap((u,i)=>v&&u?[{i,j,n:p.numerator===null?null:BigInt(p.numerator)*BigInt(u)*BigInt(v)}]:[]));
}
export function compactGroups(c:Construction):number[][]{
 const direct:number[]=[],planes:number[]=[];
 c.products.forEach((_,i)=>(productCells(c,i).length===1?direct:planes).push(i));
 return [direct,planes].filter(g=>g.length);
}
