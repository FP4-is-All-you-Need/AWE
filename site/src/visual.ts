import type {Pair, Solution} from './types.ts';
import type {ModularCatalog, ModularSolution} from './modular.ts';

export const PAPER_8192='awems1_5b05738257bbabf8901c9dfaa2c8b7d03469ce483316bd6e8f9b0b46197e5757';
export const PAPER_16384='awems1_a5885349a9a7ded35f1072e1509027c38f41c3e8b6033865068b05d0de7893a0';
export const INT8='awe1_d323a4454c50d58cb90ee4d3d062025fe616b2f994dfb6d7d579615c4858161d';
export type Term={a:number;b:number;group:number|null;numerator:number|null};
// display_indices belongs to a rendering copy only; canonical records remain unchanged.
export type Construction={plane_moduli?:Pair<number[]>;limbs_stored?:Pair<boolean[]>;id:string;display_indices?:Pair<number[]>;additional?:Record<string,unknown>;modulus:number;weights:Pair<number[]>;planes:Pair<number[][]>|null;products:Term[];denominator:number;shape:string;faces_a:number;faces_b:number|null;holes:{count:number|null;share:number|null};carry:boolean;block_shift:boolean;source_sha256:string;saved_encoding?:Pair<Record<string,number[]>>;encoding_domain?:number[];hole_values?:number[];correction?:{kind:string;max_abs_shift?:number;chosen_representatives:null};canonical?:ModularSolution;max_k?:number|null;integer?:Solution};
export type Lane={format?:string;usage?:import('./modular.ts').Usage[];id:string;lane:string;selection_kind:string;tag:string;moduli:number[];products:number;faces_a:number;faces_b:number|null;k_max:string;mods:Construction[];bits?:number;plan_k?:number;original_id?:string};
export type VisualCatalog={schema_version:number;source_sha256:string;widths:{bits:number;rows:Lane[]}[]};
export const ACC=['#0288D1','#EF6C00','#6A1B9A'];
export function factors(n:number):{prime:number;exponent:number}[]{
 const out=[];for(let p=2;p*p<=n;p++){if(n%p)continue;let exponent=0;while(n%p===0){n/=p;exponent++;}out.push({prime:p,exponent});}if(n>1)out.push({prime:n,exponent:1});return out;
}
export const factorText=(n:number)=>factors(n).map(f=>`${f.prime}${f.exponent>1?'^'+f.exponent:''}`).join(' × ');
const vectorKey=(v:number[])=>v.join(',');
function termKey(c:Pick<Construction,'planes'>,p:{a:number;b:number}){return c.planes?vectorKey(c.planes.A[p.a])+';'+vectorKey(c.planes.B[p.b]):'';}
export function geometry(c:Pick<Construction,'modulus'|'weights'|'planes'|'products'>):string{
 return JSON.stringify([c.modulus,c.weights,c.planes?c.products.map(p=>termKey(c,p)).sort():null]);
}
export function fromCanonical(s:ModularSolution):Construction{
 const extra=s as ModularSolution&{accumulation?:{max_k:number|null}};
 let shape=s.weights.A.length>2||s.weights.B.length>2?`${s.weights.A.length}×${s.weights.B.length}`:'direct';if(s.weights.A.length===1&&s.weights.B.length===1)shape='one';
 else if(s.weights.A.length===2&&s.products.length===3)shape=s.weights.A[1]*s.weights.B[1]%s.modulus===0?'B':'A';
 return {plane_moduli:s.plane_moduli,limbs_stored:s.limbs_stored,additional:{verification:s.verified,measurement:s.measurement,correction_source:s.correction?.source_cost,encoding_origin:s.encoding_origin},id:s.id,modulus:s.modulus,weights:s.weights,planes:s.planes,products:s.products.map(p=>({...p,group:null})),denominator:s.denominator,shape,faces_a:new Set(s.products.map(p=>p.a)).size,faces_b:new Set(s.products.map(p=>p.b)).size,holes:{count:s.measurement?Math.max(s.measurement.holes.A.length,s.measurement.holes.B.length):0,share:s.measurement?Math.max(s.measurement.holes.A.length,s.measurement.holes.B.length)/s.modulus:0},correction:s.correction?{kind:s.correction.kind,chosen_representatives:null}:undefined,carry:false,block_shift:false,source_sha256:s.provenance?.[0]?.source_sha256??'',canonical:s,max_k:extra.accumulation?.max_k};
}
export function fromInteger(s:Solution):Construction{return {id:s.id,modulus:0,weights:s.weights,planes:s.planes,products:s.products.map(p=>({...p,group:null})),denominator:s.denominator,shape:`${s.products.length}積`,faces_a:s.planes.A.length,faces_b:s.planes.B.length,holes:{count:0,share:0},carry:false,block_shift:false,source_sha256:s.provenance[0]?.source_sha256??'',max_k:s.accumulation.max_k,integer:s,additional:{widths:s.widths,domain:s.domain}};}
export function connect(saved:VisualCatalog,canonical:ModularCatalog):VisualCatalog{
 const byGeometry=new Map<string,Construction>();for(const s of canonical.solutions){if(s.plane_moduli)continue;const c=fromCanonical(s);if(!byGeometry.has(geometry(c)))byGeometry.set(geometry(c),c);}
 return {...saved,widths:saved.widths.map(w=>({...w,rows:w.rows.map(row=>({...row,bits:w.bits,plan_k:8192,mods:row.mods.map(s=>{
  const c=byGeometry.get(geometry(s));if(!c)return s;
  const terms=new Map(c.products.map(p=>[termKey(c,p),p.numerator]));
  // Keep the saved order: accumulator colours index the saved product list.
  return {...s,id:c.id,canonical:c.canonical,max_k:c.max_k,denominator:c.denominator,products:s.products.map(p=>({...p,numerator:p.numerator??terms.get(termKey(s,p))??null})),holes:c.holes};
 })}))}))};
}
export function canonicalLane(c:ModularCatalog,id:string,saved?:VisualCatalog):Lane|undefined{
 const s=c.sets.find(s=>s.id===id);if(!s)return;
 const savedMods=saved?.widths.find(w=>w.bits===s.magnitude_bits)?.rows.flatMap(r=>r.mods)??[];
 return {usage:s.usage,id:s.id,lane:'paper',selection_kind:'paper',tag:'standard',bits:s.magnitude_bits,plan_k:s.k,moduli:s.verification.moduli,products:s.verification.products,faces_a:0,faces_b:0,k_max:s.verification.max_k,mods:s.solution_ids.map(id=>{
  const m=fromCanonical(c.solutions.find(c=>c.id===id)!);return s.k===8192?savedMods.find(v=>v.id===m.id)??m:m;
 })};
}
export function signature(c:Construction):string{return JSON.stringify([geometry(c),c.products.map(p=>p.numerator),c.denominator,c.holes,c.block_shift,c.canonical?.id??null,c.plane_moduli??null,c.limbs_stored&&!Object.values(c.limbs_stored).flat().every(Boolean)?c.limbs_stored:null]);}
export function pool(saved:VisualCatalog,c:ModularCatalog):Construction[]{
 const out=new Map<string,Construction>();for(const s of [...c.solutions.map(fromCanonical),...saved.widths.flatMap(w=>w.rows.flatMap(r=>r.mods))])out.set(signature(s),s);return [...new Map([...out.values()].map(s=>[s.id,s])).values()];
}
export function conflicts(mods:Construction[],slot:number,candidate:Construction){const primes=factors(candidate.modulus).map(f=>f.prime);return mods.flatMap((c,i)=>i===slot?[]:primes.filter(p=>c.modulus%p===0).map(prime=>({prime,modulus:c.modulus})));}
export function holePercent(c:Construction):number|null{return c.holes.share!==null?100*c.holes.share:c.holes.count!==null&&c.modulus>0?100*c.holes.count/c.modulus:null;}
export const holeLabel=(c:Construction)=>holePercent(c)===null?'率未測定':`${Number(holePercent(c)!.toFixed(3))}%`;
export function inFilter(c:Construction,max:number,unknown=true){const p=holePercent(c);return p===null?unknown:p<=max;}
export function totals(mods:Construction[],bits:number,k:number,bitsB=bits){
 const P=mods.reduce((p,c)=>p*BigInt(c.modulus),1n),bound=2n*((1n<<BigInt(bits))-1n)*((1n<<BigInt(bitsB))-1n);
 const coprime=mods.every((c,i)=>conflicts(mods,i,c).length===0);
 const crtMax=bound?(P-1n)/bound:0n;const unknown=mods.some(c=>c.max_k===undefined);
 const ks=mods.flatMap(c=>c.max_k===undefined||c.max_k===null?[]:[c.max_k]);
 return {products:mods.reduce((n,c)=>n+c.products.length,0),facesA:mods.reduce((n,c)=>n+c.faces_a,0),facesB:mods.some(c=>c.faces_b===null)?null:mods.reduce((n,c)=>n+c.faces_b!,0),crtMax,coprime,crtOK:coprime&&crtMax>=BigInt(k),accMax:ks.length?Math.min(...ks):null,accUnknown:unknown,holes:mods.some(c=>(holePercent(c)??0)>0),unknownCoverage:mods.some(c=>holePercent(c)===null)};
}
export function residual(c:Construction):string[][]|null{
 if(!c.planes||c.products.some(p=>p.numerator===null))return null;
 return c.weights.B.map((b,j)=>c.weights.A.map((a,i)=>{
  let n=c.products.reduce((n,p)=>n+BigInt(p.numerator!)*BigInt(c.planes!.A[p.a][i])*BigInt(c.planes!.B[p.b][j]),0n)-BigInt(c.denominator)*BigInt(a)*BigInt(b);
  if(c.modulus)n=((n%BigInt(c.modulus))+BigInt(c.modulus))%BigInt(c.modulus);return String(n);
 }));
}
export const PRECISIONS:Record<string,{ma:number;b:number;label:string}>={...Object.fromEntries([4,5,6,7,8].map(n=>['int'+n,{ma:n,b:n-1,label:'INT'+n}])),fp4:{ma:3,b:2,label:'FP4 (E2M1)'},fp8:{ma:5,b:4,label:'FP8 (E4M3)'},bf16:{ma:9,b:8,label:'BF16'},fp16:{ma:12,b:11,label:'FP16'},fp32:{ma:25,b:24,label:'FP32'},fp64:{ma:54,b:53,label:'FP64'},complex_fp32:{ma:25,b:24,label:'複素FP32'},complex_fp64:{ma:54,b:53,label:'複素FP64'}};
export type VisualState={b:number;b_b:number;k:number;matrix_m:number;matrix_n:number;hole_pct_max:number;precision_a:string;precision_b:string;set_id:string;selected_slot:number;prime:number;include_unknown:boolean;replace:Record<number,string>;cp:string;cf:string};
export function initialState(q=new URLSearchParams(location.search)):VisualState{
 const n=(key:string,d:number,min:number,max:number)=>{const v=Number(q.get(key)??d);return Number.isFinite(v)&&v>=min&&v<=max?v:d;};
 const replace:Record<number,string>={};for(const text of q.getAll('replace')){const [i,id]=text.split(':');if(/^\d+$/.test(i)&&id)replace[Number(i)]=id;}
 return {b:Math.floor(n('b',53,1,84)),b_b:Math.floor(n('b_b',n('b',53,1,84),1,84)),k:Math.floor(n('k',8192,1,65536)),matrix_m:Math.floor(n('matrix_m',8192,1,1048576)),matrix_n:Math.floor(n('matrix_n',8192,1,1048576)),hole_pct_max:n('hole_pct_max',1,0,100),precision_a:q.get('precision_a')??'fp64',precision_b:q.get('precision_b')??'fp64',set_id:q.get('set_id')??PAPER_8192,selected_slot:Math.floor(n('selected_slot',-1,-1,200)),prime:n('prime',0,0,100000),include_unknown:q.get('include_unknown')!=='0',replace,cp:q.get('c_product_fp4')??'',cf:q.get('c_plane_load')??''};
}
export function stateQuery(s:VisualState){const q=new URLSearchParams();for(const [key,v] of Object.entries(s)){if(key==='replace')continue;if(key==='cp'||key==='cf'){if(v!=='')q.set(key==='cp'?'c_product_fp4':'c_plane_load',String(v));continue;}q.set(key,String(v===true?1:v===false?0:v));}Object.entries(s.replace).forEach(([slot,id])=>q.append('replace',slot+':'+id));q.set('input_ma',String(s.b+1));q.set('input_mb',String(s.b_b+1));return q;}
