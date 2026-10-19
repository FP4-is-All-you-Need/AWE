import {useEffect,useMemo,useRef,useState} from 'react';
import {useParameter,bounded} from './parameters.ts';
import {useLanguage} from './i18n.tsx';
import {read} from './catalog.ts';
import {chunksFor,formRows,type FormSolution,type FormsIndex,type ModularForms} from './modularForms.ts';

const SETS=['','2xE2M1','8xE2M3','16xE3M2'];
const PER=50;
/** The list loads forms-index.json when the section is first opened, then only the files whose modulus range meets the filter. */
export function ModularFormsList(){
 const en=useLanguage()==='en',t=(ja:string,english:string)=>en?english:ja;
 const [range,setRange]=useParameter('forms_m','',r=>r.slice(0,40));
 const [set,setSet]=useParameter('forms_set','',r=>SETS.includes(r)?r:'');
 const [holeFree,setHoleFree]=useParameter('forms_holefree',false,r=>r==='1',v=>v?'1':'0');
 const [page,setPage]=useParameter('forms_page',0,r=>Math.floor(bounded(r,0,100000,0)));
 const [open,setOpen]=useState(false);
 const [index,setIndex]=useState<FormsIndex>();
 const [loaded,setLoaded]=useState<Record<string,FormSolution[]>>({});
 const [error,setError]=useState('');
 const asked=useRef(new Set<string>());
 useEffect(()=>{if(open&&!index)read<FormsIndex>('modular/forms-index.json').then(setIndex).catch(e=>setError(e instanceof Error?e.message:String(e)));},[open,index]);
 const wanted=useMemo(()=>index?chunksFor(index,range):[],[index,range]);
 useEffect(()=>{
  if(!open)return;
  for(const c of wanted){
   if(asked.current.has(c.path))continue;
   asked.current.add(c.path);
   read<ModularForms>('modular/'+c.path,c.sha256).then(d=>setLoaded(l=>({...l,[c.path]:d.solutions}))).catch(e=>{asked.current.delete(c.path);setError(e instanceof Error?e.message:String(e));});
  }
 },[open,wanted]);
 const waiting=wanted.filter(c=>!loaded[c.path]).length;
 const rows=useMemo(()=>formRows(wanted.flatMap(c=>loaded[c.path]??[]),{range,set,holeFree},index?.value_set_inclusion),[wanted,loaded,range,set,holeFree,index]);
 const pages=Math.max(1,Math.ceil(rows.length/PER)),current=Math.min(page,pages-1);
 const reasonText=(reason:string,note:string)=>en?note:({coverage_cost_cap:'検算器の符号化の探索が決まった手数を超え、符号化を作り直して確かめられない',nonunit_denominator_needs_table:'分母が法の単元でなく、公開の検算器で確かめるには符号化の表が要る(法が 256 より大きい構成の表は収めていない)',holes_differ_from_input:'検算器の数えた穴が、構成に添えた穴と違う',no_served_residue:'片側で符号化のある剰余が無く、確かめる組が無い'} as Record<string,string>)[reason]??note;
 return <details data-section="modular-forms" className="modular-forms" data-no-i18n onToggle={e=>setOpen((e.currentTarget as HTMLDetailsElement).open)}><summary><span>{t('単独の法の構成','Single modular constructions')}{index&&<>{' '}<span data-forms-count={waiting?index.solutions:rows.length}>{en?`${waiting?index.solutions:rows.length} entries`:`${waiting?index.solutions:rows.length}件`}</span></>}</span></summary>
 <p>{t('組に属さない法の構成です。どれも全部の剰余の組で検算しました。符号化表は法が 256 以下の構成だけに収め、ほかは検算器(verify/modular_forms.py)が作り直します。',
  'Modular constructions outside the saved modulus sets. Each was checked on every pair of residues. Encoding tables are stored only for moduli up to 256; the verifier (verify/modular_forms.py) rebuilds the others.')}
  {t(' 値の集合は、その構成を確かめた一番小さい集合です。2×E2M1 は整数として 8×E2M3 にも 16×E3M2 にも含まれるので、FP4 の構成は FP6 でもそのまま成り立ちます。値の集合で絞ると、その集合で成り立つ構成を全部出します。',
   ' The value set is the smallest set the construction was checked on. 2×E2M1 is contained in 8×E2M3 and in 16×E3M2 as integers, so an FP4 construction also holds on FP6; filtering by a value set lists every construction that holds on it.')}
  {t(' 分母が 1 でない構成は、積の和を d1·m を法として持ち、d1 で割ってから d2 の逆数を掛ける手順だけを確かめています(各行の reconstruction)。和を分母·m を法として持ち分母全体で割る手順は、d2 > 1 の時に成り立たない組があり得ます。',
   ' For a denominator above 1, only one reconstruction is checked: keep the sum of the products modulo d1·m, divide by d1, then multiply by the inverse of d2 (reconstruction in each row). Dividing the sum modulo denominator·m by the whole denominator can fail on some residue pairs when d2 > 1.')}</p>
 {index&&index.excluded.length>0&&<div data-forms-excluded><p>{t('次の構成は、一覧に収めていません。収めていない事は、その構成が無い事や成り立たない事を意味しません。各構成は data/modular/forms-excluded.json にあります。','The following constructions are not in the list. This does not mean that they do not exist or do not hold; each one is in data/modular/forms-excluded.json.')}</p>
  <ul>{index.excluded.map(e=><li key={e.reason} data-forms-excluded-reason={e.reason}>{en?`${e.count} constructions: `:`${e.count} 個: `}{reasonText(e.reason,e.note)}</li>)}</ul></div>}
 <form name="forms_filters" className="paper-controls" onSubmit={e=>e.preventDefault()}>
  <label>{t('法の範囲','Modulus range')}<input name="forms_m" value={range} placeholder={t('例 4000-6000','e.g. 4000-6000')} onChange={e=>{setRange(e.target.value);setPage(0);}}/></label>
  <label>{t('値の集合','Value set')}<select name="forms_set" value={set} onChange={e=>{setSet(e.target.value);setPage(0);}}><option value="">{t('すべて','All')}</option><option value="2xE2M1">{t('FP4 (2×E2M1) で成り立つ','Holds on FP4 (2×E2M1)')}</option><option value="8xE2M3">{t('FP6 (8×E2M3) で成り立つ','Holds on FP6 (8×E2M3)')}</option><option value="16xE3M2">{t('FP6 (16×E3M2) で成り立つ','Holds on FP6 (16×E3M2)')}</option></select></label>
  <label><input name="forms_holefree" type="checkbox" checked={holeFree} onChange={e=>{setHoleFree(e.target.checked);setPage(0);}}/>{t('穴なしのみ','Hole-free only')}</label>
  <button name="forms_previous" type="button" disabled={!current} onClick={()=>setPage(current-1)}>{t('前','Previous')}</button><label>{t('ページ','Page')}<input name="forms_page" type="number" min="1" max={pages} value={current+1} data-url-offset="-1" onChange={e=>{const n=Number(e.target.value);if(Number.isInteger(n)&&n>=1&&n<=pages)setPage(n-1);}}/></label><span>/ {pages}</span><button name="forms_next" type="button" disabled={current+1>=pages} onClick={()=>setPage(current+1)}>{t('次','Next')}</button>
 </form>
 {error?<p role="alert">{t('読み込めませんでした: ','Could not load: ')}{error}</p>:!index||waiting?<p data-forms-loading>{t('読み込み中','Loading')}</p>:
 rows.length?<table className="modular-forms-table" data-forms-table><thead><tr><th>{t('法','Modulus')}</th><th>{t('素因数','Factors')}</th><th>{t('値の集合','Value set')}</th><th>{t('積','Products')}</th><th>{t('分母','Denominator')}</th><th>{t('面 A / B','Planes A / B')}</th><th>{t('面の法','Plane moduli')}</th><th>{t('穴 A / B','Holes A / B')}</th><th>{t('K の上限(FP32)','K limit (FP32)')}</th><th>{t('符号化表','Encoding table')}</th></tr></thead>
 <tbody>{rows.slice(current*PER,current*PER+PER).map(r=><tr key={r.id} data-form={r.id}><td>{r.modulus}</td><td>{r.factors}</td><td>{r.set}</td><td>{r.products}</td><td title={r.dividesD1?t('d1 で割り d2 の逆数を掛ける手順だけを確かめた','checked only for dividing by d1, then multiplying by the inverse of d2'):undefined}>{r.denominator}{r.dividesD1?t('(d1 で割る)',' (divide by d1)'):''}</td><td>{r.facesA} / {r.facesB}</td><td>{r.folded?t('折り返しあり','folded'):'—'}</td><td>{r.holesA} / {r.holesB}{r.exact?'':t('(上限)',' (upper bound)')}</td><td>{r.maxK??'—'}</td><td>{r.table?t('あり','stored'):t('検算器で作る','rebuilt by the verifier')}</td></tr>)}</tbody></table>:<p>{t('未収録','None')}</p>}
 </details>;
}
