import {PlaneSets} from './PlaneSets.tsx';
import {textInk,planeColor as sharedPlaneColor,DIRECT_FILL_OPACITY,PLANE_FILL_OPACITY,productBaseColor,coefficientColor,directColor,productFillOpacity} from './compact.ts';
import {originalIndices} from './limbOrder.ts';
import {useId} from 'react';
import {Formula,MathText} from './PaperFigures.tsx';
import type {Construction} from './visual.ts';

const nnz=(row:number[])=>row.filter(v=>v!==0).length;
const first=(row:number[])=>row.findIndex(v=>v!==0);
const expression=(row:number[],symbol:string)=>row.map((v,i)=>v===0?'':`${v<0?'-':'+'}${Math.abs(v)===1?'':Math.abs(v)}${symbol}_{${i}}`).join('').replace(/^\+/,'')||'0';

import {savedPlaneValues,FP4_VALUES} from './encoding.ts';
export function SavedPlaneValues({c,side,plane}:{c:Construction;side:'A'|'B';plane:number}){
 const values=savedPlaneValues(c,side,plane);
 if(values===null)return <p style={{fontSize:16,margin:'2px 0'}}>未測定</p>;
 const outside=values.filter(v=>!FP4_VALUES.includes(v));
 const residues=c.modulus>0?[...new Set(values.map(v=>((v%c.modulus)+c.modulus)%c.modulus))].sort((a,b)=>a-b):null;
 return <div className="paper-scroll" style={{fontSize:16,margin:'2px 0'}}>
 <div data-plane-band={`${side}.${plane}`} style={{display:'flex',width:450}} aria-label={`保存済み符号化の実値 ${values.join(', ')}`}>
 {FP4_VALUES.map(v=><span key={v} data-fp4-value={v} data-used={values.includes(v)} style={{width:30,flexShrink:0,textAlign:'center',fontSize:14,border:'1px solid #9E9E9E',background:values.includes(v)?'#E2F1F8':'#FFFFFF',color:values.includes(v)?'#1A1A1A':'#666666'}}><MathText tex={String(v)}/></span>)}
 </div>
 {c.modulus>0&&<div className="plane-residues"><MathText tex={`\\mathrm{mod}\\;${c.modulus}`}/><div style={{display:'flex',width:450}}>{FP4_VALUES.map(v=><span key={v} data-residue={((v%c.modulus)+c.modulus)%c.modulus} data-used={values.includes(v)} style={{width:30,flexShrink:0,textAlign:'center',fontSize:14,border:'1px solid #9E9E9E',background:values.includes(v)?'#E2F1F8':'#FFFFFF'}}><MathText tex={String(((v%c.modulus)+c.modulus)%c.modulus)}/></span>)}</div></div>}
 <p style={{margin:'2px 0'}}>使う値</p>
 {outside.length>0&&<p style={{margin:'2px 0'}}>Sの外：{outside.join(', ')}</p>}
 {residues&&<p style={{margin:'2px 0',overflowWrap:'anywhere'}}>合同な剰余：{residues.join(', ')}（法 {c.modulus}）</p>}
 </div>;
}

