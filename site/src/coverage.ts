import type {Construction} from './visual.ts';

export type ProductCoverage={terms:[number,number][];kept:[number,number][];scales:string[]};
/** The terms a_i b_j of each product (both plane coefficients nonzero). A product keeps a term unless another product
 * containing it has fewer terms; `scales` lists w_i×w_j of the kept terms, once per value. */
export function productCoverage(c:Construction):ProductCoverage[]{
 const planes=c.planes;if(!planes)return [];
 const terms=c.products.map(p=>planes.A[p.a].flatMap((x,i)=>x?planes.B[p.b].flatMap((y,j)=>y?[[i,j] as [number,number]]:[]):[]));
 const fewest=new Map<string,number>();
 for(const t of terms)for(const [i,j] of t)fewest.set(i+':'+j,Math.min(fewest.get(i+':'+j)??Infinity,t.length));
 return terms.map(t=>{
  const kept=t.filter(([i,j])=>fewest.get(i+':'+j)===t.length),seen=new Set<number>();
  const scales=kept.flatMap(([i,j])=>{const v=c.weights.A[i]*c.weights.B[j];if(seen.has(v))return [];seen.add(v);return [`${c.weights.A[i]}×${c.weights.B[j]}`];});
  return {terms:t,kept,scales};
 });
}
