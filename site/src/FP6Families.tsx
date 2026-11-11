import {useEffect,useMemo,useState} from 'react';
import {read} from './catalog.ts';
import {bounded,useParameter} from './parameters.ts';
import {usePeriodicFormat} from './PeriodicFormat.tsx';
import {useLanguage} from './i18n.tsx';
import {LawRow} from './PaperFigures.tsx';
import {Expansion} from './Expansion.tsx';
import {PrimeFactors as FactorBadges} from './PrimeFactors.tsx';
import {formConstruction} from './formConstruction.ts';
import {useSelectedDetailScroll} from './useSelectedDetailScroll.ts';
import {familyRows,fewestShown,formLink,FP6_FAMILIES,reconstructionText,shownCounts,verificationReason,type FP6FamilyRow,type FP6Periodic} from './fp6Periodic.ts';
import type {FormSolution,FormsIndex,ModularForms} from './modularForms.ts';
import type {Construction,Lane} from './visual.ts';
// One construction drawn as a periodic-table card tile.
const tileLane=(c:Construction):Lane=>({id:c.id,lane:'candidate',selection_kind:'candidate',tag:'candidate',moduli:[c.modulus],mods:[c],products:c.products.length,faces_a:c.faces_a,faces_b:c.faces_b,k_max:'0'});
export function FP6Families(){
 const {valueSet}=usePeriodicFormat(),en=useLanguage()==='en';
 const [data,setData]=useState<FP6Periodic>(),[error,setError]=useState('');
 const [family,setFamily]=useParameter('fp6_family','',s=>s in FP6_FAMILIES?s:'');
 const [modulus,setModulus]=useParameter('fp6_m','',s=>/^\d+$/.test(s)?s:'');
 const [holes,setHoles]=useParameter('fp6_holes',true,s=>s!=='0',v=>v?'1':'0');
 const [page,setPage]=useParameter('fp6_page',0,s=>Math.floor(bounded(s,0,10000,0)));
 const [selectedId,setSelectedId]=useParameter('fp6_form','',s=>/^\w{1,80}$/.test(s)?s:'');
 const [index,setIndex]=useState<FormsIndex>(),[forms,setForms]=useState(new Map<string,FormSolution>()),[formsError,setFormsError]=useState('');
 useEffect(()=>{read<FP6Periodic>('visualization/fp6-periodic.json').then(setData).catch(e=>setError(String(e)));},[]);
 useEffect(()=>{read<FormsIndex>('modular/forms-index.json').then(setIndex).catch(e=>setFormsError(String(e)));},[]);
 const rows=useMemo(()=>data?familyRows(data,valueSet,family,modulus,holes):[],[data,valueSet,family,modulus,holes]);
 const per=20,pages=Math.max(1,Math.ceil(rows.length/per)),current=Math.min(page,pages-1);
 const shown=useMemo(()=>rows.slice(current*per,current*per+per),[rows,current]),chosen=rows.find(r=>r.id===selectedId);
 // Every family of the filtered modulus, for its summary.
 const modulusRows=useMemo(()=>data&&modulus?familyRows(data,valueSet,'',modulus,true):[],[data,valueSet,modulus]);
 // Construction files whose modulus range holds a published row on this page, the selected row or the summary rows.
 const chunks=useMemo(()=>{const wanted:FP6FamilyRow[]=[...shown,...modulusRows,...chosen?[chosen]:[]].filter(r=>r.public_id);return index?index.chunks.filter(c=>wanted.some(r=>c.modulus_min<=r.m&&r.m<=c.modulus_max)):[];},[index,shown,modulusRows,chosen]);
 useEffect(()=>{let alive=true;for(const c of chunks)read<ModularForms>('modular/'+c.path,c.sha256).then(d=>{if(alive)setForms(prev=>{if(d.solutions.every(s=>prev.has(s.id)))return prev;const next=new Map(prev);for(const s of d.solutions)next.set(s.id,s);return next;});}).catch(e=>{if(alive)setFormsError(String(e));});return()=>{alive=false;};},[chunks]);
 const built=useMemo(()=>new Map([...shown,...chosen?[chosen]:[]].flatMap(r=>{const s=r.public_id?forms.get(r.public_id):undefined;return s?[[r.id,formConstruction(s)] as const]:[];})),[forms,shown,chosen]);
 const lanes=useMemo(()=>new Map([...built].map(([id,c])=>[id,tileLane(c)])),[built]);
 const detailScroll=useSelectedDetailScroll(selectedId,!!chosen);
 const select=(id:string)=>{detailScroll.request();setSelectedId(id);};
 const summary=data?.summaries.find(r=>r.value_set===valueSet&&String(r.m)===modulus);
 const record=(r:FP6FamilyRow)=>r.public_id?forms.get(r.public_id):undefined,fewest=summary&&fewestShown(modulusRows,record,summary.holefree_family);
 const name=(f:string)=>FP6_FAMILIES[f]?.[en?1:0]??f;
 const selected=chosen&&built.get(chosen.id);
 // Text written in both languages is marked data-no-i18n; the tiles and the expansion are translated like the FP4 views.
 return <details open data-section="fp6-families" className="fp6-families">
  <summary data-no-i18n>{en?'FP6 constructions by family':'FP6 の系列ごとの構成'}</summary>
  <p data-no-i18n>{en?'One representative per modulus, value set, family and product count, minimizing the larger hole count and then the sum. Every delivered family is retained. “Source report only” entries have not been reproduced by this site’s verifier and are excluded from the modulo spiral and component comparisons.':'法・値の集合・系列・積数ごとに、両側の穴の数の最大値、両側の合計の順に比較し、最少の構成を一つ載せます。受領したすべての系列を残しています。「出所の報告のみ」は、この頁の検算器で再現できていない行で、法の螺旋表示や成分との比較には含めません。'}</p>
  <div className="paper-controls" data-no-i18n>
   <label>{en?'Family':'系列'} <select aria-label="FP6 family" value={family} onChange={e=>{setFamily(e.target.value);setPage(0);}}><option value="">{en?'All':'すべて'}</option>{Object.keys(FP6_FAMILIES).map(f=><option key={f} value={f}>{name(f)}</option>)}</select></label>
   <label>{en?'Modulus':'法'} <input aria-label="FP6 modulus" inputMode="numeric" value={modulus} onChange={e=>{setModulus(e.target.value.replace(/\D/g,''));setPage(0);}}/></label>
   <label><input aria-label="FP6 include holes" type="checkbox" checked={holes} onChange={e=>{setHoles(e.target.checked);setPage(0);}}/>{en?'Include holes':'穴ありも含む'}</label>
   <span data-fp6-family-count={rows.length}>{rows.length} {en?'entries':'件'} · {valueSet}</span>
  </div>
  {error?<p role="alert" data-no-i18n>{error}</p>:!data?<p data-no-i18n>{en?'Loading':'読み込み中'}</p>:<>
   <div className="paper-scroll"><table><thead data-no-i18n><tr>{[en?'Modulus':'法',en?'Construction':'構成',en?'Family':'系列',en?'Products':'積',en?'Planes A/B':'面 A/B',en?'Holes A/B':'穴 A/B',en?'Denominator':'分母',en?'Reconstruction':'復元',en?'Source / details':'出所・詳細'].map(t=><th key={t}>{t}</th>)}</tr></thead>
   <tbody>{shown.map(r=>{const lane=lanes.get(r.id),counts=shownCounts(r,record(r));return <tr key={[r.m,r.value_set,r.family,r.R].join(':')} data-fp6-family-row={r.id} data-value-set={r.value_set} data-family={r.family} data-status={r.status} data-selected={r.id===selectedId} data-products={counts.R}>
    <td data-no-i18n><button type="button" className="molecule-select" aria-pressed={r.id===selectedId} onClick={()=>select(r.id)}>{r.m}</button><FactorBadges m={r.m}/></td>
    <td className="fp6-family-tile">{lane?<LawRow lane={lane} selectionRole="focus" selected={r.id===selectedId?0:-1} onSelect={()=>select(r.id)}/>:<span data-no-i18n>{r.public_id&&!formsError?(en?'Loading':'読み込み中'):'—'}</span>}</td>
    <td data-no-i18n>{name(r.family)}</td><td>{counts.R}{Number(built.get(r.id)?.additional?.omitted_limbs)>0&&<small data-omitted-limbs data-no-i18n><br/>{en?'Unused limbs are omitted.':'使われないリムを省いて表示しています。'}</small>}</td><td>{counts.faces.join(' / ')}</td><td>{r.holes.join(' / ')}</td><td>{r.denominator}</td><td data-no-i18n data-fp6-recon={r.recon}>{reconstructionText(r.recon,en)}</td>
    <td data-no-i18n>{r.public_id?<a href={formLink(r,en?'en':'ja')}>{en?'Open construction':'構成を開く'}</a>:<span>{en?'Source report only':'出所の報告のみ'}</span>}<br/><small>{r.id}</small>{r.reason&&<details><summary>{en?'Verification status':'検算の状態'}</summary><p>{verificationReason(r.reason,en)}</p></details>}</td>
   </tr>;})}</tbody></table></div>
   <div className="paper-controls" data-no-i18n><button type="button" disabled={!current} onClick={()=>setPage(current-1)}>{en?'Previous':'前'}</button><span>{current+1} / {pages}</span><button type="button" disabled={current+1>=pages} onClick={()=>setPage(current+1)}>{en?'Next':'次'}</button></div>
   {formsError&&<p role="alert" data-no-i18n>{formsError}</p>}
   {chosen&&<div className="fp6-family-detail" data-fp6-selected={chosen.id} ref={detailScroll.ref}><h3 data-no-i18n>{`mod ${chosen.m} · ${name(chosen.family)} · ${shownCounts(chosen,record(chosen)).R}${en?' products':' 積'}`}</h3>
    {selected?<Expansion key={chosen.id} c={selected} scope="fp6."/>:<p data-no-i18n>{chosen.public_id?(formsError?'—':en?'Loading':'読み込み中'):en?'Source report only: there is no construction data to draw.':'出所の報告のみで、図にする構成のデータがありません。'}</p>}</div>}
  </>}
  {summary&&<div data-fp6-summary={summary.m} data-no-i18n><p>{en?'Source collection: fewest hole-free products across families':'出所の収録範囲：すべての系列での穴なし最少積数'}: {fewest?.R??summary.holefree_R??'—'} {(fewest?.row.family??summary.holefree_family)&&`(${name(fewest?.row.family??summary.holefree_family!)})`}{fewest&&summary.holefree_R!=null&&fewest.R!==summary.holefree_R&&<small data-fp6-source-holefree>{en?` Source report: ${summary.holefree_R} products (counting unused limbs)`:` 出所の報告では ${summary.holefree_R} 積（使われないリムを含む数）`}</small>}</p>
   {summary.scope_of_no_holefree&&<details><summary>{en?'General-weight search: completed range and open cells':'一般の重みの探索：探索を終えた範囲と未完了の条件'}</summary>
    <p>{en?'No hole-free construction through this product count, only under the conditions below':'下の条件の範囲で穴なしが無いと確認した積数の上限'}: {summary.general_weight_no_holefree_upto??'—'}。{en?'Unfinished cells (products, A planes, B planes)':'未完了の条件（積数・A の面数・B の面数）'}: {summary.general_weight_open_cells?.map(c=>`(${c.join(', ')})`).join(' ')||'—'}</p>
    <p>{en?'Both operands use the selected value set; denominator 1; up to two limbs per side, at most four planes per side; fewer than half the residues are holes. m is a product of distinct primes, one at least 53 and the other at least 17, with m ≤ 7938. This is a bounded search result, not a lower bound for other families.':'両側とも選んだ値の集合、分母1、片側2リム以下・4面以下、穴は各側の剰余の半数未満。法は異なる2素数の積で、一方は53以上、他方は17以上、法は7938以下。この探索条件での結果であり、別の系列に対する下限ではありません。'}</p>
    <details><summary>{en?'Recorded search conditions':'記録された探索条件'}</summary><p>{summary.scope_of_no_holefree}</p></details>
   </details>}
  </div>}
 </details>;
}
