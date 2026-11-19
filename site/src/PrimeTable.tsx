import {usePeriodicFormat} from './PeriodicFormat.tsx';
import {FP6Families} from './FP6Families.tsx';
import {useEffect,useId,useMemo,useState} from 'react';
import {LawRow,MathText} from './PaperFigures.tsx';
import {Expansion} from './Expansion.tsx';
import {miniWeightStyle,textInk,whiteFill} from './compact.ts';
import {PRODUCT_BANDS,productBand} from './ribbonColors.ts';
import {connect,pool,type Construction,type Lane,type VisualCatalog} from './visual.ts';
import {mergeModularCatalogs,type ModularCatalog} from './modular.ts';
import {read} from './catalog.ts';
import {useParameter} from './parameters.ts';
import {useLanguage} from './i18n.tsx';
import {useMeasuredWidth} from './useMeasuredWidth.ts';
import {formCells,fp4Fewest,pendingSource,primeTableData,weightVariants,type FormCell,type PrimeForm,type PrimeSet} from './primeTable.ts';
import './prime-table.css';

const SET_LABEL:Record<string,string>={'2xE2M1':'FP4 (2×E2M1)','8xE2M3':'FP6 (8×E2M3)','16xE3M2':'FP6 (16×E3M2)'};
/** The single constructions of a modulus in the catalog: value set, holes, products and planes. */
function FormRows({cell,en}:{cell:FormCell;en:boolean}){
 const t=(ja:string,english:string)=>en?english:ja;
 if(!cell.entries.some(f=>f.kind!=='excluded'))return null;
 return <div className="prime-forms" data-prime-forms-detail>
  <h4>{t('単独の法の構成','Single modular constructions')}</h4>
  <table><thead><tr><th>{t('値の集合','Value set')}</th><th>{t('穴','Holes')}</th><th>{t('積','Products')}</th><th>{t('面 A / B','Planes A / B')}</th></tr></thead>
  <tbody>{cell.entries.filter(f=>f.kind!=='excluded').map(f=><tr key={f.kind+f.id} data-prime-form={f.id} data-kind={f.kind}><td>{SET_LABEL[f.value_set]??f.value_set}</td>
   <td>{f.holes&&(f.holes.A||f.holes.B)?`${f.holes.A} / ${f.holes.B}${f.holes.exact?'':t('(上限)',' (upper bound)')}`:t('なし','none')}</td>
   <td>{f.products}</td><td>{f.planes[0]} / {f.planes[1]}</td></tr>)}</tbody></table>
 </div>;
}
/** FP4's fewest products per prime-power modulus (the same saved catalogs as the FP4 page, without FP6 sets), for the FP6 marks only. */
function useFP4Fewest(enabled:boolean){
 const [fewest,setFewest]=useState<Map<number,number>>(),[error,setError]=useState('');
 useEffect(()=>{if(!enabled||fewest)return;let alive=true;
  Promise.all([read<VisualCatalog>('visualization/modsets.json'),read<{prime_powers:PrimeForm[]}>('modular/forms-index.json'),Promise.all(['catalog','powers','fp32','fp32-history'].map(n=>read<ModularCatalog>(`modular/${n}.json`)))])
   .then(([saved,index,parts])=>{if(!alive)return;const c=mergeModularCatalogs(parts);setFewest(fp4Fewest(pool(connect(saved,c),c),index.prime_powers));})
   .catch(e=>{if(alive)setError(e instanceof Error?e.message:String(e));});
  return()=>{alive=false;};},[enabled,fewest]);
 return {fewest,error};
}

