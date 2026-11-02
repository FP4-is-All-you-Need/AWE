import type {ValueSet} from './polarModel.ts';
export type FP6FamilyRow={m:number;factor:string;value_set:ValueSet;family:string;R:number;faces:number[];holes:number[];holefree:boolean;denominator:number;recon:string;id:string;public_id:string|null;status:'checked'|'source_only';reason?:string};
export type FP6Summary={m:number;value_set:ValueSet;holefree_R:number|null;holefree_family:string|null;general_weight_no_holefree_upto:number|null;general_weight_open_cells:number[][]|null;scope_of_no_holefree:string|null};
export type FP6Periodic={schema_version:number;rows:FP6FamilyRow[];summaries:FP6Summary[]};
export const FP6_FAMILIES:Record<string,[string,string]>={
 toom:['Toom 型','Toom'],a0_shared_2prime:['a0 共有の2素数','Two primes sharing a0'],
 general_weight_2prime:['一般の重みの2素数','Two primes, general weights'],
 p2:['素数べきの2積','Prime power, two products'],p2_holes_paid:['素数べき・穴を補完','Prime power with hole correction'],
 p2_karatsuba:['p² の5積','p², five products'],p3:['p³ の5積','p³, five products'],polynomial:['多項式型','Polynomial'],
};
export const reconstructionText=(recon:string,en:boolean)=>recon==='d1_divide_d2_inverse'||recon==='divide_d1_then_multiply_d2_inverse'
 ?en?'Divide by d1, then multiply by the inverse of d2':'d1 で割り、d2 の逆数を掛ける'
 :recon==='none'?(en?'No denominator division':'分母による除算なし'):recon;
export function familyRows(data:FP6Periodic,set:ValueSet,family:string,modulus:string,holes:boolean){
 return data.rows.filter(r=>r.value_set===set&&(!family||r.family===family)&&(!modulus||String(r.m)===modulus)&&(holes||r.holefree));
}
export function formLink(row:FP6FamilyRow,lang='ja'){
 const q=new URLSearchParams({prime_set:'fp6',periodic_fp6:row.value_set,section:'modular-forms',forms_m:String(row.m)});
 q.set('lang',lang);
 if(row.public_id)q.set('forms_id',row.public_id);
 return '?'+q.toString();
}
export function verificationReason(reason:string,en:boolean){
 const labels:Record<string,[string,string]>={
  nonunit_denominator_needs_table:['分母の逆数が法 m で存在せず、この頁の検算器には保存対象の範囲を超える符号化表が必要です。構成が無いという意味ではありません。','The denominator is not invertible modulo m; the verifier requires an encoding table beyond its supported stored-table range. This is not a nonexistence result.'],
  coverage_cost_cap:['符号化を作り直す手数が、検算器の上限を超えました。','Rebuilding the encoding exceeded the verifier’s work budget.'],
  no_served_residue:['この検算器で作り直した符号化では、片側に表せる剰余が無く、積の検算を行えませんでした。出所の手順との対応は未確認です。','The encoding rebuilt by this verifier serves no residues on one side, so product verification could not proceed. Its correspondence to the source procedure is unconfirmed.'],
 };
 return labels[reason]?.[en?1:0]??reason;
}
