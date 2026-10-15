import {coefficientColor,productCells,productFillColor} from './compact.ts';
import {MathText} from './PaperFigures.tsx';
import {linear} from './Expansion.tsx';
import type {Construction} from './visual.ts';

// Use the same display order as the tile; its index map retains the stored indices.
export function ConstructionDifference({c,id}:{c?:Construction;id:string}){
 const count=c?.integer?.provenance.length??1;
 const shared=c?.planes&&JSON.stringify(c.planes.A)===JSON.stringify(c.planes.B);
 return <span className="construction-difference" data-construction-difference={id}>
 <span className="difference-identity"><span title={id}>ID {id.startsWith('awe1_')?id.slice(5,13):id}</span>{c&&<MathText tex={`D=${c.denominator}`}/>} {count>1&&<span data-same-form={count}>出所の記録 {count}</span>}</span>
 {c?.planes&&(shared?['A'] as const:['A','B'] as const).map(side=><span className="difference-planes" key={side}>
 <MathText tex={shared?'A\\leftrightarrow B:':`${side}:`}/>
 {c.planes![side].filter(v=>v.filter(Boolean).length>1||v.some(n=>Math.abs(n)>1)).map((v,i)=><MathText key={i} tex={`${i?',\\;':''}${linear(v,side==='A'?'a':'b')}`}/>)}
 </span>)}
 {c&&<span className="block-swatches">{c.products.map((p,i)=>productCells(c,i).length>1&&<span key={i} data-block-swatch data-product-index={i} data-block-color={coefficientColor(c,i)} style={{borderColor:coefficientColor(c,i),background:productFillColor(c,i)}}><MathText tex={`T_{${i}}`}/></span>)}</span>}
 </span>;
}
