import {useLayoutEffect,useState} from 'react';
import katex from 'katex';
import {Formula} from './PaperFigures.tsx';
import {productSequence} from './productSequence.ts';
import {useMeasuredWidth} from './useMeasuredWidth.ts';
type Row={modulus:number;a:bigint|null;b:bigint|null;result:bigint|null;products:number};
type Line={tex:string;size:number};

// Measure with the same KaTeX and subscript styles as the visible formulas.
// The temporary element is removed before paint; fonts loading triggers a recheck.
function useFormulaWidths(lines:Line[]){
 const key=JSON.stringify(lines),[widths,setWidths]=useState<number[]>([]);
 useLayoutEffect(()=>{let active=true;const measure=()=>{
  if(!active)return;
  const probe=document.createElement('div');probe.className='svg-math';
  Object.assign(probe.style,{position:'absolute',visibility:'hidden',pointerEvents:'none',width:'max-content',left:'0',top:'0'});
  const math=document.createElement('span');math.className='math';probe.append(math);document.body.append(probe);
  try{const next=(JSON.parse(key) as Line[]).map(({tex,size})=>{probe.style.fontSize=`${size}px`;math.innerHTML=katex.renderToString(tex,{throwOnError:false,strict:'ignore',output:'html'});return Math.ceil(math.getBoundingClientRect().width)+18;});setWidths(old=>old.length===next.length&&old.every((v,i)=>v===next[i])?old:next);}finally{probe.remove();}
 };measure();document.fonts.ready.then(measure);return()=>{active=false;};},[key]);
 return widths;
}

export function CRTFlow({a,b,rows,selected,result,onSelect}:{a:bigint;b:bigint;rows:Row[];selected:number;result?:bigint;onSelect:(i:number)=>void}){
 const {ref,width:measured}=useMeasuredWidth();
 const input={tex:`A=${a},\\quad B=${b}`,size:18},output={tex:`\\mathrm{CRT}:\\quad C=${result??'?'}`,size:19};
 const branchLines=rows.map((r,i)=>[
  {tex:`\\operatorname{mod}\\;${r.modulus}`,size:17},{tex:`(${r.a??'?'},${r.b??'?'})`,size:17},
  {tex:productSequence(r.products),size:17},{tex:`r_{${i}}=${r.result??'?'}`,size:17},
 ]);
 const widths=useFormulaWidths([input,output,...branchLines.flat()]);
 const gap=14,available=Math.max(1,(measured||360)-40),inputWidth=widths[0]??140,outputWidth=widths[1]??140;
 let band=0,cursor=0;
 const positions=rows.map((_,i)=>{
  const residue=Math.max(widths[2+4*i]??100,widths[3+4*i]??100),product=Math.max(widths[4+4*i]??100,widths[5+4*i]??100),box=Math.max(residue,product);
  if(cursor&&cursor+box>available){band++;cursor=0;}
  const x=20+cursor;cursor+=box+gap;return {x,y:92+band*225,band,box,residue,product,middle:x+box/2};
 });
 const bands=band+1,columns=Math.max(0,...Array.from({length:bands},(_,b)=>positions.filter(p=>p.band===b).length));
 const width=Math.max(inputWidth+40,outputWidth+40,...positions.map(p=>p.x+p.box+20)),end=80+bands*225,height=end+75;
 const inputX=(width-inputWidth)/2,outputX=(width-outputWidth)/2;
 return <div className="crt-flow-wrap" ref={ref}><svg width={width} height={height} data-crt-flow="true" data-columns={columns} aria-label="入力から各法の剰余と積へ分岐しCRTへ合流する図">
 <defs><marker id="crt-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10" fill="#1A1A1A"/></marker></defs>
 <g data-crt-node="input"><rect x={inputX} y="1" width={inputWidth} height="44" fill="#FFFFFF" stroke="#1A1A1A"/>
 <g data-crt-caption="true"><Formula x={inputX+8} y={6} w={inputWidth-16} h={32} tex={input.tex} size={input.size}/></g></g>
 <path d={`M${inputX+inputWidth} 45H${width-8}V${65+(bands-1)*225}`} fill="none" stroke="#1A1A1A"/>
 <path d={`M8 260V${end+12}H${width/2}V${end+20}`} fill="none" stroke="#1A1A1A" markerEnd="url(#crt-arrow)"/>
 {Array.from({length:bands},(_,band)=>{const inBand=positions.filter(p=>p.band===band),cy=65+band*225;return <g key={band}><path d={`M${width-8} ${cy}H${inBand[0]?.middle??20}`} fill="none" stroke="#1A1A1A"/><path d={`M${inBand.at(-1)?.middle??20} ${cy+195}H8`} fill="none" stroke="#1A1A1A"/></g>;})}
 {rows.map((r,i)=>{const {x,y,box,residue,product,middle}=positions[i],rx=middle-residue/2,px=middle-product/2,chosen=selected===i,lines=branchLines[i];return <g key={i} data-crt-branch={r.modulus} role="button" tabIndex={0} aria-label={`mod ${r.modulus}`} aria-pressed={chosen} onClick={()=>onSelect(i)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onSelect(i);}}}>
 <rect x={x} y={y-27} width={box} height="195" fill="none" pointerEvents="all"/>
 <line x1={middle} x2={middle} y1={y-27} y2={y} stroke="#1A1A1A" markerEnd="url(#crt-arrow)"/>
 <g data-crt-node="residue"><rect x={rx} y={y} width={residue} height="62" fill={chosen?'#FCEBDB':'#E2F1F8'} stroke={chosen?'#C2185B':'#0288D1'} strokeWidth={chosen?3:1}/>
 <Formula x={rx+8} y={y+2} w={residue-16} h={25} tex={lines[0].tex} size={17}/><Formula x={rx+8} y={y+27} w={residue-16} h={30} tex={lines[1].tex} size={17}/></g>
 <line x1={middle} x2={middle} y1={y+62} y2={y+88} stroke="#1A1A1A" markerEnd="url(#crt-arrow)"/>
 <g data-crt-node="product"><rect x={px} y={y+88} width={product} height="65" fill={chosen?'#FCEBDB':'#F7E5ED'} stroke={chosen?'#C2185B':'#884499'} strokeWidth={chosen?3:1}/>
 <Formula x={px+8} y={y+90} w={product-16} h={25} tex={lines[2].tex} size={17}/><Formula x={px+8} y={y+116} w={product-16} h={32} tex={lines[3].tex} size={17}/></g>
 <line x1={middle} x2={middle} y1={y+153} y2={y+168} stroke="#1A1A1A"/>
 </g>;})}
 <g data-crt-node="output"><rect x={outputX} y={end+20} width={outputWidth} height="48" fill="#FCEBDB" stroke="#EF6C00"/>
 <g data-crt-caption="true"><Formula x={outputX+8} y={end+29} w={outputWidth-16} h={36} tex={output.tex} size={output.size}/></g></g>
 </svg></div>;
}
