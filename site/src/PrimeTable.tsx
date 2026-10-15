import {useId,useMemo,useState} from 'react';
import {LawRow,MathText} from './PaperFigures.tsx';
import {Expansion} from './Expansion.tsx';
import {miniWeightStyle} from './compact.ts';
import {type Construction,type Lane} from './visual.ts';
import {useParameter} from './parameters.ts';
import {useLanguage} from './i18n.tsx';
import {useMeasuredWidth} from './useMeasuredWidth.ts';
import {primeTableData,weightVariants,type PrimeSet} from './primeTable.ts';
import './prime-table.css';

export function PrimeTable({records,lane,selectedConstruction,sets=[],comparisonLanes=[]}:{records:Construction[];lane?:Lane;selectedConstruction?:Construction;sets?:PrimeSet[];comparisonLanes?:Lane[]}){
 const en=useLanguage()==='en',[openedModulus,setOpenedModulus]=useState<number|null>(null),[openedId,setOpenedId]=useState('');
 const glowId='prime-selected-'+useId().replace(/[^a-zA-Z0-9_-]/g,'');
 const all=useMemo(()=>[...new Map([...records,...(lane?.mods??[])].map(c=>[c.id,c])).values()],[records,lane]);
 const table=useMemo(()=>primeTableData(all,sets),[all,sets]),measured=useMeasuredWidth();
 const used=new Set(lane?.mods.map(c=>c.id)??[]),usedModuli=new Set(lane?.moduli??[]);
 const [compareId,setCompareId]=useParameter('prime_compare','auto',r=>r);
 const choices=[...new Map(comparisonLanes.map(l=>[l.id,l])).values()].sort((a,b)=>(a.bits??0)-(b.bits??0)||a.products-b.products||a.id.localeCompare(b.id));
 const different=(l:Lane)=>l.moduli.length!==usedModuli.size||l.moduli.some(m=>!usedModuli.has(m));
 const comparison=compareId==='none'?undefined:choices.find(l=>l.id===compareId)??choices.find(l=>l.bits===lane?.bits&&different(l))??choices.find(different)??choices[0];
 const compared=new Set(comparison?.moduli??[]);
 const shownModulus=openedModulus??selectedConstruction?.modulus??lane?.moduli[0];
 const variants=table.byModulus.get(shownModulus??0)??all.filter(c=>c.modulus===shownModulus);
 const inspected=variants.find(c=>c.id===openedId)??variants.find(c=>used.has(c.id))??variants[0];
 const cells=table.columns.flatMap(c=>c.powers),shown=new Set(cells.map(p=>p.modulus));
 const other=lane?.moduli.filter(m=>!shown.has(m))??[];
 const otherCompared=comparison?.moduli.filter(m=>!shown.has(m))??[];
 const minima=table.columns.map(c=>Math.max(60,Math.max(...c.powers.map(p=>String(p.modulus).length))*8+3));
 const minimum=minima.reduce((a,b)=>a+b,0),available=Math.max(minimum,Math.min(1404,(measured.width||960)-8));
 const widths=minima.map(w=>w+(available-minimum)/table.columns.length),lefts=widths.map((_,i)=>4+widths.slice(0,i).reduce((a,b)=>a+b,0));
 const row=60,width=available+8,height=Math.max(...cells.map(p=>p.exponent))*row+8;
 const usage=openedModulus===null?[]:table.usedIn.get(openedModulus)??[];
 const groups=weightVariants(variants);
 const cardLeft=Math.max(0,...table.columns.flatMap((c,i)=>c.powers.filter(p=>p.exponent>1).map(()=>lefts[i]+widths[i])))+16;
 const cardTop=row+16,cardWidth=Math.min(width,measured.width)-cardLeft-12;
 const inline=measured.width>=720&&cardWidth>=240;
 const cards=<div className="prime-weight-cards" data-prime-cards={shownModulus} data-inline={inline} style={inline?{position:'absolute',left:cardLeft,top:cardTop,width:cardWidth,maxHeight:height-cardTop-8}:undefined}>
  {groups.map(v=>{const c=v.items.find(c=>c.id===inspected?.id)??v.items.find(c=>used.has(c.id))??v.items[0];const item:Lane={id:c.id,lane:'candidate',selection_kind:'candidate',tag:'candidate',moduli:[c.modulus],mods:[c],products:c.products.length,faces_a:c.faces_a,faces_b:c.faces_b,k_max:'0'};
   return <div className="prime-weight-card" key={v.key} data-prime-weight-card={v.key} data-used={v.items.some(c=>used.has(c.id))} data-focused={v.items.some(c=>c.id===inspected?.id)}>
    <LawRow lane={item} selectionRole="focus" selected={v.items.some(c=>c.id===inspected?.id)?0:-1} onSelect={()=>{setOpenedModulus(c.modulus);setOpenedId(c.id);}}/>
    {v.items.some(c=>used.has(c.id))&&<span className="prime-card-used" title={en?'Selected: in the current set':'選択中：今の組で使用'} aria-label={en?'In the selected set':'選択中の組'}>✓</span>}
   </div>;
  })}
 </div>;
 const open=(modulus:number)=>{setOpenedModulus(modulus);setOpenedId('');};
 return <details data-section="prime-table" className="prime-table" open>
  <summary>{en?'FP4 periodic table':'FP4 の周期表'}</summary>
  <p className="prime-intro">{en?'FP4 constructions for prime moduli and their powers.':'素数とその冪を法に使うFP4の構成。'}</p>
  <div className="prime-table-legend"><span>{en?'Prime bases':'素数'}: 2–{table.primeMax}</span><span>{en?'Moduli':'法'} ≤ {table.modulusMax}</span><span>{en?'×n: weight candidates (cards shown at lower right)':'×n：重みの候補の数(右下にカードで並ぶ)'}</span><span className="prime-missing-key">{en?'No construction recorded':'構成の収録なし'}</span><span className="prime-used-key">✓ {en?'Selected set: outer border':'選んだ組：外側の枠'}</span><span className="prime-compare-key">{en?'Comparison set: inner border':'比較する組：内側の枠'}</span><span>{en?'Both borders: common to both sets':'両方の枠：共通'}</span><span className="prime-focus-key">{en?'Focus: black frame':'表示中：黒枠'}</span></div>
  {!!choices.length&&<label className="prime-compare-control">{en?'Compare with':'比較する組'} <select name="prime_compare" value={compareId==='none'?'none':comparison?.id??'none'} onChange={e=>setCompareId(e.target.value)}><option value="none">{en?'None':'なし'}</option>{choices.map((l,i)=><option key={l.id} value={l.id} data-moduli={l.moduli.join(',')} data-bits={l.bits} data-format={l.format??''}>{i+1}: {l.format?l.format+' · ':''}{l.bits} bit · {l.moduli.length}{en?' moduli':'法'} · {l.products}{en?' products':'積'} · K {l.plan_k??l.k_max}</option>)}</select></label>}
  <p className="prime-search-scope">{en?`The recorded search covered moduli 2–225 under fixed conditions with two limbs on both A and B (2×2), and found no constructions for primes above ${table.primeMax} in that range; three-limb constructions and constructions with unequal limb counts were not searched for every modulus.`:`記録された探索はA・Bとも2リム（2×2）の決まった条件で法2〜225を対象とし、その範囲では${table.primeMax}より大きい素数の構成は見つかっていませんが、3リムやA・Bでリム数が違う構成を全ての法で調べたものではありません。`}</p>
  <div className="prime-table-figure" ref={measured.ref}>
   <div className="prime-table-surface" style={{width}}><svg data-prime-chart width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-label={en?'FP4 periodic table: prime columns and power rows':'FP4 の周期表：素数の列と冪の行'}>
    <defs><filter id={glowId} x="-50%" y="-30%" width="200%" height="160%"><feGaussianBlur stdDeviation={1.5}/></filter></defs>
    {table.columns.flatMap((column,col)=>column.powers.map(({modulus,exponent})=>{
     const list=table.byModulus.get(modulus)??[],count=weightVariants(list).length,chosen=list.find(c=>used.has(c.id))??list[0],style=chosen?miniWeightStyle(chosen,'A',Math.min(1,chosen.weights.A.length-1)):undefined;
     const selected=usedModuli.has(modulus),cell=widths[col],x=lefts[col],y=4+(exponent-1)*row;
     return <g key={modulus} data-prime-modulus={modulus} data-prime-base={column.prime} data-exponent={exponent} data-recorded={!!list.length} data-in-set={selected} data-in-comparison={compared.has(modulus)} data-variant-count={count} role="button" tabIndex={0} aria-label={`${en?'mod':'法'} ${modulus}`} aria-pressed={openedModulus===modulus} onClick={()=>open(modulus)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open(modulus);}}}>
      <title>{`${modulus}${count>1?` · ×${count}: ${en?'weight candidates (cards shown at lower right)':'重みの候補の数(右下にカードで並ぶ)'}`:''}${selected?' ✓':''}`}</title>
      <rect data-prime-frame x={x} y={y} width={cell} height={row} fill={style?.background??'#FFFFFF'} stroke={selected?'#C2185B':'#1A1A1A'} strokeWidth={selected?3:.5}/>
      {compared.has(modulus)&&<g pointerEvents="none"><rect data-prime-compare-glow={modulus} x={x+4} y={y+4} width={cell-8} height={row-8} fill="none" stroke="#ED964F" strokeWidth={4} opacity={.35} filter={`url(#${glowId})`}/><rect data-prime-compare-outline={modulus} x={x+4} y={y+4} width={cell-8} height={row-8} fill="none" stroke="#ED964F" strokeWidth={2} opacity={.8}/></g>}
      {count>1&&<text data-variant-badge x={x+cell-3} y={y+14} textAnchor="end" fontSize={14}>×{count}</text>}
      <text data-prime-number x={x+cell/2} y={y+28} textAnchor="middle" fontSize={16} fontFamily="KaTeX_Main,serif">{modulus}</text>
      <text data-prime-bits x={x+cell/2} y={y+42} textAnchor="middle" fontSize={14} fontFamily="KaTeX_Main,serif">{Math.log2(modulus).toFixed(2)}</text><text data-prime-bit-unit x={x+cell/2} y={y+56} textAnchor="middle" fontSize={14}>bit</text>
      {selected&&<text data-prime-used x={x+8} y={y+14} textAnchor="middle" fontSize={14} fill="#C2185B">✓</text>}
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
  {!!other.length&&<div className="prime-other">{en?'Other moduli in the selected set':'選択中の組の他の法'}: {other.map(m=><button key={m} type="button" className="prime-used-key" data-prime-other-used={m} aria-pressed={openedModulus===m} onClick={()=>open(m)}><MathText tex={`\\operatorname{mod}\\;${m}`}/></button>)}</div>}
  {!!otherCompared.length&&<div className="prime-other">{en?'Other moduli in the comparison set':'比較する組の他の法'}: {otherCompared.map(m=><button key={m} type="button" className="prime-compare-key" data-prime-other-comparison={m} aria-pressed={openedModulus===m} onClick={()=>open(m)}><MathText tex={`\\operatorname{mod}\\;${m}`}/></button>)}</div>}
  {openedModulus!==null&&<div className="prime-inspection">
   <h3>{en?'Focus: ':'表示中：'}<MathText tex={`\\operatorname{mod}\\;${openedModulus}`}/></h3>
   {!!usage.length&&<details className="prime-set-history"><summary>{en?'Sets containing this modulus':'この法を使う組'} ({usage.length}) · {usage.some(s=>s.measured)?(en?'Used in measurements':'測定で使用'):(en?'Catalog only':'カタログのみ')}</summary>
    <table><thead><tr><th>{en?'Use':'使用'}</th><th>bit</th><th>K</th><th>{en?'Products':'積'}</th><th>{en?'Moduli':'法'}</th></tr></thead><tbody>{usage.map(s=><tr key={s.id} data-prime-set={s.id} data-use={s.measured?'measured':'catalog-only'}><td>{s.measured?(en?'Used in measurements':'測定で使用'):(en?'Catalog only':'カタログのみ')}</td><td>{s.bits}</td><td>{s.k}</td><td>{s.products}</td><td>{s.moduli.join(', ')}</td></tr>)}</tbody></table>
   </details>}
   {inspected?<>
    <div className="prime-variants">{weightVariants(variants).map(v=>{const c=v.items.find(c=>used.has(c.id))??v.items[0],style=miniWeightStyle(c,'A',Math.min(1,c.weights.A.length-1));return <button key={v.key} type="button" data-weight-variant={v.key} data-used-variant={v.items.some(c=>used.has(c.id))} aria-pressed={v.items.some(c=>c.id===inspected.id)} style={{background:style.background,color:style.ink}} onClick={()=>setOpenedId(c.id)}><MathText tex={`w_{A}=(${c.weights.A.join(',')}),\\;w_{B}=(${c.weights.B.join(',')})`}/>{v.items.some(c=>used.has(c.id))?' ✓':''}</button>;})}</div>
    <label>{en?'Construction':'構成'} <select name="prime_construction" value={inspected.id} onChange={e=>setOpenedId(e.target.value)}>{variants.map((c,i)=><option key={c.id} value={c.id}>{i+1}: A ({c.weights.A.join(',')}) / B ({c.weights.B.join(',')}) · {c.products.length}{en?' products':'積'}{used.has(c.id)?' ✓':''}</option>)}</select></label>
    <Expansion key={inspected.id} c={inspected} scope="prime."/>
   </>:<output>{en?'Not recorded':'未収録'}</output>}
  </div>}
 </details>;
}
