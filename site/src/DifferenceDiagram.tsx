import {DIRECT_FILL_OPACITY,PLANE_FILL_OPACITY,coefficientColor,productBaseColor} from './compact.ts';
import {Formula} from './PaperFigures.tsx';
import type {Construction} from './visual.ts';
// awe_diffface_scale.py: FW=6.6, FH=1.78, X0=.56, C=GAP=.30,
// TOP_ROOM=.47; inches multiplied by 180 (2.5 px per source point).
const C=54,TOP=84.6,XS=[100.8,316.8,532.8,748.8,964.8],LIMB=['#C2185B','#884499','#4A53A8'],WASH=[0,.061,.170];
export function differencePlan(c:Construction){
 if(c.denominator!==1||c.weights.A.length!==3||c.weights.A.join()!==c.weights.B.join()||!c.planes||c.products.length!==6)return null;
 const terms=c.products.map(p=>({p,a:c.planes!.A[p.a],b:c.planes!.B[p.b]}));
 const find=(v:number[])=>terms.findIndex(t=>t.a?.join()===v.join()&&t.b?.join()===v.join());
 const direct=[0,1,2].map(i=>find([0,1,2].map(j=>i===j?1:0))),pairs=[[0,1],[0,2],[1,2]].map(([i,j])=>({i,j,term:find([0,1,2].map(k=>k===i?1:k===j?-1:0))}));
 if([...direct,...pairs.map(p=>p.term)].some(i=>i<0))return null;
 const w=c.weights.A,expected=direct.map((term,i)=>[term,w[i]*w.reduce((a,b)=>a+b,0)]).concat(pairs.map(p=>[p.term,-w[p.i]*w[p.j]]));
 if(expected.some(([i,n])=>c.products[i].numerator===null||(c.modulus?(c.products[i].numerator!-n)%c.modulus!==0:c.products[i].numerator!==n)))return null;
 return {direct,pairs};
}
export function DifferenceDiagram({c,selected,onSelect}:{c:Construction;selected:number|null;onSelect:(n:number)=>void}){
 const plan=differencePlan(c)!;const w=c.weights.A;const LIMB=plan.direct.map(t=>coefficientColor(c,t));
 const grid=(x:number)=>Array.from({length:3},(_,r)=>Array.from({length:3},(_,col)=><rect data-grid-cell key={`${r}-${col}`} x={x+col*C} y={TOP+r*C} width={C} height={C} fill="none" stroke="#9E9E9E" strokeWidth={1.25}/>));
 const formula=(x:number,y:number,tex:string,color='#1A1A1A',width=C,size=21.25)=><Formula x={x} y={y} w={width} h={32} tex={tex} color={color} size={size}/>;
 const select=(term:number)=>({role:'button',tabIndex:0,'aria-label':`積 ${term+1}`,'aria-pressed':selected===term,onClick:()=>onSelect(term),onKeyDown:(e:React.KeyboardEvent)=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onSelect(term);}}});
 const term=(n:number,symbol:string,color:string)=>`${n<0?'-':'+'}\\textcolor{${color}}{${Math.abs(n)}${symbol}}`;
 const expr=plan.direct.map((t,i)=>term(c.products[t].numerator!,`P_{${i}${i}}`,LIMB[i])).concat(plan.pairs.map(p=>term(c.products[p.term].numerator!,`M_{${p.i}${p.j}}`,coefficientColor(c,p.term)))).join('').replace(/^\+/,'');
 const corners=(x:number)=>[0,2].flatMap(r=>[0,2].map(col=>{const dx=col===0?-1:1,dy=r===0?1:-1,xv=x+(col===0?1:col)*C+dx*4.5,yh=TOP+(r===0?1:r)*C-dy*4.5,xo=x+(col===0?0:3*C)+dx*5.4,yo=TOP+(r===0?0:3*C)-dy*5.4;return `M ${xv} ${yo} V ${yh} H ${xo}`;})).join(' ');

 return <svg data-expansion={c.id} data-paper-difference width={1188} height={320.4} viewBox="0 0 1188 320.4" aria-label="全項の格子と面の積の和">
 <Formula x={480} y={3} w={699} h={32} tex={'\\text{差の積 }M_{ij}=(a_{i}-a_{j})(b_{i}-b_{j})=P_{ii}+P_{jj}-a_{i}b_{j}-a_{j}b_{i}'} size={22.5}/>
 <Formula x={420} y={36} w={759} h={32} tex={'AB'+(c.modulus?'\\equiv':'=')+expr+(c.modulus?`\\pmod{${c.modulus}}`:'')} size={22.5}/>
 {XS.map((x,index)=><g key={index}>
 {index<4&&formula(x+162,TOP+61,index===0?'=':'+',undefined,54,30)}
 {index===0&&<>{WASH.map((alpha,i)=>alpha>0&&<g key={i}><rect x={x} y={TOP+i*C} width={162} height={C} fill="#000000" fillOpacity={alpha}/><rect x={x+i*C} y={TOP} width={C} height={162} fill="#000000" fillOpacity={alpha}/></g>)}{[0,1,2].map(i=><g key={i}>{formula(x+i*C,TOP-68,`b_{${i}}`,LIMB[i])}<rect x={x+i*C} y={TOP-34.2} width={C} height={21.6} fill="#000000" fillOpacity={WASH[i]}/>{formula(x+i*C,TOP-40,`\\times ${w[i]}`,LIMB[i],C,20)}{formula(x-85,TOP+i*C+12,`a_{${i}}`,LIMB[i],40)}<rect x={x-55.8} y={TOP+i*C} width={48.6} height={C} fill="#000000" fillOpacity={WASH[i]}/>{formula(x-52,TOP+i*C+12,`\\times ${w[i]}`,LIMB[i],48,20)}</g>)}{[0,1,2].flatMap(r=>[0,1,2].map(col=><g key={`${r}-${col}`}>{formula(x+col*C,TOP+r*C+12,`a_{${r}}b_{${col}}`)}</g>))}{formula(x,TOP+166,'\\text{全9項}',undefined,162,20)}{formula(x,TOP+196,'w_{i}w_{j} a_{i} b_{j}',undefined,162,20)}</>}
 {index===1&&<>{plan.direct.map((term,i)=><g key={i} data-product={term} data-product-index={term} data-block-color={coefficientColor(c,term)} {...select(term)}><rect x={x+i*C} y={TOP+i*C} width={C} height={C} fill={LIMB[i]} fillOpacity={DIRECT_FILL_OPACITY}/><rect x={x+i*C+5.4} y={TOP+i*C+5.4} width={C-10.8} height={C-10.8} fill="none" stroke={LIMB[i]} strokeWidth={selected===term?3:2.25}/>{formula(x+i*C,TOP+i*C+12,`P_{${i}${i}}`,LIMB[i],C,22.5)}</g>)}{formula(x-5,TOP+166,'\\text{直接の積3本}',undefined,172,20)}{formula(x-10,TOP+196,w.map((v,i)=>`${v}^2P_{${i}${i}}`).join(','),undefined,190,20)}</>}
 {index>=2&&(()=>{const {i,j,term}=plan.pairs[index-2],color=coefficientColor(c,term);return <g data-product={term} data-product-index={term} data-block-color={color} {...select(term)}>{[[i,j],[j,i]].map(([r,col])=><g key={r}><rect x={x+col*C} y={TOP+r*C} width={C} height={C} fill={productBaseColor(c,term)} fillOpacity={PLANE_FILL_OPACITY}/>{formula(x+col*C,TOP+r*C+12,`a_{${r}}b_{${col}}`)}</g>)}{[i,j].map(m=><g key={m}><line x1={x+m*C+6.3} y1={TOP+(m+1)*C-6.3} x2={x+(m+1)*C-6.3} y2={TOP+m*C+6.3} stroke={LIMB[m]} strokeWidth={2}/>{formula(x+m*C,TOP+m*C+12,`+P_{${m}${m}}`,LIMB[m])}</g>)}{j-i===1?<rect data-difference-support data-product-index={term} data-block-color={color} x={x+i*C+5.4} y={TOP+i*C+5.4} width={2*C-10.8} height={2*C-10.8} fill="none" stroke={color} strokeWidth={selected===term?3:2.25}/>:<path data-difference-support data-product-index={term} data-block-color={color} d={corners(x)} fill="none" stroke={color} strokeWidth={selected===term?3:2.5}/>}{formula(x-10,TOP+166,`${w[i]}\\times${w[j]}(a_{${i}}b_{${j}}+a_{${j}}b_{${i}})`,color,192,20)}{formula(x-10,TOP+196,`=${w[i]*w[j]}(P_{${i}${i}}+P_{${j}${j}}-M_{${i}${j}})`,color,210,20)}{selected===term&&<rect x={x-3} y={TOP-3} width={168} height={168} fill="none" stroke="#1A1A1A" strokeWidth={2}/>}</g>;})()}
 {grid(x)}
 </g>)}
 </svg>;
}
