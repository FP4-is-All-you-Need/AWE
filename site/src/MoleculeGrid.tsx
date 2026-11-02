import {useId,useMemo} from 'react';
import {useParameter} from './parameters.ts';
import {CompactExpansion} from './CompactExpansion.tsx';
import {coefficientColor,productFillColor,textInk,whiteFill} from './compact.ts';
import {DIRECT_COLORS} from './productPalette.ts';
import {moleculeSharing,type MoleculeSource} from './moleculeModel.ts';
import type {Construction} from './visual.ts';

export function MoleculeGrid({source,components,sharing,selected,onSelect,en}:{source:MoleculeSource;components:number[];sharing:ReturnType<typeof moleculeSharing>;selected:number|null;onSelect:(i:number|null)=>void;en:boolean}){
 const [mode,setMode]=useParameter<'components'|'products'>('molecule_grid_color','components',v=>v==='products'?'products':'components');
 const c=useMemo<Construction>(()=>({...source,products:source.products.map(p=>({...p,group:null})),shape:'published',faces_a:source.planes.A.length,faces_b:source.planes.B.length,holes:{count:null,share:null},carry:false,block_shift:false,source_sha256:''}),[source]);
 const cell=66,left=82,top=52,n=source.weights.B.length,m=source.weights.A.length;
 const width=left+n*cell+16,height=top+m*cell+24,uid=useId().replace(/[^a-zA-Z0-9_-]/g,'');
 const color=(i:number)=>DIRECT_COLORS[i%DIRECT_COLORS.length];
 // A cell that several components use is hatched with the colours of those components, in their order.
 const hatch=(owners:number[])=>`${uid}-hatch-${owners.join('-')}`;
 const stripe=6,hatchTint=.55;
 const product=selected===null?undefined:source.products[selected];
 const names=(uses:(boolean|null)[])=>components.filter((_,i)=>uses[i]===true).join(', ')||'—';
 const render=(component:number|null)=>{
  const checked=component===null||sharing.status[component]==='checked';
  const ownerSets=component===null&&mode==='components'?[...new Set(sharing.cellTerms.flatMap(row=>row.map(uses=>components.flatMap((_,j)=>uses.some(u=>u[j]===true)?[j]:[]).join('-'))))].filter(k=>k.includes('-')):[];
  return <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} data-molecule-grid={component===null?'combined':components[component]} data-grid-rows={m} data-grid-columns={n} aria-label={component===null?(en?'Combined limb-pair grid':'まとめた構成のリムの組の格子'):`mod ${components[component]}`}>
   {ownerSets.length>0&&<defs>{ownerSets.map(k=>{const owners=k.split('-').map(Number);return <pattern key={k} id={hatch(owners)} width={stripe*owners.length} height={stripe*owners.length} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">{owners.map((o,i)=><rect key={o} x={i*stripe} y="0" width={stripe} height={stripe*owners.length} fill={whiteFill(color(o),hatchTint)}/>)}</pattern>;})}</defs>}
   <text x={left+n*cell/2} y="15" textAnchor="middle" fontSize="12">{en?'B limbs · weights':'B リム・重み'}</text>
   <text x="4" y="32" fontSize="12">A</text>
   {source.weights.B.map((w,b)=><text key={b} x={left+(b+.5)*cell} y={top-13} textAnchor="middle" fontSize="12">b{b} · {w}</text>)}
   {source.weights.A.map((w,a)=><text key={a} x={left-8} y={top+(a+.5)*cell+4} textAnchor="end" fontSize="12">a{a} · {w}</text>)}
   {source.weights.A.flatMap((_,a)=>source.weights.B.map((_,b)=>{
    const uses=sharing.cellTerms[a][b],projected=uses.flatMap((u,t)=>(component===null?u.some(v=>v===true):u[component]===true)?[t]:[]);
    const covered=mode==='products'&&component===null?source.products.flatMap((p,t)=>source.planes.A[p.a][a]&&source.planes.B[p.b][b]?[t]:[]):projected;
    const owners=components.flatMap((_,j)=>uses.some(u=>u[j]===true)?[j]:[]),shared=uses.some(u=>u.filter(v=>v===true).length>1);
    const unknown=component===null?sharing.status.some(v=>v!=='checked'):!checked;
    const hatched=component===null&&owners.length>1&&covered.length>0;
    const ink=component!==null?color(component):hatched?'#1A1A1A':owners.length?color(owners[0]):'#6E6E6E';
    const fill=hatched?'#ffffff':covered.length?whiteFill(ink,.30):'#ffffff';
    const xx=left+b*cell,yy=top+a*cell,active=selected!==null&&covered.includes(selected),label=covered.map(t=>'T'+t).join(', ');
    const select=()=>{if(covered.length)onSelect(covered[(covered.indexOf(selected??-1)+1)%covered.length]);};
    return <g key={a+':'+b} data-molecule-cell={`${component??'all'}:${a}:${b}`} data-covering-products={covered.join(',')} data-components={owners.map(i=>components[i]).join(',')} data-shared-product={shared} role={covered.length?'button':undefined} tabIndex={covered.length?0:undefined} aria-label={`${en?'Limb pair':'リムの組'} a${a} b${b}: ${label||'—'}`} onClick={select} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select();}}}>
     <rect x={xx} y={yy} width={cell} height={cell} fill={mode==='products'&&covered.length?'#ffffff':hatched&&mode==='components'?`url(#${hatch(owners)})`:fill} stroke="#9E9E9E" strokeWidth=".65" data-hatched={hatched&&mode==='components'||undefined}/>
     {mode==='products'&&covered.map((t,k)=><rect key={t} data-grid-product-color={t} x={xx+k*cell/covered.length} y={yy} width={cell/covered.length} height={cell} fill={productFillColor(c,t)}/>)}
     <text x={xx+cell/2} y={yy+25} textAnchor="middle" fontSize="14" fill="#1A1A1A">a{a}b{b}</text>
     <text x={xx+cell/2} y={yy+44} textAnchor="middle" fontSize="10" fill={textInk(mode==='products'?'#1A1A1A':ink,fill)}>{covered.length>4?`${covered.slice(0,3).map(t=>'T'+t).join(',')}…`:label|| (unknown?'?':'0')}</text>
     {shared&&component===null&&<text x={xx+cell-5} y={yy+13} textAnchor="end" fontSize="10" fill="#1A1A1A" paintOrder="stroke" stroke="#ffffff" strokeWidth="2">●</text>}
     {unknown&&covered.length>0&&<text x={xx+5} y={yy+13} fontSize="10">?</text>}
     {active&&<rect x={xx+2} y={yy+2} width={cell-4} height={cell-4} fill="none" stroke={coefficientColor(c,selected!)} strokeWidth="3"/>}
     <title>{`${label||'—'}; ${en?'components':'成分'}: ${owners.map(i=>components[i]).join(', ')||'—'}${shared?(en?'; one product contributes to multiple components':'; 同じ積が複数の成分に寄与'):''}${unknown?(en?'; some comparisons unconfirmed':'; 一部の比較は未確認'):''}`}</title>
    </g>;
   }))}
  </svg>;
 };
 return <section className="molecule-grid-view" data-molecule-grid-view>
  <h4>{en?'Limb-pair grid: products and shared contributions':'リムの組の格子：積と共有する部分'}</h4>
  <label>{en?'Cell colours':'セルの色'} <select aria-label="molecule grid color" value={mode} onChange={e=>setMode(e.target.value as 'components'|'products')}><option value="components">{en?'Components and overlap':'成分と重なる部分'}</option><option value="products">{en?'Saved products (Expansion colours)':'保存した積（Expansion の配色）'}</option></select></label>
  <div className="molecule-grid-legend">{components.map((q,i)=><span key={q} style={{background:whiteFill(color(i),.30),color:textInk(color(i))}}>mod {q}{sharing.status[i]!=='checked'?' ?':''}</span>)}<span data-hatch-legend style={{background:`repeating-linear-gradient(45deg,${components.slice(0,Math.max(2,Math.min(components.length,3))).map((_,i)=>`${whiteFill(color(i),hatchTint)} ${i*stripe}px ${(i+1)*stripe}px`).join(',')})`,color:'#1A1A1A'}}>{en?'Multiple components: hatched in their colours':'複数の成分：その成分の色の斜線'}</span><span>● {en?'Same product shared':'同じ積を共有'}</span></div>
  <div className="molecule-grid-main">{render(null)}</div>
  <div className="compact-products">{source.products.map((_,t)=><button type="button" key={t} data-molecule-product={t} aria-pressed={selected===t} onClick={()=>onSelect(selected===t?null:t)} style={{border:`${selected===t?3:2}px solid ${coefficientColor(c,t)}`,background:productFillColor(c,t),color:textInk(coefficientColor(c,t))}}>T{t}</button>)}<button type="button" onClick={()=>onSelect(null)}>{en?'Clear selection':'選択を解除'}</button></div>
  {product&&selected!==null&&<div className="molecule-selected-product" data-molecule-selected-product={selected} aria-live="polite">
   <p><strong>T{selected}</strong> · {en?'Reconstruction coefficient':'復元係数'} {product.numerator} / {source.denominator} · {en?'Contributes to components':'寄与する成分'}: <span data-selected-product-components>{names(sharing.terms[selected])}</span></p>
   {(['A','B'] as const).map(side=>{const plane=product[side==='A'?'a':'b'],coefficients=source.planes[side][plane];return <p key={side} data-molecule-selected-plane={`${side}:${plane}`}><strong>{side} {en?'plane':'面'} {plane}</strong> · {en?'Limb coefficients':'リムの係数'} ({coefficients.join(', ')}) · {en?'Limbs used':'使うリム'} {coefficients.flatMap((v,i)=>v?[`${side==='A'?'a':'b'}${i}`]:[]).join(', ')} · {en?'Components using this plane':'この面を使う成分'}: {names(sharing.planes[side][plane])}</p>;})}
   {sharing.status.some(v=>v!=='checked')&&<p>{en?'Unconfirmed components are omitted from these lists:':'次の未確認の成分は、この一覧に含めていません：'} {components.filter((_,i)=>sharing.status[i]!=='checked').join(', ')}</p>}
  </div>}
  <p>{en?'Rows are A limbs and columns are B limbs, in stored order. T, plane and limb indices start at 0, matching Expansion. A cell hatched in several component colours receives contributions for those components; ● means at least one SAME product contributes to multiple components at that cell. Separate products meeting in a cell do not count as a shared product.':'行は A のリム、列は B のリムで、保存順です。T・面・リムの番号は Expansion と同じ0始まりです。複数の成分の色の斜線は、その成分への寄与があるセル、●はそのセルで同じ積を複数の成分が使うことを表します。別々の積が同じセルにあるだけでは、積の共有と数えません。'}</p>
  <details data-molecule-component-grids><summary>{en?'Same grid for each component':'各成分で見た同じ格子'}</summary><div className="molecule-component-grids">{components.map((q,i)=><figure key={q}><figcaption>mod {q}{sharing.status[i]!=='checked'?(en?' · unconfirmed':' · 未確認'):''}</figcaption>{render(i)}</figure>)}</div></details>
  <details data-molecule-expansion><summary>{en?'Expansion with the existing product colours':'既存の積の配色による展開'}</summary><div className="paper-scroll"><CompactExpansion c={c} selected={selected} onSelect={onSelect}/></div></details>
  <p>{en?'Component colours show nonzero product contributions before cancellation. Saved-product colours on the combined grid show the stored plane supports, including products whose component projections are unconfirmed. Counts come from the combined construction, not a new match to independently optimal component encodings. Unknown denominator or plane reductions remain unconfirmed.':'成分の色は打ち消し前の、ゼロでない積の寄与を示します。まとめた格子を保存した積の色で見る時は、成分への寄与が未確認の積も、元の面が覆うセルに表示します。まとめた構成のデータを使い、各成分で個別に積の本数を最少にした符号化との対応は、推定していません。分母や面の折り返しを照合できない成分は未確認とします。'}</p>
 </section>;
}
