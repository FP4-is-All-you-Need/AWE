import {useContext,useMemo,useId} from 'react';
import {MathText} from './PaperFigures.tsx';
import {CostContext} from './CostContext.tsx';
import {DimensionContext} from './Dimensions.tsx';
import {constructionCost} from './cost.ts';
import {useParameter,bounded} from './parameters.ts';
import {useLanguage} from './i18n.tsx';
import type {Lane} from './visual.ts';
export function ModulusSets({lanes,selected,onSelect}:{lanes:Lane[];selected:string;onSelect:(id:string)=>void}){
 const cost=useContext(CostContext),dims=useContext(DimensionContext);
 const [sort,setSort]=useParameter('modset_sort','products',r=>['products','planes','cost'].includes(r)?r:'products');
 const [page,setPage]=useParameter('modset_page',0,r=>Math.floor(bounded(r,0,10000,0)));
 const scored=useMemo(()=>lanes.map(lane=>{const terms=lane.mods.map(c=>constructionCost(c,dims,cost));return {lane,total:terms.every(t=>t.total!==null)?terms.reduce((n,t)=>n+t.total!,0):null};}).sort((a,b)=>(sort==='cost'?(a.total??Infinity)-(b.total??Infinity):sort==='planes'?a.lane.faces_a+(a.lane.faces_b??0)-b.lane.faces_a-(b.lane.faces_b??0):0)||a.lane.products-b.lane.products||a.lane.id.localeCompare(b.lane.id)),[lanes,sort,cost,dims.m,dims.n,dims.k]);
 const pages=Math.max(1,Math.ceil(scored.length/8)),current=Math.min(page,pages-1);
 return <details open data-section="modset-catalog" className="modset-catalog"><summary><span>法の組を選ぶ{' '}<span data-modset-count={lanes.length}>{lanes.length}件</span></span></summary>
 <form name="modset_selection" className="paper-controls" onSubmit={e=>e.preventDefault()}><label>法の組<select name="modset_id" value={selected} onChange={e=>onSelect(e.target.value)}><option value="">既定の組</option>{scored.map(({lane},i)=><option key={lane.id} value={lane.id}>{i+1}: {lane.bits} bit / {lane.mods.length}法 / {lane.products}積 / K {lane.plan_k}{lane.usage?' · '+(lane.usage.some(e=>e.state==='measured')?'測定で使用':lane.usage.some(e=>e.state==='build_only')?'コンパイル済・実行未確認':'未確認'):''}</option>)}</select></label><label>並べ替え<select name="modset_sort" value={sort} onChange={e=>{setSort(e.target.value);setPage(0);}}><option value="products">積数順</option><option value="planes">面数順</option><option value="cost">総費用順</option></select></label>
 <button name="modset_previous" type="button" disabled={!current} onClick={()=>setPage(current-1)}>前</button><label>ページ<input name="modset_page" type="number" min="1" max={pages} value={current+1} data-url-offset="-1" onChange={e=>{const n=Number(e.target.value);if(Number.isInteger(n)&&n>=1&&n<=pages)setPage(n-1);}}/></label><span>/ {pages}</span><button name="modset_next" type="button" disabled={current+1>=pages} onClick={()=>setPage(current+1)}>次</button></form>
 <div data-modset-list>
 {scored.slice(current*8,current*8+8).map(({lane,total})=><section key={lane.id} data-saved-modset={lane.id} className="saved-modset"><button name="modset_choice" form="visual-actions" type="button" value={lane.id} aria-pressed={selected===lane.id} onClick={()=>onSelect(lane.id)}>{lane.bits} bit / {lane.mods.length}法・{lane.products}積・面 A {lane.faces_a} / B {lane.faces_b} <MathText tex={`K\\le ${lane.k_max}`}/></button>
 {lane.usage&&<p data-set-usage>{lane.usage.some(e=>e.state==='measured')?'測定で使用':lane.usage.some(e=>e.state==='build_only')?'コンパイル済・実行未確認':'未確認'}</p>}<ModsetWeights lane={lane}/>{sort==='cost'&&<p>総費用 {String(total??'未設定')}</p>}</section>)}
 {!scored.length&&<p>未収録</p>}</div></details>;
}

function ModsetWeights({lane}:{lane:Lane}){
 const en=useLanguage()==='en',id=useId();
 const [expanded,setExpanded]=useParameter('modset_expand.'+lane.id,false,r=>r==='1',v=>v?'1':'0');
 return <div className="modset-text-row" data-expanded={expanded}>
  <div id={id} className="modset-weights">{lane.mods.map((c,i)=><span key={i}><MathText tex={`\\operatorname{mod}\\;${c.modulus}`}/>{' '}<MathText tex={`w_A=(${c.weights.A}),\\;w_B=(${c.weights.B})`}/></span>)}</div>
  <button type="button" name="modset_expand" value={lane.id} aria-expanded={expanded} aria-controls={id} onClick={()=>setExpanded(!expanded)}>{expanded?(en?'Less':'閉じる'):(en?'More':'続き')}</button>
 </div>;
}