export function PlaneFlow({c,side,selectedProduct,onSelectPlane,showValues}:{c:Construction;side:'A'|'B';selectedProduct:number|null;onSelectPlane:(index:number)=>void;showValues:boolean}){
 const marker=useId().replace(/:/g,'');
 const rows=c.planes?.[side];
 if(!rows)return <p>未収録</p>;
 const symbol=side.toLowerCase(),single=rows.map((row,index)=>({row,index})).filter(p=>nnz(p.row)<=1);
 const groups=[rows.map((row,index)=>({row,index})).filter(p=>nnz(p.row)===2),rows.map((row,index)=>({row,index})).filter(p=>nnz(p.row)>=3)];
 groups.forEach(group=>group.sort((a,b)=>first(a.row)-first(b.row)||a.index-b.index));
 const active=selectedProduct===null?null:c.products[selectedProduct]?.[side==='A'?'a':'b'];
 const planeProduct=(index:number)=>{const products=c.products.flatMap((p,i)=>p[side==='A'?'a':'b']===index?[i]:[]);return products[0];};
 const planeColor=(index:number)=>sharedPlaneColor(c,side,index);
 const singleColumns=Math.max(1,...c.weights[side].map((_,i)=>single.filter(p=>first(p.row)===i).length)),sourceX=showValues?singleColumns*560:20,boxW=230*singleColumns,planeXs=[sourceX+boxW+140,sourceX+boxW+140+(showValues?790:400)],sourceBoxH=36,spacing=c.plane_moduli?86:56,top=62,portPitch=32;
 const columnSpacing=groups.map(group=>Math.max(64,...group.map(p=>(nnz(p.row)-1)*portPitch+36)));
 const sourceCount=c.weights[side].length;
 const height=top+Math.max((sourceCount-1)*spacing+sourceBoxH+(c.plane_moduli?24:0),...groups.map((g,column)=>g.length?g.length*columnSpacing[column]:0))+28;
 const width=groups[1].length?planeXs[1]+(showValues?920:260):groups[0].length?planeXs[0]+(showValues?920:260):Math.max(430,sourceX+boxW+20);
 const sourceY=(i:number)=>top+i*spacing;
 return <section data-plane-flow={side} data-flow-weights={c.weights[side].join(',')} data-flow-column-rows={groups.map(g=>g.length).join(',')} aria-label={`${side} 側のリムから面への流れ`} style={{fontSize:16}}>
 <div className="paper-scroll"><svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${side} 側：元のリム、2 リムの面、3 リム以上の面`}>
 <defs>{rows.map((_,index)=><marker key={index} id={`${marker}-${index}`} data-flow-arrowhead={index} markerUnits="userSpaceOnUse" viewBox="0 0 8 8" markerWidth="8" markerHeight="8" refX="8" refY="4" orient="auto"><path d="M 0 0 L 8 4 L 0 8 z" fill={planeColor(index)}/></marker>)}</defs>
 <text x={sourceX} y={28} fontSize={16}>元のリム（{sourceCount} リム）</text>
 <text x={sourceX} y={54} fontSize={14}>1リム以下を使う面：{single.length} 面</text>
 {groups.map((group,column)=>group.length>0&&<text key={column} x={planeXs[column]} y={28} fontSize={16}>{column===0?'2 リムの面':'3 リム以上の面'}（{group.length} 面）</text>)}
 {groups.flatMap((group,column)=>group.flatMap(({row,index},position)=>row.flatMap((coefficient,i)=>{
 if(coefficient===0)return [];
 const sources=row.flatMap((v,k)=>v?[k]:[]),port=sources.indexOf(i);
 const y1=sourceY(i)+sourceBoxH/2,y2=top+position*columnSpacing[column]+columnSpacing[column]/2+(port-(sources.length-1)/2)*portPitch,x1=sourceX+boxW,x2=planeXs[column]-32;
 const label=coefficient===1?'+':coefficient===-1?'-':coefficient>0?`+${coefficient}`:String(coefficient);
 const selected=active===index,color=planeColor(index),product=planeProduct(index);
 return [<g key={`${index}-${i}`} data-flow-link={index} data-flow-source={i} data-flow-port={port} data-flow-coefficient={coefficient} data-flow-end-x={x2} data-flow-end-y={y2} data-product-index={product} data-block-color={color} >
 <line data-flow-line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={selected?3:1.5} markerEnd={`url(#${marker}-${index})`}/>
 <g data-flow-label data-flow-coefficient={coefficient} data-flow-label-tex={label}><Formula x={planeXs[column]-25} y={y2-12} w={22} h={24} size={14} tex={label} color={color}/></g>
 </g>];
 })))}
 {c.weights[side].map((_,i)=>{
 const color=side==='A'?directColor(c,i,Math.min(i,c.weights.B.length-1)):directColor(c,Math.min(i,c.weights.A.length-1),i),sourcePlanes=single.filter(p=>first(p.row)===i);
 return <g key={i} data-flow-limb={i} data-original-index={originalIndices(c,side)[i]}>
 {!sourcePlanes.length&&<Formula x={sourceX} y={sourceY(i)} w={boxW} h={36} tex={`\\{${symbol}_{${i}}\\}`} size={20} color={color}/>}
 {sourcePlanes.map(({row,index},slot)=>{const product=planeProduct(index),ink=planeColor(index),selected=active===index;return <g key={index} data-flow-plane={index} data-product-index={product} data-block-color={ink} role="button" tabIndex={0} aria-label={`${side} の面 ${index+1}`} aria-pressed={selected} onClick={()=>onSelectPlane(index)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onSelectPlane(index);}}}>
 <rect data-flow-box="source" data-flow-paint x={sourceX+slot*230} y={sourceY(i)} width={230} height={sourceBoxH} fill={product===undefined?ink:productBaseColor(c,product)} fillOpacity={product===undefined?DIRECT_FILL_OPACITY:productFillOpacity(c,product)} stroke={ink} strokeWidth={selected?3:2}/>
 <foreignObject data-flow-destination x={sourceX+slot*230+8} y={sourceY(i)+3} width={104} height={30}><div className="svg-math" style={{justifyContent:'flex-start',fontSize:20,color:textInk(ink)}}><MathText tex={`\\{${expression(row,symbol)}\\}`}/></div></foreignObject>
 {showValues&&<InlinePlaneBand c={c} side={side} plane={index} x={20+slot*560} y={sourceY(i)-2}/>}
 <text data-flow-plane-label x={sourceX+slot*230+(c.plane_moduli?8:118)} y={sourceY(i)+(c.plane_moduli?52:22)} fontSize={14} fill={textInk(ink)}>面 {index+1} · T {c.products.flatMap((p,k)=>p[side==='A'?'a':'b']===index?[k+1]:[]).join(',')}{c.plane_moduli?` · mod ${c.plane_moduli[side][index]}`:''}</text>
 </g>;})}
 <Formula x={sourceX} y={sourceY(i)+(c.plane_moduli?58:36)} w={boxW} h={20} tex={`w=${c.weights[side][i]},\\;[${symbol}_{${originalIndices(c,side)[i]}}]`} size={14}/>
 </g>;
 })}

 {groups.flatMap((group,column)=>group.map(({row,index},position)=>{
 const y=top+(position+.5)*columnSpacing[column],selected=active===index,color=planeColor(index),product=planeProduct(index),uses=c.products.flatMap((p,i)=>p[side==='A'?'a':'b']===index?[i+1]:[]),values=showValues?savedPlaneValues(c,side,index):null;
 return <g key={index} data-flow-plane={index} data-product-index={product} data-block-color={color} role="button" tabIndex={0} aria-label={`${side} の面 ${index+1}`} aria-pressed={selected} style={{cursor:'pointer'}} onClick={()=>onSelectPlane(index)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onSelectPlane(index);}}}>
 <rect data-flow-paint x={planeXs[column]+4} y={y-18} width={244} height={36} fill={product===undefined?color:productBaseColor(c,product)} fillOpacity={product===undefined?PLANE_FILL_OPACITY:productFillOpacity(c,product)} stroke={color} strokeWidth={selected?3:2}/>
 <foreignObject data-flow-destination x={planeXs[column]+8} y={y-16} width={240} height={32}><div className="svg-math" style={{justifyContent:'flex-start',fontSize:20,color:textInk(color)}}><MathText tex={`\\{${expression(row,symbol)}\\}`}/></div></foreignObject>
 <text data-flow-plane-label x={planeXs[column]+(showValues?258:8)} y={y+(showValues?5:38)} fontSize={14} fill={textInk(color)}>面 {index+1} · T {uses.join(',')}{c.plane_moduli?` · mod ${c.plane_moduli[side][index]}`:''}</text>

 {values!==null&&<InlinePlaneBand c={c} side={side} plane={index} x={planeXs[column]+360} y={y-20}/>}

 </g>;
 }))}
 </svg></div>

 <PlaneSets c={c} side={side} onSelectPlane={onSelectPlane}/>
 </section>;
}

