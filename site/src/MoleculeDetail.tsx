import {MoleculeGrid} from './MoleculeGrid.tsx';
import {reconstructionText} from './fp6Periodic.ts';
import {useEffect,useMemo,useState} from 'react';
import {read} from './catalog.ts';
import {factorText} from './modularForms.ts';
import {DIRECT_COLORS} from './productPalette.ts';
import {componentComparison,type Coefficients,type PolarRow} from './polarModel.ts';
import {moleculeSharing,type MoleculeSource} from './moleculeModel.ts';
import {withoutUnusedLimbs} from './unusedLimbs.ts';
import './molecule-detail.css';

const cache=new Map<string,Promise<{solutions:MoleculeSource[]}>>();
const sourceFile=(path:string)=>{let p=cache.get(path);if(!p){p=read<{solutions:MoleculeSource[]}>(path).catch(e=>{cache.delete(path);throw e;});cache.set(path,p);}return p;};
const n=(v:number|null|undefined)=>v==null?'—':v.toLocaleString(undefined,{maximumFractionDigits:3});
export function MoleculeDetail({m,groups,s,en}:{m:number;groups:Map<number,PolarRow[]>;s:Coefficients;en:boolean}){
 const comparison=useMemo(()=>componentComparison(m,groups,s),[m,groups,s]),row=comparison.best;
 const [source,setSource]=useState<MoleculeSource>(),[error,setError]=useState(''),[selected,setSelected]=useState<number|null>(null);
 useEffect(()=>{let alive=true;setSource(undefined);setError('');setSelected(null);if(row)sourceFile(row.source).then(d=>{
  const raw=d.solutions.find(v=>v.id===row.id);if(!raw)throw Error(en?'Source construction was not found':'元の構成が見つかりません');
  const found=withoutUnusedLimbs(raw);
  if(found.modulus!==row.m||found.products.length!==row.R||found.planes.A.length!==row.FA||found.planes.B.length!==row.FB||JSON.stringify(found.weights)!==JSON.stringify(row.weights))throw Error(en?'Source and display index do not match':'元データと表示用索引が一致しません');
  if(alive)setSource(found);
 }).catch(e=>{if(alive)setError(String(e));});return()=>{alive=false;};},[row,en]);
 const sharing=useMemo(()=>source?moleculeSharing(source,comparison.components):undefined,[source,comparison.components.join(',')]);
 const parts=comparison.parts,allParts=parts.every(Boolean),sumA=allParts?parts.reduce((v,r)=>v+r!.FA,0):null,sumB=allParts?parts.reduce((v,r)=>v+r!.FB,0):null;
 const sumLA=allParts?parts.reduce((v,r)=>v+r!.weights.A.length,0):null,sumLB=allParts?parts.reduce((v,r)=>v+r!.weights.B.length,0):null;
 const color=(i:number)=>DIRECT_COLORS[i%DIRECT_COLORS.length];
 const lines=Math.max(3,(source?.weights.A.length??0)+(source?.weights.B.length??0),(source?.planes.A.length??0)+(source?.planes.B.length??0),row?.R??0,parts.length),height=60+lines*48;
 const y=(i:number,total:number)=>40+(i+.5)*(height-60)/Math.max(1,total),curve=(x1:number,y1:number,x2:number,y2:number)=>`M${x1},${y1}C${(x1+x2)/2},${y1} ${(x1+x2)/2},${y2} ${x2},${y2}`;
 const product=selected===null?undefined:source?.products[selected];
 return <details open className="molecule-detail" data-molecule-detail={m} data-section={`molecule-detail.${m}`}>
  <summary>{en?'Combined construction and component comparison':'まとめた構成と成分の比較'}: {m} = {factorText(m)}</summary>
  {row?.recon&&<p data-molecule-reconstruction>{en?'Denominator':'分母'}: {row.denominator} · {en?'Reconstruction':'復元'}: {reconstructionText(row.recon,en)}</p>}
  <div className="molecule-atoms">{comparison.components.map((q,i)=><div key={q} className="molecule-atom" style={{borderColor:color(i)}}><span className="molecule-atom-circle" style={{borderColor:color(i)}}>{factorText(q)}</span><strong>{q}</strong><span>{parts[i]?`${parts[i]!.R} ${en?'products':'積'}`:en?'Unrecorded':'未収録'}</span><small>{parts[i]?`${en?'Planes':'面'} A / B: ${parts[i]!.FA} / ${parts[i]!.FB}`:''}</small></div>)}</div>
  <div className="molecule-reduction" data-product-reduction={comparison.saving??'unknown'}><span>{en?'Separate components':'成分ごと'} <b>{parts.map(r=>r?.R??'?').join(' + ')} = {comparison.sum??'?'}</b> {en?'products':'積'}</span><span>→</span><span>{en?'Combined':'まとめて'} <b>{row?.R??'?'}</b> {en?'products':'積'}</span><strong>{comparison.saving===null?en?'Comparison unknown':'比較未確認':comparison.saving>0?en?`${comparison.saving} fewer products`:`${comparison.saving} 積減る`:comparison.saving===0?en?'Same product count':'積は同じ':en?`${-comparison.saving} more products`:`${-comparison.saving} 積増える`}</strong></div>
  <div className="polar-table-scroll"><table><thead><tr><th></th><th>{en?'Separate components':'成分ごと'}</th><th>{en?'Combined':'まとめて'}</th></tr></thead><tbody><tr><th>{en?'Planes A / B':'面 A / B'}</th><td>{n(sumA)} / {n(sumB)}</td><td>{row?.FA??'—'} / {row?.FB??'—'}</td></tr><tr><th>{en?'Limbs A / B':'リム A / B'}</th><td>{n(sumLA)} / {n(sumLB)}</td><td>{row?.weights.A.length??'—'} / {row?.weights.B.length??'—'}</td></tr><tr><th>{en?'Minimum cost / bit':'最少の費用 / bit'}</th><td>{n(comparison.sumCost===null?null:comparison.sumCost/Math.log2(m))}</td><td>{n(comparison.cost===null?null:comparison.cost/Math.log2(m))}</td></tr></tbody></table></div>
  <p>{en?'Product, plane and limb counts above use the minimum-product constructions. Costs are minimized separately. They need not describe the same constructions.':'上の積・面・リムの数は、積が最少の構成で数えます。費用は別に最少を選ぶため、同じ構成とは限りません。'}</p>
  {error?<p role="alert">{error}</p>:!source||!sharing?<p>{en?'Loading the source construction…':'元の構成を読み込み中…'}</p>:<>
   <p data-shared-counts data-shared-products={sharing.sharedProducts} data-shared-planes={sharing.sharedPlanes} data-shared-limbs={sharing.sharedLimbs}>{en?'Contributing to two or more components':'2 つ以上の成分に寄与'}: {sharing.sharedProducts} {en?'products':'積'} · {sharing.sharedPlanes} {en?'planes':'面'} · {sharing.sharedLimbs} {en?'limbs':'リム'}{sharing.status.some(v=>v!=='checked')&&(en?' (only checked components counted)':'（確認できた成分だけ）')}</p>
   <MoleculeGrid source={source} components={comparison.components} sharing={sharing} selected={selected} onSelect={setSelected} en={en}/>
   <details data-molecule-flow><summary>{en?'Connections: limbs → planes → products → components':'つながり：リム → 面 → 積 → 成分'}</summary>
   <p>{en?'This record does not contain a CRT-2 schedule or intermediate residues; the graph shows algebraic dependencies only.':'この記録には CRT-2 の計算手順や途中の剰余は入っていません。図は式の上の依存関係だけを示します。'}</p>
   <h4>{en?'One combined computation, reused by its components':'一つの計算を、どの成分で使うか'}</h4>
   <p>{en?'The diagram reduces this combined construction modulo each prime-power component. Coloured lines identify terms with nonzero coefficients in that component. Multiple coloured borders mean the same computed value contributes to multiple components.':'図は、まとめた構成を各素数べきの法で見たものです。色の線は、その成分で係数がゼロにならない項を示します。複数の色の枠は、一度計算した同じ値が複数の成分に寄与することを表します。'}</p>
   <div className="molecule-graph-scroll"><svg width="960" height={height} viewBox={`0 0 960 ${height}`} data-molecule-graph={m} aria-label={en?'Limbs to planes to products to prime-power components':'リムから面、積、素数べきの成分へのつながり'}>
    {[['リム','Limbs',75],['面','Planes',310],['積','Products',575],['素数べきの成分','Prime-power components',850]].map(([ja,eng,x])=><text key={String(x)} x={x} y="19" textAnchor="middle" fontSize="13">{en?eng:ja}</text>)}
    {(['A','B'] as const).flatMap(side=>source.planes[side].flatMap((plane,pi)=>plane.flatMap((c,li)=>{
     if(!c)return [];const lii=li+(side==='B'?source.weights.A.length:0),pii=pi+(side==='B'?source.planes.A.length:0),active=!product||(side==='A'?product.a:product.b)===pi;
     return <path key={`${side}-${pi}-${li}`} d={curve(116,y(lii,source.weights.A.length+source.weights.B.length),260,y(pii,source.planes.A.length+source.planes.B.length))} fill="none" stroke="#6E6E6E" strokeWidth={active?1.3:.7} opacity={active?.5:.1}><title>{side}{li} → {side}{pi}: {c}</title></path>;
    })))}
    {source.products.flatMap((p,i)=>(['A','B'] as const).map(side=>{const pi=side==='A'?p.a:source.planes.A.length+p.b;return <path key={`${i}-${side}`} d={curve(360,y(pi,source.planes.A.length+source.planes.B.length),525,y(i,source.products.length))} fill="none" stroke="#6E6E6E" strokeWidth="1.5" opacity={selected===null||selected===i?.65:.1}/>;}))}
    {sharing.terms.flatMap((uses,t)=>uses.map((used,c)=>used===true&&<path key={`${t}-${c}`} data-sharing-edge={`${t}:${c}`} d={curve(625,y(t,source.products.length),814,y(c,parts.length))} fill="none" stroke={color(c)} strokeWidth="2" opacity={selected===null||selected===t?.75:.08}/>))}
    {(['A','B'] as const).flatMap(side=>source.weights[side].map((weight,i)=>{const yy=y(i+(side==='B'?source.weights.A.length:0),source.weights.A.length+source.weights.B.length);return <g key={`${side}${i}`} data-limb-node={`${side}${i}`}><rect x="34" y={yy-14} width="82" height="28" rx="4" fill="#fff" stroke="#6E6E6E"/>{sharing.limbs[side][i].map((used,c)=>used===true&&<line key={c} x1={38+c*6} x2={38+c*6} y1={yy-10} y2={yy+10} stroke={color(c)} strokeWidth="3"/>)}<text x="80" y={yy+4} textAnchor="middle" fontSize="12">{side} {en?'limb':'リム'} {i}</text><title>{en?'Weight':'重み'} {weight}</title></g>;}))}
    {(['A','B'] as const).flatMap(side=>source.planes[side].map((coefficients,i)=>{const yy=y(i+(side==='B'?source.planes.A.length:0),source.planes.A.length+source.planes.B.length);return <g key={`${side}${i}`} data-plane-node={`${side}${i}`}><rect x="260" y={yy-14} width="100" height="28" rx="4" fill="#fff" stroke="#6E6E6E"/>{sharing.planes[side][i].map((used,c)=>used===true&&<line key={c} x1={264+c*6} x2={264+c*6} y1={yy-10} y2={yy+10} stroke={color(c)} strokeWidth="3"/>)}<text x="314" y={yy+4} textAnchor="middle" fontSize="12">{side} {en?'plane':'面'} {i}</text><title>{coefficients.join(', ')}</title></g>;}))}
    {source.products.map((p,i)=>{const yy=y(i,source.products.length);return <g key={i} data-product-node={i} role="button" tabIndex={0} aria-label={`${en?'Saved product':'保存した積'} T${i}`} aria-pressed={selected===i} onClick={()=>setSelected(selected===i?null:i)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setSelected(selected===i?null:i);}}}><rect x="525" y={yy-14} width="100" height="28" rx="4" fill="#fff" stroke={selected===i?'#1A1A1A':'#6E6E6E'} strokeWidth={selected===i?2:1}/>{sharing.terms[i].map((used,c)=>used===true&&<line key={c} x1={529+c*6} x2={529+c*6} y1={yy-10} y2={yy+10} stroke={color(c)} strokeWidth="3"/>)}<text x="579" y={yy+4} textAnchor="middle" fontSize="12">A{p.a} × B{p.b}</text><title>{en?'Reconstruction coefficient':'復元係数'} {p.numerator} / {source.denominator}</title></g>;})}
    {comparison.components.map((q,i)=>{const yy=y(i,parts.length);return <g key={q}><circle cx="850" cy={yy} r="34" fill="#fff" stroke={color(i)} strokeWidth="2"/><text x="850" y={yy+4} textAnchor="middle" fontSize="14">{q}</text><text x="895" y={yy+4} fontSize="11">{sharing.status[i]==='checked'?'✓':'?'}</text></g>;})}
   </svg></div></details>
   {sharing.status.some(v=>v!=='checked')&&<p>{en?'Some component links are unconfirmed: the denominator is not invertible, folded planes cannot be projected term by term, or the polynomial check does not apply. No links are inferred for those components.':'未確認の成分があります。分母の逆数が無い場合、成分の法ごとに面の折り返しを項ごとに対応付けられない場合、係数の照合が成り立たない場合には、その成分への線を引いていません。'}</p>}
   <p>{en?'The diagram uses the combined construction’s limbs and encodings. It does not assert that these match the independently selected component constructions above, or that sharing counts equal the product reduction.':'図のリムと符号化は、まとめた構成のものです。上段で別々に選んだ成分の構成との一致や、共有する積の数と削減数の一致を示すものではありません。'}</p>
   <details><summary>{en?'Coefficients and source':'係数と元データ'}</summary><p><a href={import.meta.env.BASE_URL+row!.source}>{row!.id}</a></p><p>{en?'Weights':'重み'} A ({source.weights.A.join(', ')}) / B ({source.weights.B.join(', ')})</p><div className="polar-table-scroll"><table><thead><tr><th>{en?'Product':'積'}</th><th>A {en?'plane coefficients':'面の係数'}</th><th>B {en?'plane coefficients':'面の係数'}</th><th>{en?'Reconstruction coefficient':'復元係数'}</th><th>{en?'Components':'成分'}</th></tr></thead><tbody>{source.products.map((p,i)=><tr key={i}><td>T{i}</td><td>{source.planes.A[p.a].join(', ')}</td><td>{source.planes.B[p.b].join(', ')}</td><td>{p.numerator} / {source.denominator}</td><td>{comparison.components.filter((_,c)=>sharing.terms[i][c]===true).join(', ')||'—'}</td></tr>)}</tbody></table></div></details>
  </>}
 </details>;
}
