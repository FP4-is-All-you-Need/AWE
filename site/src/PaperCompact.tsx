import {DIRECT_FILL_OPACITY,PLANE_FILL_OPACITY,productBaseColor,directColor,coefficientColor} from './compact.ts';
import {originalIndices} from './limbOrder.ts';
import {useLayoutEffect,useRef,useState} from 'react';
import {Formula,MathText} from './PaperFigures.tsx';
import {blockFormula,pLabel,weightScale,type CompactBlock} from './compactBlocks.ts';
import type {Construction} from './visual.ts';
// Coordinates from fig_m12_compact.py, in inches multiplied by 288.
// Text uses bundled KaTeX; minimum 14px and square corners follow the UI rules.
export function PaperCompact({c,blocks,selected,onSelect}:{c:Construction;blocks:CompactBlock[];selected:number|null;onSelect:(i:number)=>void}){
 blocks=blocks.map(b=>({...b,color:coefficientColor(c,b.product)}));
 const u=288,cell=.25*u,gap=.17*u,left=.40*u,top=.34*u,n=c.weights.B.length,m=c.weights.A.length,pw=n*cell,width=left+(blocks.length+2)*pw+(blocks.length+1)*gap+.06*u,height=top+m*cell+210;

 const showOriginal=!!c.display_indices;
 const positions=Array.from({length:blocks.length+2},(_,i)=>left+i*(pw+gap)),ink='#1A1A1A',rank=[0,.07,.14,.22];
 const tex=(x:number,y:number,w:number,text:string,size=20,color=ink)=><Formula x={x} y={y-size*.63} w={w} h={size*1.8} tex={text} size={size} color={color}/>;
 const click=(product:number)=>({role:'button',tabIndex:0,onClick:()=>onSelect(product),onKeyDown:(e:React.KeyboardEvent)=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onSelect(product);}}});
 return <svg data-expansion={c.id} data-compact-expansion="true" data-paper-compact="true" width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-label="全項と直接積と面の積をまとめた格子">
 {positions.map((x,g)=><g key={g} data-compact-grid={g}>
 {g===0&&<>{c.weights.B.map((w,i)=><g key={i}><rect x={x+i*cell} y={top-(.10+.045)*u} width={cell} height={.09*u} fill="#000000" fillOpacity={rank[Math.min(i,3)]}/>{tex(x+i*cell,top-.24*u,cell,`b_{${i}}`,28)}{tex(x+i*cell,top-.10*u,cell,`\\times ${w}`,24)}</g>)}{c.weights.A.map((w,j)=><g key={j}><rect x={x-.22*u} y={top+j*cell} width={.165*u} height={cell} fill="#000000" fillOpacity={rank[Math.min(j,3)]}/>{tex(x-.39*u,top+(j+.5)*cell,.15*u,`a_{${j}}`,28)}{tex(x-.23*u,top+(j+.5)*cell,.19*u,`\\times ${w}`,24)}</g>)}</>}
 {c.weights.B.flatMap((_,j)=>c.weights.A.map((_,i)=>{
 const owner=blocks.find(b=>b.a.includes(i)&&b.b.includes(j))!,block=g>=2?blocks[g-2]:owner,inBlock=block.a.includes(i)&&block.b.includes(j),direct=block.direct.find(t=>t.i===i&&t.j===j),cross=block.cross.find(t=>t.i===i&&t.j===j),product=g>=2?block.product:direct?.product??block.product,isSelected=selected===product,xx=x+j*cell,yy=top+i*cell,filled=g===1?!!direct:g>=2?!!cross:false,directInk=directColor(c,i,j),color=g===1?directInk:block.color;
 const math=g>=2&&!inBlock?'':g===0?`a_{${i}}b_{${j}}`:g===1?(direct?pLabel(i,j):''):direct?`${-direct.subtract===-1n?'-':-direct.subtract===1n?'':-direct.subtract}${pLabel(i,j)}`:`a_{${i}}b_{${j}}`;
 return <g key={`${i}:${j}`} {...(g<2||inBlock?click(product):{})} aria-label={`積 ${product+1}`} aria-pressed={isSelected} data-compact-cell={`${g}:${i}:${j}`} data-product-index={product} data-block-color={color}>
 {g===0?<><rect x={xx} y={yy} width={cell} height={cell} fill="#000000" fillOpacity={rank[Math.min(i,3)]}/><rect x={xx} y={yy} width={cell} height={cell} fill="#000000" fillOpacity={rank[Math.min(j,3)]}/></>:filled&&<rect data-compact-fill="true" data-scale={g===1?String(direct!.scale):String(cross!.scale)} data-coefficient={g>=2?String(block.numerator):undefined} x={xx} y={yy} width={cell} height={cell} fill={g===1?directInk:productBaseColor(c,block.product)} fillOpacity={g===1?DIRECT_FILL_OPACITY:PLANE_FILL_OPACITY}/>}
 <rect x={xx} y={yy} width={cell} height={cell} fill="none" stroke="#9E9E9E" strokeWidth={.45*u/72}/>
 {g>=2&&direct&&<line data-cancelled-term={pLabel(i,j)} x1={xx+.032*u} y1={yy+cell-.032*u} x2={xx+cell-.032*u} y2={yy+.032*u} stroke={block.color} strokeOpacity=".85" strokeWidth={.8*u/72}/>}
 {math&&<g data-cancellation-label={g>=2&&direct?true:undefined}>{g===1&&showOriginal?<Formula x={xx} y={yy+2} w={cell} h={25} tex={math} size={22} color={directInk}/>:tex(xx,yy+cell*.5-(g===1?.046*u:0),cell,math,g>=2&&direct?22.4:g===1?28.8:25.6,g===1?directInk:g>=2?block.color:ink)}</g>}
 {g===1&&direct&&showOriginal&&<g data-original-product={`${i}:${j}`} data-stored-product={`${originalIndices(c,'A')[i]}:${originalIndices(c,'B')[j]}`}><Formula x={xx} y={yy+27} w={cell} h={18} tex={`[${pLabel(originalIndices(c,'A')[i],originalIndices(c,'B')[j])}]`} size={14}/></g>}
 {g===1&&direct&&<g data-direct-scale={String(direct.scale)}><ScaleLabel x={xx+2} y={showOriginal?yy+46:yy+cell*.5+.054*u-14} width={cell-4} tex={`\\times ${weightScale(c,direct.scale)}`} maximum={showOriginal?14:21.2}/></g>}
 {g===1&&direct&&<rect x={xx+.016*u} y={yy+.016*u} width={cell-.032*u} height={cell-.032*u} fill="none" stroke={directInk} strokeWidth={isSelected?4:.8*u/72}/>}
 {isSelected&&(g<2||inBlock)&&<rect x={xx+1} y={yy+1} width={cell-2} height={cell-2} fill="none" stroke={g===1?directInk:block.color} strokeWidth="4"/>}
 </g>;
 }))}
 {Array.from({length:n/2+1},(_,i)=><line key={'v'+i} x1={x+i*2*cell} x2={x+i*2*cell} y1={top} y2={top+m*cell} stroke="#4A4A4A" strokeWidth={1.1*u/72} pointerEvents="none"/>)}
 {Array.from({length:m/2+1},(_,j)=><line key={'h'+j} x1={x} x2={x+pw} y1={top+j*2*cell} y2={top+j*2*cell} stroke="#4A4A4A" strokeWidth={1.1*u/72} pointerEvents="none"/>)}
 {g>=2&&[blocks[g-2]].map(b=><rect data-compact-block={b.product} data-coefficient={String(b.numerator)} key={b.product} x={x+b.b[0]*cell+.02*u} y={top+b.a[0]*cell+.02*u} width={2*cell-.04*u} height={2*cell-.04*u} stroke={b.color} strokeWidth={b.product===selected?5:Math.max(2,.9*u/72)} fill="none" pointerEvents="none"/>)}
 </g>)}
 {positions.slice(1).map((x,index)=>tex(x-gap,top+m*cell/2,gap,index===0?(c.modulus?'\\equiv':'='):'+',36))}
 <g data-compact-caption="direct"><foreignObject x={positions[1]} y={top-.29*u} width={pw} height={.14*u}><div className="compact-caption"><FormulaInline tex={'P_{ij}=a_{i}b_{j}'}/><span>{blocks.length*2} 直接積</span></div></foreignObject><foreignObject x={positions[1]} y={top-.15*u} width={pw} height={.14*u}><div className="compact-caption"><span>各セルの尺</span><FormulaInline tex={'w_{i}w_{j}'}/></div></foreignObject></g>
 {blocks.map((block,index)=>{const x=positions[index+2],formula=blockFormula(c,block);return <g key={block.product} data-compact-formula={block.product} data-formula-block={`${block.column}:${block.row}`}>
 {tex(x,top-42,pw,`Q_{${block.column}${block.row}}`,24,block.color)}
 <rect x={x} y={top+m*cell+16} width={pw} height={184} fill="none" stroke={block.color} strokeWidth="2"/>
 {formula.map((f,i)=><Formula key={i} x={x+4} y={top+m*cell+22+i*43} w={pw-8} h={40} tex={f.replace(/\\color\{#[0-9A-Fa-f]{6}\}/g,`\\color{${block.color}}`)} size={16}/>)}
 </g>;})}

 </svg>;
}
function FormulaInline({tex,color}:{tex:string;color?:string}){return <span style={{color}}><MathText tex={tex}/></span>;}

function ScaleLabel({x,y,width,tex,maximum=21.2}:{x:number;y:number;width:number;tex:string;maximum?:number}){
 const ref=useRef<HTMLSpanElement>(null),[size,setSize]=useState(maximum);
 useLayoutEffect(()=>{const span=ref.current;if(!span)return;const measured=span.getBoundingClientRect().width;if(measured>width+.1)setSize(s=>Math.max(14,s*width/measured));},[tex,width,size]);
 return <foreignObject x={x} y={y} width={width} height={26}><div className="svg-math" style={{fontSize:size}}><span ref={ref} style={{flexShrink:0}}><MathText tex={tex}/></span></div></foreignObject>;
}
