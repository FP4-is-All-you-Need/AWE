import {shapeFormula} from './shapeFormula.ts';
import {Fragment,useMemo,useLayoutEffect,useRef,useState,type ReactNode} from 'react';
import {useMeasuredWidth} from './useMeasuredWidth.ts';
import {useSelectedDetailScroll} from './useSelectedDetailScroll.ts';
import {useLimbOrder,useLimbOrderQuery,readLimbOrder} from './useLimbOrder.ts';
import {blockPairs,orderedConstruction} from './limbOrder.ts';
import {useLanguage,translate} from './i18n.tsx';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import type {Construction,Lane} from './visual.ts';
import {miniWeightStyle,textInk,DIRECT_FILL_OPACITY,PLANE_FILL_OPACITY,productBaseColor,coefficientColor,directColor,productFillOpacity,whiteFill} from './compact.ts';
import {holePercent} from './visual.ts';

export function MathText({tex,className=''}:{tex:string;className?:string}){const lang=useLanguage();const localized=tex.replace(/(\\(?:textcolor|color)\{)(#[0-9a-fA-F]{6})(\})/g,(_,a:string,color:string,b:string)=>a+textInk(color)+b).replace(/\\text\{([^{}]*)\}/g,(_,text:string)=>'\\text{'+translate(text,lang)+'}');return <span data-tex={tex} className={'math '+className} dangerouslySetInnerHTML={{__html:katex.renderToString(localized,{throwOnError:false,strict:'ignore',output:'html'})}}/>;}
export function Formula({x,y,w=160,h=36,tex,size=18,color='#1A1A1A',background='#B2B2B2'}:{x:number;y:number;w?:number;h?:number;tex:string;size?:number;color?:string;background?:string}){
 const ref=useRef<HTMLDivElement>(null),[box,setBox]=useState({w,h,size});
 useLayoutEffect(()=>{
  const el=ref.current;if(!el)return;
  const measure=()=>{const math=el.firstElementChild as HTMLElement;if(!math)return;
   math.style.fontSize=`${size}px`;const natural=math.offsetWidth;
   const font=Math.max(14,Math.min(size,size*(w-2)/Math.max(1,natural)));
   math.style.fontSize=`${font}px`;
   const width=Math.ceil(Math.max(w,math.scrollWidth+2)),height=Math.ceil(Math.max(h,math.scrollHeight+2));
   setBox(old=>old.w===width&&old.h===height&&old.size===font?old:{w:width,h:height,size:font});
  };measure();const observer=new ResizeObserver(measure);observer.observe(el);document.fonts.ready.then(()=>{if(ref.current===el)measure();});return()=>observer.disconnect();
 },[tex,w,h,size]);
 return <foreignObject x={x-(box.w-w)/2} y={y} width={box.w} height={box.h} style={{overflow:'visible'}}><div ref={ref} className="svg-math" style={{fontSize:box.size,color:textInk(color,background),minHeight:box.h}}><MathText tex={tex}/></div></foreignObject>;
}
const INK='#1A1A1A',PURPLE='#6A1B9A',RED='#C62828';

export function Lattice({c,x,y,cell=20,groups=true}:{c:Construction;x:number;y:number;cell?:number;groups?:boolean}){
 const na=c.weights.A.length,nb=c.weights.B.length,singles=new Map<string,number|null>(),directProducts=new Map<string,number>(),combos:{cells:number[][];group:number|null;product:number}[]=[];
 for(const [product,p] of c.products.entries()){if(!c.planes)continue;const cells=[];for(let j=0;j<nb;j++)for(let i=0;i<na;i++)if(c.planes.A[p.a]?.[i]&&c.planes.B[p.b]?.[j])cells.push([i,j]);if(cells.length===1){singles.set(cells[0].join(','),p.group);directProducts.set(cells[0].join(','),product);}else if(cells.length)combos.push({cells,group:p.group,product});}
 // Shared product colours; all translucent fills are composited on white.
 return <g data-lattice-weights-a={c.weights.A.join(',')} data-lattice-weights-b={c.weights.B.join(',')}><rect x={x} y={y} width={nb*cell} height={na*cell} fill="#FFFFFF"/>{Array.from({length:nb},(_,j)=>Array.from({length:na},(_,i)=>{
 const key=[i,j].join(',');
 const product=directProducts.get(key)??combos.find(c=>c.cells.some(([a,b])=>a===i&&b===j))?.product;
 return <rect data-lattice-product={product} data-block-color={product===undefined?undefined:coefficientColor(c,product)} data-lattice-cell={key} data-weight={c.weights.A[i]*c.weights.B[j]} data-product-color={directColor(c,i,j)} key={key} x={x+j*cell} y={y+i*cell} width={cell} height={cell} fill={product===undefined?'#FFFFFF':productBaseColor(c,product)} fillOpacity={singles.has(key)?DIRECT_FILL_OPACITY:combos.some(c=>c.cells.some(([a,b])=>a===i&&b===j))?PLANE_FILL_OPACITY:0} stroke="#9E9E9E" strokeWidth="0.65"/>;
 }))}{combos.map((combo,k)=>{const xs=combo.cells.map(v=>v[1]),ys=combo.cells.map(v=>v[0]),inset=2+k*2;return <rect data-lattice-support={combo.cells.map(v=>v.join(',')).join(';')} data-product-index={combo.product} data-block-color={coefficientColor(c,combo.product)} key={k} x={x+Math.min(...xs)*cell+inset} y={y+Math.min(...ys)*cell+inset} width={(Math.max(...xs)-Math.min(...xs)+1)*cell-2*inset} height={(Math.max(...ys)-Math.min(...ys)+1)*cell-2*inset} fill="none" stroke={coefficientColor(c,combo.product)} strokeWidth="2"/>;})}{(holePercent(c)??0)>0&&<rect x={x-2} y={y-2} width={nb*cell+4} height={na*cell+4} fill="none" stroke={RED} strokeWidth="2" strokeDasharray="4 2"/>}{na!==nb&&<rect x={x-3} y={y-3} width={nb*cell+6} height={na*cell+6} fill="none" stroke={PURPLE} strokeWidth="2"/>}</g>;
}
// Display A on rows and B on columns. Stored indices and arithmetic stay unchanged.
export function LawRow({lane:storedLane,other:storedOther,selected=-1,onSelect,groups=true,slots,detail,selectionRole='selected'}:{selectionRole?:'selected'|'focus';lane:Lane;other?:Lane;selected?:number;onSelect?:(i:number)=>void;groups?:boolean;slots?:number[];detail?:ReactNode}){
 const detailScroll=useSelectedDetailScroll(selected,!!detail);
 const select=(i:number)=>{detailScroll.request();onSelect?.(i);};
 const measured=useMeasuredWidth();
 const query=useLimbOrderQuery();
 const project=(lane:Lane)=>({...lane,mods:lane.mods.map(c=>orderedConstruction(c,readLimbOrder(c,query)))});
 const lane=useMemo(()=>project(storedLane),[storedLane,query]),other=useMemo(()=>storedOther&&project(storedOther),[storedOther,query]);
 const english=useLanguage()==='en';
 const cell=25.2,band=selected>=0?24:0,font=14;
 const miniLeft=(c:Construction|undefined)=>!c?42:Math.max(c.weights.A.length,c.weights.B.length)>3?60:c.weights.B.length===1?70:40+Math.max(14,...c.weights.A.map(w=>String(w).length*7))+(c.faces_a>=10?8:0);
 const mods=slots??lane.mods.map(m=>m.modulus);let cursor=0;
 const positions=mods.map(p=>{const c=lane.mods.find(m=>m.modulus===p)??other?.mods.find(m=>m.modulus===p),n=c?.weights.B.length??2,mini=cell*Math.min(1,3/Math.max(c?.weights.A.length??2,n)),width=Math.max(104,miniLeft(c)+n*mini+4);const out={p,x:cursor,width};cursor+=width+8;return out;});
 const tileLayout=(c:Construction)=>{const reduced=Math.max(c.weights.A.length,c.weights.B.length)>3,miniCell=cell*Math.min(1,3/Math.max(c.weights.A.length,c.weights.B.length)),gridTop=band+56,footer=gridTop+c.weights.A.length*miniCell+3;
  return {gridTop,footer,height:footer+(reduced?31:53)};};
 const height=Math.max(...lane.mods.map(c=>tileLayout(c).height));
 const lines:(typeof positions)[]=[];let line:typeof positions=[],used=0;
 for(const position of positions){
  if(line.length&&used+position.width>(measured.width||360)){lines.push(line);line=[];used=0;}
  line.push({...position,x:used});used+=position.width+8;
 }
 if(line.length)lines.push(line);
 return <div ref={measured.ref} className="law-row" data-source-figure={`laws-${lane.bits??53}`} aria-label={`${lane.mods.length}法 ${lane.products}積の一覧`}>
 {lines.map((line,row)=><Fragment key={row}><svg data-law-line={row} viewBox={`0 0 ${Math.max(...line.map(p=>p.x+p.width))} ${height}`} width={Math.max(...line.map(p=>p.x+p.width))} height={height}>
 {line.map(({p,x,width})=>{const i=lane.mods.findIndex(m=>m.modulus===p),c=lane.mods[i];if(!c)return null;const reduced=Math.max(c.weights.A.length,c.weights.B.length)>3,miniCell=cell*Math.min(1,3/Math.max(c.weights.A.length,c.weights.B.length));const {gridTop,footer,height:tileHeight}=tileLayout(c);const cx=x+width/2,gx=x+miniLeft(c);
 const weight=(w:number,xx:number,yy:number,key:string,ww=cell)=>{const side=key[0]==='a'?'A':'B',index=Number(key.slice(1)),style=miniWeightStyle(c,side,index);return <g key={key} data-weight-label={key} data-weight-ink={style.ink} data-weight-background={style.background}><rect x={xx} y={yy+(side==='B'?4:0)} width={ww} height={side==='B'?14:18} fill={style.background}/><Formula x={xx} y={yy} w={ww} h={21} tex={String(w)} size={font} color={style.ink} background={style.background}/></g>;};
 return <g key={p} data-mini-reduced={reduced} data-tile-id={c.id} data-tile-modulus={p} data-tile-weights-a={c.weights.A.join(',')} data-tile-weights-b={c.weights.B.join(',')} role="button" tabIndex={0} aria-label={`法 ${p} ${c.products.length}積`} aria-pressed={selected===i} onClick={()=>select(i)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select(i);}}} className="law-button">
 <title>{`法 ${p}・重み A (${c.weights.A}) B (${c.weights.B})・${c.products.length} 積・面 A ${c.faces_a} B ${c.faces_b??'未測定'}`}</title>
 <rect x={x+2.5} y={selected===i?2.5:2.5+band} width={width-5} height={tileHeight-6-(selected===i?0:band)} fill="#FFFFFF" stroke={selected===i?(selectionRole==='focus'?'#1A1A1A':'#884499'):'none'} strokeWidth="5"/>
 {selected===i&&<g data-selection-band="true" data-selection-role={selectionRole}><rect x={x+2.5} y={2.5} width={width-5} height={24} fill={selectionRole==='focus'?'#FFFFFF':'#884499'}/><text x={x+8} y={20} textAnchor="start" fill={selectionRole==='focus'?'#1A1A1A':'#FFFFFF'} fontSize="14">{selectionRole==='focus'?(english?'focus':'表示中'):(english?'selected':'選択中')}</text>{selectionRole==='selected'&&<g role="button" tabIndex={0} aria-label={english?"Swap candidates":"入れ替え候補"} onClick={event=>{event.stopPropagation();window.dispatchEvent(new Event('awe-open-swap'));}} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();event.stopPropagation();window.dispatchEvent(new Event('awe-open-swap'));}}}><rect x={x+width-31} y={3} width={25} height={23} fill="#884499"/><text x={x+width-18} y={24} textAnchor="middle" fill="#FFFFFF" fontSize="18">→</text></g>}</g>}
 <Formula x={x} y={band-2} w={width} h={27} tex={`\\operatorname{mod}\\;${p}`} size={18}/>
 <PlaneHeaders c={c} x={x} gx={gx} gridTop={gridTop} cell={miniCell}/>
 {!reduced&&c.weights.B.map((w,j)=>weight(w,gx+j*cell,gridTop-23,`b${j}`))}
 {!reduced&&c.weights.A.map((w,i)=>weight(w,gx-Math.max(14,String(w).length*7)-4,gridTop+i*cell+(cell-18)/2,`a${i}`,Math.max(14,String(w).length*7)))}
 <Lattice c={c} x={gx} y={gridTop} cell={miniCell} groups={groups}/>
 <text data-tile-products x={cx} y={footer+19} textAnchor="middle" fontSize="14"><tspan data-product-count fontSize="18" fontWeight="700">{c.products.length}</tspan>{english?` ${c.products.length===1?'product':'products'}`:'積'}</text>
 {!reduced&&<Formula x={x+5} y={footer+26} w={width-10} h={23} tex={shapeFormula(c)} size={14}/>}

 </g>;})}</svg></Fragment>)}
 {detail&&<div className="law-detail" data-selected-detail ref={detailScroll.ref}>{detail}</div>}
 </div>;
}
export function PaperLegend(){return <div className="paper-legend"><span><i style={{background:'#C2185B'}}/><i style={{background:'#9E9D24'}}/>単一の積：重みの小さい順</span><span><i style={{border:'2px solid #E8710A',background:whiteFill('#E8710A',PLANE_FILL_OPACITY)}}/><i style={{border:'2px solid #A0825E',background:whiteFill('#CCAA88',PLANE_FILL_OPACITY)}}/><i style={{border:'2px solid #D4A017',background:whiteFill('#D4A017',PLANE_FILL_OPACITY)}}/><i style={{border:'2px solid #4FC3F7',background:whiteFill('#4FC3F7',PLANE_FILL_OPACITY)}}/><i style={{border:'2px solid #9CCC65',background:whiteFill('#9CCC65',PLANE_FILL_OPACITY)}}/>和・差の面の積：左上から右下へ</span><span><i style={{border:`2px solid ${PURPLE}`}}/>左右のリム数が異なる</span><span><i style={{border:`2px dashed ${RED}`}}/>穴と補正</span></div>;}


