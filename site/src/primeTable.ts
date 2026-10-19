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
/** One entry of forms-index.json prime_powers: the fewest-product single construction of a prime-power modulus and value set,
 without holes (hole_free), with holes (holes) or left out of the published files (excluded; given without holes). */
export type PrimeForm={modulus:number;prime:number;exponent:number;value_set:string;kind:'hole_free'|'holes'|'excluded';products:number;planes:number[];holes?:{A:number;B:number;exact:boolean};reason?:string;id:string};
export type PrimeTab='fp4'|'fp6';
/** The value sets of each tab. A 2xE2M1 construction also holds on both FP6 sets (value_set_inclusion), so FP6 is the union. */
export const TAB_SETS:Record<PrimeTab,string[]>={fp4:['2xE2M1'],fp6:['2xE2M1','8xE2M3','16xE3M2']};
export type FormCell={hole_free?:PrimeForm;holes?:PrimeForm;excluded?:PrimeForm;entries:PrimeForm[];fewer:boolean;onlyWider:boolean;excludedFewer:boolean};
const formOrder=(a:PrimeForm,b:PrimeForm)=>a.products-b.products||a.planes[0]+a.planes[1]-b.planes[0]-b.planes[1]||(a.id<b.id?-1:a.id>b.id?1:0);
/** The single constructions of each prime-power modulus shown on a tab, with the comparisons the cells mark:
 fewer: the fewest products without holes is below every saved construction (FP4) or every FP4 construction (FP6);
 onlyWider: on FP6, only FP6 value sets give a construction without holes; excludedFewer: a left-out construction has fewer products. */
export function formCells(forms:PrimeForm[],tab:PrimeTab,holes:boolean,saved:Map<number,Construction[]>):Map<number,FormCell>{
 const sets=TAB_SETS[tab],out=new Map<number,FormCell>();
 for(const f of forms){
  if(!sets.includes(f.value_set)||(f.kind==='holes'&&!holes))continue;
  const cell=out.get(f.modulus)??{entries:[],fewer:false,onlyWider:false,excludedFewer:false};
  cell.entries.push(f);const best=cell[f.kind];if(!best||formOrder(f,best)<0)cell[f.kind]=f;
  out.set(f.modulus,cell);
 }
 for(const [modulus,cell] of out){
  cell.entries.sort((a,b)=>a.kind.localeCompare(b.kind)||formOrder(a,b));
  const savedMin=Math.min(...(saved.get(modulus)??[]).map(c=>c.products.length));
  const fp4=Math.min(savedMin,...cell.entries.filter(f=>f.kind==='hole_free'&&f.value_set==='2xE2M1').map(f=>f.products));
  const free=cell.hole_free?.products??Infinity;
  cell.fewer=free<(tab==='fp4'?savedMin:fp4)&&Number.isFinite(tab==='fp4'?savedMin:fp4);
  cell.onlyWider=tab==='fp6'&&Number.isFinite(free)&&!Number.isFinite(fp4);
  cell.excludedFewer=!!cell.excluded&&cell.excluded.products<Math.min(savedMin,free);
  if(!cell.hole_free&&!cell.holes)cell.entries=cell.entries.filter(f=>f.kind!=='excluded');
 }
 return out;
}
export function primeTableData(records:Construction[],sets:PrimeSet[]=[],forms:Map<number,FormCell>=new Map()){
 const byModulus=new Map<number,Construction[]>();
 for(const c of records){
  const fs=factors(c.modulus);if(fs.length!==1)continue;
  const list=byModulus.get(c.modulus)??[];
  if(!list.some(x=>x.id===c.id))list.push(c);
  byModulus.set(c.modulus,list);
 }
 const shownForms=[...forms].filter(([,c])=>c.hole_free||c.holes).map(([m])=>m);
 const known=new Set([...byModulus.keys(),...sets.flatMap(s=>s.moduli),...shownForms]);
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
 // Prime powers whose prime is above the last column (the last prime of the saved constructions) are listed after the table.
 const beyond=knownPowers.filter(p=>p.fs[0].prime>primeMax).map(p=>({modulus:p.modulus,prime:p.fs[0].prime,exponent:p.fs[0].exponent})).sort((a,b)=>a.modulus-b.modulus);
 return {primeMax,modulusMax,primes,columns,byModulus,usedIn,beyond};
}
export function weightVariants(records:Construction[]){
 const groups=new Map<string,Construction[]>();
 for(const c of records){const key=JSON.stringify(c.weights);groups.set(key,[...(groups.get(key)??[]),c]);}
 return [...groups.entries()].map(([key,items])=>({key,items})).sort((a,b)=>(a.items[0].weights.A[1]??0)-(b.items[0].weights.A[1]??0)||(a.items[0].weights.B[1]??0)-(b.items[0].weights.B[1]??0)||a.key.localeCompare(b.key));
}
