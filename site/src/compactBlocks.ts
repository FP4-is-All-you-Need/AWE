import {blockPairs} from './limbOrder.ts';
import {productCells,coefficientColor,directColor} from './compact.ts';
import type {Construction} from './visual.ts';
export type CompactBlock={a:number[];b:number[];column:number;row:number;product:number;direct:{i:number;j:number;product:number;subtract:bigint;scale:bigint}[];cross:{i:number;j:number;factor:bigint;scale:bigint}[];numerator:bigint;denominator:bigint;color:string};
// Algebraic re-expression of saved products only. Test every coefficient over Z,
// including for modular records; never turn a congruence into an integer identity.
export function compactBlocks(c:Construction):CompactBlock[]|null{
 const pairs=blockPairs(c);if(!pairs||!c.planes||c.weights.A.length<4||c.weights.B.length<4||c.denominator<=0||[...pairs.A,...pairs.B].some(p=>p[1]!==p[0]+1))return null;
 const out:CompactBlock[]=[],d=BigInt(c.denominator);
 for(const [row,b] of pairs.B.entries())for(const [column,a] of pairs.A.entries()){
  const products=c.products.flatMap((p,k)=>{const cells=productCells(c,k);return cells.some(t=>a.includes(t.i)&&b.includes(t.j))?[{p,k,cells}]:[];});
  const mixed=products.find(t=>t.cells.length===4),direct=products.filter(t=>t.cells.length===1);
  if(!mixed||mixed.p.numerator===null||direct.length!==2)return null;
  const numerator=BigInt(mixed.p.numerator),av=c.planes.A[mixed.p.a],bv=c.planes.B[mixed.p.b];
  const diag=[];
  for(let k=0;k<2;k++){
   const i=a[k],j=b[k],term=direct.find(t=>t.cells[0].i===i&&t.cells[0].j===j),subtract=BigInt(av[i])*BigInt(bv[j]),scale=BigInt(c.weights.A[i])*BigInt(c.weights.B[j]);
   if(!term||term.cells[0].n===null||term.cells[0].n+numerator*subtract!==d*scale)return null;
   diag.push({i,j,product:term.k,subtract,scale});
  }
  const cross=[{i:a[0],j:b[1]},{i:a[1],j:b[0]}].map(({i,j})=>({i,j,factor:BigInt(av[i])*BigInt(bv[j]),scale:BigInt(c.weights.A[i])*BigInt(c.weights.B[j])}));
  if(cross.some(t=>numerator*t.factor!==d*t.scale))return null;
  out.push({a,b,row,column,product:mixed.k,direct:diag,cross,numerator,denominator:d,color:''});
 }
 // Shared position-based palette, including equal coefficients in different blocks.
 return out.map(b=>({...b,color:coefficientColor(c,b.product)}));
}
// Express a scale with factors already present among the saved limb weights.
export function weightScale(c:Construction,value:bigint):string{
 if(value===0n)return '0';const sign=value<0n?'-':'';let rest=value<0n?-value:value;
 const bases=[...new Set([...c.weights.A,...c.weights.B].filter(v=>v>1))].sort((a,b)=>a-b),parts:string[]=[];
 for(const b of bases){const base=BigInt(b);let n=0;while(rest%base===0n){n++;rest/=base;}if(n)parts.push(n===1?String(b):`${b}^{${n}}`);}
 if(rest>1n)parts.push(String(rest));return sign+(parts.join('\\cdot ')||'1');
}
const term=(coefficient:bigint,symbol:string)=>coefficient===0n?'':`${coefficient<0n?'-':'+'}${coefficient===1n||coefficient===-1n?'':coefficient<0n?-coefficient:coefficient}${symbol}`;
export const pLabel=(i:number,j:number)=>`P_{${i}${j}}`;
export function blockFormula(c:Construction,b:CompactBlock):[string,string,string,string]{
 const q=`Q_{${b.column}${b.row}}`,p=c.products[b.product],av=c.planes!.A[p.a],bv=c.planes!.B[p.b];
 const linear=(v:number[],letter:string)=>v.map((x,i)=>term(BigInt(x),`${letter}_{${i}}`)).join('').replace(/^\+/,'')||'0';
 const direct=(s:string,i:number,j:number)=>`\\color{${directColor(c,i,j)}}{${s}}`,col=(s:string)=>`\\color{${b.color}}{${s}}`;
 const diags=b.direct.map(t=>direct(term(t.subtract,pLabel(t.i,t.j)),t.i,t.j));
 const cross=b.cross.map(t=>term(t.factor,`a_{${t.i}}b_{${t.j}}`)).join('').replace(/^\+/,'');
 const crossFactor=b.cross[0].factor===b.cross[1].factor?b.cross[0].factor:null;
 const crossTerms=b.cross.map(t=>`a_{${t.i}}b_{${t.j}}`).join('+');
 const expansion=crossFactor!==null?`${crossFactor<0n?'-':'+'}${crossFactor===1n||crossFactor===-1n?'':crossFactor<0n?-crossFactor:crossFactor}${col(`(${crossTerms})`)}`:`+${col(`(${cross})`)}`;
 const weighted=b.cross[0].scale===b.cross[1].scale?`${weightScale(c,b.cross[0].scale)}${col(`(${crossTerms})`)}`:b.cross.map(t=>term(t.scale,`a_{${t.i}}b_{${t.j}}`)).join('').replace(/^\+/,'');
 const coefficient=b.denominator===1n?weightScale(c,b.numerator):`\\frac{${weightScale(c,b.numerator)}}{${b.denominator}}`;
 return [`${q}=(${linear(av,'a')})(${linear(bv,'b')})`,`=${diags[0].replace('{+','{')}${expansion}${diags[1]}`,weighted,`=${coefficient}\\left(${q}${b.direct.map(t=>direct(term(-t.subtract,pLabel(t.i,t.j)),t.i,t.j)).join('')}\\right)`];
}
