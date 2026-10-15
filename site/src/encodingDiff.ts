import {planeValue} from './encoding.ts';
import type {Construction} from './visual.ts';
import type {PlaneDistribution} from './planeDistribution.ts';
export type Exclusion={plane:number;value:number};
export type EncodingDiff={reference:number[][];referenceChoices:Record<string,number[]>;removable:Exclusion[];excluded:Exclusion[];changedInputs:number[];blocked:boolean};
export const parseExclusions=(s:string):Exclusion[]=>[...new Map(s.split(',').filter(v=>/^\d+:-?\d+$/.test(v)).map(v=>{const [plane,value]=v.split(':').map(Number);return [v,{plane,value}] as const;})).values()];
/** Reassign existing representations over the same covered inputs; no new construction. */
export function encodingDiff(c:Construction,side:'A'|'B',base:PlaneDistribution,requested:Exclusion[]):{result:PlaneDistribution;diff:EncodingDiff}{
 const excluded=requested.filter(e=>e.plane>=0&&e.plane<base.planes.length&&Number.isSafeInteger(e.value));
 const reference=base.planes.map(p=>p.values),empty:EncodingDiff={reference,referenceChoices:base.chosen,removable:[],excluded,changedInputs:[],blocked:false};
 if(!base.complete||!base.alternativesComplete)return {result:base,diff:{...empty,blocked:excluded.length>0}};
 const values=(tuple:number[])=>base.planes.map((_,p)=>Number(planeValue(c,side,p,tuple)));
 const legal:Record<string,{tuple:number[];values:number[]}[]>={};
 for(const input of Object.keys(base.chosen)){
  legal[input]=(base.alternatives[input]??[]).map(tuple=>({tuple,values:values(tuple)})).filter(r=>excluded.every(e=>r.values[e.plane]!==e.value));
  if(!legal[input].length)return {result:base,diff:{...empty,blocked:true}};
 }
 const result:PlaneDistribution={...base,chosen:{},alternatives:{...base.alternatives},planes:base.planes.map(()=>({values:[],histogram:{},extra:[],witnesses:[]}))};
 const mandatory=base.planes.map(()=>new Set<number>()),changedInputs:number[]=[];
 for(const [input,rows] of Object.entries(legal)){
  const before=base.chosen[input],next=rows.find(r=>r.tuple.join()===before.join())??rows[0];
  result.chosen[input]=next.tuple;result.alternatives[input]=rows.map(r=>r.tuple);
  if(next.tuple.join()!==before.join())changedInputs.push(Number(input));
  result.planes.forEach((p,i)=>{
   const value=next.values[i];p.histogram[value]=(p.histogram[value]??0)+1;
   const possible=new Set(rows.map(r=>r.values[i]));if(possible.size===1)mandatory[i].add(value);
  });
 }
 result.planes.forEach(p=>{p.values=Object.keys(p.histogram).map(Number).sort((a,b)=>a-b);});
 const removable=result.planes.flatMap((p,plane)=>p.values.filter(value=>!mandatory[plane].has(value)).map(value=>({plane,value})));
 return {result,diff:{reference,referenceChoices:base.chosen,removable,excluded,changedInputs,blocked:false}};
}