/** onInspect is told the modulus whose cards and details are shown, so that constructions known only by their row can be read in full. */
export function PrimeTable({records,lane,selectedConstruction,sets=[],comparisonLanes=[],forms,onInspect}:{records:Construction[];lane?:Lane;selectedConstruction?:Construction;sets?:PrimeSet[];comparisonLanes?:Lane[];forms?:PrimeForm[];onInspect?:(modulus:number)=>void}){
 const en=useLanguage()==='en',[openedModulus,setOpenedModulus]=useState<number|null>(null),[openedId,setOpenedId]=useState('');
 const glowId='prime-selected-'+useId().replace(/[^a-zA-Z0-9_-]/g,'');
 const all=useMemo(()=>[...new Map([...records,...(lane?.mods??[])].map(c=>[c.id,c])).values()],[records,lane]);
 const {tab,setTab,valueSet}=usePeriodicFormat();
 const [withForms,setWithForms]=useParameter('prime_forms',true,r=>r!=='0',v=>v?'1':'0');
 const [withHoles,setWithHoles]=useParameter('prime_holes',true,r=>r!=='0',v=>v?'1':'0');
 const saved=useMemo(()=>primeTableData(all,sets).byModulus,[all,sets]);
 // The FP6 page shows its own value set only; its fewer and FP6-only marks compare with FP4, so they wait for the FP4 minima.
 const fp4=useFP4Fewest(tab==='fp6'&&!!forms&&withForms);
 const formsBy=useMemo(()=>forms&&withForms&&(tab==='fp4'||fp4.fewest)?formCells(forms.filter(f=>f.value_set===valueSet),tab,withHoles,saved,fp4.fewest):new Map<number,FormCell>(),[forms,withForms,tab,withHoles,saved,valueSet,fp4.fewest]);
 const table=useMemo(()=>primeTableData(all,sets,formsBy,tab==='fp6'),[all,sets,formsBy,tab]),measured=useMeasuredWidth();
 const shownForm=(m:number)=>{const f=formsBy.get(m);return f&&(f.hole_free||f.holes)?f:undefined;};
 const formTitle=(m:number)=>{const f=shownForm(m);if(!f)return '';const b=f.hole_free??f.holes!;return ` · ${en?'single construction':'単独の法の構成'} ${b.products}${en?' products':'積'}${f.hole_free?'':en?' (holes)':'(穴あり)'}`;};
 // The product count does not fit the square cell beside its marks, so writing it makes every cell one line taller.
 const [counts,setCounts]=useParameter('prime_counts',false,r=>r==='1',v=>v?'1':'0');
 // Fewest products among the constructions a cell shows; it sets the cell's fill.
 const products=(m:number)=>{const n=[...(table.byModulus.get(m)??[]).map(c=>c.products.length),...[shownForm(m)].flatMap(f=>f?[(f.hole_free??f.holes)!.products]:[])];return n.length?Math.min(...n):null;};
 const fp=tab==='fp6'?'FP6':'FP4';
 const used=new Set(lane?.mods.map(c=>c.id)??[]),usedModuli=new Set(lane?.moduli??[]);
 const [compareId,setCompareId]=useParameter('prime_compare','auto',r=>r);
 const choices=[...new Map(comparisonLanes.map(l=>[l.id,l])).values()].sort((a,b)=>(a.bits??0)-(b.bits??0)||a.products-b.products||a.id.localeCompare(b.id));
 const different=(l:Lane)=>l.moduli.length!==usedModuli.size||l.moduli.some(m=>!usedModuli.has(m));
 const comparison=compareId==='none'?undefined:choices.find(l=>l.id===compareId)??choices.find(l=>l.bits===lane?.bits&&different(l))??choices.find(different)??choices[0];
 const compared=new Set(comparison?.moduli??[]);
 const shownModulus=openedModulus??selectedConstruction?.modulus??lane?.moduli[0];
 const variants=table.byModulus.get(shownModulus??0)??all.filter(c=>c.modulus===shownModulus);
 const inspected=variants.find(c=>c.id===openedId)??variants.find(c=>used.has(c.id))??variants[0];
 useEffect(()=>{if(shownModulus!==undefined)onInspect?.(shownModulus);},[shownModulus,onInspect]);
 // Cards and details wait until every construction of the modulus is read in full.
 const waiting=variants.some(c=>pendingSource(c)!==undefined);
 const cells=table.columns.flatMap(c=>c.powers),shown=new Set(cells.map(p=>p.modulus));
 const other=lane?.moduli.filter(m=>!shown.has(m))??[];
 const otherCompared=comparison?.moduli.filter(m=>!shown.has(m))??[];
 const minima=table.columns.map(c=>Math.max(60,Math.max(...c.powers.map(p=>String(p.modulus).length))*8+3));
 // Cells keep their width whatever the number of columns; a table wider than the page scrolls.
 const widths=minima,lefts=widths.map((_,i)=>4+widths.slice(0,i).reduce((a,b)=>a+b,0));
 const square=60,row=counts?square+14:square,width=widths.reduce((a,b)=>a+b,0)+8,height=Math.max(...cells.map(p=>p.exponent))*row+8;
 const usage=openedModulus===null?[]:table.usedIn.get(openedModulus)??[];
 const groups=weightVariants(variants);
 const cardLeft=Math.max(0,...table.columns.flatMap((c,i)=>c.powers.filter(p=>p.exponent>1).map(()=>lefts[i]+widths[i])))+16;
 const cardTop=row+16,cardWidth=Math.min(width,measured.width)-cardLeft-12;
 const inline=measured.width>=720&&cardWidth>=240;
 const cards=<div className="prime-weight-cards" data-prime-cards={shownModulus} data-inline={inline} style={inline?{position:'absolute',left:cardLeft,top:cardTop,width:cardWidth,maxHeight:height-cardTop-8}:undefined}>
  {waiting?<p data-prime-cards-loading>{en?'Loading':'読み込み中'}</p>:groups.map(v=>{const c=v.items.find(c=>c.id===inspected?.id)??v.items.find(c=>used.has(c.id))??v.items[0];const item:Lane={id:c.id,lane:'candidate',selection_kind:'candidate',tag:'candidate',moduli:[c.modulus],mods:[c],products:c.products.length,faces_a:c.faces_a,faces_b:c.faces_b,k_max:'0'};
   return <div className="prime-weight-card" key={v.key} data-prime-weight-card={v.key} data-used={v.items.some(c=>used.has(c.id))} data-focused={v.items.some(c=>c.id===inspected?.id)}>
    <LawRow lane={item} selectionRole="focus" selected={v.items.some(c=>c.id===inspected?.id)?0:-1} onSelect={()=>{setOpenedModulus(c.modulus);setOpenedId(c.id);}}/>
    {v.items.some(c=>used.has(c.id))&&<span className="prime-card-used" title={en?'Selected: in the current set':'選択中：今の組で使用'} aria-label={en?'In the selected set':'選択中の組'}>✓</span>}
   </div>;
  })}
 </div>;
 const open=(modulus:number)=>{setOpenedModulus(modulus);setOpenedId('');};
 return <details data-section="prime-table" className="prime-table" open>
  <summary>{en?`${fp} periodic table`:`${fp} の周期表`}</summary>
  <p className="prime-intro">{tab==='fp6'?(en?'Prime moduli and their powers, using only constructions checked on the selected FP6 value set.':'素数とそのべきを法に使う構成です。選んだ FP6 の値の集合で検算した構成だけを出します。'):(en?'FP4 constructions for prime moduli and their powers.':'素数とその冪を法に使うFP4の構成。')}</p>
  {!!forms&&<form name="prime_layers" className="prime-layer-controls" onSubmit={e=>e.preventDefault()}>
   <label>{en?'Value set':'値の集合'} <select name="prime_set" value={tab} onChange={e=>setTab(e.target.value==='fp6'?'fp6':'fp4')}><option value="fp4">FP4 (2×E2M1)</option><option value="fp6">{tab==='fp6'?SET_LABEL[valueSet]??'FP6':'FP6'}</option></select></label>
   <label><input type="checkbox" name="prime_forms" checked={withForms} onChange={e=>setWithForms(e.target.checked)}/>{en?'Show single modular constructions':'単独の法の構成を出す'}</label>
   <label><input type="checkbox" name="prime_holes" checked={withHoles} disabled={!withForms} onChange={e=>setWithHoles(e.target.checked)}/>{en?'Include constructions with holes':'穴のある構成も出す'}</label>
   <label><input type="checkbox" name="prime_counts" checked={counts} onChange={e=>setCounts(e.target.checked)}/>{en?'Write product counts (taller cells)':'積の数を書く(マスを縦に伸ばす)'}</label>
  </form>}
  <div className="prime-table-legend"><span>{en?'Prime bases':'素数'}: 2–{table.primeMax}</span><span>{en?'Moduli':'法'} ≤ {table.modulusMax}</span>{all.length>0&&<span>{en?'×n: weight candidates (cards shown at lower right)':'×n：重みの候補の数(右下にカードで並ぶ)'}</span>}<span data-legend="products">{en?'Fill: fewest products':'塗り：一番少ない積の数'} {PRODUCT_BANDS.map(b=>{const fill=whiteFill(b.color,.30);return <span key={b.label} data-legend-band={b.label} style={{background:fill,color:textInk(b.color,fill),border:`1px solid ${b.color}`,borderRadius:4,padding:'0 4px',marginLeft:3}}>{b.label}</span>;})}</span><span className="prime-missing-key">{en?'No construction recorded':'構成の収録なし'}</span>{(sets.length>0||comparisonLanes.length>0||!!lane)&&<><span className="prime-used-key">✓ {en?'Selected set: outer border':'選んだ組：外側の枠'}</span><span className="prime-compare-key">{en?'Comparison set: inner border':'比較する組：内側の枠'}</span><span>{en?'Both borders: common to both sets':'両方の枠：共通'}</span></>}<span className="prime-focus-key">{en?'Shown: black frame':'表示中：黒枠'}</span>
   {formsBy.size>0&&<><span data-legend="forms">◢ {en?'Single modular construction without holes':'単独の法の構成(穴なし)'}</span>{withHoles&&<span data-legend="forms-holes">◿ {en?'Only with holes':'穴のある構成だけ'}</span>}<span data-legend="fewer">● {tab==='fp6'?(en?'Fewer products than every FP4 construction':'FP4のどの構成より積が少ない'):(en?'Fewer products than the saved constructions':'保存された組の構成より積が少ない')}</span>{tab==='fp6'&&<span data-legend="only-wider">6 {en?'Without holes only with FP6 values':'穴なしはFP6の値でだけ'}</span>}</>}</div>
  {!!choices.length&&<label className="prime-compare-control">{en?'Compare with':'比較する組'} <select name="prime_compare" value={compareId==='none'?'none':comparison?.id??'none'} onChange={e=>setCompareId(e.target.value)}><option value="none">{en?'None':'なし'}</option>{choices.map((l,i)=><option key={l.id} value={l.id} data-moduli={l.moduli.join(',')} data-bits={l.bits} data-format={l.format??''}>{i+1}: {l.format?l.format+' · ':''}{l.bits} bit · {l.moduli.length}{en?' moduli':'法'} · {l.products}{en?' products':'積'} · K {l.plan_k??l.k_max}</option>)}</select></label>}
  {tab==='fp4'&&<p className="prime-search-scope">{en?`The recorded search covered moduli 2–225 under fixed conditions with two limbs on both A and B (2×2), and found no constructions for primes above ${table.primeMax} in that range; three-limb constructions and constructions with unequal limb counts were not searched for every modulus.${formsBy.size?' The single modular constructions come from other searches, with their own limb counts, modulus ranges and value sets. A modulus missing here, or an empty cell, does not mean that no construction exists.':''}`:`記録された探索はA・Bとも2リム（2×2）の決まった条件で法2〜225を対象とし、その範囲では${table.primeMax}より大きい素数の構成は見つかっていませんが、3リムやA・Bでリム数が違う構成を全ての法で調べたものではありません。${formsBy.size?'単独の法の構成は別の探索の結果で、リムの数・法の範囲・値の集合はそれぞれ違います。ここに無い法や空いた欄は、構成が無いことを示しません。':''}`}</p>}
  {tab==='fp6'&&(formsBy.size>0||all.length>0)&&<p className="prime-search-scope">{en?`Columns run from 2 through ${table.primeMax}: every prime up to it has a construction on this value set, and the next prime has none. Moduli of larger primes are listed after the table. The fill gives the fewest products; ×n and cards come from the weights of the saved FP6 sets and of the checked FP6 constructions. Every FP4 (2×E2M1) value is also in the FP6 value set, so FP4 constructions hold on FP6 unchanged. They are not entered in this table; ● and 6 compare with them. A modulus missing here, or an empty cell, does not mean that no construction exists.`:`列は2から、この値の集合で構成のある素数が途切れずに続く${table.primeMax}までです。それより大きい素数の法は表の後に一覧します。塗りは一番少ない積の数、×n・カードは、保存されたFP6の組の構成と、検算済みのFP6の構成の重みから付けます。FP4 (2×E2M1)の値はどれもFP6の値の集合にも含まれるので、FP4の構成はFP6でもそのまま成り立ちます。ただし、この表には入れていません。●と6は、FP4の構成と比べた印です。ここに無い法や空いた欄は、構成が無いことを示しません。`}</p>}
  {fp4.error&&<p role="alert">{fp4.error}</p>}
  <div className="prime-table-figure" ref={measured.ref}>
   <div className="prime-table-surface" style={{width}}><svg data-prime-chart width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-label={en?`${fp} periodic table: prime columns and power rows`:`${fp} の周期表：素数の列と冪の行`}>
    <defs><filter id={glowId} x="-50%" y="-30%" width="200%" height="160%"><feGaussianBlur stdDeviation={1.5}/></filter></defs>
    {table.columns.flatMap((column,col)=>column.powers.map(({modulus,exponent})=>{
     const list=table.byModulus.get(modulus)??[],count=weightVariants(list).length,fc=formsBy.get(modulus),form=shownForm(modulus);
     const selected=usedModuli.has(modulus),cell=widths[col],x=lefts[col],y=4+(exponent-1)*row;
     const R=products(modulus),band=R===null?undefined:productBand(R);
     return <g key={modulus} data-prime-modulus={modulus} data-products={R??undefined} data-product-band={band?.label} data-prime-base={column.prime} data-exponent={exponent} data-recorded={!!list.length||!!form} data-forms={form?(form.hole_free?'hole_free':'holes'):'none'} data-forms-fewer={!!fc?.fewer} data-forms-only-wider={!!fc?.onlyWider} data-forms-excluded-fewer={!!fc?.excludedFewer} data-in-set={selected} data-in-comparison={compared.has(modulus)} data-variant-count={count} role="button" tabIndex={0} aria-label={`${en?'mod':'法'} ${modulus}`} aria-pressed={openedModulus===modulus} onClick={()=>open(modulus)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open(modulus);}}}>
      <title>{`${modulus}${count>1?` · ×${count}: ${en?'weight candidates (cards shown at lower right)':'重みの候補の数(右下にカードで並ぶ)'}`:''}${formTitle(modulus)}${R!==null?` · ${en?'fewest products':'一番少ない積の数'} ${R}`:''}${selected?' ✓':''}`}</title>
      <rect data-prime-frame x={x} y={y} width={cell} height={row} fill={band?whiteFill(band.color,.30):'#FFFFFF'} stroke={selected?'#C2185B':'#1A1A1A'} strokeWidth={selected?3:.5}/>
      {compared.has(modulus)&&<g pointerEvents="none"><rect data-prime-compare-glow={modulus} x={x+4} y={y+4} width={cell-8} height={row-8} fill="none" stroke="#ED964F" strokeWidth={4} opacity={.35} filter={`url(#${glowId})`}/><rect data-prime-compare-outline={modulus} x={x+4} y={y+4} width={cell-8} height={row-8} fill="none" stroke="#ED964F" strokeWidth={2} opacity={.8}/></g>}
      {count>1&&<text data-variant-badge x={x+cell-3} y={y+14} textAnchor="end" fontSize={14}>×{count}</text>}
      <text data-prime-number x={x+cell/2} y={y+28} textAnchor="middle" fontSize={16} fontFamily="KaTeX_Main,serif">{modulus}</text>
      <text data-prime-bits x={x+cell/2} y={y+42} textAnchor="middle" fontSize={14} fontFamily="KaTeX_Main,serif">{Math.log2(modulus).toFixed(2)}</text><text data-prime-bit-unit x={x+cell/2} y={y+56} textAnchor="middle" fontSize={14}>bit</text>
      {counts&&R!==null&&<text data-prime-products x={x+cell/2} y={y+square+10} textAnchor="middle" fontSize={14}>{R}{en?' prod':'積'}</text>}
      {selected&&<text data-prime-used x={x+8} y={y+14} textAnchor="middle" fontSize={14} fill="#C2185B">✓</text>}
      {form&&<path data-prime-forms-marker d={`M${x+cell-2} ${y+square-2}h-11l11-11z`} fill={form.hole_free?'#1A1A1A':'#FFFFFF'} stroke="#1A1A1A" strokeWidth={1}/>}
      {fc?.fewer&&<circle data-prime-fewer cx={x+7} cy={y+square-7} r={3.5} fill="#1A1A1A"/>}
      {fc?.onlyWider&&<text data-prime-only-wider x={x+cell-3-(count>1?String(count).length*8+12:0)} y={y+14} textAnchor="end" fontSize={14}>6</text>}
      {openedModulus===modulus&&<rect x={x+2} y={y+2} width={cell-4} height={row-4} fill="none" data-prime-focus={modulus} stroke="#1A1A1A" strokeWidth={2.5} strokeDasharray="5 3" pointerEvents="none"/>}
     </g>;
    }))}
    <g pointerEvents="none">{table.columns.flatMap((column,col)=>column.powers.filter(p=>usedModuli.has(p.modulus)).map(({modulus,exponent})=>{
     const cell=widths[col],x=lefts[col],y=4+(exponent-1)*row;
     return <g key={modulus}>
      <rect data-prime-glow={modulus} x={x} y={y} width={cell} height={row} fill="none" stroke="#C2185B" strokeWidth={4} opacity={.45} filter={`url(#${glowId})`}/>
      <rect data-prime-outline={modulus} x={x} y={y} width={cell} height={row} fill="none" stroke="#C2185B" strokeWidth={3}/>
     </g>;
    }))}</g>
   </svg>{inline&&cards}</div>
  </div>{!inline&&cards}
  {!!table.beyond.length&&<details className="prime-beyond" data-section="prime-beyond" data-prime-beyond-list>
   <summary>{en?`Moduli whose prime is above ${table.primeMax} (${table.beyond.length}, only where a construction is shown)`:`${table.primeMax}より大きい素数とその冪の法(${table.beyond.length}法、構成を出す法だけ)`}</summary>
   <div className="prime-beyond-cells">{table.beyond.map(p=>{const fc=formsBy.get(p.modulus),form=shownForm(p.modulus),products=(form?.hole_free??form?.holes)?.products??table.byModulus.get(p.modulus)?.[0]?.products.length;return <button key={p.modulus} type="button" data-prime-beyond={p.modulus} data-prime-base={p.prime} data-exponent={p.exponent} data-forms={form?(form.hole_free?'hole_free':'holes'):'none'} data-forms-only-wider={!!fc?.onlyWider} aria-pressed={openedModulus===p.modulus} title={`${p.modulus}${formTitle(p.modulus)}`} onClick={()=>open(p.modulus)}>
    <span className="prime-beyond-number">{p.exponent>1?<MathText tex={`${p.prime}^{${p.exponent}}`}/>:p.modulus}</span><span className="prime-beyond-products">{products!==undefined&&<>{products}{en?' products':'積'}</>}</span>{form?(form.hole_free?'◢':'◿'):''}{fc?.onlyWider?' 6':''}</button>;})}</div>
  </details>}
  {!!other.length&&<div className="prime-other">{en?'Other moduli in the selected set':'選択中の組の他の法'}: {other.map(m=><button key={m} type="button" className="prime-used-key" data-prime-other-used={m} aria-pressed={openedModulus===m} onClick={()=>open(m)}><MathText tex={`\\operatorname{mod}\\;${m}`}/></button>)}</div>}
  {!!otherCompared.length&&<div className="prime-other">{en?'Other moduli in the comparison set':'比較する組の他の法'}: {otherCompared.map(m=><button key={m} type="button" className="prime-compare-key" data-prime-other-comparison={m} aria-pressed={openedModulus===m} onClick={()=>open(m)}><MathText tex={`\\operatorname{mod}\\;${m}`}/></button>)}</div>}
  {openedModulus!==null&&<div className="prime-inspection">
   <h3>{en?'Shown: ':'表示中：'}<MathText tex={`\\operatorname{mod}\\;${openedModulus}`}/></h3>
   {!!usage.length&&<details className="prime-set-history"><summary>{en?'Sets containing this modulus':'この法を使う組'} ({usage.length})</summary>
    <table><thead><tr><th>GPU</th><th>bit</th><th>K</th><th>{en?'Products':'積'}</th><th>{en?'Moduli':'法'}</th></tr></thead><tbody>{usage.map(s=><tr key={s.id} data-prime-set={s.id} data-engines={s.engines.join(',')}><td>{s.engines.length?s.engines.join(en?', ':'・'):'—'}</td><td>{s.bits}</td><td>{s.k}</td><td>{s.products}</td><td>{s.moduli.join(', ')}</td></tr>)}</tbody></table>
   </details>}
   {waiting?<p data-prime-inspection-loading>{en?'Loading':'読み込み中'}</p>:inspected?<>
    <div className="prime-variants">{weightVariants(variants).map(v=>{const c=v.items.find(c=>used.has(c.id))??v.items[0],style=miniWeightStyle(c,'A',Math.min(1,c.weights.A.length-1));return <button key={v.key} type="button" data-weight-variant={v.key} data-used-variant={v.items.some(c=>used.has(c.id))} aria-pressed={v.items.some(c=>c.id===inspected.id)} style={{background:style.background,color:style.ink}} onClick={()=>setOpenedId(c.id)}><MathText tex={`w_{A}=(${c.weights.A.join(',')}),\\;w_{B}=(${c.weights.B.join(',')})`}/>{v.items.some(c=>used.has(c.id))?' ✓':''}</button>;})}</div>
    <label>{en?'Construction':'構成'} <select name="prime_construction" value={inspected.id} onChange={e=>setOpenedId(e.target.value)}>{variants.map((c,i)=><option key={c.id} value={c.id}>{i+1}: A ({c.weights.A.join(',')}) / B ({c.weights.B.join(',')}) · {c.products.length}{en?' products':'積'}{used.has(c.id)?' ✓':''}</option>)}</select></label>
    <Expansion key={inspected.id} c={inspected} scope="prime."/>
   </>:!shownForm(openedModulus)&&<output>{en?'No construction for this modulus in this catalog':'この目録には、この法の構成はありません'}</output>}
   {formsBy.get(openedModulus)&&<FormRows cell={formsBy.get(openedModulus)!} en={en}/>}
  </div>}
  {tab==='fp6'&&<FP6Families/>}
 </details>;
}
