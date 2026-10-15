import {countedCost,type CostSettings} from './cost.ts';
import type {Row} from './types.ts';
export type IntegerFilters={r:number;limbs:number;planes:number;denominator:number;weight:string;mixed:boolean;sort:string};
export function integerRowCost(r:Row,dims:{m:number;n:number;k:number},settings:CostSettings){return countedCost({products:r[5],facesA:r[6],facesB:r[7],addA:r[13]?.add_a??null,addB:r[13]?.add_b??null,modular:false,needsCorrection:false},dims,settings);}
export function integerRows(rows:Row[],f:IntegerFilters,k:number,dims:{m:number;n:number;k:number},settings:CostSettings){
 const wanted=f.weight.trim().split(/[ ,]+/).filter(Boolean).map(Number);
 const filtered=rows.filter(r=>(!f.r||r[5]<=f.r)&&(!f.limbs||r[3]===f.limbs&&r[4]===f.limbs)&&(!f.planes||r[6]+r[7]<=f.planes)&&(!f.denominator||r[8]===f.denominator)&&(r[9]===null||r[9]>=k)&&(f.mixed||!r[12])&&wanted.every(w=>r[10].includes(w)||r[11].includes(w)));
 const costs=f.sort==='cost'?new Map(filtered.map(r=>[r[0],integerRowCost(r,dims,settings).total])):new Map<string,number|null>();
 const range=(r:Row)=>r[13]?.domain_a&&r[13]?.domain_b?(r[13].domain_a[1]-r[13].domain_a[0]+1)*(r[13].domain_b[1]-r[13].domain_b[0]+1):-1;
 return filtered.sort((a,b)=>(f.sort==='range'?range(b)-range(a):f.sort==='planes'?a[6]+a[7]-b[6]-b[7]:f.sort==='cost'?(costs.get(a[0])??Infinity)-(costs.get(b[0])??Infinity):0)||a[5]-b[5]||a[6]+a[7]-b[6]-b[7]||a[0].localeCompare(b[0]));
}
