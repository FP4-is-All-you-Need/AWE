import type {FormSolution} from './modularForms.ts';
import type {Construction} from './visual.ts';
/** Keep holes and missing encodings explicit when adapting a published modular row for Expansion. */
export function formConstruction(s:FormSolution):Construction{
 const count=Math.max(s.holes?.A??0,s.holes?.B??0),encoding=s.encoding?{A:Object.fromEntries(s.encoding.A.flatMap((v,i)=>v?[[String(i),v]]:[])),B:Object.fromEntries(s.encoding.B.flatMap((v,i)=>v?[[String(i),v]]:[]))}:undefined;
 return {id:s.id,modulus:s.modulus,weights:s.weights,planes:s.planes,plane_moduli:s.plane_moduli,products:s.products.map(p=>({...p,group:null})),denominator:s.denominator,shape:'published',faces_a:s.planes.A.length,faces_b:s.planes.B.length,holes:{count,share:count/s.modulus},carry:false,block_shift:false,source_sha256:'',saved_encoding:encoding,encoding_domain:[0,s.modulus-1],max_k:s.accumulation?.max_k??null,additional:{plane_sets:s.plane_sets,holes_exact:s.holes?.exact??true,reconstruction:s.reconstruction}};
}
