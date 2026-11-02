import {useEffect,useMemo,useState} from 'react';
import {read} from './catalog.ts';
import {bounded,useParameter} from './parameters.ts';
import {usePeriodicFormat} from './PeriodicFormat.tsx';
import {useLanguage} from './i18n.tsx';
import {familyRows,formLink,FP6_FAMILIES,reconstructionText,verificationReason,type FP6Periodic} from './fp6Periodic.ts';
export function FP6Families(){
 const {valueSet}=usePeriodicFormat(),en=useLanguage()==='en';
 const [data,setData]=useState<FP6Periodic>(),[error,setError]=useState('');
 const [family,setFamily]=useParameter('fp6_family','',s=>s in FP6_FAMILIES?s:'');
 const [modulus,setModulus]=useParameter('fp6_m','',s=>/^\d+$/.test(s)?s:'');
 const [holes,setHoles]=useParameter('fp6_holes',true,s=>s!=='0',v=>v?'1':'0');
 const [page,setPage]=useParameter('fp6_page',0,s=>Math.floor(bounded(s,0,10000,0)));
 useEffect(()=>{read<FP6Periodic>('visualization/fp6-periodic.json').then(setData).catch(e=>setError(String(e)));},[]);
 const rows=useMemo(()=>data?familyRows(data,valueSet,family,modulus,holes):[],[data,valueSet,family,modulus,holes]);
 const per=50,pages=Math.max(1,Math.ceil(rows.length/per)),current=Math.min(page,pages-1);
 const summary=data?.summaries.find(r=>r.value_set===valueSet&&String(r.m)===modulus);
 const name=(f:string)=>FP6_FAMILIES[f]?.[en?1:0]??f;
 return <details open data-section="fp6-families" className="fp6-families" data-no-i18n>
  <summary>{en?'FP6 constructions by family':'FP6 の系列ごとの構成'}</summary>
  <p>{en?'One representative per modulus, value set, family and product count, minimizing the larger hole count and then the sum. Every delivered family is retained. “Source report only” entries have not been reproduced by this site’s verifier and are excluded from the modulo spiral and component comparisons.':'法・値の集合・系列・積数ごとに、両側の穴の数の最大値、両側の合計の順に比較し、最少の構成を一つ載せます。受領したすべての系列を残しています。「出所の報告のみ」は、この頁の検算器で再現できていない行で、法の螺旋表示や成分との比較には含めません。'}</p>
  <div className="paper-controls">
   <label>{en?'Family':'系列'} <select aria-label="FP6 family" value={family} onChange={e=>{setFamily(e.target.value);setPage(0);}}><option value="">{en?'All':'すべて'}</option>{Object.keys(FP6_FAMILIES).map(f=><option key={f} value={f}>{name(f)}</option>)}</select></label>
   <label>{en?'Modulus':'法'} <input aria-label="FP6 modulus" inputMode="numeric" value={modulus} onChange={e=>{setModulus(e.target.value.replace(/\D/g,''));setPage(0);}}/></label>
   <label><input aria-label="FP6 include holes" type="checkbox" checked={holes} onChange={e=>{setHoles(e.target.checked);setPage(0);}}/>{en?'Include holes':'穴ありも含む'}</label>
   <span data-fp6-family-count={rows.length}>{rows.length} {en?'entries':'件'} · {valueSet}</span>
  </div>
  {error?<p role="alert">{error}</p>:!data?<p>{en?'Loading':'読み込み中'}</p>:<>
   <div className="paper-scroll"><table><thead><tr>{[en?'Modulus':'法',en?'Family':'系列',en?'Products':'積',en?'Planes A/B':'面 A/B',en?'Holes A/B':'穴 A/B',en?'Denominator':'分母',en?'Reconstruction':'復元',en?'Source / details':'出所・詳細'].map(t=><th key={t}>{t}</th>)}</tr></thead>
   <tbody>{rows.slice(current*per,current*per+per).map(r=><tr key={[r.m,r.value_set,r.family,r.R].join(':')} data-fp6-family-row={r.id} data-value-set={r.value_set} data-family={r.family} data-status={r.status}>
    <td>{r.m}<br/><small>{r.factor}</small></td><td>{name(r.family)}</td><td>{r.R}</td><td>{r.faces.join(' / ')}</td><td>{r.holes.join(' / ')}</td><td>{r.denominator}</td><td data-fp6-recon={r.recon}>{reconstructionText(r.recon,en)}</td>
    <td>{r.public_id?<a href={formLink(r,en?'en':'ja')}>{en?'Open construction':'構成を開く'}</a>:<span>{en?'Source report only':'出所の報告のみ'}</span>}<br/><small>{r.id}</small>{r.reason&&<details><summary>{en?'Verification status':'検算の状態'}</summary><p>{verificationReason(r.reason,en)}</p></details>}</td>
   </tr>)}</tbody></table></div>
   <div className="paper-controls"><button type="button" disabled={!current} onClick={()=>setPage(current-1)}>{en?'Previous':'前'}</button><span>{current+1} / {pages}</span><button type="button" disabled={current+1>=pages} onClick={()=>setPage(current+1)}>{en?'Next':'次'}</button></div>
  </>}
  {summary&&<div data-fp6-summary={summary.m}><p>{en?'Source collection: fewest hole-free products across families':'出所の収録範囲：すべての系列での穴なし最少積数'}: {summary.holefree_R??'—'} {summary.holefree_family&&`(${name(summary.holefree_family)})`}</p>
   {summary.scope_of_no_holefree&&<details><summary>{en?'General-weight search: completed range and open cells':'一般の重みの探索：探索を終えた範囲と未完了の条件'}</summary>
    <p>{en?'No hole-free construction through this product count, only under the conditions below':'下の条件の範囲で穴なしが無いと確認した積数の上限'}: {summary.general_weight_no_holefree_upto??'—'}。{en?'Unfinished cells (products, A planes, B planes)':'未完了の条件（積数・A の面数・B の面数）'}: {summary.general_weight_open_cells?.map(c=>`(${c.join(', ')})`).join(' ')||'—'}</p>
    <p>{en?'Both operands use the selected value set; denominator 1; up to two limbs per side, at most four planes per side; fewer than half the residues are holes. m is a product of distinct primes, one at least 53 and the other at least 17, with m ≤ 7938. This is a bounded search result, not a lower bound for other families.':'両側とも選んだ値の集合、分母1、片側2リム以下・4面以下、穴は各側の剰余の半数未満。法は異なる2素数の積で、一方は53以上、他方は17以上、法は7938以下。この探索条件での結果であり、別の系列に対する下限ではありません。'}</p>
    <details><summary>{en?'Recorded search conditions':'記録された探索条件'}</summary><p>{summary.scope_of_no_holefree}</p></details>
   </details>}
  </div>}
 </details>;
}
