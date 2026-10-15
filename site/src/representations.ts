import {SETS} from './verify.ts';
import {FP4_VALUES} from './encoding.ts';
import {originalIndices} from './limbOrder.ts';
import type {Construction} from './visual.ts';
export type RepresentationSpec={weights:number[];coordinateSets:number[][];basis?:number[][];planes:number[][];planeSets:number[][];modulus:number};
export type Representations={complete:boolean;reason?:'unknown'|'limit';combinations:number;accepted:number;values:Record<string,number[][]>};
export const ENUMERATION_LIMIT=250000;
export function representationSpec(c:Construction,side:'A'|'B'):RepresentationSpec|null{
 if(!c.planes)return null;
 const source=c.integer??c.canonical;
 if(!source&&c.id.startsWith('joint_'))return planeOnlySpec(c.weights[side],c.planes[side],c.planes[side].map(()=>FP4_VALUES),c.modulus);
 // Unspecified imported records have no storage declaration and are not
 // silently classified as uncovered. Joint records constrain planes only.
 if(!source)return null;
 const names=source?.limb_sets?.[side],order=originalIndices(c,side);
 const coordinateSets=names?order.map(i=>SETS[names[i]]):c.weights[side].map(()=>FP4_VALUES);
 const planeSets=source?.plane_sets?.[side].map(name=>SETS[name])??c.planes[side].map(()=>FP4_VALUES);
 if(coordinateSets.some(s=>!s)||planeSets.some(s=>!s))return null;
 return {weights:c.weights[side],coordinateSets,planes:c.planes[side],planeSets,modulus:c.modulus};
}
export function base13Spec(weights:number[]):RepresentationSpec{
 return {weights,coordinateSets:weights.map(()=>FP4_VALUES),planes:[],planeSets:[],modulus:0};
}
function determinant(a:bigint[][]):bigint{
 if(!a.length)return 1n;
 return a[0].reduce((sum,v,j)=>sum+(j%2?-v:v)*determinant(a.slice(1).map(row=>row.filter((_,k)=>k!==j))),0n);
}
// Choose an independent subset of the existing planes, never new planes.
// Its finite storage values give every possible integer limb tuple exactly once.
export function planeOnlySpec(weights:number[],planes:number[][],sets:number[][],modulus=0):RepresentationSpec|null{
 if(weights.length>4||planes.some(p=>p.length!==weights.length))return null;
 let chosen:number[]|null=null;
 function take(ids:number[],next:number):void{
  if(chosen)return;
  if(ids.length===weights.length){if(determinant(ids.map(i=>planes[i].map(BigInt))))chosen=[...ids];return;}
  for(let i=next;i<planes.length;i++)take([...ids,i],i+1);
 }
 take([],0);if(!chosen)return null;
 const indices:number[]=chosen;
 return {weights,coordinateSets:indices.map(i=>sets[i]),basis:indices.map(i=>planes[i]),planes,planeSets:sets,modulus};
}
// Enumerate representations of one fixed construction. No weights, planes,
// moduli or construction candidates are generated or ranked here.
export function enumerateRepresentations(spec:RepresentationSpec|null):Representations{
 const empty=(reason:'unknown'|'limit',combinations=0):Representations=>({complete:false,reason,combinations,accepted:0,values:{}});
 if(!spec||!spec.weights.length||spec.coordinateSets.length!==spec.weights.length||spec.planes.length!==spec.planeSets.length||!Number.isSafeInteger(spec.modulus)||spec.modulus<0)return empty('unknown');
 const {weights,planes}=spec,domains=spec.coordinateSets.map(s=>[...new Set(s)]);
 if([...weights,...domains.flat(),...planes.flat(),...spec.planeSets.flat()].some(v=>!Number.isSafeInteger(v))||planes.some(row=>row.length!==weights.length)||domains.some(s=>!s.length))return empty('unknown');
 const combinations=domains.reduce((n,s)=>n*s.length,1);if(combinations>ENUMERATION_LIMIT)return empty('limit',combinations);
 const basis=spec.basis?.map(row=>row.map(BigInt));
 if(basis&&(basis.length!==weights.length||basis.some(row=>row.length!==weights.length)||weights.length>4))return empty('unknown');
 const det=basis?determinant(basis):1n;if(!det)return empty('unknown');
 const adj=basis?basis.map((_,i)=>basis.map((_,j)=>(i+j)%2?-determinant(basis.filter((_,r)=>r!==j).map(row=>row.filter((_,c)=>c!==i))):determinant(basis.filter((_,r)=>r!==j).map(row=>row.filter((_,c)=>c!==i))))):null;
 const values:Record<string,number[][]>=Object.create(null),w=weights.map(BigInt),ps=planes.map(row=>row.map(BigInt)),allowed=spec.planeSets.map(s=>new Set(s.map(BigInt))),mod=BigInt(spec.modulus),coordinates:bigint[]=[];let accepted=0;
 function visit(i:number){
  if(i<domains.length){for(const v of domains[i]){coordinates[i]=BigInt(v);visit(i+1);}return;}
  const numerators=adj?adj.map(row=>row.reduce((n,v,k)=>n+v*coordinates[k],0n)):coordinates;
  if(numerators.some(v=>v%det!==0n))return;
  const tuple=numerators.map(v=>v/det);
  if(ps.some((row,j)=>!allowed[j].has(row.reduce((n,v,k)=>n+v*tuple[k],0n))))return;
  if(tuple.some(v=>!Number.isSafeInteger(Number(v))))return;
  const sum=tuple.reduce((n,v,k)=>n+v*w[k],0n),key=String(mod?((sum%mod)+mod)%mod:sum);(values[key]??=[]).push(tuple.map(Number));accepted++;
 }
 visit(0);return {complete:true,combinations,accepted,values};
}
