import type {Construction} from './visual.ts';
export type EncodingTable={method:string;description:string;weights:number[];input_domain:number[];limbset:number[];values:Record<string,number[]>;source_sha256:string;alternatives_complete:boolean};
export const modulo=(n:bigint,p:bigint)=>((n%p)+p)%p;
export function integer(text:string):bigint|null{return /^-?\d{1,100}$/.test(text)?BigInt(text):null;}
export function savedTuple(c:Construction,value:bigint,side:'A'|'B'):number[]|undefined{
 const key=String(c.modulus>0?modulo(value,BigInt(c.modulus)):value);
 const row=c.saved_encoding?.[side]?.[key]??c.canonical?.encoding[side][Number(key)];
 return row?.length===c.weights[side].length&&row.every(Number.isSafeInteger)?row:undefined;
}
export function weightedTuple(tuple:number[],weights:number[]):bigint{return tuple.reduce((sum,v,i)=>sum+BigInt(v)*BigInt(weights[i]),0n);}
