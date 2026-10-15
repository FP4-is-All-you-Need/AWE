import {factors,type Construction,type VisualCatalog} from './visual.ts';
import type {ModularCatalog} from './modular.ts';

export type PrimeSet={id:string;bits:number;k:number;products:number;moduli:number[];solutionIds:string[];measured:boolean};
export function primeSets(catalog?:ModularCatalog,saved?:VisualCatalog):PrimeSet[]{
 return [
  ...(catalog?.sets??[]).map(s=>({id:s.id,bits:s.magnitude_bits,k:s.k,products:s.verification.products,moduli:s.verification.moduli,solutionIds:s.solution_ids,measured:s.usage?.some(u=>u.state==='measured')??false})),
  ...(saved?.widths.flatMap(w=>w.rows.map(r=>({id:r.id,bits:w.bits,k:r.plan_k??8192,products:r.products,moduli:r.moduli,solutionIds:r.mods.map(c=>c.id),measured:r.selection_kind==='measured'})))??[]),
 ];
}

export function primesThrough(limit:number):number[]{
 const out:number[]=[];
 for(let n=2;n<=limit;n++)if(out.every(p=>p*p>n||n%p!==0))out.push(n);
 return out;
}
export function primeTableData(records:Construction[],sets:PrimeSet[]=[]){
 const byModulus=new Map<number,Construction[]>();
 for(const c of records){
  const fs=factors(c.modulus);if(fs.length!==1)continue;
  const list=byModulus.get(c.modulus)??[];
  if(!list.some(x=>x.id===c.id))list.push(c);
  byModulus.set(c.modulus,list);
 }
 const known=new Set([...byModulus.keys(),...sets.flatMap(s=>s.moduli)]);
 const knownPowers=[...known].map(modulus=>({modulus,fs:factors(modulus)})).filter(p=>p.fs.length===1);
 const primeMax=Math.max(2,...[...byModulus.keys()].filter(m=>factors(m)[0].exponent===1)),primes=primesThrough(primeMax);
 const columns=primes.map(prime=>{
  const entries=new Map<number,number>();
  // Retain the original empty cells through 169; extend only from saved data.
  for(let modulus=prime,exponent=1;modulus<=169;modulus*=prime,exponent++)entries.set(modulus,exponent);
  for(const p of knownPowers)if(p.fs[0].prime===prime)entries.set(p.modulus,p.fs[0].exponent);
  if(!entries.has(prime))entries.set(prime,1);
  return {prime,powers:[...entries].map(([modulus,exponent])=>({modulus,exponent})).sort((a,b)=>a.exponent-b.exponent)};
 });
 const modulusMax=Math.max(...columns.flatMap(c=>c.powers.map(p=>p.modulus)));
 const usedIn=new Map<number,PrimeSet[]>();for(const s of sets)for(const m of new Set(s.moduli))usedIn.set(m,[...(usedIn.get(m)??[]),s]);
 for(const list of byModulus.values())list.sort((a,b)=>a.products.length-b.products.length||a.id.localeCompare(b.id));
 return {primeMax,modulusMax,primes,columns,byModulus,usedIn};
}
export function weightVariants(records:Construction[]){
 const groups=new Map<string,Construction[]>();
 for(const c of records){const key=JSON.stringify(c.weights);groups.set(key,[...(groups.get(key)??[]),c]);}
 return [...groups.entries()].map(([key,items])=>({key,items})).sort((a,b)=>(a.items[0].weights.A[1]??0)-(b.items[0].weights.A[1]??0)||(a.items[0].weights.B[1]??0)-(b.items[0].weights.B[1]??0)||a.key.localeCompare(b.key));
}
