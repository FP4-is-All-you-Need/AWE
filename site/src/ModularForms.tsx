import {IntegerConstructions} from './IntegerConstructions.tsx';
import {Expansion} from './Expansion.tsx';
import {formConstruction} from './formConstruction.ts';
import {usePeriodicFormat} from './PeriodicFormat.tsx';
import {useEffect,useMemo,useRef,useState} from 'react';
import {useParameter,bounded} from './parameters.ts';
import {useLanguage} from './i18n.tsx';
import {read} from './catalog.ts';
import {chunksFor,formRows,usableOn,type FormSolution,type FormsIndex,type ModularForms} from './modularForms.ts';

const SETS=['','2xE2M1','8xE2M3','16xE3M2'];
const PER=50;
/** The list loads forms-index.json when the section is first opened, then only the files whose modulus range meets the filter. */
export function ModularFormsList(){
 const en=useLanguage()==='en',t=(ja:string,english:string)=>en?english:ja;
 const [range,setRange]=useParameter('forms_m','',r=>r.slice(0,40));
 const {valueSet:set}=usePeriodicFormat();
 const [holeFree,setHoleFree]=useParameter('forms_holefree',false,r=>r==='1',v=>v?'1':'0');
 const [page,setPage]=useParameter('forms_page',0,r=>Math.floor(bounded(r,0,100000,0)));
 const [open,setOpen]=useState(false);
 const [selected,setSelected]=useParameter('forms_id','',r=>r);
 const root=useRef<HTMLDetailsElement>(null);
 useEffect(()=>{if(selected||new URLSearchParams(location.search).get('section')==='modular-forms'){setOpen(true);if(root.current)root.current.open=true;const timer=setTimeout(()=>root.current?.scrollIntoView({block:'start'}),250);return()=>clearTimeout(timer);}},[]);

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
 const rows=useMemo(()=>index?formRows(wanted.flatMap(c=>loaded[c.path]??[]),{range,set,holeFree},index.value_set_inclusion):[],[wanted,loaded,range,set,holeFree,index]);
 useEffect(()=>{setPage(0);},[set]);
 const selectedRow=index&&Object.values(loaded).flat().find(r=>r.id===selected&&usableOn(r.plane_sets.A[0],set,index.value_set_inclusion));
 const selectedPath=Object.entries(loaded).find(([,rs])=>rs.some(r=>r.id===selected))?.[0];
 const select=(id:string)=>{setSelected(id);const q=new URLSearchParams(location.search);q.set('section','modular-forms');q.set('open.modular-forms','1');history.replaceState(null,'','?'+q.toString());};
 const pages=Math.max(1,Math.ceil(rows.length/PER)),current=Math.min(page,pages-1);
 return <details ref={root} data-section="modular-forms" className="modular-forms" onToggle={e=>setOpen((e.currentTarget as HTMLDetailsElement).open)}><summary><span>{t('構成の一覧','Construction list')}{index&&<>{' '}<span data-forms-count={waiting?undefined:rows.length}>{en?`${waiting?"…":rows.length} entries`:`${waiting?"…":rows.length}件`}</span></>}</span></summary>
 <p>{t('法ごとの単独の構成です。どれも、符号化できる剰余のすべての組で検算しました。符号化表は法が 256 以下の構成だけに収め、ほかは検算器(verify/modular_forms.py)が作り直します。',
  'Single modular constructions, one modulus each. Each was checked on every pair of residues it encodes. Encoding tables are stored only for moduli up to 256; the verifier (verify/modular_forms.py) rebuilds the others.')}
  {t(' 値の集合は、その構成を確かめた一番小さい集合です。ページ最上部で選んだ集合で成り立つ構成を出します。その集合で確かめた構成と、その集合に含まれる値の集合で確かめた構成です。',
   ' The value set is the smallest set the construction was checked on. The list shows the constructions that hold on the value set selected at the top of the page: those checked on it and those checked on a value set it contains.')}
  {t(' 分母が 1 でない構成は、積の和を d1·m を法として持ち、d1 で割ってから d2 の逆数を掛ける手順だけを確かめています（選んだ構成の詳細に出します）。和を分母·m を法として持ち分母全体で割る手順は、d2 > 1 の時に成り立たない組があり得ます。',
   ' For a denominator above 1, only one reconstruction is checked: keep the sum of the products modulo d1·m, divide by d1, then multiply by the inverse of d2 (in the details of the selected construction). Dividing the sum modulo denominator·m by the whole denominator can fail on some residue pairs when d2 > 1.')}</p>
 <form name="forms_filters" className="paper-controls" onSubmit={e=>e.preventDefault()}>
  <label>{t('法の範囲','Modulus range')}<input name="forms_m" value={range} placeholder={t('例 4000-6000','e.g. 4000-6000')} onChange={e=>{setRange(e.target.value);setPage(0);}}/></label>
  <span data-forms-value-set={set}>{t('値の集合','Value set')}: {set}</span>
  <label><input name="forms_holefree" type="checkbox" checked={holeFree} onChange={e=>{setHoleFree(e.target.checked);setPage(0);}}/>{t('穴なしのみ','Hole-free only')}</label>
  <button name="forms_previous" type="button" disabled={!current} onClick={()=>setPage(current-1)}>{t('前','Previous')}</button><label>{t('ページ','Page')}<input name="forms_page" type="number" min="1" max={pages} value={current+1} data-url-offset="-1" onChange={e=>{const n=Number(e.target.value);if(Number.isInteger(n)&&n>=1&&n<=pages)setPage(n-1);}}/></label><span>/ {pages}</span><button name="forms_next" type="button" disabled={current+1>=pages} onClick={()=>setPage(current+1)}>{t('次','Next')}</button>
 </form>
 {error?<p role="alert">{t('読み込めませんでした: ','Could not load: ')}{error}</p>:!index||waiting?<p data-forms-loading>{t('読み込み中','Loading')}</p>:
 rows.length?<div className="paper-scroll"><table className="modular-forms-table" data-forms-table><thead><tr><th>{t('法','Modulus')}</th><th>{t('素因数','Factors')}</th><th>{t('値の集合','Value set')}</th><th>{t('積','Products')}</th><th>{t('分母','Denominator')}</th><th>{t('面 A / B','Planes A / B')}</th><th>{t('面の折り返し','Folded planes')}</th><th>{t('穴 A / B','Holes A / B')}</th><th>{t('K の上限(FP32)','K limit (FP32)')}</th><th>{t('符号化表','Encoding table')}</th></tr></thead>
 <tbody>{rows.slice(current*PER,current*PER+PER).map(r=><tr key={r.id} data-form={r.id}><td><button type="button" className="molecule-select" aria-pressed={selected===r.id} onClick={()=>select(r.id)}>{r.modulus}</button></td><td>{r.factors}</td><td>{r.set}</td><td>{r.products}</td><td title={r.dividesD1?t('d1 で割り d2 の逆数を掛ける手順だけを確かめた','checked only for dividing by d1, then multiplying by the inverse of d2'):undefined}>{r.denominator}{r.dividesD1?t('(d1 で割る)',' (divide by d1)'):''}</td><td>{r.facesA} / {r.facesB}</td><td>{r.folded?t('折り返しあり','folded'):'—'}</td><td>{r.holesA} / {r.holesB}{r.exact?'':t('(上限)',' (upper bound)')}</td><td>{r.maxK??'—'}</td><td>{r.table?t('あり','stored'):t('検算器で作る','rebuilt by the verifier')}</td></tr>)}</tbody></table></div>:<p>{t('該当する構成はありません','No construction matches.')}</p>}
 {selectedRow&&<div data-selected-form={selectedRow.id}><p><a href={import.meta.env.BASE_URL+'modular/'+selectedPath}>{en?'Source construction':'元の構成'}</a></p><p data-no-i18n>{en?'Holes A / B':'穴 A / B'}: {selectedRow.holes?.A??0} / {selectedRow.holes?.B??0}</p>{selectedRow.reconstruction&&<p data-no-i18n>{selectedRow.reconstruction.procedure==='divide_d1_then_multiply_d2_inverse'?(en?'Reconstruct by dividing by d1, then multiplying by the inverse of d2.':'d1 で割り、d2 の逆数を掛けて復元します。'):selectedRow.reconstruction.procedure}</p>}<Expansion key={selectedRow.id} c={formConstruction(selectedRow)}/></div>}
 {set==='2xE2M1'&&<IntegerConstructions active={open} selected={selected} onSelect={select} en={en}/>}
 </details>;
}
