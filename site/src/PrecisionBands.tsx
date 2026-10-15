import {useLayoutEffect,useRef,useState} from 'react';
import {useMeasuredWidth} from './useMeasuredWidth.ts';
import {Formula} from './PaperFigures.tsx';

const FORMATS=[
 {id:'fp64',label:'FP64',s:1,e:11,m:52,implicit:true},
 {id:'fp32',label:'FP32',s:1,e:8,m:23,implicit:true},
 {id:'bf16',label:'BF16',s:1,e:8,m:7,implicit:true},
 {id:'fp16',label:'FP16',s:1,e:5,m:10,implicit:true},
 {id:'fp8',label:'FP8 E4M3',s:1,e:4,m:3,implicit:true},
 {id:'fp4',label:'FP4 E2M1',s:1,e:2,m:1,implicit:true},
 {id:'int8',label:'INT8',s:1,e:0,m:7,implicit:false},
];
// Bit-field layout and colors follow the floating-point format diagram.
// p:spPr/a:solidFill/a:srgbClr and a:ln/a:solidFill: white bit boundaries.
const COLORS=['#EEEEEE','#CDEFFC','#FFE2BD'];
const INK='#1A1A1A',ACCENT='#55B9DB';

export function PrecisionBands({precision,bits,onSelect}:{precision:string;bits:number;onSelect:(id:string)=>void}){
 const last=useRef(precision==='custom'?(new URLSearchParams(location.search).get('precision_basis')??'fp64'):precision);
 if(precision!=='custom'){
  last.current=precision;const q=new URLSearchParams(location.search);q.set('precision_basis',precision);history.replaceState(null,'','?'+q.toString());
 }
 const basis=last.current.replace('complex_',''),integer=/^int([4-8])$/.exec(basis);
 const active=FORMATS.find(f=>f.id===basis)??(integer?{id:basis,label:basis.toUpperCase(),s:1,e:0,m:Number(integer[1])-1,implicit:false}:FORMATS[0]);
 const formats=FORMATS.some(f=>f.id===active.id)?FORMATS:[...FORMATS,active];
 const measured=useMeasuredWidth();
 // Keep a common bit scale. Each S/E/M field has one label; narrow fields
 // keep labels inside the strip; a narrow fraction label may extend right.
 const width=Math.max(280,measured.width||280),left=8,top=54;
 const unit=Math.min(36,(width-left-44)/64);

 const rowY:number[]=[top];for(let i=1;i<formats.length;i++)rowY.push(rowY[i-1]+(formats[i].id===active.id?88:64));
 const height=rowY.at(-1)!+38;
 return <details open data-section="precision-bands" className="precision-bands" style={{fontSize:16}}><summary>形式ごとのビット数</summary>
 <div className="precision-figure" ref={measured.ref}><svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-label="入力形式の符号、指数、仮数のビット配置">
 {formats.map((format,index)=>{
 const y=rowY[index],selected=format.id===active.id;
 const mantissaX=left+(format.s+format.e)*unit;
 const available=format.m+(format.implicit?1:0),usedStored=Math.min(format.m,Math.max(0,bits-(format.implicit?1:0))),overrun=bits>available;
 return <g key={`${format.id}:${index}`} data-format={format.id} data-bit-width={unit} role="button" tabIndex={0} aria-label={`${format.label}：符号 ${format.s}、指数 ${format.e}、仮数 ${format.m} ビット`} aria-pressed={selected} onClick={()=>onSelect(format.id)} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();onSelect(format.id);}}} style={{cursor:'pointer'}}>
 <rect x={1} y={y-(selected?52:28)} width={width-2} height={selected?88:64} fill="#FFFFFF" stroke={selected?ACCENT:'#FFFFFF'} strokeWidth={selected?2:1}/>
 <text data-format-label x={12} y={y-8} textAnchor="start" fontSize={16} fontWeight={selected?700:400}>{format.label}</text>
 <BitFields format={format} unit={unit} left={left} y={y}/>
 {selected&&<>
 <path d={`M ${mantissaX} ${y-4} v -5 H ${mantissaX+usedStored*unit} v 5`} stroke={INK} fill="none"/>
 <line data-b-marker data-b={bits} data-used-stored={usedStored} x1={mantissaX+usedStored*unit} y1={y-12} x2={mantissaX+usedStored*unit} y2={y+34} stroke={INK} strokeWidth={2}/>
 <Formula x={100} y={y-49} w={Math.min(300,width-108)} h={26} tex={`b=${bits}\\quad ${overrun?`\\text{ビット数超過 }+${bits-available}`:`\\text{使用 }${bits}/${available}`}`} size={16}/>
 </>}
 </g>;
 })}
 </svg></div>
 <div className="paper-legend precision-legend">{['符号','指数','仮数'].map((label,i)=><span key={label} data-precision-legend={i}><i style={{background:COLORS[i]}}/>{label}</span>)}</div>
 </details>;
}