function InlinePlaneBand({c,side,plane,x,y}:{c:Construction;side:'A'|'B';plane:number;x:number;y:number}){
 const values=savedPlaneValues(c,side,plane);if(values===null)return null;
 const cells=(residue:boolean)=>FP4_VALUES.map(v=><span key={v} data-fp4-value={residue?undefined:v} data-residue={residue?((v%c.modulus)+c.modulus)%c.modulus:undefined} data-used={values.includes(v)} style={{width:30,flexShrink:0,textAlign:'center',fontSize:14,border:'1px solid #9E9E9E',background:values.includes(v)?'#E2F1F8':'#FFFFFF',color:values.includes(v)?'#1A1A1A':'#666666'}}><MathText tex={String(residue?((v%c.modulus)+c.modulus)%c.modulus:v)}/></span>);
 return <foreignObject data-flow-measured-values={plane} x={x} y={y} width={540} height={48}><div style={{fontSize:14}}><div data-plane-band={`${side}.${plane}`} style={{display:'flex'}} aria-label={`S ${values.join(', ')}`}>{cells(false)}</div>{c.modulus>0&&<div className="plane-residues" style={{display:'flex'}}>{cells(true)}<span style={{marginLeft:4}}><MathText tex={`\\mathrm{mod}\\;${c.modulus}`}/></span></div>}</div></foreignObject>;
}
