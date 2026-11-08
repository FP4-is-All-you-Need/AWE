import {MoleculeDetail} from './MoleculeDetail.tsx';
import {reconstructionText} from './fp6Periodic.ts';
import {useEffect,useMemo,useState} from 'react';
import {ModulusRibbon,type StarSize} from './ModulusRibbon.tsx';
import {bounded,useParameter} from './parameters.ts';
import {read} from './catalog.ts';
import {useLanguage} from './i18n.tsx';
import {usePeriodicFormat} from './PeriodicFormat.tsx';
import {PrimeFactors as FactorBadges} from './PrimeFactors.tsx';
import {ModulusCostTable} from './ModulusCostTable.tsx';
import {SpiralDetail} from './PolarFormDetail.tsx';
import {SideLayout} from './SideLayout.tsx';
import {factorText,type FormSolution} from './modularForms.ts';
import type {ModularSolution} from './modular.ts';
import {withoutUnusedLimbs} from './unusedLimbs.ts';
import {factors} from './visual.ts';
import {accumulator,cheapest,COEFFICIENTS,componentComparison,cost,costOrder,DEFAULT_COEFFICIENTS,dominance,formKind,groupRows,kind,pick,productPlaneOptions,type Coefficients,type PolarCatalog,type PolarRow} from './polarModel.ts';
import './polar-periodic.css';
const fmt=(n:number|null|undefined,d=3)=>n==null||!Number.isFinite(n)?'—':n.toLocaleString(undefined,{maximumFractionDigits:d});
const SUP:Record<string,string>={'0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹'};
/** Short: "w³,w⁴≡0 · 面の法 7·49" for the ribbon and the candidate list; long: one sentence for the selected construction. */
function kindText(r:PolarRow,planeModuli:number[]|null|undefined,en:boolean,short:boolean){
 const k=formKind(r,planeModuli),parts:string[]=[];
 if(k.vanishing.length)parts.push(k.vanishing.map(i=>'w'+String(i).split('').map(d=>SUP[d]).join('')).join(',')+'≡0'+(short?'':` (mod ${r.m}, w = ${k.w})`));
 if(k.folded?.length)parts.push((en?'plane moduli ':'面の法 ')+k.folded.join('·')+(short?'':en?` (below ${r.m}: folded planes)`:`（法 ${r.m} より小さい面の法：面の折り返し）`));
 if(!short&&!parts.length&&k.folded)parts.push(en?`every plane modulus is ${r.m} (no folding)`:`面の法はすべて ${r.m}（折り返しなし）`);
 if(!short&&k.folded===null)parts.push(en?'plane moduli not recorded':'面の法の記録なし');
 return parts.join(' · ');
}
function CoefficientControls({s,onChange,en}:{s:Coefficients;onChange:(s:Coefficients)=>void;en:boolean}){
 return <details className="polar-coefficients"><summary>{en?'Cost coefficients':'費用の係数'}</summary><div className="polar-sliders">{COEFFICIENTS.map(([key,ja,eng,min,max,step])=><label key={key}>{en?eng:ja}<output>{fmt(s[key])}</output><input aria-label={en?eng:ja} type="range" min={min} max={max} step={step} value={s[key]} onChange={e=>onChange({...s,[key]:Number(e.target.value)})}/></label>)}</div><div className="paper-controls"><label>{en?'Accumulator':'累積器'} <select value={s.lim} onChange={e=>onChange({...s,lim:e.target.value as 'f'|'i'})}><option value="f">FP32</option><option value="i">INT32</option></select></label><label>K <select value={s.K} onChange={e=>onChange({...s,K:Number(e.target.value)})}>{[4096,8192,16384].map((k,i)=><option key={k} value={i}>{k}</option>)}</select></label><label>{en?'Input bits':'入力 bit'} <select value={s.b} onChange={e=>onChange({...s,b:Number(e.target.value)})}>{[8,12,16,53].map((b,i)=><option key={b} value={i}>{b}</option>)}</select></label><label>{en?'Correction':'補正'} <select value={s.pay} onChange={e=>onChange({...s,pay:e.target.value as Coefficients['pay']})}><option value="min">{en?'Lower modeled cost':'費用の小さい方'}</option><option value="kap">{en?'Hole correction':'穴の補正'}</option><option value="shift">{en?'Shift if available':'ずらしが使える時は使う'}</option></select></label><button type="button" onClick={()=>onChange({...DEFAULT_COEFFICIENTS})}>{en?'Reset coefficients':'係数を戻す'}</button></div><p>{en?'Illustrative cost model, not measured runtime. Encoding counts are estimates. FP6/FP4 is a provisional time ratio. The tables share these coefficients; they are separate from the matrix-size cost settings above.':'費用の模型です。実行時間の測定ではありません。符号化は手数の見積もり、FP6 / FP4 は仮の時間比です。この係数は下の表で共有し、上の行列サイズごとの費用設定とは別に扱います。'}</p></details>;
}
function MoleculeTable({rows,s,setS,en,onOpen}:{rows:PolarRow[];s:Coefficients;setS:(s:Coefficients)=>void;en:boolean;onOpen:()=>void}){
 const [open,setOpen]=useState(false),[holes,setHoles]=useState(false),[less,setLess]=useState(false),[page,setPage]=useState(0),[filter,setFilter]=useState('');
 const [pageSize,setPageSize]=useParameter('molecule_page_size',15,v=>Math.floor(bounded(v,1,100,15)));
 const [selected,setSelected]=useParameter('molecule_modulus',0,v=>Math.floor(bounded(v,0,65536,0)));
 const select=(m:number)=>{setSelected(m);requestAnimationFrame(()=>{const d=document.querySelector<HTMLDetailsElement>(`[data-molecule-detail="${m}"]`);if(d){d.open=true;d.scrollIntoView({block:'nearest'});}});};
 const groups=useMemo(()=>groupRows(rows.filter(r=>r.inCatalog&&(holes||(!r.hA&&!r.hB)))),[rows,holes]);
 const list=useMemo(()=>open?[...groups.keys()].filter(m=>kind(m)==='composite'&&(!filter||String(m).includes(filter)||factors(m).some(f=>String(f.prime)===filter))).map(m=>({m,...componentComparison(m,groups,s)})).filter(r=>!less||(r.saving??0)>0).sort((a,b)=>(b.saving??-Infinity)-(a.saving??-Infinity)||a.m-b.m):[],[groups,open,s,less,filter]);
 const pages=Math.max(1,Math.ceil(list.length/pageSize)),current=Math.min(page,pages-1);
 return <details data-section="composite-table" data-no-i18n className="molecule-table" onToggle={e=>{const v=e.currentTarget.open;setOpen(v);if(v)onOpen();}}><summary>{en?'Composite moduli':'分子の表'}</summary>
 <p>{en?'Compare a combined construction with separate constructions for its coprime prime-power factors. Minima are over the verified published entries in the catalog, with the same format and hole filter. Missing components leave the sum unknown. CRT reconstruction and its costs are not included.':'互いに素な素数べきごとに組む場合と、まとめて組む場合を比べます。最少は、同じ値の集合と穴の条件で、検算済みの公開構成のうち目録と照合できた範囲です。成分が未収録なら和は未確認です。CRT の復元とその費用は含みません。'}</p>
 <div className="paper-controls"><label><input type="checkbox" checked={holes} onChange={e=>{setHoles(e.target.checked);setPage(0);}}/>{en?'Include holes':'穴ありも含む'}</label><label><input type="checkbox" checked={less} onChange={e=>{setLess(e.target.checked);setPage(0);}}/>{en?'Fewer products only':'和より積が少ない法だけ'}</label><label>{en?'Modulus / prime':'法・素数'} <input value={filter} onChange={e=>{setFilter(e.target.value);setPage(0);}} inputMode="numeric"/></label><label>{en?'Per page':'一ページの件数'} <input aria-label="molecule page size" className="molecule-page-size" type="number" min="1" max="100" value={pageSize} onChange={e=>{const n=Number(e.target.value);if(Number.isInteger(n)&&n>=1&&n<=100){setPageSize(n);setPage(0);}}}/></label><span>{list.length} {en?'moduli':'法'}</span></div>
 <CoefficientControls s={s} onChange={setS} en={en}/>
 {!rows.length?<p>{en?'Loading':'読み込み中'}</p>:<><div className="polar-table-scroll"><table><thead><tr>{[en?'Modulus':'法',en?'Components':'素数べき',en?'Combined products':'まとめた積',en?'CRT products':'成分の積の和',en?'Fewer by':'積の削減数',en?'Cost / bit':'費用 / bit',en?'CRT cost / bit':'成分の費用の和 / bit',en?'Holes A / B':'穴 A / B'].map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{list.slice(current*pageSize,current*pageSize+pageSize).map(r=><tr key={r.m} data-composite={r.m} data-selected={selected===r.m} onClick={()=>select(r.m)} data-saves-products={(r.saving??0)>0}><td><button type="button" className="molecule-select" aria-pressed={selected===r.m} onClick={e=>{e.stopPropagation();select(r.m);}}>{r.m}</button></td><td><FactorBadges m={r.m}/></td><td title={r.best?.id}>{r.best?.R??'—'}</td><td title={r.parts.map(p=>p?`${p.m}: ${p.R}`:'?').join(' + ')}>{r.sum??'—'} <small>{r.parts.map(p=>p?.R??'?').join(' + ')}</small></td><td>{r.saving!==null&&r.saving!==undefined&&r.saving>0?r.saving:'—'}</td><td title={r.combined?.id}>{fmt(r.cost===null?null:r.cost/Math.log2(r.m))}</td><td>{fmt(r.sumCost===null?null:r.sumCost/Math.log2(r.m))}</td><td>{r.best?`${r.best.hA} / ${r.best.hB}${r.best.exact?'':'*'}`:'—'}</td></tr>)}</tbody></table></div>{selected>0&&groups.has(selected)&&kind(selected)==='composite'&&<MoleculeDetail key={selected} m={selected} groups={groups} s={s} en={en}/>}<div className="paper-controls"><button type="button" disabled={!current} onClick={()=>setPage(current-1)}>{en?'Previous':'前'}</button><span>{current+1} / {pages}</span><button type="button" disabled={current+1>=pages} onClick={()=>setPage(current+1)}>{en?'Next':'次'}</button></div><p>{en?'Product counts and costs are minimized separately. The cost-minimizing construction may have more products. With holes enabled, different constructions can have different hole counts. * is an upper bound.':'積と費用は別々に最少を選びます。費用が最少の形は、積が最少の形と違う場合があります。穴ありを含めると、穴の数が異なる構成も比べます。* は穴の上限です。'}</p></>}
 </details>;
}
function PolarView({rows,s,setS,en,onOpen}:{rows:PolarRow[];s:Coefficients;setS:(s:Coefficients)=>void;en:boolean;onOpen:()=>void}){
 const [open,setOpen]=useState(false),[allCandidates,setAllCandidates]=useState(false);
 // The construction picked in the candidate list or on a ribbon option; empty means the ribbon's own choice.
 const [inspect,setInspect]=useParameter('polar_form','',v=>/^[a-z0-9]+_[0-9a-f]{16,64}$/.test(v)?v:'');
 const [sizeMetric,setSizeMetric]=useParameter<StarSize>('polar_size','products',v=>['cost','products','products_per_bit','constant'].includes(v)?v as StarSize:'products');
 const [holeLimit,setHoleLimit]=useParameter('polar_holes',0,v=>bounded(v,0,100,0));
 const [selected,setSelected]=useParameter('polar_modulus',13,v=>Math.round(bounded(v,2,65536,13)));
 const groups=useMemo(()=>groupRows(rows.filter(r=>Math.max(r.hA,r.hB)/r.m<=holeLimit/100)),[rows,holeLimit]);
 const costs=useMemo(()=>new Map(rows.map(r=>[r.id,cost(r,s)])),[rows,s]);
 const chosen=useMemo(()=>new Map([...groups].map(([m,rs])=>[m,pick(rs,s,sizeMetric==='products'||sizeMetric==='products_per_bit'?'products':'cost')??pick(rs,s,'products')])),[groups,s,sizeMetric]);
 const candidates=useMemo(()=>groups.get(selected)??[],[groups,selected]);const dominated=useMemo(()=>dominance(candidates,s),[candidates,s]);
 // The list, the zoomed bands and the detail under the spiral all show `active`: the picked construction, or by default
 // the cheapest undominated one.
 const ordered=useMemo(()=>[...candidates].sort(costOrder(s)),[candidates,s]);
 const active=ordered.find(r=>r.id===inspect)??cheapest(candidates,s),comparison=componentComparison(selected,groups,s);
 const select=(m:number)=>{setSelected(m);setInspect('');};
 // Plane moduli of the selected modulus's candidates, read from their source files (folded planes need them) and counted
 // without unused limbs like the index.
 const [planeModuli,setPlaneModuli]=useState(new Map<string,number[]|null>());
 useEffect(()=>{let alive=true;setPlaneModuli(new Map());const ids=new Set(candidates.map(r=>r.id));
  Promise.all([...new Set(candidates.map(r=>r.source))].map(p=>read<{solutions?:(FormSolution|ModularSolution)[]}>(p).catch(()=>null))).then(files=>{if(!alive)return;
   const found=new Map<string,number[]|null>();
   for(const f of files)for(const raw of f?.solutions??[])if(ids.has(raw.id)){const v=withoutUnusedLimbs(raw);found.set(v.id,v.plane_moduli?[...v.plane_moduli.A,...v.plane_moduli.B]:null);}
   setPlaneModuli(found);});
  return()=>{alive=false;};},[candidates]);
 // Zoomed ribbon: one option per (products, planes) pair that no other construction beats in both; the selected modulus
 // shows the picked construction in its pair and names what makes each option fit the modulus.
 const options=useMemo(()=>new Map([...groups].map(([m,rs])=>[m,productPlaneOptions(rs,s,chosen.get(m))])),[groups,s,chosen]);
 const ribbonOptions=useMemo(()=>new Map([...options].filter(([,o])=>o.length>1).map(([m,o])=>[m,o.map(x=>{const r=m===selected&&active&&active.R===x.R&&active.FA+active.FB===x.F?active:x.shown;
  return {id:r.id,R:r.R,FA:r.FA,FB:r.FB,count:x.rows.length,active:m===selected&&r===active,tag:m===selected?kindText(r,planeModuli.get(r.id),en,true):''};})])),[options,selected,active,planeModuli,en]);
 const tip=(m:number)=>{const r=chosen.get(m);return [`${en?'Modulus':'法'} ${m} = ${factorText(m)}`,`bit = log2(${m}) = ${fmt(Math.log2(m),6)}`,...r?[`id: ${r.id}`,`${en?'Products':'積'} ${r.R} · ${en?'Planes':'面'} A / B ${r.FA} / ${r.FB}`,`${en?'Holes':'穴'} A / B ${r.hA} / ${r.hB}${r.exact?'':'*'}`,`${en?'Accumulators':'累積器'} ${fmt(accumulator(r,s))} · K ${[4096,8192,16384][s.K]}`,`${en?'Cost / bit':'費用 / bit'} ${fmt(costs.get(r.id)==null?null:costs.get(r.id)!/Math.log2(m))}`]:[en?'No published construction under this value-set and hole filter; this is not a nonexistence result.':'この値の集合・穴の条件では公開構成が未収録です。不存在の結論ではありません。']].join('\n');};
 const savings=useMemo(()=>new Map([...groups.keys()].filter(m=>kind(m)==='composite').map(m=>[m,componentComparison(m,groups,s).saving])),[groups,s]);
 return <details data-section="polar-periodic" className="polar-periodic" data-no-i18n onToggle={e=>{const v=e.currentTarget.open;setOpen(v);if(v)onOpen();}}><summary>{en?'Modulo spiral':'法の螺旋表示'}</summary>
 <div className="paper-controls"><label>{en?'Holes ≤':'穴 ≤'} <input aria-label="polar holes percent" type="number" min="0" max="100" step="1" value={holeLimit} onChange={e=>setHoleLimit(Math.min(100,Math.max(0,Number(e.target.value))))}/>%</label></div>
 <CoefficientControls s={s} onChange={setS} en={en}/>
 <SideLayout name="polar" className="polar-layout" en={en}><ModulusRibbon chosen={chosen} costs={costs} savings={savings} selected={selected} onSelect={select} tip={tip} en={en} sizeMetric={sizeMetric} setSizeMetric={setSizeMetric} options={ribbonOptions} onSelectForm={(m,id)=>{setSelected(m);setInspect(id);}} detail={<SpiralDetail m={selected} row={active} groups={groups} s={s} en={en}/>}/>
 <aside className="polar-detail"><label>{en?'Modulus':'法'} <input aria-label="polar selected modulus" type="number" min="2" max="65536" value={selected} onChange={e=>{const m=Number(e.target.value);if(Number.isInteger(m)&&m>=2&&m<=65536)select(m);}}/></label><h3>{selected} = {factorText(selected)}</h3><FactorBadges m={selected} onSelect={select}/><p>{en?'bits':'bit'} = log2({selected}) = {fmt(Math.log2(selected),6)}</p>
 {active?<><p>{en?'Selected construction':'表示中の形'} · {active.vs}</p><dl><dt>{en?'Products':'積'}</dt><dd>{active.R} ({fmt(active.R/Math.log2(selected))} / bit)</dd><dt>{en?'Cost / bit':'費用 / bit'}</dt><dd>{fmt(costs.get(active.id)==null?null:costs.get(active.id)!/Math.log2(selected))}</dd><dt>{en?'Planes A / B':'面 A / B'}</dt><dd>{active.FA} / {active.FB}</dd>{kindText(active,planeModuli.get(active.id),en,false)&&<><dt>{en?'Fit to the modulus':'法への合わせ方'}</dt><dd data-polar-form-kind>{kindText(active,planeModuli.get(active.id),en,false)}</dd></>}<dt>{en?'Holes A / B':'穴 A / B'}</dt><dd>{active.hA} / {active.hB}{active.exact?'':en?' (upper bound)':' (上限)'}</dd><dt>{en?'Accumulators':'累積器'}</dt><dd>{fmt(accumulator(active,s))} · K {[4096,8192,16384][s.K]}</dd><dt>{en?'Weights A':'重み A'}</dt><dd>{active.weights.A.join(', ')}</dd><dt>{en?'Weights B':'重み B'}</dt><dd>{active.weights.B.join(', ')}</dd></dl><p className="polar-id">id: {active.id}</p><a href={import.meta.env.BASE_URL+active.source}>{en?'Source data':'元のデータ'}</a>{!active.model&&<p>{en?'Cost metadata has not been matched for this representation.':'この書き方の費用データは未確認です。'}</p>}</>:<p>{en?'No published construction under the selected value set and hole filter. This does not establish nonexistence.':'選んだ値の集合と穴の条件では公開構成が未収録です。不存在を示すものではありません。'}</p>}
 {comparison.components.length>1&&<p>{en?'Component products':'成分の積'}: {comparison.parts.map(r=>r?.R??'?').join(' + ')} = {comparison.sum??'—'} · {en?'Combined minimum':'まとめた最少'}: {comparison.best?.R??'—'} · {en?'Fewer by':'積の削減数'}: {comparison.saving??'—'}<br/>{en?'Component cost / bit':'成分の費用の和 / bit'}: {fmt(comparison.sumCost===null?null:comparison.sumCost/Math.log2(selected))}</p>}
 {active?.recon&&<p data-polar-reconstruction>{en?'Denominator':'分母'}: {active.denominator} · {en?'Reconstruction':'復元'}: {reconstructionText(active.recon,en)}</p>}
 <h4>{en?'Candidates':'候補'} ({candidates.length})</h4><label><input type="checkbox" checked={allCandidates} onChange={e=>setAllCandidates(e.target.checked)}/>{en?'Include dominated candidates':'ほかの形に支配される候補も表示'}</label><p>{en?'Dominance uses ten cost measures within each checked value set. Unknown costs remain visible.':'支配の判定は、同じ値の集合の中の 10 項目で比べます。費用未確認の候補も残します。'}</p><div className="polar-candidates">{ordered.filter(r=>allCandidates||!dominated.has(r.id)).map(r=><button key={r.id} type="button" className={r.id===active?.id?'selected':''} title={r.id+(dominated.has(r.id)?' → '+dominated.get(r.id):'')} onClick={()=>setInspect(r.id)}>{r.R}{en?' products':' 積'} · {r.FA}/{r.FB}{en?' planes':' 面'}{kindText(r,planeModuli.get(r.id),en,true)?' · '+kindText(r,planeModuli.get(r.id),en,true):''} · {fmt(costs.get(r.id)==null?null:costs.get(r.id)!/Math.log2(selected))} / bit · {r.hA}/{r.hB} · {r.vs}</button>)}</div>
 </aside></SideLayout>
 </details>;
}
export function PeriodicViews(){
 const en=useLanguage()==='en',{tab,valueSet}=usePeriodicFormat(),[needed,setNeeded]=useState(false),[data,setData]=useState<PolarCatalog>(),[error,setError]=useState(''),[s,setS]=useState({...DEFAULT_COEFFICIENTS});
 useEffect(()=>{if(needed&&!data)read<PolarCatalog>('visualization/polar-catalog.json').then(setData).catch(e=>setError(String(e)));},[needed,data]);
 useEffect(()=>{const name=new URLSearchParams(location.search).get('section');if(name!=='polar-periodic'&&name!=='composite-table'&&name!=='modulus-cost')return;const node=document.querySelector<HTMLDetailsElement>('[data-section="'+name+'"]');if(!node)return;node.open=true;setNeeded(true);const timer=setTimeout(()=>node.scrollIntoView({block:'start'}),250);return()=>clearTimeout(timer);},[data]);
 const rows=useMemo(()=>data?.rows.filter(r=>r.m>=2&&r.m<=65536&&r.vs===valueSet)??[],[data,valueSet]);
 return <div data-no-i18n className="periodic-views"><div className="paper-controls"><strong>{tab.toUpperCase()} · {valueSet}</strong><span>{en?'The following views use the format at the top.':'以下の表は最上部の形式に切り替わります。'}</span></div>{error&&<p role="alert">{error}</p>}<ModulusCostTable rows={rows} s={s} en={en} onOpen={()=>setNeeded(true)}><CoefficientControls s={s} onChange={setS} en={en}/></ModulusCostTable><MoleculeTable rows={rows} s={s} setS={setS} en={en} onOpen={()=>setNeeded(true)}/><PolarView rows={rows} s={s} setS={setS} en={en} onOpen={()=>setNeeded(true)}/></div>;
}
