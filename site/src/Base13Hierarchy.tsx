import {Base13CarryChoices} from './Base13CarryChoices.tsx';
import {useCallback,useEffect,useState} from 'react';
import {read} from './catalog.ts';
import {SourceLabelView,type SourceScene,type SourceLabel} from './SourceFigure.tsx';
import {DIRECT_COLORS} from './productPalette.ts';
import {base13Carry} from './base13Carry.ts';
import {integer} from './savedEncoding.ts';
import {useParameter} from './parameters.ts';
import {MathText} from './PaperFigures.tsx';
import {useLanguage} from './i18n.tsx';

type Scene=SourceScene&{coordinates:Record<string,number|number[]>;palette:{levels:string[];reverse:string;trace:string;ink:string};dynamic_labels:SourceLabel[]};
type Mark={exponent:number;digit:number;kind:'digit'|'reverse';row:number;number:number};
export function Base13Hierarchy({value,onSelect,saved}:{value:string;onSelect:(value:string)=>void;saved?:number[]}){
 const [fittedFonts,setFittedFonts]=useState<Record<string,number>>({});
 const onFit=useCallback((id:string,font:number)=>{if(Number.isFinite(font)&&font>0)setFittedFonts(old=>Math.abs((old[id]??0)-font)<.001?old:{...old,[id]:font});},[]);
 const [scene,setScene]=useState<Scene>(),[error,setError]=useState('');const lang=useLanguage();
 const [chosen,setChosen]=useParameter('encode_step',-1,r=>Number.isInteger(Number(r))?Number(r):-1);
 useEffect(()=>{read<Scene>('visualization/figure1-hierarchy.json').then(setScene).catch(e=>setError(e instanceof Error?e.message:String(e)));},[]);
 useEffect(()=>setFittedFonts({}),[value,scene,lang]);
 if(error)return <p role="alert">{error}</p>;if(!scene)return <p>読込中</p>;
 const n=integer(value);if(n===null)return <p>整数のみ</p>;
 const carry=base13Carry(n),{raw,digits,events,sign}=carry,C=scene.coordinates,P=scene.palette;
 const x=(v:number)=>v*72,y=(v:number)=>(Number(C.H)-v)*72,xs=(C.XS as number[]).map(x),baseWidth=scene.size_pt[0],baseHeight=scene.size_pt[1];
 const pitch=y(Number(C.Y1))-y(Number(C.Y2)),extra=Math.max(0,Math.max(raw.length,digits.length)-3),shift=extra*pitch,topExponent=3+extra;
 const cut=y(Number(C.Y2)+.26),end=cut+pitch;
 const axis=(e:number)=>e<=2?y(Number(C['Y'+e]))+shift:y(Number(C.Y2))+(topExponent-1-e)*pitch;
 const marks:Mark[]=raw.map((d,i)=>({exponent:i,digit:d,kind:'digit' as const,row:0,number:raw.length-i})).reverse();
 const stages:{values:number[];event?:typeof events[number];phase:'raw'|'rewrite'|'carry';marks:number[]}[]=[{values:raw,phase:'raw',marks:marks.map(m=>m.number)}];
 events.forEach(e=>{
  const a=marks.length+1;marks.push({exponent:e.exponent,digit:e.digit,kind:'reverse',row:stages.length,number:a});stages.push({values:e.before,event:e,phase:'rewrite',marks:[a]});
  const b=marks.length+1;marks.push({exponent:e.exponent+1,digit:e.upperBefore+1,kind:'digit',row:stages.length,number:b});stages.push({values:e.after,event:e,phase:'carry',marks:[b]});
 });
 const selected=marks.find(m=>m.number===chosen),activeRow=selected?.row??-1,reverseExponent=selected?.kind==='reverse'?selected.exponent:events[0]?.exponent??1;
 const reverseY=y(Number(C.YR))+shift,eqY=scene.dynamic_labels.find(l=>l.text==='$=$')!.anchor_pt[1]+shift,eqPitch=Number(C.EQ_PITCH)*72;
 const wide=Math.max(raw.length,digits.length)>3,height=baseHeight+shift+Math.max(0,stages.length-3)*eqPitch+(wide?38:0),width=Math.max(baseWidth,wide?Math.max(raw.length,digits.length)*45+70:0);
 const minFont=Math.min(6.5,...scene.labels.map(l=>l.fontsize),...Object.values(fittedFonts)),scale=Math.max(2.2,14/minFont);
 const inputX=(xs[0]+xs[13])/2+Number(n*1_000_000_000_000n/(13n**BigInt(topExponent)))/1_000_000_000_000*(xs[13]-xs[0])/2;
 const color=(e:number)=>DIRECT_COLORS[e]??'#1A1A1A',dynamic=(text:string,xx:number,yy:number,extra:Partial<SourceLabel>={}):SourceLabel=>({gid:text+xx+yy,text,anchor_pt:[xx,yy],fontsize:9.5,color:P.ink,ha:'center',va:'center',rotation:0,fontfamily:['serif'],...extra});
 const label=(l:SourceLabel,key:string)=> <SourceLabelView key={`${key}:${l.text}`} l={{...l,gid:key}} name="figure1-hierarchy" onFit={onFit}/>;
 const moveLabel=(l:SourceLabel,text:string,dy:number):SourceLabel=>({...l,text,anchor_pt:[l.anchor_pt[0],l.anchor_pt[1]+dy],painted_box_pt:text===l.text&&l.painted_box_pt?[l.painted_box_pt[0],l.painted_box_pt[1]+dy,l.painted_box_pt[2],l.painted_box_pt[3]]:undefined});
 // A copied source row retains its geometry, but its level colours advance with its exponent.
 const shiftedColor=(value:string,offset:number)=>{const i=P.levels.findIndex(c=>c.toLowerCase()===value.toLowerCase());return i<0?value:color(i+offset);};
 const graphic=(id:string,offset=0)=> <g dangerouslySetInnerHTML={{__html:scene.graphics.replaceAll('hierarchy_asset_',id+'_').replace(/#[0-9a-f]{6}\b/gi,c=>shiftedColor(c,offset))}}/>;
 const replaceLevel=(l:SourceLabel,e:number):SourceLabel=>{
  let text=l.text;
  if(text==='$13^{2}$ scale')text=`$13^{${e}}$ scale`;
  else if(text==='$-2197$')text=`$-${13n**BigInt(e+1)}$`;
  else if(text==='$169 = 13^{2}$')text=`$${13n**BigInt(e)} = 13^{${e}}$`;
  else if(text==='$13^{3}$')text=`$13^{${e+1}}$`;
  else if(/^\$\d+\$$/.test(text)){const k=Number(text.slice(1,-1))/169;if(Number.isInteger(k))text=`$${BigInt(k)*13n**BigInt(e)}$`;}
  return {...moveLabel(l,text,(topExponent-1-e)*pitch),color:shiftedColor(l.color,e-2)};
 };
 const staticLabel=(l:SourceLabel)=>{
  let text=l.text,yy=l.anchor_pt[1];
  if(yy<cut){text=text.replaceAll('13^{3}',`13^{${topExponent}}`).replaceAll('2197',String(13n**BigInt(topExponent)));}
  else {yy+=shift;if(l.anchor_pt[1]>160&&l.anchor_pt[1]<204){text=text.replaceAll('$-169$',`$-${13n**BigInt(reverseExponent+1)}$`).replaceAll('$169$',`$${13n**BigInt(reverseExponent+1)}$`).replaceAll('$13^{2}$',`$13^{${reverseExponent+1}}$`);if(reverseExponent!==1&&text.includes('drawn for'))text=lang==='ja'?`$13^{k+1}$から下向きに読む（$13^{k+1}-j\\cdot13^k$、$k=${reverseExponent}$）`:`the $13^{k}$ ruler read downward from $13^{k+1}$ ($13^{k+1}-j\\cdot13^k$, $k=${reverseExponent}$)`;}}
  return {...moveLabel(l,text,yy-l.anchor_pt[1]),color:shiftedColor(l.color,l.anchor_pt[1]<cut?topExponent-3:0)};
 };
 const badge=(xx:number,yy:number,num:number)=> <g data-hierarchy-step={num} aria-pressed={chosen===num} role="button" tabIndex={0} onClick={()=>setChosen(num)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setChosen(num);}}}>
 <circle cx={xx} cy={yy} r={Number(C.EQ_R_BADGE)*72} fill={P.trace} stroke={chosen===num?P.reverse:'#FFFFFF'} strokeWidth={chosen===num?1.5:.7}/>
 {label(dynamic(`$${num}$`,xx,yy+1.8,{fontsize:6.5,color:'#FFFFFF',fontweight:'bold'}),'badge'+xx+yy+num)}
 </g>;
 const coefficient=(s:typeof stages[number],i:number)=>{
  const e=s.event,d=s.values[i]??0;let text=String(Math.abs(d));
  if(e&&s.phase==='rewrite'&&i===e.exponent)text=`(\\color{${P.reverse}}{13-}\\color{${P.trace}}{${13-e.digit}})`;
  if(e&&s.phase==='carry'&&i===e.exponent+1)text=`(${e.upperBefore}\\color{${P.reverse}}{+1})`;
  return `\\color{${P.trace}}{${text}}`;
 };
 const equation=(s:typeof stages[number])=>{
  const parts:string[]=[];for(let i=s.values.length-1;i>=0;i--){const d=s.values[i]*sign,op=d<0?'-':parts.length?'+':'';parts.push(op+coefficient(s,i)+(i?`\\color{${color(i)}}{\\cdot13^{${i}}}`:''));}return `${n}=${parts.join('')}`;
 };
 const eqFirst=scene.dynamic_labels.filter(l=>Math.abs(l.anchor_pt[1]-(eqY-shift))<.001),at=(t:string)=>eqFirst.find(l=>l.text===t)!.anchor_pt[0];
 const reverseMark=marks.find(m=>m.number===chosen&&m.kind==='reverse')??marks.find(m=>m.kind==='reverse'),reverseDigit=reverseMark?.digit??0;
 return <div className="base13-hierarchy" data-carry-result={digits.map(d=>d*sign).join(',')} data-carry-input={value}>
 <form name="base13_steps" className="paper-controls" onSubmit={e=>e.preventDefault()}><label>手順 <select name="encode_step" value={selected?chosen:-1} onChange={e=>setChosen(Number(e.target.value))}><option value={-1}>全体</option>{marks.map(m=><option key={m.number} value={m.number}>{m.number}</option>)}</select></label><span><MathText tex={`n=${n}\\quad (a_0,\\ldots)=(${digits.map(d=>d*sign).join(',')})`}/></span></form>
 <div className="paper-scroll"><svg data-hierarchy data-source-figure="figure1-hierarchy" data-scale={scale} width={width*scale} height={(height+(n===1000n?0:15))*scale} viewBox={`0 ${n===1000n?0:-15} ${width} ${height+(n===1000n?0:15)}`} aria-label="基数13の階層と繰り上がり">
 <defs><clipPath id="hierarchy-top"><rect x="0" y="0" width={baseWidth} height={cut}/></clipPath><clipPath id="hierarchy-body"><rect x="0" y={cut} width={baseWidth} height={baseHeight-cut}/></clipPath><clipPath id="hierarchy-row"><rect x="0" y={cut} width={baseWidth} height={end-cut}/></clipPath><marker id="hierarchy-arrow" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 L6 3 L0 6" fill={P.trace}/></marker></defs>
 <g data-hierarchy-layer-exponent={topExponent} clipPath="url(#hierarchy-top)">{graphic('hierarchy_top',topExponent-3)}</g>
 {Array.from({length:extra},(_,j)=><g key={j} data-hierarchy-layer-exponent={topExponent-1-j} transform={`translate(0 ${j*pitch})`} clipPath="url(#hierarchy-row)">{graphic('hierarchy_extra'+j,topExponent-3-j)}</g>)}
 <g transform={`translate(0 ${shift})`} clipPath="url(#hierarchy-body)">{graphic('hierarchy_body')}</g>
 {scene.labels.map(l=>label(staticLabel(l),l.gid))}
 {Array.from({length:extra},(_,j)=>scene.labels.filter(l=>l.anchor_pt[1]>=cut&&l.anchor_pt[1]<end).map(l=>label(replaceLevel(l,topExponent-1-j),'extra'+j+l.gid)))}
 {label(dynamic(`$${n}$`,inputX,(n===1000n?y(Number(C.Y3)+Number(C.D_VAL)+.02):-3),{fontsize:8,color:P.trace,va:'bottom',fontweight:'bold'}),'input')}
 <polygon points={`${inputX},${y(Number(C.Y3)+.012)} ${inputX-.075*.62*72},${y(Number(C.Y3)+.012+.075)} ${inputX+.075*.62*72},${y(Number(C.Y3)+.012+.075)}`} fill={P.trace}/>
 {Array.from({length:topExponent},(_,e)=>xs.map((xx,d)=><rect key={`${e}:${d}`} data-hierarchy-value={String(BigInt(d)*13n**BigInt(e))} data-hierarchy-exponent={e} x={xx-7} y={axis(e)-7} width={14} height={14} fill="transparent" role="button" tabIndex={0} aria-label={`${d} × 13^${e}`} onClick={()=>onSelect(String(BigInt(d)*13n**BigInt(e)))} onKeyDown={event=>{if(event.key==='Enter')onSelect(String(BigInt(d)*13n**BigInt(e)));}}/>))}

 {reverseMark&&label(dynamic(`$${BigInt(reverseDigit)*13n**BigInt(reverseExponent)}$`,xs[reverseDigit],reverseY-Number(C.D_VAL)*72,{va:'bottom'}),'reverse-value')}
 {marks.map(m=>{const yy=m.kind==='reverse'?reverseY:axis(m.exponent),xx=xs[m.digit],cy=yy+Number(C.STEP_DROP)*72;return <g key={m.number} data-trace-exponent={m.exponent} data-trace-digit={m.digit} data-trace-kind={m.kind} data-active={chosen===m.number}>
 {chosen===m.number&&<rect x={xx-7} y={yy-7} width={14} height={14} fill={P.trace} fillOpacity={.1} stroke={P.trace} strokeWidth={1.5}/>}
 <line x1={xx} y1={cy-Number(C.EQ_R_BADGE)*72-.008*72} x2={xx} y2={yy+.066*72} stroke={P.trace} strokeWidth={1} markerEnd="url(#hierarchy-arrow)"/>{badge(xx,cy,m.number)}
 </g>;})}
 {reverseMark&&(()=>{
 const xx=xs[reverseDigit],middle=axis(0),skips=Array.from({length:reverseExponent},(_,e)=>[axis(e)-(.085+.138)*72,axis(e)-(.085-.022)*72]);skips.push([axis(0)+(.27-.079)*72,axis(0)+(.27+.079)*72]);skips.sort((a,b)=>a[0]-b[0]);
 const spans:[[number,number,string],[number,number,string]]=[[axis(reverseExponent)+(.21+.075)*72,middle,color(reverseExponent)],[middle,reverseY-.26*72,P.reverse]];
 return spans.flatMap(([from,to,color],j)=>{let cursor=from;const segments:number[][]=[];for(const [a,b] of skips){if(b<=cursor||a>=to)continue;if(a>cursor)segments.push([cursor,Math.min(a,to)]);cursor=Math.max(cursor,Math.min(b,to));}if(cursor<to)segments.push([cursor,to]);return segments.map(([a,b],i)=><line key={`${j}:${i}`} x1={xx} x2={xx} y1={a} y2={b} stroke={color} strokeDasharray="1.8 1.8" strokeWidth={.9} opacity={.85}/>);});
 })()}

 {stages.map((s,index)=>{const yy=(wide?baseHeight+shift+14:eqY)+index*eqPitch;return <g key={index} data-carry-stage={index} data-carry-phase={s.phase} aria-pressed={activeRow===index} role="button" tabIndex={0} onClick={()=>setChosen(s.marks[0])} onKeyDown={e=>{if(e.key==='Enter')setChosen(s.marks[0]);}}>
 <rect x={wide?0:at('$1000$')-26} y={yy-6} width={wide?width:baseWidth-(at('$1000$')-26)} height={12} fill={activeRow===index?P.trace:'#FFFFFF'} fillOpacity={activeRow===index?.1:0}/>
 {wide?label(dynamic('$'+equation(s)+'$',10,yy,{ha:'left'}),'equation'+index):n!==1000n?<>{label(dynamic('$'+equation(s)+'$',at('$1000$')-24,yy,{ha:'left',painted_box_pt:[at('$1000$')-24,yy-5,baseWidth-at('$1000$')-16,10]}),'equation'+index)}{s.marks.map((m,j)=>badge(baseWidth-34+j*9,yy,m))}</>:<>
 {label(dynamic(index===0?`$${n}$`:'',at('$1000$'),yy,{ha:'right',color:P.trace}),'head'+index)}
 {label(dynamic('$=$',at('$=$'),yy,{ha:'left'}),'equals'+index)}
 {[2,1,0].map(i=>{const d=(s.values[i]??0)*sign,coef=coefficient(s,i);return <g key={i}>
 {i===2?label(dynamic(`$${d<0?'-':''}${coef}$`,at('$\\times 169$'),yy,{ha:'right'}),'c2'):label(dynamic(d<0?'$-$':'$+$',eqFirst.filter(l=>l.text==='$+$')[i===1?0:1].anchor_pt[0],yy),'op'+i)}
 {i===1&&label(dynamic('$'+coef+'$',at('$\\times 13$'),yy,{ha:'right'}),'c1')}
 {i===0?label(dynamic('$'+coef+'$',at('$12$'),yy,{ha:'right'}),'c0'):label(dynamic(i===2?'$\\times169$':'$\\times13$',at(i===2?'$\\times 169$':'$\\times 13$'),yy,{ha:'left',color:color(i)}),'scale'+i)}
 </g>;})}
 {s.marks.map((m,j)=>badge(at('$12$')+(.06+.056)*72+j*(2*.056+.012)*72,yy,m))}
 </>}
 </g>;})}
 {label(dynamic(lang==='ja'?`例：入力 ${n} の符号化`:`example: encoding the input ${n}`,scene.dynamic_labels.find(l=>l.text.startsWith('example:'))!.anchor_pt[0],scene.dynamic_labels.find(l=>l.text.startsWith('example:'))!.anchor_pt[1]+shift,{ha:'left',va:'baseline',fontsize:8,painted_box_pt:[scene.dynamic_labels.find(l=>l.text.startsWith('example:'))!.anchor_pt[0],scene.dynamic_labels.find(l=>l.text.startsWith('example:'))!.anchor_pt[1]+shift-6.3,108,8]}),'legend-input')}
 </svg></div>
 <Base13CarryChoices value={n} saved={saved} onStep={e=>{const mark=marks.find(m=>m.kind==='digit'&&m.row>0&&m.exponent===e+1);if(mark)setChosen(mark.number);}}/>
 </div>;
}
