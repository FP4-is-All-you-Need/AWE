import {correctionLabel} from './wording.ts';
import {SideDetails} from './SideDetails.tsx';
import {useLanguage,translate} from './i18n.tsx';
import {useLimbOrder} from './useLimbOrder.ts';
import {blockPairs,type LimbOrder} from './limbOrder.ts';
import {CompactExpansion} from './CompactExpansion.tsx';
import {productBaseColor,coefficientColor,productFillOpacity} from './compact.ts';
import {DifferenceDiagram,differencePlan} from './DifferenceDiagram.tsx';
import {useParameter,bounded} from './parameters.ts';
import {useState,useContext} from 'react';
import {MatrixSplit} from './MatrixSplit.tsx';
import {DimensionContext} from './Dimensions.tsx';
import {Formula,MathText} from './PaperFigures.tsx';
import {PlaneFlow,SavedPlaneValues} from './PlaneFlow.tsx';
import {holeLabel,residual,type Construction} from './visual.ts';

export const linear=(v:number[],s:string)=>v.map((n,i)=>n?`${n<0?'-':'+'}${Math.abs(n)===1?'':Math.abs(n)}${s}_{${i}}`:'').join('').replace(/^\+/,'')||'0';
export function Expansion({c:stored,scope=""}:{c:Construction;scope?:string}){
 const dimensions=useContext(DimensionContext),lang=useLanguage();
 const key=(name:string)=>scope+name+'.'+stored.id;
 const {order,setOrder,view:c}=useLimbOrder(stored,scope),blocks=blockPairs(c);
 const [selected,setSelected]=useParameter<number|null>(key('product_index'),null,r=>r===''?null:bounded(r,0,c.products.length-1,0),v=>v===null?'':String(v)),[showValues,setShowValues]=useParameter(key('plane_values'),false,r=>r==='1',v=>v?'1':'0');
 const [layout,setLayout]=useParameter(key('expansion_layout'),Math.max(c.weights.A.length,c.weights.B.length)>=4?'compact':'products',r=>r==='compact'?'compact':'products');
 const n=c.weights.B.length,m=c.weights.A.length,cell=54,gap=54,gridW=n*cell,gridH=m*cell,panel=Math.max(gridW,150)+gap,top=65;
 const diff=residual(c),consistent=diff?.every(row=>row.every(x=>x==='0'));
 const equation=`${c.denominator===1?'':c.denominator}AB${c.modulus?'\\equiv':'='}${c.products.map((p,i)=>`${p.numerator!==null&&p.numerator<0?'-':i?'+':''}\\textcolor{${coefficientColor(c,i)}}{${p.numerator===null?'?':Math.abs(p.numerator)}T_{${i}}}`).join('')}${c.modulus?`\\pmod{${c.modulus}}`:''}`;
 const selectPlane=(side:'A'|'B',idx:number)=>{const i=c.products.findIndex(p=>p[side==='A'?'a':'b']===idx);setSelected(i<0?null:i);};
 return <details data-section={scope+'detail.'+c.id} className="construction-detail" open><summary className="selected-mod"><MathText tex={c.modulus?`\\operatorname{mod}\\;${c.modulus}`:'\\text{整数の構成}'}/> の詳細：{c.products.length}積、面 A {c.faces_a} / B {c.faces_b??'未測定'}</summary>
 <form name={scope+'limb_order.'+c.id} onSubmit={e=>e.preventDefault()}><label>リムの並び <select name="limb_order" data-url-key={key('limb_order')} value={order} onChange={e=>setOrder(e.target.value as LimbOrder)}><option value="stored">保存順</option><option value="weight">重み順</option><option value="block">ブロック順</option></select></label></form>
 {stored.integer&&<p data-integer-domain>被覆範囲 <MathText tex={`A\\in[${stored.integer.domain.A}],\\quad B\\in[${stored.integer.domain.B}]`}/></p>}
 <p data-limb-weights="true"><MathText tex={`w_{A}=(${c.weights.A.join(',')}),\\quad w_{B}=(${c.weights.B.join(',')})`}/></p>
 {blocks?<p data-block-label="true">ブロック Karatsuba：{blocks.A.length*blocks.B.length} 組。<MathText tex={`A:\\;${blocks.A.map(p=>'('+p.map(i=>c.weights.A[i]).join(',')+')').join('\\mid')},\\quad B:\\;${blocks.B.map(p=>'('+p.map(i=>c.weights.B[i]).join(',')+')').join('\\mid')},\\quad ${blocks.A.length*blocks.B.length}\\times3=${c.products.length}`}/></p>:order==='block'&&<p>対応するブロック配置なし</p>}
 {c.plane_moduli&&<p data-plane-moduli><MathText tex={`m_A=(${c.plane_moduli.A}),\\quad m_B=(${c.plane_moduli.B})`}/></p>}
 {c.limbs_stored&&<p data-limb-storage>{(['A','B'] as const).map(side=><span key={side}>{side}: {c.limbs_stored![side].every(Boolean)?'FP4 格納':<>FP4に格納しないリム <MathText tex={c.limbs_stored![side].flatMap((stored,i)=>stored?[]:[`${side.toLowerCase()}_{${i}}`]).join(',')}/></>} </span>)}</p>}
 {c.correction&&c.canonical?.correction?.source_cost?.correction_rel_mma!==undefined&&<p data-correction-source-cost>補正の費用比（元資料） <MathText tex={`\\times ${c.canonical.correction.source_cost.correction_rel_mma}`}/></p>}
 <p className="equation"><MathText tex={equation}/></p>
 {!consistent&&<p>{diff===null?'未測定':`係数式のずれ（行A・列B）：${diff[0].map((_,i)=>diff.map(row=>row[i])).map(r=>'('+r.join(',')+')').join(' ')}`}</p>}
 <form name={scope+'expansion_view.'+c.id} onSubmit={e=>e.preventDefault()}><label>展開図の表示 <select name="expansion_layout" data-url-key={key('expansion_layout')} value={layout} onChange={e=>setLayout(e.target.value==='compact'?'compact':'products')}><option value="products">積ごと</option><option value="compact">まとめた形</option></select></label></form>
 <div className="paper-scroll">{layout==='compact'?<CompactExpansion c={c} selected={selected} onSelect={setSelected}/>:differencePlan(c)?<DifferenceDiagram c={c} selected={selected} onSelect={setSelected}/>:<svg data-expansion={c.id} width={(c.products.length+1)*panel} height={top+gridH+100} viewBox={`0 0 ${(c.products.length+1)*panel} ${top+gridH+100}`} aria-label="全項の格子と面の積の和">
 {Array.from({length:c.products.length+1},(_,index)=>{const x=28+index*panel,p=c.products[index-1],av=p&&c.planes?.A[p.a],bv=p&&c.planes?.B[p.b],color=index?coefficientColor(c,index-1):'#1A1A1A';
 return <g key={index} data-product={index-1} data-product-index={index?index-1:undefined} data-block-color={index?color:undefined} role={index?'button':undefined} tabIndex={index?0:undefined} aria-label={index?`積 ${index}`:'全項'} aria-pressed={selected===index-1} onClick={()=>index&&setSelected(index-1)} onKeyDown={e=>{if(index&&(e.key==='Enter'||e.key===' ')){e.preventDefault();setSelected(index-1);}}}>
 {index>0&&<Formula x={x-gap-28} y={top+gridH/2-16} w={gap-8} h={40} tex={index===1?(c.modulus?'\\equiv':'='):'+'} size={24}/>}
 <Formula x={x+(gridW-Math.max(gridW,110))/2} y={0} w={Math.max(gridW,110)} h={38} tex={index?`${p.numerator??'?'}T_{${index-1}}`:'w_{i}w_{j}a_{i}b_{j}'} size={20} color={color}/>
 {c.weights.B.map((w,j)=><Formula key={j} x={x+j*cell} y={top-30} w={cell} h={28} tex={String(w)} size={18}/>)}
 {c.weights.A.map((w,i)=><Formula key={i} x={x-28} y={top+i*cell+15} w={28} h={30} tex={String(w)} size={18}/>)}
 {Array.from({length:n},(_,j)=>Array.from({length:m},(_,i)=>{const coefficient=index?(av?.[i]??0)*(bv?.[j]??0):(c.weights.A[i]*c.weights.B[j])%(c.modulus||Infinity);return <g key={`${i},${j}`}><rect data-expansion-cell={`${index}:${i}:${j}`} data-cell-coefficient={coefficient} x={x+j*cell} y={top+i*cell} width={cell} height={cell} fill={index?productBaseColor(c,index-1):'#000000'} fillOpacity={coefficient?(index?productFillOpacity(c,index-1):.061):0} stroke="#9E9E9E" strokeWidth=".65"/>{coefficient!==0&&<Formula x={x+j*cell} y={top+i*cell+14} w={cell} h={40} tex={`${index&&coefficient!==1?(coefficient===-1?'-':coefficient):''}a_{${i}}b_{${j}}`} size={20}/>}</g>;}))}
 {index>0&&av&&bv&&(()=>{const xs=bv.flatMap((v,i)=>v?[i]:[]),ys=av.flatMap((v,i)=>v?[i]:[]);if(!xs.length||!ys.length)return null;return <rect x={x+Math.min(...xs)*cell+2} y={top+Math.min(...ys)*cell+2} width={(Math.max(...xs)-Math.min(...xs)+1)*cell-4} height={(Math.max(...ys)-Math.min(...ys)+1)*cell-4} fill="none" stroke={color} strokeWidth={selected===index-1?3:2}/>;})()}
 {selected===index-1&&<rect x={x-4} y={top-4} width={gridW+8} height={gridH+8} fill="none" stroke="#1A1A1A" strokeWidth="2"/>}
 <Formula x={x-15} y={top+gridH+9} w={panel-10} h={40} tex={index&&av?`(${linear(av,'a')})`:'A=\\sum_{i} w_{i} a_{i}'} size={20}/>
 <Formula x={x-15} y={top+gridH+46} w={panel-10} h={40} tex={index&&bv?`(${linear(bv,'b')})`:'B=\\sum_{j} w_{j} b_{j}'} size={20}/>
 </g>;})}</svg>}</div>
 <p>穴 {holeLabel(c)}{c.hole_values?.length?`（${c.hole_values.join(', ')}）`:null}。補正：{c.correction?(c.correction.kind==='nearest_shift'&&c.correction.max_abs_shift!==undefined?`近い値へずらす ±${c.correction.max_abs_shift}`:<>補正の種類：<span>{correctionLabel(c.correction.kind)}</span></>):c.carry?'記録あり':c.block_shift?'塊ずらし':c.integer?'不要':c.canonical?'不要':'未収録'}。<MathText tex={'K_{\\max}='+String(c.max_k??'\\text{未測定}')}/>。</p>
 {c.correction?.kind==='nearest_shift'&&<p><MathText tex={'AB=A_{0}B_{0}+\\delta_{A} B+A_{0}\\delta_{B}'}/></p>}
 <form name={scope+'expansion.'+c.id} onSubmit={e=>e.preventDefault()}><label>積を選択 <select name="product_index" data-url-key={key('product_index')} value={selected??''} onChange={e=>setSelected(e.target.value===''?null:Number(e.target.value))}><option value="">未選択</option>{c.products.map((_,i)=><option key={i} value={i}>積 {i+1}</option>)}</select></label><label><input type="checkbox" name="plane_values" data-url-key={key('plane_values')} checked={showValues} onChange={e=>{setShowValues(e.target.checked);if(e.target.checked&&selected===null)setSelected(0);}}/> 面の値 <MathText tex={'S=2\\times\\mathrm{E2M1}'}/></label></form>
 {showValues&&selected!==null&&<div className="selected-values">{(['A','B'] as const).map(side=><SideDetails key={side} c={c} side={side} kind="plane-values" matching={c.products[selected].a===c.products[selected].b}><strong>{translate('{side} 側・積 {index} の面',lang).replace('{side}',side).replace('{index}',String(selected+1))}</strong><SavedPlaneValues c={c} side={side} plane={c.products[selected][side==='A'?'a':'b']}/></SideDetails>)}</div>}
 <details data-section={scope+'flow.'+c.id}><summary>面を作る流れ（A / B）</summary>{(['A','B'] as const).map(side=><SideDetails key={side} c={c} side={side} kind="flow"><PlaneFlow c={c} side={side} selectedProduct={selected} onSelectPlane={idx=>selectPlane(side,idx)} showValues={showValues}/></SideDetails>)}</details>
 <MatrixSplit c={c} scope={scope} selectedProduct={selected} {...dimensions} onTerm={(i,j)=>{const term=c.products.findIndex(p=>c.planes?.A[p.a][i]&&c.planes?.B[p.b][j]);setSelected(term<0?null:term);}}/>
 <Encoding c={c} scope={scope}/>

 </details>;
}
function Encoding({c,scope}:{c:Construction;scope:string}){
 const key=(name:string)=>scope+name+'.'+c.id;
 const [input,setInput]=useParameter(key('encode_value'),'12',r=>r),[side,setSide]=useParameter<'A'|'B'>(key('encode_side'),'A',r=>r==='B'?'B':'A'),[zoom,setZoom]=useParameter(key('encode_zoom'),28,r=>bounded(r,28,100,28));
 const valid=/^-?\d+$/.test(input),r=valid?(c.modulus?Number(((BigInt(input)%BigInt(c.modulus))+BigInt(c.modulus))%BigInt(c.modulus)):Number.isSafeInteger(Number(input))?Number(input):null):null;
 const lut=c.saved_encoding?.[side]??c.canonical?.encoding[side];
 const get=(v:number)=>Array.isArray(lut)?lut[v]:lut?.[String(v)],tuple=r===null?undefined:get(r);
 const start=Math.max(c.encoding_domain?.[0]??0,(r??0)-10),end=Math.max(start,Math.min(c.encoding_domain?c.encoding_domain[1]+1:c.modulus,start+41));
 return <details data-section={scope+'encoding.'+c.id} className="encoding"><summary>符号化表と数直線</summary><span>{c.additional?.encoding_origin==='fixed_construction_enumeration'?'検算用':'保存表'}</span>
 <form name={scope+'encoding.'+c.id} className="paper-controls" onSubmit={e=>e.preventDefault()}><label>整数 <input name="encode_value" data-url-key={key('encode_value')} value={input} onChange={e=>setInput(e.target.value)} inputMode="numeric"/></label><label>入力側 <select name="encode_side" data-url-key={key('encode_side')} value={side} onChange={e=>setSide(e.target.value as 'A'|'B')}><option>A</option><option>B</option></select></label><label>拡大 <input type="range" name="encode_zoom_range" min="28" max="100" value={zoom} onChange={e=>setZoom(Number(e.target.value))}/><input name="encode_zoom" data-url-key={key('encode_zoom')} type="number" min="28" max="100" value={zoom} onChange={e=>setZoom(bounded(e.target.value,28,100,28))}/></label></form>
 {!lut?<p>未収録</p>:!valid?<p>整数のみ</p>:<><p><MathText tex={c.modulus?`${input}\\equiv ${r}\\pmod{${c.modulus}}`:`${input}`}/>：{tuple?<MathText tex={`(${tuple.join(',')})`}/>:'穴'}</p>

 <div className="paper-scroll"><svg width={(end-start)*zoom+30} height={100} aria-label="符号化表の剰余の数直線"><line x1="15" y1="40" x2={(end-start)*zoom} y2="40" stroke="#1A1A1A"/>{Array.from({length:end-start},(_,i)=>{const v=i+start,x=15+i*zoom;return <g key={v} role="button" tabIndex={0} aria-label={`${c.modulus?'剰余':'整数'} ${v}`} onClick={()=>setInput(String(v))} onKeyDown={e=>{if(e.key==='Enter')setInput(String(v));}}><circle cx={x} cy="40" r={v===r?9:6} fill={get(v)?'#E2F1F8':'#FFFFFF'} stroke={get(v)?'#0288D1':'#C62828'} strokeDasharray={get(v)?'3 2':undefined}/><text x={x} y="70" textAnchor="middle" fontSize="14">{v}</text></g>;})}</svg></div></>}
 </details>;
}
