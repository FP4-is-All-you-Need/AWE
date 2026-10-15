export type JsonlUsage=Omit<RunUsage,'kind'|'association'|'device'|'summary_sha256'|'engine_sha256'>&{kind:'run_jsonl';association:'header_hash_and_engine_manifest';device?:'NVIDIA GB200'|'NVIDIA B200'|'NVIDIA B300';header_sha256:string;binary_sha256:string;output_sha256:string[];processes:number;evidence_sha256:Record<string,string>};
export type RunUsage={kind:'run_summary';state:'measured';source_sha256:string;summary_sha256:string;reference_sha256:string;engine_sha256:string;association:'reported_table_name';device?:'B200'|'B300';date:string;checks:{shape:number[];output_hash:string;comparison:'expected_and_baseline'|'baseline_only'}[]};
import type {Pair} from './types.ts';
export type ModularSolution={provenance?:{source_sha256:string;position?:number}[];id:string;kind:'modular';limb_sets?:Pair<string[]>;modulus:number;weights:Pair<number[]>;planes:Pair<number[][]>;products:{a:number;b:number;numerator:number}[];denominator:number;encoding:Pair<(number[]|null)[]>;plane_moduli?:Pair<number[]>;limbs_stored?:Pair<boolean[]>;measurement?:{bits?:number;holes:Pair<number[]>;plane_values:Pair<number[][]>};correction?:{kind:string;source_cost?:Record<string,number|null>};encoding_origin?:string;plane_sets:Pair<string[]>;verified:{method:string;identity:string;encoding:string;date:string;n_pairs:number;n_residues:Pair<number>;verifier_version:string}};
export type Usage=JsonlUsage|RunUsage|{state:'measured'|'build_only'|'unknown';header_sha256:string;summary_sha256:string|null};
export type ModularSet={usage?:Usage[];id:string;magnitude_bits:number;k:number;solution_ids:string[];verification:{max_k:string;products:number;faces:number;moduli:number[];modulus_product:string;max_abs_operand:string}};
export type TableCheck='passed'|'failed'|'unsupported_output_width'|'not_applicable'|'unspecified';
export type SourceDeclaration={scope_id:string|null;pool:string;table_check:TableCheck;selection:'saved_selection';selection_index_sha256?:string};
export type Intake={source_sha256:string;copies:number;status:'accepted'|'quarantined';reason:string;declarations:SourceDeclaration[]};
export type SearchScope={source_sha256:string;global_exhaustiveness_claimed:false;enumeration:{modulus_interval:number[];limbs:number;weights_rule:string;u_interval:number[];v_values:number[];face_families?:string[];conditions?:string[]};additional_source_families?:string[];not_globally_enumerated?:string[]};
export type FP32Run={device:string;recorded_device?:string;routine:string;shape:number[];bits:number;distribution:string;qualified:boolean|null;scope:string;association:'matched'|'unconfirmed';result_sha256:string;binary_sha256:string;output_hashes:string[]};
export type FP32Engine={id:string;device:string;bits:number;k_limit:number;set_id:string;state:'measured'|'build_only'|'unknown';source_revision:string;header_sha256:string;evidence_sha256:string;origin:string;measurements:FP32Run[]};
export type FP32Group={id:string;moduli:number[];set_ids:string[];engines:FP32Engine[]};
export type ModularCatalog={fp32_groups?:FP32Group[];schema_version:number;sets:ModularSet[];solutions:ModularSolution[];intake?:Intake[];search_scopes?:SearchScope[]};
/** Canonical IDs identify copies across imported catalogs. Preserve their evidence. */
export function mergeModularCatalogs(parts:ModularCatalog[]):ModularCatalog{
 const unique=<T,>(items:T[])=>[...new Map(items.map(x=>[JSON.stringify(x),x])).values()];
 const solutions=new Map<string,ModularSolution>(),sets=new Map<string,ModularSet>();
 for(const part of parts){
  for(const s of part.solutions){const old=solutions.get(s.id);solutions.set(s.id,old?{...old,provenance:unique([...(old.provenance??[]),...(s.provenance??[])])}:s);}
  for(const s of part.sets){const old=sets.get(s.id);sets.set(s.id,old?{...old,usage:unique([...(old.usage??[]),...(s.usage??[])])}:s);}
 }
 return {fp32_groups:unique(parts.flatMap(p=>p.fp32_groups??[])),schema_version:1,solutions:[...solutions.values()],sets:[...sets.values()],intake:parts.flatMap(p=>p.intake??[]),search_scopes:parts.flatMap(p=>p.search_scopes??[])};
}
export const tableCheckLabel=(status:TableCheck):string=>({passed:'通過',failed:'不通過',unsupported_output_width:'出力幅が未対応',not_applicable:'適用対象外',unspecified:'指定なし'})[status];
export function modularSources(c:ModularCatalog,s:ModularSolution){return [...new Set((s.provenance??[]).map(p=>p.source_sha256))].map(sha=>({sha,intake:c.intake?.find(i=>i.source_sha256===sha)}));}
export type ModularIndex={path:string;sha256:string;sets:number;solutions:number};
export type ModularFilters={bits:number;k:string;cp:number;cf:number};
export function modularInitial(q:URLSearchParams):ModularFilters{
 const number=(key:string,fallback:number,integer:boolean,min:number)=>{const n=Number(q.get(key)??fallback);return Number.isFinite(n)&&n>=min&&n<=10000000&&(!integer||Number.isSafeInteger(n))?n:fallback;};
 const k=q.get('m_k')??'8192';
 return {bits:number('m_bits',53,true,1),k,cp:number('m_cp',1,false,0),cf:number('m_cf',0,false,0)};
}
export function validModularK(k:string):boolean{return /^[1-9][0-9]{0,15}$/.test(k)&&Number(k)<=Number.MAX_SAFE_INTEGER;}
export function verifiedModular(s:ModularSolution):boolean{return s.verified.method==='full_pairs'&&s.verified.identity==='modulo_p'&&s.verified.encoding==='all_residues';}
export function rankModular(sets:ModularSet[],f:ModularFilters):ModularSet[]{
 if(!validModularK(f.k))return [];
 return sets.filter(s=>s.magnitude_bits>=f.bits&&BigInt(f.k)<=BigInt(s.verification.max_k)).sort((a,b)=>(a.verification.products*f.cp+a.verification.faces*f.cf)-(b.verification.products*f.cp+b.verification.faces*f.cf)||a.verification.products-b.verification.products||a.id.localeCompare(b.id));
}
