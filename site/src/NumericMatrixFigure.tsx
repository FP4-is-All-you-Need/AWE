import {MathText} from './PaperFigures.tsx';
import {GroupBrace} from './GroupBrace.tsx';
import {useParameter} from './parameters.ts';
import {useLanguage} from './i18n.tsx';
import {directPalette} from './productPalette.ts';
import {productFillColor,textInk,coefficientColor,directColor} from './compact.ts';
import type {Construction} from './visual.ts';
import type {Plan,Matrix,computeMatrix} from './numericExample.ts';
import {FP4_SCALE_COLOR,scaledEntries,scaledMatrixTex} from './numericMatrix.ts';
import './numeric-matrix.css';

type Result=ReturnType<typeof computeMatrix>;
const texColor=(color:string,tex:string)=>`\\textcolor{${color}}{${tex}}`;
const power13=(weight:number)=>{
 let power=0,current=1;while(current<weight){current*=13;power++;}
 return current===weight?(power===0?'1':power===1?'13':`13^{${power}}`):String(weight);
};

function MatrixGlyph({matrix,color,show=false,label}:{matrix:Matrix;color:string;show?:boolean;label?:string}){
 const visible=show,entries=scaledEntries(matrix);
 const body=<><span className="numeric-matrix-bracket" style={{color:textInk(color)}} data-matrix-rows={matrix.length} data-matrix-columns={matrix[0].length}>
 <span className="numeric-matrix-entries" style={{gridTemplateColumns:`repeat(${matrix[0].length},${visible?'minmax(1.4em, auto)':'0.7em'})`}}>
 {entries.flatMap((row,i)=>row.map((value,j)=><span key={`${i}.${j}`} data-entry-value={value}>{visible?value:'·'}</span>))}
 </span></span>{label&&<span className="numeric-matrix-label"><MathText tex={label}/></span>}</>;
 return <span className="numeric-matrix-glyph" style={{color:textInk(color)}}>{body}</span>;
}

function MatrixToggle({matrix,color,label,name}:{matrix:Matrix;color:string;label:string;name:string}){
 const [revealed,setRevealed]=useParameter(name,false,r=>r==='1',v=>v?'1':'0'),language=useLanguage();
 return <button type="button" name={name} form="visual-actions" value={revealed?'1':'0'} className="numeric-matrix-toggle" data-limb={label.replaceAll('_','')} aria-label={`${label.replaceAll('_','')} ${language==='ja'?'値':'values'}`} aria-pressed={revealed} onClick={()=>setRevealed(!revealed)} style={{color:textInk(color)}}><MatrixGlyph matrix={matrix} color={color} label={label} show={revealed}/></button>;
}

