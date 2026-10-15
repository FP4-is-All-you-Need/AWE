import {enumerateRepresentations,representationSpec} from './representations.ts';
import {planeValue} from './encoding.ts';
import {savedTuple,weightedTuple,modulo} from './savedEncoding.ts';
import {originalIndices} from './limbOrder.ts';
import type {Construction} from './visual.ts';
export type PlaneChange={plane:number;from:number;to:number};
export type Alternative={input:number;tuple:number[];changes:PlaneChange[];delta:number[]};
export type PlaneDistribution={domain:number[]|null;method:'saved_lut'|'verifier_first';complete:boolean;alternativesComplete:boolean;reason?:string;holes:number[];missing:number[];chosen:Record<string,number[]>;alternatives:Record<string,number[][]>;planes:{values:number[];histogram:Record<string,number>;extra:number[];witnesses:Alternative[]}[]};
export function planeDomain(c:Construction,side:'A'|'B'):number[]|null{return c.integer?.domain[side]??c.encoding_domain??(c.modulus>0?[0,c.modulus-1]:null);}
const sorted=(xs:Iterable<number>)=>[...new Set(xs)].sort((a,b)=>a-b);
export function setTex(values:number[]):string{
 const xs=sorted(values);if(!xs.length)return '\\varnothing';
 const positive=xs.filter(x=>x>0),symmetric=positive.length>0&&positive.every(x=>xs.includes(-x))&&xs.filter(x=>x<0).every(x=>xs.includes(-x));
 if(symmetric)return `${xs.includes(0)?'\\{0\\}\\cup ':''}\\pm\\{${positive.join(',')}\\}`;
 return `\\{${xs.join(',')}\\}`;
}
// Exhaust the fixed construction's legal representations. The first choice is
// ordered in STORED coordinates, matching verify.core.encode_side exactly.
export function measurePlaneDistribution(c:Construction,side:'A'|'B',override?:{input:number;tuple:number[]}):PlaneDistribution{
 const domain=planeDomain(c,side),hasSaved=!!(c.saved_encoding||c.canonical),method=hasSaved?'saved_lut':'verifier_first';
 const result:PlaneDistribution={domain,method,complete:false,alternativesComplete:false,holes:[],missing:[],chosen:{},alternatives:{},planes:(c.planes?.[side]??[]).map(()=>({values:[],histogram:{},extra:[],witnesses:[]}))};
 if(!domain||domain.length!==2||domain[0]>domain[1]||!c.planes||domain.some(v=>!Number.isSafeInteger(v))||domain[1]-domain[0]>200000){result.reason='limit_or_unknown';return result;}
 const all=c.plane_moduli?null:enumerateRepresentations(representationSpec(c,side));result.alternativesComplete=all?.complete??false;
 const order=originalIndices(c,side).map((original,index)=>({original,index})).sort((a,b)=>a.original-b.original).map(v=>v.index);
 const compare=(a:number[],b:number[])=>{for(const i of order){if(a[i]!==b[i])return a[i]-b[i];}return 0;};
 const valid=(x:number,t:number[])=>{if(t.length!==c.weights[side].length)return false;const delta=weightedTuple(t,c.weights[side])-BigInt(x);return c.modulus?modulo(delta,BigInt(c.modulus))===0n:delta===0n;};
 const vals=(t:number[])=>c.planes![side].map((_,i)=>Number(planeValue(c,side,i,t)));
 for(let x=domain[0];x<=domain[1];x++){
  const candidates=(all?.values[String(x)]??[]).sort(compare);result.alternatives[String(x)]=candidates;
  const saved=hasSaved?savedTuple(c,BigInt(x),side):undefined;
  let chosen=hasSaved?saved:candidates[0];
  if(override?.input===x&&candidates.some(t=>t.join()===override.tuple.join()))chosen=override.tuple;
  if(!chosen){(all?.complete&&!candidates.length?result.holes:hasSaved&&!saved&&c.modulus>0?result.holes:result.missing).push(x);continue;}
  if(!valid(x,chosen)||(all?.complete&&!candidates.some(t=>t.join()===chosen!.join()))){result.reason='invalid_lut';result.missing.push(x);continue;}
  try {const faces=vals(chosen);result.chosen[String(x)]=chosen;faces.forEach((value,p)=>{const hist=result.planes[p].histogram;hist[String(value)]=(hist[String(value)]??0)+1;});}
  catch{result.missing.push(x);result.reason='invalid_plane';}
 }
 result.planes.forEach(p=>{p.values=sorted(Object.keys(p.histogram).map(Number));});
 // A witness is an exact change of representation of the SAME integer.
 // It does not imply that a face value itself is conserved or paid to an accumulator.
 for(const [input,chosen] of Object.entries(result.chosen)){
  const current=vals(chosen);
  for(const tuple of result.alternatives[input]??[]){
   if(tuple.join()===chosen.join())continue;const next=vals(tuple),changes=next.flatMap((value,p)=>value===current[p]?[]:[{plane:p,from:current[p],to:value}]);
   next.forEach((value,p)=>{const row=result.planes[p];if(row.values.includes(value)||row.extra.includes(value))return;
    row.extra.push(value);row.witnesses.push({input:Number(input),tuple,changes,delta:tuple.map((v,i)=>v-chosen[i])});
   });
  }
 }
 result.planes.forEach(p=>{p.extra.sort((a,b)=>a-b);});result.complete=result.missing.length===0;return result;
}
