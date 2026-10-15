import {residual,type Construction} from './visual.ts';
import {productCells} from './compact.ts';
export type LimbOrder='stored'|'weight'|'block';
export const defaultLimbOrder=(c:Construction):LimbOrder=>Math.max(c.weights.A.length,c.weights.B.length)>=4?'block':'weight';
export const originalIndices=(c:Construction,side:'A'|'B')=>c.display_indices?.[side]??c.weights[side].map((_,i)=>i);
const ascending=(w:number[])=>w.map((_,i)=>i).sort((a,b)=>w[a]-w[b]||a-b);
// Recognise only pairs already used by saved planes, without constructing new ones.
function pairs(c:Construction,side:'A'|'B'):number[][]|null{
 const w=c.weights[side];if(w.length%2||!c.planes)return null;
 const used=new Set(c.products.map(p=>p[side==='A'?'a':'b']));
 const candidates=[...new Map(c.planes[side].flatMap((p,index)=>{const ids=p.flatMap((v,i)=>v?[i]:[]).sort((a,b)=>w[a]-w[b]||a-b);return used.has(index)&&ids.length===2?[[ids.join(','),ids] as const]:[];})).values()].sort((a,b)=>w[a[0]]-w[b[0]]||w[a[1]]-w[b[1]]);
 const seen=new Set<number>(),result:number[][]=[];for(const p of candidates)if(p.every(i=>!seen.has(i))){result.push(p);p.forEach(i=>seen.add(i));}
 return seen.size===w.length?result:null;
}
export function blockPairs(c:Construction):{A:number[][];B:number[][]}|null{
 const A=pairs(c,'A'),B=pairs(c,'B');if(!A||!B||!residual(c)?.every(row=>row.every(v=>v==='0')))return null;
 const cells=c.products.map((_,i)=>productCells(c,i));
 for(const a of A)for(const b of B){const terms=cells.filter(points=>points.some(p=>a.includes(p.i)&&b.includes(p.j)));
  if(terms.some(points=>points.some(p=>!a.includes(p.i)||!b.includes(p.j)))||terms.map(p=>p.length).sort().join(',')!=='1,1,4')return null;
 }
 return {A,B};
}
export function orderedConstruction(c:Construction,order:LimbOrder):Construction{
 if(order==='stored')return c;
 const blocks=order==='block'?blockPairs(c):null;
 const indices={A:blocks?.A.flat()??ascending(c.weights.A),B:blocks?.B.flat()??ascending(c.weights.B)};
 const weights={A:indices.A.map(i=>c.weights.A[i]),B:indices.B.map(i=>c.weights.B[i])};
 const planes=c.planes?{A:c.planes.A.map(p=>indices.A.map(i=>p[i])),B:c.planes.B.map(p=>indices.B.map(i=>p[i]))}:null;
 const tuples=(rows:Record<string,number[]>,side:'A'|'B')=>Object.fromEntries(Object.entries(rows).map(([key,row])=>[key,indices[side].map(i=>row[i])]));
 const saved_encoding=c.saved_encoding?{A:tuples(c.saved_encoding.A,'A'),B:tuples(c.saved_encoding.B,'B')}:undefined;
 const canonical=c.canonical&&planes?{...c.canonical,weights,planes,encoding:{A:c.canonical.encoding.A.map(t=>t&&indices.A.map(i=>t[i])),B:c.canonical.encoding.B.map(t=>t&&indices.B.map(i=>t[i]))}}:undefined;
 const display_indices={A:indices.A.map(i=>originalIndices(c,'A')[i]),B:indices.B.map(i=>originalIndices(c,'B')[i])};
 return {...c,weights,planes,saved_encoding,canonical,display_indices,limbs_stored:c.limbs_stored?{A:indices.A.map(i=>c.limbs_stored!.A[i]),B:indices.B.map(i=>c.limbs_stored!.B[i])}:undefined};
}
