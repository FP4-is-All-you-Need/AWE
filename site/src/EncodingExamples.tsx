import {Base13Hierarchy} from './Base13Hierarchy.tsx';
import {useEffect,useState} from 'react';
import {read} from './catalog.ts';
import {MathText} from './PaperFigures.tsx';
import type {Construction} from './visual.ts';
import {integer,savedTuple,weightedTuple,type EncodingTable as Table} from './savedEncoding.ts';
import {Representations} from './Representations.tsx';
import {base13Spec,representationSpec} from './representations.ts';
import {useLimbOrder} from './useLimbOrder.ts';
function AweLine({selected,side,value,zoom,onSelect}:{selected:Construction;side:'A'|'B';value:string;zoom:number;onSelect:(v:string)=>void}){
 const {view:c}=useLimbOrder(selected),n=integer(value),tuple=n===null?undefined:savedTuple(c,n,side);
 return <section data-number-line="awe" data-construction={c.id}><h3>AWE — 選択中の構成 {c.modulus>0&&<MathText tex={`\\operatorname{mod}\\;${c.modulus}`}/>}</h3><p><MathText tex={`w_{${side}}=(${c.weights[side].join(',')})`}/></p><p className="awe-encoding-equation">{tuple?<MathText tex={`${value}${c.modulus?'\\equiv':'='}${tuple.map((v,i)=>`(${v})\\cdot ${c.weights[side][i]}`).join('+')}${c.modulus?`\\pmod{${c.modulus}}`:''}`}/>:c.hole_values?.includes(Number(value))?'Hole':'未収録'}</p><Representations key={c.id+side} rangeName="awe_line_" spec={representationSpec(c,side)} value={value} zoom={zoom} onSelect={onSelect} adopted={n=>savedTuple(c,n,side)}/>{tuple&&<p><MathText tex={`\\sum_{i} w_{i} a_{i}=${weightedTuple(tuple,c.weights[side])}`}/></p>}</section>;
}
export function EncodingExamples({selected}:{selected?:Construction}){
 const q=new URLSearchParams(location.search),[data,setData]=useState<{tables:Table[]}>(),[error,setError]=useState(''),[value,setValue]=useState(q.get('encode_int')??q.get('encode_integer')??'1000'),[separateValue,setSeparateValue]=useState(q.get('awe_encode_int')??q.get('encode_int')??'1000'),[shared,setShared]=useState(q.get('encode_shared')!=='0'),[method,setMethod]=useState(q.get('encode_method')??'min_nonzero'),[side,setSide]=useState<'A'|'B'>(q.get('encode_example_side')==='B'?'B':'A'),[zoom,setZoom]=useState(Number(q.get('encode_scale'))||28);
 useEffect(()=>{read<{tables:Table[]}>('visualization/encoding-examples.json').then(setData).catch(e=>setError(e instanceof Error?e.message:String(e)));},[]);
 useEffect(()=>{const q=new URLSearchParams(location.search);q.set('encode_int',value);q.delete('encode_integer');q.set('awe_encode_int',shared?value:separateValue);q.set('encode_shared',shared?'1':'0');q.set('encode_method',method);q.set('encode_scale',String(zoom));q.set('encode_example_side',side);history.replaceState(null,'','?'+q.toString());},[value,separateValue,shared,method,zoom,side]);
 useEffect(()=>{if(data&&new URLSearchParams(location.search).get('section')==='numberline'){const d=document.getElementById('numberline') as HTMLDetailsElement|null;if(d){d.open=true;requestAnimationFrame(()=>d.scrollIntoView({block:'start'}));}}},[data]);
 const focusSection=()=>{const q=new URLSearchParams(location.search);q.set('section','numberline');q.set('open.encoding-example','1');history.replaceState(null,'','?'+q);};
 const editBase=(v:string)=>{focusSection();setValue(v);};
 const editAwe=(v:string)=>{focusSection();if(shared)setValue(v);else setSeparateValue(v);};
 if(error)return <p>{error}</p>;if(!data)return <p>読込中</p>;
 const table=data.tables.find(t=>t.method===method)??data.tables[0],tuple=integer(value)!==null?table.values[String(integer(value))]:undefined;
 return <details id="numberline" data-section="encoding-example" className="encoding-examples" open><summary>数直線（基数13とAWE）</summary><form name="encoding_example" className="paper-controls" onSubmit={e=>e.preventDefault()}><label>整数の入力 <select name="encode_shared" value={shared?'1':'0'} onChange={e=>{focusSection();setSeparateValue(value);setShared(e.target.value==='1');}}><option value="1">基数13とAWEで共有</option><option value="0">別々に入力</option></select></label><label>入力側 <select name="encode_example_side" value={side} onChange={e=>setSide(e.target.value as 'A'|'B')}><option>A</option><option>B</option></select></label><label>選び方 <select name="encode_method" value={method} onChange={e=>setMethod(e.target.value)}><option value="min_nonzero">非零リムが少ない順</option><option value="frozen_residue">剰余の代表を固定</option></select></label><label>数直線の拡大 <input name="encode_scale_range" type="range" min="20" max="80" value={zoom} onChange={e=>setZoom(Number(e.target.value))}/><input name="encode_scale" type="number" min="20" max="80" value={zoom} onChange={e=>{const n=Number(e.target.value);if(n>=20&&n<=80)setZoom(n);}}/></label></form>
 <section data-number-line="base13"><h3>基数13</h3><p><MathText tex={'(w_{0},w_{1},w_{2})=(1,13,169)'}/></p>
 <form name="base13_integer" className="paper-controls" onSubmit={e=>e.preventDefault()}><label>整数 <input name="encode_int" value={value} onChange={e=>editBase(e.target.value)} inputMode="numeric" maxLength={100}/></label></form><Base13Hierarchy value={value} onSelect={editBase} saved={tuple}/>
 <details data-section="base13-representations" open><summary>全表現と表の採用値</summary><p className="encoding-equation">{tuple?<MathText tex={`${value}=${tuple.map((v,i)=>`${v<0?'('+v+')':v}\\cdot ${table.weights[i]}`).join('+')}`}/>:'範囲外（−128〜127）'}</p>
 <Representations rangeName="base13_line_" spec={base13Spec(table.weights)} value={value} zoom={zoom} onSelect={editBase} adopted={n=>table.values[String(n)]}/>

 </details>
 </section>{selected?<><form name="awe_integer" className="paper-controls" onSubmit={e=>e.preventDefault()}><label>AWE の整数 <input name="awe_encode_int" value={shared?value:separateValue} onChange={e=>editAwe(e.target.value)} inputMode="numeric" maxLength={100}/></label></form><AweLine selected={selected} side={side} value={shared?value:separateValue} zoom={zoom} onSelect={editAwe}/></>:<p>未選択</p>}
 <div data-numberline-legend><p>丸：表現、点線：表の採用値、赤：穴、青：表現数</p><p>表現数：棒=最大、線=平均、赤=穴の割合</p></div>
 </details>;
}