export function NumericMatrixFigure({plan,result,kind,selected,onSelect,c}:{plan:Plan;result:Result;kind:string;selected:number;onSelect:(index:number)=>void;c?:Construction}){
 const visual:Construction=c??{id:plan.id,modulus:plan.modulus,weights:plan.weights,planes:plan.planes,products:plan.products.map(p=>({...p,group:null})),denominator:plan.denominator,shape:'direct',faces_a:plan.planes.A.length,faces_b:plan.planes.B.length,holes:{count:0,share:0},carry:false,block_shift:false,source_sha256:''};
 const weights=[...new Set([...plan.weights.A,...plan.weights.B])].sort((a,b)=>a-b),limbPalette=directPalette(weights.length);
 const limbColor=(side:'A'|'B',index:number)=>limbPalette[weights.indexOf(plan.weights[side][index])];
 const planeTex=(side:'A'|'B',index:number)=>plan.planes[side][index].map((v,i)=>!v?'':`${v<0?'-':'+'}${Math.abs(v)===1?'':Math.abs(v)}${texColor(limbColor(side,i),`${side}_{${i}}`)}`).join('').replace(/^\+/,'')||'0';
 const direct=kind==='base13';
 const pair=(i:number,j:number)=>texColor(limbColor('A',i),`A_{${i}}`)+texColor(limbColor('B',j),`B_{${j}}`);
 const directTerm=(index:number)=>{
  const term=plan.products[index],a=plan.planes.A[term.a],b=plan.planes.B[term.b];
  return pair(a.findIndex(Boolean),b.findIndex(Boolean));
 };
 const groups=direct?[...new Set(plan.products.map(p=>p.numerator))].sort((a,b)=>a-b).map(weight=>({weight,indices:plan.products.flatMap((p,i)=>p.numerator===weight?[i]:[])})):[];
 const reconstruction=direct?groups.map(({weight,indices},group)=>{
  const color=directColor(visual,plan.products[indices[0]].a,plan.products[indices[0]].b),terms=indices.map(directTerm).join('+');
  return `${group?'+':''}${weight===1?'':texColor(color,power13(weight))}${indices.length>1?`\\left(${terms}\\right)`:terms}`;
 }):plan.products.map((p,i)=>`${i?'+':''}${texColor(coefficientColor(visual,i),`${p.numerator<0?'('+p.numerator+')':p.numerator===1?'':p.numerator}T_{${i}}`)}`);
 const operation=plan.modulus?'\\equiv':'=',denominator=plan.denominator===1?'':plan.modulus?`${plan.denominator}^{-1}`:`\\frac{1}{${plan.denominator}}`;
 const term=plan.products[selected];
 const glyphWidth=(matrix:Matrix)=>{
  const entries=scaledEntries(matrix),columns=matrix[0].length;
  return Array.from({length:columns},(_,j)=>Math.max(2,...entries.map(row=>row[j].length))*9).reduce((sum,width)=>sum+width,0)+Math.max(0,columns-1)*3+20;
 };
 const cellWidth=Math.max(180,...plan.products.map(p=>glyphWidth(result.fa[p.a])+glyphWidth(result.fb[p.b])+48));
 return <div className="numeric-matrix-figure" data-fp4-scale="2">
 <div className="numeric-source-rows">
 {(['A','B'] as const).map(side=><div className="numeric-source-row" key={side} data-source-side={side}>
 <MathText tex={`${side}${operation}${texColor(FP4_SCALE_COLOR,'2')}\\Bigl(`}/>
 {plan.weights[side].map((weight,i)=><span className="numeric-source-term" key={i}>
 {i>0&&<MathText tex="+"/>}{weight!==1&&<MathText tex={texColor(limbColor(side,i),power13(weight))}/>}
 <MatrixToggle matrix={(side==='A'?result.la:result.lb)[i]} color={limbColor(side,i)} label={`${side}_${i}`} name={`example_limb_values_${kind}_${side}${i}`}/>
 </span>)}<MathText tex={`\\Bigr)${plan.modulus?`\\pmod{${plan.modulus}}`:''}`}/>
 </div>)}
 </div>
 <div className="numeric-products-reconstruction">
 <form name={'numeric_products_'+kind} className={`numeric-product-grid${direct?' numeric-direct-grid':''}`} style={{gridTemplateColumns:`${direct?'50px ':''}repeat(${direct?plan.weights.B.length:Math.min(3,plan.products.length)},${cellWidth}px)`}} onSubmit={e=>e.preventDefault()}>
 {direct&&<>{plan.weights.B.map((_,j)=><span key={`B${j}`} data-numeric-axis={`B${j}`} className="numeric-product-axis" style={{gridRow:1,gridColumn:j+2,color:textInk(limbColor('B',j))}}><MathText tex={`B_{${j}}`}/></span>)}{plan.weights.A.map((_,i)=><span key={`A${i}`} data-numeric-axis={`A${i}`} className="numeric-product-axis" style={{gridRow:i+2,gridColumn:1,color:textInk(limbColor('A',i))}}><MathText tex={`A_{${i}}`}/></span>)}</>}
 {plan.products.map((p,index)=>{
  const color=coefficientColor(visual,index),ai=plan.planes.A[p.a].findIndex(Boolean),bi=plan.planes.B[p.b].findIndex(Boolean),isSelected=selected===index;
  return <button key={index} type="button" name={'example_product_'+kind} value={index} data-numeric-product={index} data-product-color={color} data-product-index={index} aria-pressed={isSelected} onClick={()=>onSelect(index)} style={{gridRow:direct?ai+2:undefined,gridColumn:direct?bi+2:undefined,borderColor:color,borderWidth:isSelected?3:2,background:productFillColor(visual,index)}}>
  <span className="numeric-plane-matrices"><MatrixGlyph matrix={result.fa[p.a]} color={direct?limbColor('A',ai):color} show={isSelected}/><span data-numeric-times><MathText tex={'\\times'}/></span><MatrixGlyph matrix={result.fb[p.b]} color={direct?limbColor('B',bi):color} show={isSelected}/></span>
  <span className="numeric-product-formula"><MathText tex={direct?directTerm(index):`T_{${index}}=(${planeTex('A',p.a)})(${planeTex('B',p.b)})`}/></span>
  <span className="numeric-product-result"><MathText tex={`${direct?directTerm(index):`T_{${index}}`}=${scaledMatrixTex(result.products[index],4n)}`}/></span>
  </button>;
 })}
 </form>
 <div className="numeric-grouped-reconstruction" data-numeric-grouped-reconstruction={kind}>
 <MathText tex="C=AB"/>
 <div className="numeric-brace-formula">
 <MathText tex={`${operation}${texColor(FP4_SCALE_COLOR,'2^2')}${denominator}`}/>
 <GroupBrace side="left" size={Math.max(72,reconstruction.length*38)}/>
 <div className="numeric-reconstruction-rows">
 {reconstruction.map((tex,row)=>{
  const indices=direct?groups[row].indices:[row],active=indices.includes(selected),index=active?selected:indices[0];
  const color=direct?directColor(visual,plan.products[index].a,plan.products[index].b):coefficientColor(visual,index);
  return <button type="button" name={'example_product_'+kind} value={index} form="visual-actions" key={row} data-numeric-reconstruction-row={row} data-reconstruction-products={indices.join(',')} data-product-color={color} aria-pressed={active} onClick={()=>onSelect(index)} style={{borderColor:active?color:'transparent',background:active?productFillColor(visual,index):'transparent'}}><MathText tex={tex}/></button>;
 })}
 </div>
 <GroupBrace side="right" size={Math.max(72,reconstruction.length*38)}/>
 </div>
 {plan.modulus>0&&<MathText tex={`\\pmod{${plan.modulus}}`}/>}
 </div>
 </div>
 <div className="numeric-row paper-scroll numeric-selected" data-fp4-product-scale="4"><MathText tex={`${texColor(FP4_SCALE_COLOR,'2^2')}\\left(${scaledMatrixTex(result.fa[term.a])}\\right)\\left(${scaledMatrixTex(result.fb[term.b])}\\right)=${scaledMatrixTex(result.products[selected],1n)}`}/></div>
 </div>;
}
