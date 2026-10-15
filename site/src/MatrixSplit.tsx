import {DIRECT_FILL_OPACITY,productBaseColor,directColor,coefficientColor,productFillOpacity} from './compact.ts';
import {useParameter} from './parameters.ts';
import {Formula,MathText} from './PaperFigures.tsx';
import type {Construction} from './visual.ts';

import {directPalette} from './productPalette.ts';
const sum=(weights:number[],symbol:string)=>weights.map((weight,i)=>`${i&&weight>=0?'+':''}${weight===1?'':weight===-1?'-':weight}${symbol}_{${i}}`).join('');
const clamp=(value:number)=>Math.min(65536,Math.max(1,Math.round(value)||1));

// Colors follow the matrix decomposition diagram: bracket 19050 EMU, caps66675,
// dots28575, landscape552450×323850 and portrait323850×495300; colors unchanged.
function Matrix({x,y,rows,cols,color,width=80,height=58}:{x:number;y:number;rows:number;cols:number;color:string;width?:number;height?:number}){
 const ratio=cols/rows,w=Math.min(width,height*ratio),h=Math.min(height,width/ratio),xx=x+(width-w)/2,yy=y+(height-h)/2;
 const cap=Math.min(7,w/3),line=2,dot=3;
 return <g><rect x={xx} y={yy} width={w} height={h} fill="#FFFFFF"/>
 <path d={`M ${xx+cap} ${yy} H ${xx} V ${yy+h} H ${xx+cap} M ${xx+w-cap} ${yy} H ${xx+w} V ${yy+h} H ${xx+w-cap}`} fill="none" stroke={color} strokeWidth={line}/>
 {[.25,.5,.75].flatMap(a=>[.3,.7].map(b=><rect key={`${a}-${b}`} x={xx+w*a-dot/2} y={yy+h*b-dot/2} width={Math.min(dot,w/12)} height={Math.min(dot,h/8)} fill={color}/>))}
 </g>;
}

