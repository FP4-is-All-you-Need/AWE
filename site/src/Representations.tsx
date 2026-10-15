import {RepresentationRange} from './RepresentationRange.tsx';
import {useEffect,useState} from 'react';
import {Formula,MathText} from './PaperFigures.tsx';
import {useMeasuredWidth} from './useMeasuredWidth.ts';
import {integer,modulo} from './savedEncoding.ts';
import type {RepresentationSpec,Representations as Result} from './representations.ts';
function useRepresentations(spec:RepresentationSpec|null){
 const key=JSON.stringify(spec),[state,setState]=useState<{key:string;data:Result}|null>(null);
 useEffect(()=>{const worker=new Worker(new URL('./representations.worker.ts',import.meta.url),{type:'module'});worker.onmessage=e=>setState({key,data:e.data});worker.onerror=()=>setState({key,data:{complete:false,reason:'unknown',combinations:0,accepted:0,values:{}}});worker.postMessage(JSON.parse(key));return()=>worker.terminate();},[key]);
 return state?.key===key?state.data:null;
}
export function Representations({spec,value,zoom,onSelect,adopted,rangeName}:{spec:RepresentationSpec|null;value:string;zoom:number;onSelect:(v:string)=>void;adopted:(v:bigint)=>number[]|undefined;rangeName?:string}){
 const {ref,width:measured}=useMeasuredWidth(),width=measured||360;
 const data=useRepresentations(spec),centre=integer(value)??0n;
 if(integer(value)===null)return <div ref={ref}><p role="status">整数のみ</p></div>;
 if(!data)return <div ref={ref}><p role="status">計算中</p></div>;
 if(!data.complete)return <div ref={ref}><p role="status">{data.reason==='limit'?'列挙数の上限':'未計算'}</p></div>;
 const candidates=(n:bigint)=>data.values[String(spec?.modulus?modulo(n,BigInt(spec.modulus)):n)]??[];
 const half=Math.max(1,Math.min(20,Math.floor((width-64)/zoom/2))),spacing=Math.max(zoom,Math.max(String(centre-BigInt(half)).length,String(centre+BigInt(half)).length)*9+8);
 const visibleHalf=Math.max(1,Math.min(half,Math.floor((width-64)/spacing/2))),visibleCount=2*visibleHalf+1,left=(width-(visibleCount-1)*spacing)/2;
 const positions=Array.from({length:visibleCount},(_,i)=>{const value=centre+BigInt(i-visibleHalf);return {value,rows:candidates(value),saved:adopted(value)};}),maxCount=Math.max(1,...positions.map(p=>p.rows.length)),baseline=34+maxCount*16,height=baseline+45,rows=integer(value)===null?[]:candidates(centre),saved=adopted(centre);
 return <div ref={ref} data-enumeration-complete="true" data-enumerated={data.combinations} data-representations={rows.length}>
 <p>表現数：{rows.length}{spec?.modulus?<> <MathText tex={`\\operatorname{mod}\\;${spec.modulus}`}/></>:null}</p>
 <>{rangeName?<RepresentationRange values={data.values} modulus={spec?.modulus} scope={rangeName} value={String(spec?.modulus?modulo(centre,BigInt(spec.modulus)):centre)} width={width} zoom={zoom} onSelect={onSelect} adopted={adopted}/>:<div className="paper-scroll representation-line"><svg width={width} height={height} aria-label="全表現の重複と整数の数直線"><line x1={left} y1={baseline} x2={width-left} y2={baseline} stroke="#1A1A1A"/>{positions.map(({value:n,rows:tuples,saved:chosen},i)=>{
 const count=tuples.length,x=left+i*spacing;return <g key={String(n)} role="button" tabIndex={0} data-value={String(n)} data-count={count} data-hole={!count} aria-pressed={n===centre} onClick={()=>onSelect(String(n))} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onSelect(String(n));}}}><title>{String(n)}: {count}</title><rect x={x-spacing/2} y="0" width={spacing} height={height} fill="#FFFFFF" fillOpacity="0" pointerEvents="all"/>
 <rect data-density={count} x={x-9} y={baseline-count*16-8} width="18" height={count*16+8} fill="#0288D1" fillOpacity={count?.08+.4*Math.log2(1+count)/Math.log2(1+maxCount):0}/>
 {tuples.map((tuple,j)=><circle key={tuple.join()} data-representation={tuple.join(',')} data-adopted={tuple.join()===chosen?.join()} cx={x} cy={baseline-16*(j+1)} r="6" fill="#FFFFFF" stroke={tuple.join()===chosen?.join()?'#D81B60':'#0288D1'} strokeWidth={tuple.join()===chosen?.join()?2:1} strokeDasharray={tuple.join()===chosen?.join()?'3 2':undefined}><title>({tuple.join(', ')})</title></circle>)}
 <circle cx={x} cy={baseline} r={n===centre?9:4} fill={count?'#FFFFFF':'#C62828'} stroke={!count?'#C62828':n===centre?'#D81B60':'#1A1A1A'} strokeWidth={n===centre?2:1}/><Formula x={x-spacing/2} y={baseline+13} w={spacing} h={30} tex={String(n)} size={14}/></g>;
 })}</svg></div>}</>

 {rows.length===0&&<p data-enumerated-hole="true">Hole</p>}
 {!saved&&<p>表の採用値なし</p>}
 {saved&&!rows.some(row=>row.join()===saved.join())&&<p role="alert">符号化が格納集合の外</p>}
 <div className="encoding-candidates all-representations">{rows.map(tuple=>{const chosen=tuple.join()===saved?.join();return <span data-candidate={tuple.join(',')} data-adopted={chosen} key={tuple.join()}><svg width="20" height="20" aria-hidden="true"><circle cx="10" cy="10" r="7" fill="#FFFFFF" stroke={chosen?'#D81B60':'#0288D1'} strokeWidth={chosen?2:1} strokeDasharray={chosen?'3 2':undefined}/></svg><MathText tex={`(${tuple.join(',')})`}/>{chosen?' 表の採用値':''}</span>;})}</div>
 </div>;
}
