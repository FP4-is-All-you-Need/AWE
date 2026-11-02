import {useMemo} from 'react';
import {MathText} from './PaperFigures.tsx';
import {coefficientColor,productFillColor,whiteFill} from './compact.ts';
import {productCoverage} from './coverage.ts';
import type {Construction} from './visual.ts';
import './coverage-figure.css';

/** The paper's coverage figure: the lattice of all terms a_i b_j, then one board per product (outlined: in the product;
 * filled: kept by it; slashed: also in a product with fewer terms) with the scales of the kept terms underneath.
 * Boards wrap to the width of the container. */
export function CoverageFigure({c,selected,onSelect,en}:{c:Construction;selected:number|null;onSelect:(i:number)=>void;en:boolean}){
 const cover=useMemo(()=>productCoverage(c),[c]);
 const rows=c.weights.A.length,cols=c.weights.B.length,cell=30,top=22,left=46,board=cols*cell;
 const scales=[...new Set(c.weights.A.flatMap(a=>c.weights.B.map(b=>a*b)))].sort((x,y)=>x-y);
 const shade=(v:number)=>whiteFill('#1A1A1A',.06+.3*scales.indexOf(v)/Math.max(1,scales.length-1));
 const term=([i,j]:[number,number])=>`a${i}b${j}`;
 const latticeW=left+board+4,latticeH=top+rows*cell+20;
 return <div className="coverage-figure" data-coverage-figure={c.id}>
  <p>{en?<>Covering the {rows*cols} terms <MathText tex="a_{i}b_{j}"/> with {c.products.length} products</>:<>{rows*cols} 個の項 <MathText tex="a_{i}b_{j}"/> を {c.products.length} 個の積で覆う</>}</p>
  <div className="coverage-boards">
   <svg width={latticeW} height={latticeH} viewBox={`0 0 ${latticeW} ${latticeH}`} aria-label={en?'All terms a_i b_j':'全部の項 a_i b_j'}>
    {c.weights.B.map((w,j)=><text key={j} x={left+(j+.5)*cell} y={top-7} textAnchor="middle" fontSize="10">b{j}·{w}</text>)}
    {c.weights.A.map((w,i)=><text key={i} x={left-5} y={top+(i+.5)*cell+4} textAnchor="end" fontSize="10">a{i}·{w}</text>)}
    {c.weights.A.flatMap((wa,i)=>c.weights.B.map((wb,j)=><g key={i+':'+j}><rect x={left+j*cell} y={top+i*cell} width={cell} height={cell} fill={shade(wa*wb)} stroke="#9E9E9E" strokeWidth=".65"/><text x={left+(j+.5)*cell} y={top+(i+.5)*cell+4} textAnchor="middle" fontSize="9" fill="#1A1A1A">{term([i,j])}</text></g>))}
    <text x={left+board/2} y={top+rows*cell+14} textAnchor="middle" fontSize="10">{en?`all ${rows*cols}`:`全 ${rows*cols} 項`}</text>
   </svg>
   {cover.map((p,t)=>{const color=coefficientColor(c,t),covered=new Set(p.terms.map(term)),kept=new Set(p.kept.map(term));
    const under=[p.scales.join(', '),p.kept.map(term).join('+')],w=Math.max(board,...under.map(s=>s.length*6.2))+8,x=(w-board)/2,h=top+rows*cell+34;
    return <div key={t} className="coverage-item"><span className="coverage-op">{t?'+':'≡'}</span>
     <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="button" tabIndex={0} aria-label={`T${t}`} aria-pressed={selected===t} data-coverage-product={t} data-coverage-terms={p.terms.map(term).join(',')} data-coverage-kept={p.kept.map(term).join(',')} onClick={()=>onSelect(t)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onSelect(t);}}}>
      <text x={w/2} y={top-7} textAnchor="middle" fontSize="11" fill={color}>{c.products[t].numerator??'?'}·T{t}</text>
      {c.weights.A.flatMap((_,i)=>c.weights.B.map((_,j)=>{const k=term([i,j]),xx=x+j*cell,yy=top+i*cell,inside=covered.has(k);
       return <g key={k}><rect x={xx} y={yy} width={cell} height={cell} fill={kept.has(k)?productFillColor(c,t):'#ffffff'} stroke={inside?color:'#9E9E9E'} strokeWidth={inside?1.6:.65}/>{inside&&!kept.has(k)&&<line x1={xx+4} y1={yy+cell-4} x2={xx+cell-4} y2={yy+4} stroke={color} strokeWidth="1.4"/>}</g>;}))}
      {selected===t&&<rect x={x-3} y={top-3} width={board+6} height={rows*cell+6} fill="none" stroke="#1A1A1A" strokeWidth="2"/>}
      <text x={w/2} y={top+rows*cell+14} textAnchor="middle" fontSize="10">{under[0]}</text>
      <text x={w/2} y={top+rows*cell+28} textAnchor="middle" fontSize="10" fill={color}>{under[1]}</text>
     </svg></div>;})}
  </div>
  <ul className="coverage-legend">{(en?[['Outline','terms in the product'],['Fill','terms the product keeps'],['Slash','terms also in a product with fewer terms'],['Under each board','scales of the kept terms']]:[['枠','その積に含まれる項'],['塗り','その積が受け持つ項'],['斜線','より少ない項の積にも含まれる項'],['盤の下','受け持つ項の尺度']]).map(([k,v])=><li key={k}>{k}{en?': ':'：'}{v}</li>)}
   <li>{en?<>Left lattice: shaded by the scale <MathText tex="w_{i}w_{j}"/></>:<>左の格子：尺度 <MathText tex="w_{i}w_{j}"/> の大きさで濃さを変える</>}</li></ul>
 </div>;
}