export function MatrixSplit({c,m,n,k,onSize,onTerm,selectedProduct=null,scope=""}:{c:Construction;selectedProduct?:number|null;scope?:string;m:number;n:number;k:number;onSize:(key:'m'|'n'|'k',value:number)=>void;onTerm?:(i:number,j:number)=>void}){
 const [selected,setSelected]=useParameter<string|null>(scope+'matrix_term.'+c.id,null,r=>/^\d+,\d+$/.test(r)?r:null,v=>v??'');
 const na=c.weights.A.length,nb=c.weights.B.length,cellW=190,cellH=145,gridX=75,gridY=185;
 const formulaX=gridX+nb*cellW+24,width=Math.max(1050,formulaX+450),height=gridY+Math.max(na*cellH+40,290);
 const matrixWidth=80,matrixHeight=60;
 const active=selectedProduct===null?null:c.products[selectedProduct];
 const covers=(i:number,j:number)=>Boolean(active&&c.planes?.A[active.a]?.[i]&&c.planes?.B[active.b]?.[j]);
 const groups=new Map<number,[number,number][]>();
 c.weights.A.forEach((a,i)=>c.weights.B.forEach((b,j)=>{const weight=a*b;groups.set(weight,[...(groups.get(weight)??[]),[i,j]]);}));
 const sums=[...groups].sort(([a],[b])=>a-b);
 const picked=selected?.split(',').map(Number);
 const contributions=picked?c.products.flatMap((p,index)=>{
  const coefficient=(c.planes?.A[p.a]?.[picked[0]]??0)*(c.planes?.B[p.b]?.[picked[1]]??0);
  return coefficient?[{index,coefficient,numerator:p.numerator}]:[];
 }):[];
 return <details data-section={scope+'matrix.'+c.id} style={{fontSize:16}}><summary>行列の分解と行列サイズ</summary>
 <form name={scope+'matrix.'+c.id} onSubmit={e=>e.preventDefault()} style={{display:'flex',flexWrap:'wrap',gap:8,margin:'3px 0'}}>{(['m','n','k'] as const).map(key=>{
 const value={m,n,k}[key];return <label key={key} style={{display:'flex',alignItems:'center',gap:8}}><span style={{fontSize:20}}><MathText tex={key.toUpperCase()}/></span><input type="range" name={`matrix_${key}_range`} min={1} max={65536} value={value} onChange={event=>onSize(key,clamp(Number(event.target.value)))}/><input type="number" aria-label={`${key.toUpperCase()} の行列サイズ`} name={`matrix_${key}`} min={1} max={65536} step={1} value={value} onChange={event=>onSize(key,clamp(Number(event.target.value)))} style={{width:90,fontSize:16}}/></label>;
 })}</form>
 <p><MathText tex={`A:${m}\\times${k}\\quad B:${k}\\times${n}\\quad AB:${m}\\times${n}`}/></p>
 <div className="paper-scroll"><svg data-matrix-size={`${m} ${n} ${k}`} width={width} height={Math.max(height,gridY+sums.length*48+125)} viewBox={`0 0 ${width} ${Math.max(height,gridY+sums.length*48+125)}`} aria-label={`${na} リムと ${nb} リムの行列分解、${na*nb} 個の直接項`}>
 <Formula x={10} y={5} w={width-20} h={40} tex={`A=${sum(c.weights.A,'A')}`} size={20}/>
 <Formula x={10} y={48} w={width-20} h={40} tex={`B=${sum(c.weights.B,'B')}`} size={20}/>

 {c.weights.B.map((_,j)=><Formula key={j} x={gridX+j*cellW} y={gridY-45} w={cellW} h={35} tex={`B_{${j}}`} size={20} color={directPalette(c.weights.B.length)[[...c.weights.B].sort((a,b)=>a-b).indexOf(c.weights.B[j])]}/>)}
 {c.weights.A.map((a,i)=><g key={i}><Formula x={0} y={gridY+i*cellH+30} w={65} h={36} tex={`A_{${i}}`} size={20} color={directPalette(c.weights.A.length)[[...c.weights.A].sort((a,b)=>a-b).indexOf(c.weights.A[i])]}/>
 {c.weights.B.map((b,j)=>{
 const x=gridX+j*cellW,y=gridY+i*cellH,key=`${i},${j}`,isSelected=selected===key,covered=covers(i,j);
 return <g key={j} data-matrix-term={key} data-weight={a*b} data-product-color={directColor(c,i,j)} data-covered={covered} role="button" tabIndex={0} aria-label={`直接項 A${i} B${j}、重み ${a*b}`} aria-pressed={isSelected} style={{cursor:'pointer'}} onClick={()=>{setSelected(key);onTerm?.(i,j);}} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();setSelected(key);onTerm?.(i,j);}}}>
 <rect x={x} y={y} width={cellW-8} height={cellH-8} fill={covered&&selectedProduct!==null?productBaseColor(c,selectedProduct):directColor(c,i,j)} fillOpacity={covered&&selectedProduct!==null?productFillOpacity(c,selectedProduct):DIRECT_FILL_OPACITY} stroke={covered&&selectedProduct!==null?coefficientColor(c,selectedProduct):isSelected?'#1A1A1A':directColor(c,i,j)} strokeWidth={covered||isSelected?3:1}/>
 <Matrix x={x+6} y={y+10} rows={m} cols={k} color={directPalette(c.weights.A.length)[[...c.weights.A].sort((a,b)=>a-b).indexOf(c.weights.A[i])]} width={matrixWidth} height={matrixHeight}/>
 <Formula x={x+85} y={y+24} w={22} h={30} tex={"\\times"} size={20}/>
 <Matrix x={x+108} y={y+10} rows={k} cols={n} color={directPalette(c.weights.B.length)[[...c.weights.B].sort((a,b)=>a-b).indexOf(c.weights.B[j])]} width={65} height={matrixHeight}/>
 <Formula x={x+4} y={y+74} w={cellW-16} h={33} tex={`A_{${i}}B_{${j}}`} size={20}/>
 <Formula x={x+4} y={y+105} w={cellW-16} h={30} tex={`\\text{重み }${a*b}`} size={20}/>
 </g>;
 })}</g>)}
 <Formula x={formulaX} y={gridY-42} w={420} h={40} tex={"AB=\\sum_{i,j}w_{i}^A w_{j}^B A_{i}B_{j}"} size={20}/>
 <path d={`M ${formulaX-25} ${gridY+48} h 17 v -6 l 10 10 l -10 10 v -6 h -17 z`} fill="#1A1A1A"/>
 {sums.map(([weight,terms],index)=><g key={weight} data-matrix-sum={weight}>
 {terms.some(([i,j])=>covers(i,j))&&<rect x={formulaX} y={gridY+index*48} width={420} height={44} fill={productBaseColor(c,selectedProduct!)} fillOpacity={productFillOpacity(c,selectedProduct!)} stroke={coefficientColor(c,selectedProduct!)} strokeWidth="2"/>}
 <Formula x={formulaX} y={gridY+index*48} w={420} h={44} tex={`${index&&weight>=0?'+':''}${weight}\\bigl(${terms.map(([i,j])=>`A_{${i}}B_{${j}}`).join('+')}\\bigr)`} size={20}/></g>)}
 <Formula x={formulaX} y={gridY+sums.length*48+10} w={420} h={38} tex={`${m}\\times${n}`} size={20}/>
 <text x={formulaX} y={gridY+sums.length*48+65} fontSize={16}>直接項 {na*nb} 個</text>
 <text x={formulaX} y={gridY+sums.length*48+95} fontSize={16}>構成の積 {c.products.length} 個</text>
 </svg></div>
 {picked&&<p className="matrix-contributions"><MathText tex={`A_{${picked[0]}}B_{${picked[1]}}`}/>：この直接項を含む積 {contributions.map(({index,coefficient,numerator},i)=><span key={index}>{i?'、':''}<MathText tex={`T_{${index}}\\;(${numerator===null?'?':numerator*coefficient}/${c.denominator})`}/></span>)}{c.modulus>0&&<MathText tex={`\\pmod{${c.modulus}}`}/>}</p>}
 </details>;
}
