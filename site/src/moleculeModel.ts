export type MoleculeSource={id:string;modulus:number;denominator:number;weights:{A:number[];B:number[]};planes:{A:number[][];B:number[][]};plane_moduli?:{A:number[];B:number[]};products:{a:number;b:number;numerator:number}[]};
type Use=boolean|null;
const mod=(a:bigint,m:bigint)=>(a%m+m)%m;
function inverse(a:bigint,m:bigint):bigint|null{
 let r=m,n=mod(a,m),t=0n,u=1n;
 while(n){const q=r/n;[r,n]=[n,r-q*n];[t,u]=[u,t-q*u];}
 return r===1n?mod(t,m):null;
}
const any=(a:Use[]):Use=>a.some(v=>v===true)?true:a.some(v=>v===null)?null:false;
/** Project the SAME combined construction onto each coprime component. No matching to independently optimal encodings is inferred. */
export function moleculeSharing(source:MoleculeSource,components:number[]){
 const terms:Use[][]=source.products.map(()=>[]),limbs={A:source.weights.A.map(()=>[] as Use[]),B:source.weights.B.map(()=>[] as Use[])};
 const cellTerms=source.weights.A.map(()=>source.weights.B.map(()=>source.products.map(()=>[] as Use[])));
 const status:('checked'|'nonunit_denominator'|'folded_planes'|'identity_mismatch')[]=[];
 for(const qNumber of components){
  const q=BigInt(qNumber),inv=inverse(BigInt(source.denominator),q);
  const matrices=source.products.map(p=>{
   if(inv===null)return null;
   const c=mod(BigInt(p.numerator)*inv,q),fa=BigInt(source.plane_moduli?.A[p.a]??source.modulus),fb=BigInt(source.plane_moduli?.B[p.b]??source.modulus);
   // A stored reduction can only be dropped when its multiple contributes zero modulo q.
   if(mod(c*fa,q)!==0n||mod(c*fb,q)!==0n)return null;
   return source.planes.A[p.a].map(a=>source.planes.B[p.b].map(b=>mod(c*BigInt(a)*BigInt(b),q)));
  });
  let why:typeof status[number]=inv===null?'nonunit_denominator':matrices.some(v=>v===null)?'folded_planes':'checked';
  if(why==='checked')for(let a=0;a<source.weights.A.length;a++)for(let b=0;b<source.weights.B.length;b++){
   const sum=matrices.reduce((s,v)=>s+v![a][b],0n);
   if(mod(sum-BigInt(source.weights.A[a])*BigInt(source.weights.B[b]),q)!==0n)why='identity_mismatch';
  }
  status.push(why);
  for(let a=0;a<source.weights.A.length;a++)for(let b=0;b<source.weights.B.length;b++)for(let t=0;t<terms.length;t++)cellTerms[a][b][t].push(why==='checked'?matrices[t]![a][b]!==0n:null);
  for(let t=0;t<terms.length;t++)terms[t].push(why==='checked'?matrices[t]!.some(row=>row.some(c=>c!==0n)):null);
  for(let a=0;a<limbs.A.length;a++)limbs.A[a].push(why==='checked'?matrices.some(v=>v![a].some(c=>c!==0n)):null);
  for(let b=0;b<limbs.B.length;b++)limbs.B[b].push(why==='checked'?matrices.some(v=>v!.some(row=>row[b]!==0n)):null);
 }
 const planes={A:source.planes.A.map((_,i)=>components.map((_,c)=>any(source.products.flatMap((p,t)=>p.a===i?[terms[t][c]]:[])))),B:source.planes.B.map((_,i)=>components.map((_,c)=>any(source.products.flatMap((p,t)=>p.b===i?[terms[t][c]]:[]))))};
 const shared=(uses:Use[][])=>uses.filter(a=>a.filter(v=>v===true).length>1).length;
 return {terms,limbs,planes,cellTerms,status,sharedProducts:shared(terms),sharedPlanes:shared([...planes.A,...planes.B]),sharedLimbs:shared([...limbs.A,...limbs.B])};
}
