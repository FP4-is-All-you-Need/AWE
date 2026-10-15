import {useRef} from 'react';

const clamp=(value:number)=>Math.max(0,Math.min(100,value));
export function HoleControl({percentages,max,onChange}:{percentages:(number|null)[];max:number;onChange:(n:number)=>void}){
 const svg=useRef<SVGSVGElement>(null),width=400,height=150,left=42,right=386,top=16,bottom=112,plotWidth=right-left;
 const bins=Array.from({length:100},()=>({accepted:0,excluded:0}));let unknown=0,accepted=0,excluded=0;
 for(const value of percentages){
 if(value===null||!Number.isFinite(value)||value<0||value>100){unknown++;continue;}
 const bin=bins[Math.min(99,Math.floor(value))];
 if(value<=max){bin.accepted++;accepted++;}else{bin.excluded++;excluded++;}
 }
 const peak=Math.max(1,...bins.map(bin=>bin.accepted+bin.excluded));
 const setFromPointer=(clientX:number)=>{
 const bounds=svg.current?.getBoundingClientRect();if(!bounds||bounds.width===0)return;
 onChange(Math.round(clamp(((clientX-bounds.left)*width/bounds.width-left)/plotWidth*100)*10)/10);
 };
 return <form name="coverage" onSubmit={event=>event.preventDefault()} style={{fontSize:16}} aria-label="穴の率の上限">
 <label style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>穴の率の上限<input type="number" name="hole_pct_max" aria-label="穴の率の上限（パーセント）" value={max} min={0} max={100} step="any" onChange={event=>{const value=event.currentTarget.valueAsNumber;if(Number.isFinite(value))onChange(clamp(value));}} style={{fontSize:16,width:90}}/>%</label>
 <div className="paper-scroll"><svg ref={svg} width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-label={`穴の率の分布。測定済み ${accepted+excluded} 件、上限以内 ${accepted} 件、除外 ${excluded} 件`} style={{touchAction:'none',cursor:'ew-resize'}} onPointerDown={event=>{event.currentTarget.setPointerCapture(event.pointerId);setFromPointer(event.clientX);}} onPointerMove={event=>{if(event.currentTarget.hasPointerCapture(event.pointerId))setFromPointer(event.clientX);}} onPointerUp={event=>{if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);}}>
 <text x={left} y={13} fontSize={14}>構成数</text>
 <line x1={left} y1={top} x2={left} y2={bottom} stroke="#242424"/>
 <line x1={left} y1={bottom} x2={right} y2={bottom} stroke="#242424"/>
 <text x={left-5} y={bottom+4} textAnchor="end" fontSize={14}>0</text>
 <text x={left-5} y={top+12} textAnchor="end" fontSize={14}>{peak}</text>
 {bins.map((bin,index)=>{
 const total=bin.accepted+bin.excluded,x=left+index*plotWidth/100,barWidth=plotWidth/100-.3,acceptedHeight=bin.accepted/peak*(bottom-top),excludedHeight=bin.excluded/peak*(bottom-top);
 return <g key={index} data-hole-bin={index} data-excluded={bin.excluded} data-accepted={bin.accepted}><title>{`${index}〜${index+1}%${index===99?'（100%を含む）':''}：${total} 件、上限以内 ${bin.accepted} 件、除外 ${bin.excluded} 件`}</title><rect x={x} y={bottom-acceptedHeight} width={barWidth} height={acceptedHeight} fill="#63B6DA"/><rect x={x} y={bottom-acceptedHeight-excludedHeight} width={barWidth} height={excludedHeight} fill="#E2F1F8"/></g>;
 })}
 <line x1={left+max/100*plotWidth} y1={top} x2={left+max/100*plotWidth} y2={bottom} stroke="#242424" strokeWidth={1} data-hole-max={max}/>
 {[0,25,50,75,100].map(value=><g key={value}><line x1={left+value/100*plotWidth} y1={bottom} x2={left+value/100*plotWidth} y2={bottom+4} stroke="#242424"/><text x={left+value/100*plotWidth} y={bottom+23} textAnchor="middle" fontSize={14}>{value}%</text></g>)}
 </svg></div>
 <div style={{width:344,maxWidth:'calc(100% - 42px)',marginLeft:42}}><input type="range" name="hole_pct_max_range" aria-label="穴の率の上限を変更" min={0} max={100} step={.1} value={max} onChange={event=>onChange(Number(event.target.value))} style={{width:'100%',margin:0,boxSizing:'border-box'}}/><div style={{display:'flex',justifyContent:'space-between',fontSize:14}}>{[0,25,50,75,100].map(value=><span key={value}>{value}</span>)}</div></div>
 <p style={{margin:'8px 0'}}>表示 {accepted}件 / 非表示 {excluded}件</p>
 <p style={{margin:'8px 0'}}>率未測定 {unknown} 件</p>
 </form>;
}