type BitFormat={id:string;s:number;e:number;m:number;implicit:boolean};
function BitFields({format,unit,left,y}:{format:BitFormat;unit:number;left:number;y:number}){
 const ref=useRef<SVGGElement>(null),[shifts,setShifts]=useState({S:0,E:0,M:0,hidden:0});
 let cursor=left;
 const fields=[format.s,format.e,format.m].flatMap((count,group)=>{
  const x=cursor;cursor+=count*unit;if(!count)return [];
  const symbol=(['S','E','M'] as const)[group],w=group===0?18:count>=10?44:34,narrow=count*unit<w+4;
  return [{count,group,x,symbol,w,labelX:group===2&&narrow?x+(20-w)/2:x+(count*unit-w)/2,
   tex:group===0?'\\mathrm{S}':`\\mathrm{${symbol}}${narrow?'':'\\,'}${count}`}];
 });
 const storedEnd=cursor;
 useLayoutEffect(()=>{
  const row=ref.current;if(!row)return;
  const measure=()=>{
   if(ref.current!==row)return;
   const matrix=row.getScreenCTM();if(!matrix)return;
   const base=(selector:string,inkSelector:string)=>{
    const group=row.querySelector(selector) as SVGGElement,ink=group.querySelector(inkSelector)!.getBoundingClientRect(),shift=Number(group.dataset.shift??0);
    return {left:(ink.left-matrix.e)/matrix.a-shift,right:(ink.right-matrix.e)/matrix.a-shift};
   };
   const boxes=fields.map(f=>base(`[data-field-label=${f.symbol}]`,'.katex-html'));
   const ordered=format.id==='fp4'||boxes.some((box,i)=>i>0&&box.left<boxes[i-1].right+.5);
   // Keep the wide FP4 row unchanged; separate labels only when they have
   // to move beyond their fields at the common bit scale.
   const displacedFP4=format.id==='fp4'&&fields.some((field,i)=>i>0&&field.x<fields[i-1].x+boxes[i-1].right-boxes[i-1].left+1.25);
   const gap=displacedFP4?4.25:1.25;
   const next={S:0,E:0,M:0,hidden:0};let end=-Infinity;
   fields.forEach((field,i)=>{
    const box=boxes[i],start=ordered?Math.max(field.x,end+gap):box.left;
    next[field.symbol]=start-box.left;end=box.right+next[field.symbol];
   });
   if(format.implicit){const box=base('[data-implicit-bit]','rect');next.hidden=Math.max(0,end+4.25-box.left);}
   setShifts(old=>Object.keys(next).every(k=>Math.abs(old[k as keyof typeof next]-next[k as keyof typeof next])<.02)?old:next);
  };
  measure();document.fonts.ready.then(measure);
  const observer=new ResizeObserver(measure);row.querySelectorAll('.katex-html').forEach(n=>observer.observe(n));
  return()=>observer.disconnect();
 },[unit,format.id]);
 return <g ref={ref} data-bit-fields>
  <g data-bit-backgrounds>{fields.map(field=><g key={field.symbol} data-bit-group={field.symbol}>
   {Array.from({length:field.count},(_,bit)=><g key={bit} data-bit={`${field.symbol}${field.group?field.count-1-bit:''}`}>
    <title>{`${field.symbol}${field.group?field.count-1-bit:''}`}</title>
    <rect x={field.x+bit*unit} y={y} width={unit} height={26} fill={COLORS[field.group]} stroke="#FFFFFF" strokeWidth={1}/>
   </g>)}
  </g>)}</g>
  <g data-bit-labels>{fields.map(field=><g key={field.symbol} data-field-label={field.symbol} data-field-bits={field.count} data-label-position="inside" data-field-start={field.x} data-shift={shifts[field.symbol]} transform={`translate(${shifts[field.symbol]},0)`}>
   <Formula x={field.labelX} y={y+3} w={field.w} h={25} tex={field.tex} size={14}/>
  </g>)}</g>
  {format.implicit&&<g data-implicit-bit data-shift={shifts.hidden} transform={`translate(${shifts.hidden},0)`}><rect x={storedEnd+12} y={y} width={24} height={34} fill="#FFFFFF" stroke={INK} strokeDasharray="3 3"/><Formula x={storedEnd+12} y={y+7} w={24} h={27} tex="1" size={14}/></g>}
 </g>;
}
