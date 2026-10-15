import {useEffect,useMemo,useRef} from 'react';
import {useParameter} from './parameters.ts';
import {Formula,MathText} from './PaperFigures.tsx';
import {integer} from './savedEncoding.ts';
import {countPoints,coverageInterval,densityBins,zoomInterval,type Interval} from './numberLine.ts';

export function RepresentationRange({values,value,width,scope,zoom,onSelect,adopted,modulus=0}:{values:Record<string,number[][]>;value:string;width:number;scope:string;zoom:number;onSelect:(v:string)=>void;adopted:(v:bigint)=>number[]|undefined;modulus?:number}){
 const [mode,setMode]=useParameter<'full'|'contiguous'>(scope+'range','full',r=>r==='contiguous'?'contiguous':'full'),[positive,setPositive]=useParameter(scope+'positive',false,r=>r==='1',v=>v?'1':'0');
 const [left,setLeft]=useParameter(scope+'left','',r=>integer(r)===null?'':r),[right,setRight]=useParameter(scope+'right','',r=>integer(r)===null?'':r);
 const points=useMemo(()=>countPoints(values),[values]),bounds=useMemo(()=>coverageInterval(points,mode,positive),[points,mode,positive]);
 const fallback=bounds??{left:positive?1n:0n,right:positive?1n:0n};
 const initial=useRef({zoom:Number(new URLSearchParams(location.search).get(scope+'zoom'))||1,pan:new URLSearchParams(location.search).has(scope+'pan')?(Number(new URLSearchParams(location.search).get(scope+'pan'))||0):null});
 const initialRange=zoomInterval(fallback,Math.max(.000001,initial.current.zoom)),initialOffset=BigInt(Math.round(Number(fallback.right-fallback.left+1n)*(initial.current.pan??0)/100));
 const rawLeft=integer(left)??(initial.current.pan===null?initialRange.left:fallback.left+initialOffset),lo=positive&&rawLeft<1n?1n:modulus&&rawLeft<0n?0n:modulus&&rawLeft>=BigInt(modulus)?BigInt(modulus-1):rawLeft,rawRight=integer(right)??((initial.current.pan===null?initialRange.left:fallback.left+initialOffset)+(initialRange.right-initialRange.left)),hi=modulus&&rawRight>=BigInt(modulus)?BigInt(modulus-1):rawRight;
 const range={left:lo,right:hi<lo?lo:hi},span=range.right-range.left+1n,fullSpan=fallback.right-fallback.left+1n;
 const centre=integer(value),plotWidth=Math.max(100,width-64),bins=densityBins(points,range,Math.floor(plotWidth)),max=Math.max(1,...points.map(p=>p.count));
 const setRange=(r:Interval)=>{if(modulus){const low=positive?1n:0n,high=BigInt(modulus-1),length=r.right-r.left+1n;r.left=r.left<low?low:r.left>high?high:r.left;r.right=r.left+length-1n;r.right=r.right>high?high:r.right;}if(positive&&r.left<1n){r={left:1n,right:r.right+(1n-r.left)};}setLeft(String(r.left));setRight(String(r.right));};
 const reset=()=>{initial.current={zoom:1,pan:null};setLeft('');setRight('');};
 const scale=Number(fullSpan)/Number(span),pan=Number(range.left-fallback.left)/Number(fullSpan)*100;
 // Exact end points are the URL authority. Derived controls also have named values.
 useEffect(()=>{const q=new URLSearchParams(location.search);q.set(scope+'zoom',String(scale));q.set(scope+'pan',String(pan));history.replaceState(null,'','?'+q.toString()+location.hash);},[scope,scale,pan]);
 const prior=useRef({zoom,value});
 useEffect(()=>{if(prior.current.zoom!==zoom){const n=integer(value)??0n,length=BigInt(Math.max(1,Math.floor(plotWidth/zoom)));setRange({left:n-length/2n,right:n-length/2n+length-1n});}else if(prior.current.value!==value&&centre!==null&&(!positive||centre>0n)&&(centre<range.left||centre>range.right)){setRange({left:centre-span/2n,right:centre-span/2n+span-1n});}prior.current={zoom,value};},[zoom,value]);
 const drag=useRef<{x:number;range:Interval;moved:boolean}|null>(null),suppressClick=useRef(false);
 const choose=(n:bigint)=>{if(!suppressClick.current)onSelect(String(n));};
 const zoomTo=(factor:number,anchor=.5)=>{if(Number.isFinite(factor)&&factor>0)setRange(zoomInterval(range,factor,anchor));};
 const labelWidth=Math.max(String(range.left).length,String(range.right).length)*9+12;
 const baseline=180,height=230,spacing=plotWidth/bins.length,detailed=span<=BigInt(Math.max(1,Math.floor(plotWidth/Math.max(22,labelWidth))));
 const svgRef=useRef<SVGSVGElement>(null);
 useEffect(()=>{const svg=svgRef.current;if(!svg)return;const wheel=(e:WheelEvent)=>{e.preventDefault();const rect=svg.getBoundingClientRect();zoomTo(e.deltaY>0?.8:1.25,Math.min(1,Math.max(0,(e.clientX-rect.left-32)/plotWidth)));};svg.addEventListener('wheel',wheel,{passive:false});return()=>svg.removeEventListener('wheel',wheel);},[range.left,range.right,width,positive,modulus]);
 const movePan=(v:string)=>{const n=Number(v);if(Number.isFinite(n)){const l=fallback.left+BigInt(Math.round(Number(fullSpan)*n/100));setRange({left:l,right:l+span-1n});}};
 return <div data-range-line={scope} data-range-left={String(range.left)} data-range-right={String(range.right)}>
 <form name={scope+'controls'} className="number-line-controls" onSubmit={e=>e.preventDefault()}>
 <label>範囲 <select name={scope+'range'} value={mode} onChange={e=>{setMode(e.target.value as 'full'|'contiguous');reset();}}><option value="full">とり得る全ての範囲</option><option value="contiguous">連続整数範囲</option></select></label>
 <label><input type="checkbox" name={scope+'positive'} checked={positive} onChange={e=>{setPositive(e.target.checked);reset();}}/> 正の値のみ</label>
 <label>左端 <input name={scope+'left'} type="number" step="1" value={String(range.left)} onChange={e=>{const n=integer(e.target.value);if(n!==null)setRange({left:n,right:n>range.right?n:range.right});}}/></label>
 <label>右端 <input name={scope+'right'} type="number" step="1" value={String(range.right)} onChange={e=>{const n=integer(e.target.value);if(n!==null)setRange({left:n<range.left?n:range.left,right:n});}}/></label>
 <label>横へ移動 <input name={scope+'pan_range'} type="range" min="0" max="100" step="any" value={Math.min(100,Math.max(0,pan))} onChange={e=>movePan(e.target.value)}/><input name={scope+'pan'} type="number" step="any" value={Number(pan.toPrecision(8))} onChange={e=>movePan(e.target.value)}/> %</label>
 <label>拡大倍率 <input name={scope+'zoom'} type="number" step="any" min="0.000001" value={Number(scale.toPrecision(8))} onChange={e=>{const n=Number(e.target.value);if(n>0)zoomTo(n/scale);}}/></label>
 <button name={scope+'reset'} type="button" onClick={reset}>範囲を戻す</button>
 </form>
 {!bounds&&<p>Hole</p>}

 <svg ref={svgRef} className="range-density" width={width} height={height} aria-label="表し方の数と穴の分布" style={{touchAction:'pan-y'}}
 onPointerDown={e=>{if(e.button!==0)return;suppressClick.current=false;drag.current={x:e.clientX,range,moved:false};}}
 onPointerMove={e=>{if(!drag.current)return;const offset=e.clientX-drag.current.x;if(Math.abs(offset)>4){drag.current.moved=true;suppressClick.current=true;if(!e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.setPointerCapture(e.pointerId);}if(drag.current.moved){const delta=BigInt(Math.round(-offset/plotWidth*Number(drag.current.range.right-drag.current.range.left+1n)));setRange({left:drag.current.range.left+delta,right:drag.current.range.right+delta});}}}
 onPointerUp={e=>{drag.current=null;if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);}} onPointerCancel={()=>{drag.current=null;}}>
 <line x1={32} x2={width-32} y1={baseline} y2={baseline} stroke="#1A1A1A"/>
 {bins.map((bin,i)=>{const single=bin.left===bin.right,x=32+i*spacing,barH=140*bin.maximum/max,meanH=140*bin.mean/max,tuples=single?(values[String(bin.left)]??[]):[],saved=single?adopted(bin.left):undefined,selected=centre!==null&&centre>=bin.left&&centre<=bin.right;
 return <g key={String(bin.left)} role="button" tabIndex={0} data-value={single?String(bin.left):undefined} data-bin-left={String(bin.left)} data-bin-right={String(bin.right)} data-count={single?bin.maximum:undefined} data-maximum={bin.maximum} data-mean={bin.mean} data-holes={String(bin.holes)} data-hole={single?!bin.maximum:undefined} aria-pressed={selected} onClick={()=>{if(suppressClick.current)return;if(single)choose(bin.left);else setRange({left:bin.left,right:bin.right});}} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();if(single)onSelect(String(bin.left));else setRange({left:bin.left,right:bin.right});}}}>
 <title>{single?String(bin.left):`${bin.left}…${bin.right}`} — 最大 {bin.maximum}、平均 {Number(bin.mean.toPrecision(4))}、穴 {String(bin.holes)}</title>
 <rect x={x} y={0} width={spacing} height={height} fill="#FFFFFF" fillOpacity={0}/>
 <rect data-density={bin.maximum} x={x+.2} y={baseline-barH} width={Math.max(.5,spacing-.4)} height={barH} fill="#0288D1" fillOpacity={.08+.4*Math.log2(1+bin.maximum)/Math.log2(1+max)}/>
 {!single&&<line x1={x} x2={x+spacing} y1={baseline-meanH} y2={baseline-meanH} stroke="#0288D1" strokeWidth={2}/>}
 {bin.holes>0n&&<rect x={x} y={baseline+2} width={spacing*Number(bin.holes)/Number(bin.right-bin.left+1n)} height={5} fill="#C62828"/>}
 {detailed&&tuples.length<=20&&tuples.map((tuple,j)=><circle key={tuple.join()} data-representation={tuple.join(',')} data-adopted={tuple.join()===saved?.join()} cx={x+spacing/2} cy={baseline-8-(j+.5)*132/max} r={5} fill="#FFFFFF" stroke={tuple.join()===saved?.join()?'#D81B60':'#0288D1'} strokeDasharray={tuple.join()===saved?.join()?'3 2':undefined}/>)}
 {selected&&<rect x={x} y={baseline-Math.max(16,barH)-3} width={Math.max(2,spacing)} height={Math.max(16,barH)+6} fill="none" stroke="#D81B60" strokeWidth={2}/>}
 {detailed&&<Formula x={x} y={baseline+12} w={spacing} h={34} tex={String(bin.left)} size={14}/>}
 </g>;})}
 {!detailed&&Array.from({length:5},(_,i)=>{const n=range.left+BigInt(i)*(span-1n)/4n;return <Formula key={i} x={i*plotWidth/4} y={baseline+12} w={64} h={34} tex={String(n)} size={14}/>;})}
 <Formula x={0} y={0} w={width} h={32} tex={`\\max=${max}\\quad n\\in[${range.left},${range.right}]`} size={14}/>
 </svg>

 <MathText tex={`[${range.left},${range.right}]`}/>
 </div>;
}
