import {factors} from './visual.ts';
import type {Pair} from './types.ts';

/** Single modular constructions (data/modular/forms-*.json listed in forms-index.json, schema 2; schema-1 rows may appear unchanged). */
export type FormSolution={schema_version:number;id:string;modulus:number;weights:Pair<number[]>;planes:Pair<number[][]>;plane_sets:Pair<string[]>;plane_moduli?:Pair<number[]>;products:{a:number;b:number;numerator:number}[];denominator:number;holes?:{A:number;B:number;exact:boolean;method?:string};reconstruction?:{procedure:string;note?:string};prior_checker_versions?:string[];encoding?:Pair<(number[]|null)[]>;accumulation?:{max_k:number|null}};
export type ModularForms={schema_version:number;data_version:string;kind:string;solutions:FormSolution[]};
export type FormsChunk={path:string;sha256:string;solutions:number;modulus_min:number;modulus_max:number};
export type FormsIndex={schema_version:number;data_version:string;kind:string;solutions:number;chunks:FormsChunk[];excluded:{reason:string;count:number;note:string}[];value_set_inclusion?:Record<string,string[]>};
export type FormFilters={range:string;set:string;holeFree:boolean};
export type FormRow={id:string;modulus:number;factors:string;set:string;products:number;facesA:number;facesB:number;folded:boolean;holesA:number;holesB:number;exact:boolean;maxK:number|null;table:boolean;denominator:number;dividesD1:boolean};
/** 2xE2M1 is contained in both FP6 value sets as integers (forms-index.json value_set_inclusion). */
export const VALUE_SET_INCLUSION:Record<string,string[]>={'2xE2M1':['8xE2M3','16xE3M2']};
/** Whether a construction checked on the value set `set` also holds on `target`. */
export function usableOn(set:string,target:string,inclusion=VALUE_SET_INCLUSION):boolean{return set===target||(inclusion[set]??[]).includes(target);}

const SUP:Record<string,string>={'0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹'};
export function factorText(modulus:number):string{return factors(modulus).map(f=>String(f.prime)+(f.exponent>1?String(f.exponent).split('').map(d=>SUP[d]).join(''):'')).join('·');}
/** "4000-6000" or "589"; null for an empty or malformed range. */
export function parseRange(text:string):[number,number]|null{
 const t=text.trim();if(!t)return null;
 const r=t.match(/^(\d{1,10})\s*[-–~〜]\s*(\d{1,10})$/);if(r)return [Number(r[1]),Number(r[2])];
 return /^\d{1,10}$/.test(t)?[Number(t),Number(t)]:null;
}
/** The files whose modulus range meets the filter range; every file for an empty or malformed range. */
export function chunksFor(index:FormsIndex,range:string):FormsChunk[]{
 const r=parseRange(range);
 return index.chunks.filter(c=>!r||(c.modulus_max>=r[0]&&c.modulus_min<=r[1]));
}
export function formRow(s:FormSolution):FormRow{
 const holes=s.holes??{A:0,B:0,exact:true};
 return {id:s.id,modulus:s.modulus,factors:factorText(s.modulus),set:s.plane_sets.A[0]??'',products:s.products.length,facesA:s.planes.A.length,facesB:s.planes.B.length,
  folded:[...(s.plane_moduli?.A??[]),...(s.plane_moduli?.B??[])].some(f=>f<s.modulus),holesA:holes.A,holesB:holes.B,exact:holes.exact,maxK:s.accumulation?.max_k??null,table:Boolean(s.encoding),
  denominator:s.denominator,dividesD1:s.reconstruction?.procedure==='divide_d1_then_multiply_d2_inverse'};
}
/** The value-set filter keeps the constructions that hold on the chosen set, including those checked on a set it contains. */
export function formRows(list:FormSolution[],f:FormFilters,inclusion=VALUE_SET_INCLUSION):FormRow[]{
 const range=parseRange(f.range);
 return list.filter(s=>(!range||(s.modulus>=range[0]&&s.modulus<=range[1]))&&(!f.set||usableOn(s.plane_sets.A[0],f.set,inclusion))&&(!f.holeFree||!(s.holes&&(s.holes.A||s.holes.B))))
  .map(formRow).sort((a,b)=>a.modulus-b.modulus||a.products-b.products||a.id.localeCompare(b.id));
}