// Outer plane counts use the same row/column convention as the weights.
function PlaneHeaders({c,x,gx,gridTop,cell}:{c:Construction;x:number;gx:number;gridTop:number;cell:number}){
 // The 14px KaTeX weight row starts 23px above the grid; its baseline is 18px lower.
 const en=useLanguage()==='en',baseline=gridTop-5,ay=Math.max(gridTop+c.weights.A.length*cell/2,baseline+26),bx=gx+c.weights.B.length*cell/2;
 return <g data-plane-headers>
  <text data-plane-plus x={x+30} y={baseline-14} fontSize="18" fontWeight="700" textAnchor="middle">{c.faces_b===null?'?':c.faces_a+c.faces_b}</text>
  <text data-plane-total x={x+30} y={baseline} fontSize="14" textAnchor="middle">{en?'Planes':'面'}</text>
  <text data-plane-side="A" x={x+(c.faces_a>=10?17:13)} y={ay} fontSize="14" textAnchor="middle" dominantBaseline="central">A{c.faces_a}</text>
  <text data-plane-side="B" x={bx} y={baseline-15} fontSize="14" textAnchor="middle">B{c.faces_b??'?'}</text>
  <path data-plane-arrow="A" d={`M ${x+(c.faces_a>=10?17:13)} ${ay-11} V ${baseline+6} m -3 5 l 3 -5 l 3 5`} fill="none" stroke="#1A1A1A" strokeWidth="1"/>
  <path data-plane-arrow="B" d={`M ${bx-13} ${baseline-19} H ${x+54} m 5 -3 l -5 3 l 5 3`} fill="none" stroke="#1A1A1A" strokeWidth="1"/>
 </g>;
}

