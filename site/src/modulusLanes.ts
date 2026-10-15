import type {ModularCatalog} from './modular.ts';
import {canonicalLane,type Lane,type VisualCatalog} from './visual.ts';

/** Preserve all recorded widths and K values before choosing an input range. */
export function storedModulusLanes(catalog:ModularCatalog,saved?:VisualCatalog):Lane[]{
 const fp32=new Set(catalog.fp32_groups?.flatMap(g=>g.set_ids)??[]);
 return catalog.sets.map(s=>{
  const lane=canonicalLane(catalog,s.id,saved)!;
  return {...lane,format:fp32.has(s.id)?'FP32':s.magnitude_bits===53?'FP64':undefined,
   faces_a:lane.mods.reduce((n,c)=>n+c.faces_a,0),faces_b:lane.mods.reduce((n,c)=>n+(c.faces_b??0),0)};
 });
}

/** Comparing recorded sets does not require either set to cover the current input. */
export function modulusComparisonLanes(stored:Lane[],saved?:VisualCatalog):Lane[]{
 const visual=saved?.widths.flatMap(w=>w.rows.map(r=>({...r,bits:w.bits,format:w.bits===53?'FP64':undefined})))??[];
 return [...new Map([...visual,...stored].map(l=>[l.id,l])).values()];
}
