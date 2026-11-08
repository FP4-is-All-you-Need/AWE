import type {Pair} from './types.ts';

type Side='A'|'B';
type LimbRecord={modulus:number;weights:Pair<number[]>;planes:Pair<number[][]>;products:{a:number;b:number;numerator:number}[];encoding?:Pair<(number[]|null)[]>};
// Per-limb and per-plane fields that follow the kept limbs and planes when present.
type Indexed={limb_sets?:Pair<string[]>;limbs_stored?:Pair<boolean[]>;plane_sets?:Pair<string[]>;plane_moduli?:Pair<number[]>;plane_values?:Pair<(number[]|null)[]>;measurement?:{plane_values?:Pair<number[][]>};accumulation?:{product_bounds?:number[]}};
const both=<V,W>(v:Pair<V>,f:(x:V,side:Side)=>W):Pair<W>=>({A:f(v.A,'A'),B:f(v.B,'B')});
const pick=<V>(values:V[],kept:number[])=>kept.map(i=>values[i]);

/** Limbs of weight 0 modulo the modulus that never reach a product: no plane uses them, or the stored encoding gives them 0
 * for every residue. */
export function unusedLimbs(s:LimbRecord):Pair<number[]>{
 return both(s.weights,(weights,side)=>weights.flatMap((w,i)=>{
  if(!s.modulus||w%s.modulus)return [];
  const table=s.encoding?.[side],rows=Array.isArray(table)?table.filter((r):r is number[]=>Array.isArray(r)):[];
  return !s.planes[side].some(p=>p[i])||(rows.length>0&&rows.every(r=>!r[i]))?[i]:[];
 }));
}
/** A display copy without the unused limbs, the planes that are then all zero and the products of those planes (always 0).
 * The id stays; the published record is not changed. */
export function withoutUnusedLimbs<T extends LimbRecord>(s:T):T{
 const unused=unusedLimbs(s);if(!unused.A.length&&!unused.B.length)return s;
 const limbs=both(s.weights,(w,side)=>w.flatMap((_,i)=>unused[side].includes(i)?[]:[i]));
 const columns=both(s.planes,(rows,side)=>rows.map(p=>pick(p,limbs[side])));
 const planes=both(columns,rows=>rows.flatMap((p,j)=>p.some(Boolean)?[j]:[]));
 const products=s.products.flatMap((p,k)=>planes.A.includes(p.a)&&planes.B.includes(p.b)?[k]:[]);
 if(!limbs.A.length||!limbs.B.length||!products.length)return s;
 const r=s as unknown as LimbRecord&Indexed,out:Record<string,unknown>={...r,weights:both(s.weights,(w,side)=>pick(w,limbs[side])),planes:both(columns,(rows,side)=>pick(rows,planes[side])),
  products:products.map(k=>({...s.products[k],a:planes.A.indexOf(s.products[k].a),b:planes.B.indexOf(s.products[k].b)}))};
 if(r.encoding)out.encoding=both(r.encoding,(rows,side)=>Array.isArray(rows)?rows.map(t=>t&&pick(t,limbs[side])):rows);
 if(r.limb_sets)out.limb_sets=both(r.limb_sets,(v,side)=>pick(v,limbs[side]));
 if(r.limbs_stored)out.limbs_stored=both(r.limbs_stored,(v,side)=>pick(v,limbs[side]));
 if(r.plane_sets)out.plane_sets=both(r.plane_sets,(v,side)=>pick(v,planes[side]));
 if(r.plane_moduli)out.plane_moduli=both(r.plane_moduli,(v,side)=>pick(v,planes[side]));
 if(r.plane_values)out.plane_values=both(r.plane_values,(rows,side)=>rows.map(t=>t&&pick(t,planes[side])));
 if(r.measurement?.plane_values)out.measurement={...r.measurement,plane_values:both(r.measurement.plane_values,(v,side)=>pick(v,planes[side]))};
 if(r.accumulation?.product_bounds)out.accumulation={...r.accumulation,product_bounds:pick(r.accumulation.product_bounds,products)};
 return out as unknown as T;
}
/** {omitted_limbs: n} when the display copy left out n limbs, otherwise nothing. */
export function omittedNote(raw:LimbRecord,shown:LimbRecord):{omitted_limbs?:number}{
 const n=raw.weights.A.length+raw.weights.B.length-shown.weights.A.length-shown.weights.B.length;return n?{omitted_limbs:n}:{};
}
