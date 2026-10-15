import {useLanguage,translate} from './i18n.tsx';
import {useCallback,useEffect,useLayoutEffect,useRef,useState} from 'react';
import {read} from './catalog.ts';
import {MathText} from './PaperFigures.tsx';
export type SourceLabel={gid:string;text:string;anchor_pt:number[];fontsize:number;color:string;ha:string;va:string;rotation:number;fontfamily?:string[];fontweight?:string;fontstyle?:string;painted_box_pt?:number[]};
export type SourceScene={schema_version:number;source:string;size_pt:number[];graphics:string;labels:SourceLabel[];legend?:{label_gids:string[];bounds_pt:number[]};crops?:Record<string,{viewbox_pt:number[];label_gids:string[]}>;laws?:{modulus:number;id:string;lane:string;bounds_pt:number[]}[];cells?:{bounds_pt:number[];column_width:number;row_width:number;labels:{text:string}[]}[]};
function expression(text:string){
 const literal:Record<string,string>={'w²≡0':'w^2\\equiv0','4→3':'\\text{Karatsuba}','log2 P':'\\log_{2} P'};if(literal[text])return literal[text];
 if(/^[MAB]$/.test(text))return text;
 if(!text.includes('$'))return /^[-+\d., ×]+$/.test(text)?text.replaceAll('×','\\times'):null;
  return text.split('$').map((part,i)=>i%2?part.replaceAll('\\mathdefault','\\mathrm').replaceAll('\\mathregular','\\mathrm').replace(/(?<!\\)_([A-Za-z]|\d+)/g,'_{$1}'):part?`\\text{${part.replaceAll('%','\\%').replaceAll('_','\\_')}}`:'').join('');
}
function Label({l,name,onFit,maxWidth}:{l:SourceLabel;name:string;onFit?:(id:string,font:number)=>void;maxWidth?:number}){
 const lang=useLanguage();
 const text=translate(l.text,lang);const expressionText=expression(text);const tex=l.fontweight==='bold'?expressionText?.replaceAll('\\text{','\\textbf{')??null:expressionText;
 const ref=useRef<HTMLDivElement>(null);
 const [baseline,setBaseline]=useState(0);const [fit,setFit]=useState(1);const [horizontalFit,setHorizontalFit]=useState(1);const [glyphShift,setGlyphShift]=useState(0);
 const plainFit=!!l.painted_box_pt&&tex===null;
 useLayoutEffect(()=>{let active=true;const measure=()=>{
  const node=ref.current;if(!active||!node||!node.getBoundingClientRect().width)return;
  const marker=node.querySelector<HTMLElement>('[data-baseline]')!;setBaseline(marker.offsetTop);
  if(maxWidth!==undefined){const svg=node.closest('svg')!,scale=svg.getBoundingClientRect().width/svg.viewBox.baseVal.width,natural=node.getBoundingClientRect().width/(scale*fit*horizontalFit);const next=Math.min(1,maxWidth/natural);if(Math.abs(next-horizontalFit)>.0001)setHorizontalFit(next);}
  if(!l.painted_box_pt)return;
  const svg=node.closest('svg')!,r=node.getBoundingClientRect(),scale=svg.getBoundingClientRect().width/svg.viewBox.baseVal.width;
  const naturalWidth=r.width/(scale*Number(node.dataset.fit));
  let naturalHeight=r.height/(scale*Number(node.dataset.fit));
  if(plainFit){
   const context=document.createElement('canvas').getContext('2d')!;const style=getComputedStyle(node);
   context.font=`${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
   const metrics=context.measureText(text);
   naturalHeight=metrics.actualBoundingBoxAscent+metrics.actualBoundingBoxDescent;
   setGlyphShift(metrics.actualBoundingBoxAscent-marker.offsetTop);
  }
  const ratio=Math.min(1,l.painted_box_pt[2]/naturalWidth,l.painted_box_pt[3]/naturalHeight);
  setFit(ratio);onFit?.(l.gid,l.fontsize*ratio);
 };measure();const observer=new ResizeObserver(measure);if(ref.current)observer.observe(ref.current);document.fonts.ready.then(measure);return()=>{active=false;observer.disconnect();};},[l,onFit,lang,plainFit,text,maxWidth,horizontalFit]);
 const [x,y]=l.painted_box_pt??l.anchor_pt;
 const sx=l.painted_box_pt?'0':l.ha==='center'?'-50%':l.ha==='right'?'-100%':'0';
 const sy=l.painted_box_pt?'0':l.va==='center'?'-50%':l.va==='top'?'0':l.va==='bottom'?'-100%':`${-baseline}px`;
 const contents=<>{tex!==null?<MathText tex={tex}/>:text}<span data-baseline style={{display:'inline-block',width:0,height:0,verticalAlign:'baseline'}}/></>;
 return <g transform={`translate(${x} ${y}) rotate(${l.rotation??0})`}><foreignObject x="0" y="0" width="1" height="1" style={{overflow:'visible'}}><div ref={ref} data-source-text={l.gid} data-map-row-label={name==='figure4'&&/^pdf_text_(?:2[0-9]|3[0-6])$/.test(l.gid)?l.text:undefined} data-map-axis-label={name==='figure4'&&l.gid==='pdf_text_17'?true:undefined} data-map-legend-label={maxWidth!==undefined?true:undefined} data-next-swatch-x={maxWidth!==undefined?164.95566:undefined} data-fit={fit} data-effective-font={l.fontsize*fit} className="source-label" style={{fontSize:l.fontsize,color:l.color,fontWeight:l.fontweight==='bold'?600:400,fontStyle:l.fontstyle??'normal',fontFamily:l.fontfamily?.includes('serif')||l.fontfamily?.includes('STIXGeneral')?'KaTeX_Main,serif':'Noto Sans CJK JP,sans-serif',height:plainFit?l.painted_box_pt![3]/fit:undefined,transform:`translate(${sx},${sy}) scale(${fit}) scaleX(${horizontalFit})`}}>{plainFit?<span style={{display:'inline-block',verticalAlign:'top',lineHeight:1,transform:`translateY(${glyphShift}px)`}}>{contents}</span>:contents}</div></foreignObject></g>;
}

function CenteredCellLabel({l,bounds,row,column,scale}:{l:SourceLabel;bounds:number[];row:number;column:number;scale:number}){
 const ref=useRef<HTMLDivElement>(null),[fit,setFit]=useState(1),[position,setPosition]=useState({x:0,y:0});
 // Browser geometry is rounded; sub-pixel centering must not feed back forever.
 const [x0,y0,x1,y1]=bounds,width=x1-x0,height=y1-y0,font=Math.max(l.fontsize,14/scale);
 useLayoutEffect(()=>{let active=true;const measure=()=>{const n=ref.current,html=n?.querySelector<HTMLElement>('.katex-html'),svg=n?.closest('svg');if(!active||!n||!html||!svg)return;const matrix=svg.getScreenCTM();if(!matrix)return;const center=new DOMPoint((x0+x1)/2,(y0+y1)/2).matrixTransform(matrix),box=html.getBoundingClientRect(),s=Math.hypot(matrix.a,matrix.b);if(!box.width)return;const natural=box.width/(s*fit),nextFit=Math.min(1,(width-1)/natural);if(Math.abs(nextFit-fit)>.0001)setFit(nextFit);const dx=(center.x-(box.left+box.right)/2)/s,dy=(center.y-(box.top+box.bottom)/2)/s;if(Math.abs(dx*s)>.1||Math.abs(dy*s)>.1)setPosition(old=>({x:old.x+dx,y:old.y+dy}));};measure();document.fonts.ready.then(measure);const observer=new ResizeObserver(measure);if(ref.current)observer.observe(ref.current);return()=>{active=false;observer.disconnect();};},[x0,y0,x1,y1,width,fit,position,scale,l]);
 return <foreignObject x={x0} y={y0} width={width} height={height} style={{overflow:'visible',pointerEvents:'none'}}><div ref={ref} data-source-text={l.gid} data-map-label data-row={row} data-column={column} data-effective-font={font} style={{position:'absolute',width:'max-content',whiteSpace:'nowrap',fontSize:font,color:l.color,lineHeight:1,transformOrigin:'0 0',transform:`translate(${position.x}px,${position.y}px) scaleX(${fit})`}}><MathText tex={l.fontweight==='bold'?`\\mathbf{${l.text}}`:l.text}/></div></foreignObject>;
}

export function SourceFigure({name,label,onCell,lane,onLaw,selectedCell,onWidth,selectedWidth,holeCandidates=0}:{name:string;label:string;lane?:string;onLaw?:(id:string)=>void;onCell?:(a:number,b:number)=>void;selectedCell?:number[];onWidth?:(width:number)=>void;selectedWidth?:number;holeCandidates?:number}){
 const lang=useLanguage();
 const [fittedFonts,setFittedFonts]=useState<Record<string,number>>({});
 const onFit=useCallback((id:string,font:number)=>setFittedFonts(old=>Math.abs((old[id]??0)-font)<.001?old:{...old,[id]:font}),[]);
 const [scene,setScene]=useState<SourceScene>();const [error,setError]=useState('');
 const container=useRef<HTMLDivElement>(null);const [availableWidth,setAvailableWidth]=useState(0);
 useLayoutEffect(()=>{const el=container.current;if(!el)return;const observer=new ResizeObserver(()=>setAvailableWidth(el.clientWidth));observer.observe(el);setAvailableWidth(el.clientWidth);return()=>observer.disconnect();},[scene]);
 const ref=useRef<SVGSVGElement>(null);const [extent,setExtent]=useState<number[]>();
 useEffect(()=>{let current=true;setExtent(undefined);setScene(undefined);setFittedFonts({});read<SourceScene>(`visualization/${name}.json`).then(s=>{if(current)setScene(s);}).catch(e=>{if(current)setError(e.message);});return()=>{current=false;};},[name]);
 useLayoutEffect(()=>{if(!scene||lane)return;let active=true;const measure=()=>{if(!active||!ref.current)return;const svg=ref.current,base=svg.getBoundingClientRect();if(!base.width)return;const v=svg.viewBox.baseVal,s=base.width/v.width;let x=0,y=0,right=scene.size_pt[0],bottom=scene.size_pt[1];for(const node of svg.querySelectorAll('.source-label')){const r=node.getBoundingClientRect();x=Math.min(x,(r.left-base.left)/s+v.x);y=Math.min(y,(r.top-base.top)/s+v.y);right=Math.max(right,(r.right-base.left)/s+v.x);bottom=Math.max(bottom,(r.bottom-base.top)/s+v.y);}if(scene.legend&&name!=='figure3'){const [lx,ly,rx,by]=scene.legend.bounds_pt;let right=rx,bottom=by;for(const id of scene.legend.label_gids){const n=svg.querySelector(`[data-source-text="${id}"]`);if(n){const r=n.getBoundingClientRect();right=Math.max(right,(r.right-base.left)/s+v.x+2);bottom=Math.max(bottom,(r.bottom-base.top)/s+v.y+2);}}svg.querySelector('#source_legend_frame path')?.setAttribute('d',`M ${lx} ${ly} H ${right} V ${bottom} H ${lx} Z`);}const next=[x,y,right-x,bottom-y];setExtent(old=>old?.every((v,i)=>Math.abs(v-next[i])<.01)?old:next);};const observer=new ResizeObserver(measure);if(ref.current)observer.observe(ref.current);document.fonts.ready.then(measure);return()=>{active=false;observer.disconnect();};},[scene,lane,lang]);
 if(error)return <p role="alert">{error}</p>;if(!scene)return <p>読込中</p>;
 const minFont=Math.min(...scene.labels.map(l=>l.fontsize));
 const effectiveMinFont=Math.min(minFont,...Object.values(fittedFonts));
 const naturalScale=Math.max(2,20/minFont,14/effectiveMinFont);
 const laws=scene.laws?.filter(l=>l.lane===lane)??[];
 const crop=lane?scene.crops?.[lane]:undefined;
 const region=crop?.viewbox_pt??(lane&&laws.length?[64,Math.min(...laws.map(l=>l.bounds_pt[1]))-15,658,76]:extent??[0,0,...scene.size_pt]);
 const cellSize=scene.cells?.length?scene.cells[0].bounds_pt[2]-scene.cells[0].bounds_pt[0]:1;
 // Fit the cell geometry to the available width without shrinking the type.
 const textScale=name==='figure4'?Math.max(14/minFont,Math.min(30/cellSize,(availableWidth||region[2]*naturalScale)/region[2])):naturalScale;
 const scale=name==='figure4'?Math.min(textScale,(availableWidth||region[2]*textScale)/region[2]):textScale;
 const rawLabels=crop?scene.labels.filter(l=>crop.label_gids.includes(l.gid)):scene.labels;
 // Leave room below the tick numbers for the rotated format labels and the axis title.
 const labels=name==='figure4'?rawLabels.filter(l=>!['pdf_text_18','pdf_text_19'].includes(l.gid)).map(l=>l.gid==='pdf_text_17'?{...l,text:'$M_{B}$ (integer width)'}:/^pdf_text_(?:2[0-9]|3[0-6])$/.test(l.gid)?{...l,ha:'right',anchor_pt:[Math.min(...scene.cells!.map(c=>c.bounds_pt[0]))-2,l.anchor_pt[1]]}:l):rawLabels.map(l=>name==='figure3'&&(/^(?:FP\d+|BF16|INT)$/.test(l.text)||l.text==='Integer width $M$')?{...l,anchor_pt:[l.anchor_pt[0],l.anchor_pt[1]+(l.text==='Integer width $M$'?26:15)]}:l);
 return <div ref={container} className="paper-scroll"><svg ref={ref} data-source-figure={name} data-source-size={scene.size_pt.join(' ')} data-scale={scale} width={region[2]*scale} height={region[3]*scale} viewBox={region.join(' ')} role="img" aria-label={label}>
 <g dangerouslySetInnerHTML={{__html:scene.graphics}}/>
 {labels.map(original=>{const l=name==='figure4'?{...original,fontsize:original.fontsize*textScale/scale}:original;const cell=name==='figure4'&&/^\d+$/.test(l.text)?scene.cells?.find(c=>l.anchor_pt[0]>=c.bounds_pt[0]&&l.anchor_pt[0]<=c.bounds_pt[2]&&l.anchor_pt[1]>=c.bounds_pt[1]&&l.anchor_pt[1]<=c.bounds_pt[3]&&c.labels.some(t=>t.text===l.text)):undefined;return cell?<CenteredCellLabel key={l.gid} l={l} bounds={cell.bounds_pt} row={cell.row_width} column={cell.column_width} scale={scale}/>:<Label key={l.gid} l={l} name={name} onFit={onFit} maxWidth={name==='figure4'&&['pdf_text_342','pdf_text_344','pdf_text_346'].includes(l.gid)?164.95566-l.anchor_pt[0]-3:undefined}/>;})}
 {onLaw&&laws.map(l=><rect key={l.id} x={l.bounds_pt[0]-3} y={l.bounds_pt[1]-14} width={Math.max(20,l.bounds_pt[2]+6)} height={72} fill="transparent" role="button" tabIndex={0} aria-label={`法 ${l.modulus}`} onClick={()=>onLaw(l.id)} onKeyDown={e=>{if(e.key==='Enter')onLaw(l.id);}}/>)}
 {onCell&&scene.cells?.map((c,i)=>{const [x0,y0,x1,y1]=c.bounds_pt;return <rect data-map-cell data-row={c.row_width} data-column={c.column_width} data-method={c.row_width>c.column_width?'crt':c.row_width<c.column_width?'awe':'diagonal'} data-hole-candidates={c.row_width===8&&c.column_width===8?holeCandidates:undefined} key={i} x={x0} y={y0} width={x1-x0} height={y1-y0} fill="transparent" stroke={selectedCell?.[0]===c.row_width&&selectedCell?.[1]===c.column_width?'#1A1A1A':c.row_width===8&&c.column_width===8&&holeCandidates?'#006D3B':'none'} strokeWidth="1.5" aria-pressed={selectedCell?.[0]===c.row_width&&selectedCell?.[1]===c.column_width} role="button" tabIndex={0} aria-label={`${c.row_width} × ${c.column_width} 幅`} onClick={()=>onCell(c.row_width,c.column_width)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onCell(c.row_width,c.column_width);}}}/>;})}
 {onWidth&&scene.labels.filter(l=>l.ha==='center'&&l.va==='top'&&/^\d+$/.test(l.text)).map(l=><g key={'width-'+l.gid}>{Number(l.text)===selectedWidth&&<rect data-width-selection x={l.anchor_pt[0]-5} y={l.anchor_pt[1]-1} width={10} height={l.fontsize*1.5} fill="#63B6DA" fillOpacity={.16} stroke="#0288D1"/>}<rect x={l.anchor_pt[0]-3.5} y={4} width={7} height={l.anchor_pt[1]+l.fontsize*1.5} fill="transparent" role="button" tabIndex={0} aria-label={`幅 ${l.text} の構成へ`} aria-pressed={Number(l.text)===selectedWidth} onClick={()=>onWidth(Number(l.text))} onKeyDown={e=>{if(e.key==='Enter')onWidth(Number(l.text));}}/></g>)}
 </svg></div>;
}

export {Label as SourceLabelView};