// The selected tile and its expansion subscribe to the same display-only order.
export function ConstructionTile({c:stored}:{c:Construction}){
 const {view:c}=useLimbOrder(stored),blocks=blockPairs(c),reduced=Math.max(c.weights.A.length,c.weights.B.length)>3,cell=30*Math.min(1,3/Math.max(c.weights.A.length,c.weights.B.length)),left=76,top=54;
 return <div className="paper-scroll" data-construction-tile={c.id} data-mini-reduced={reduced}><svg width={left+c.weights.B.length*cell+8} height={top+c.weights.A.length*cell+8} aria-label="選んだ整数構成の格子">
 <PlaneHeaders c={c} x={0} gx={left} gridTop={top} cell={cell}/>
 {!reduced&&c.weights.B.map((w,j)=><Formula key={j} x={left+j*cell} y={top-26} w={cell} h={26} tex={String(w)} size={18}/>)}
 {!reduced&&c.weights.A.map((w,i)=><Formula key={i} x={left-cell-4} y={top+i*cell} w={cell} h={30} tex={String(w)} size={18}/>)}
 <Lattice c={c} x={left} y={top} cell={cell} groups={false}/>
 </svg>{blocks&&<p data-tile-block-label="true">ブロック Karatsuba：{blocks.A.length*blocks.B.length} 組。</p>}
 </div>;
}
