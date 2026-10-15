import {planeValue} from './encoding.ts';
import {FP4_VALUES} from './encoding.ts';
import {modulo,savedTuple,weightedTuple,type EncodingTable} from './savedEncoding.ts';
import type {Construction} from './visual.ts';
export type Matrix=bigint[][];
export function parseMatrix(text:string):Matrix{
 const rows=text.trim().split(/[;\n]+/).map(r=>r.trim().split(/[\s,]+/));
 if(rows.length>4||!rows[0].length||rows[0].length>4||rows.some(r=>r.length!==rows[0].length||r.some(v=>! /^-?\d{1,100}$/.test(v))))throw Error('整数行列 1〜4 × 1〜4');
 return rows.map(r=>r.map(BigInt));
}
export function multiply(a:Matrix,b:Matrix):Matrix{
 if(a[0].length!==b.length)throw Error('次元不一致');
 return a.map(row=>b[0].map((_,j)=>row.reduce((sum,v,k)=>sum+v*b[k][j],0n)));
}
export function inverse(n:bigint,p:bigint):bigint{
 let [a,b,x,y]=[modulo(n,p),p,1n,0n];
 while(b){const q=a/b;[a,b]=[b,a-q*b];[x,y]=[y,x-q*y];}
 if(a!==1n)throw Error('互いに素でない');
 return modulo(x,p);
}
export type Plan={id:string;modulus:number;weights:{A:number[];B:number[]};planes:{A:number[][];B:number[][]};products:{a:number;b:number;numerator:number}[];denominator:number;encode:(v:bigint,side:'A'|'B')=>number[]|undefined;faceValue?:(side:'A'|'B',plane:number,t:number[])=>bigint;maxK?:number|null};
export function constructionPlan(c:Construction):Plan{
 if(!c.planes||c.products.some(p=>p.numerator===null))throw Error('面・係数未収録');
 return {...c,planes:c.planes,products:c.products.map(p=>({...p,numerator:p.numerator!})),encode:(v,side)=>savedTuple(c,v,side),faceValue:(side,plane,t)=>planeValue(c,side,plane,t),maxK:c.max_k};
}
export function base13Plan(table:EncodingTable):Plan{
 const w=table.weights,planes=w.map((_,i)=>w.map((_,j)=>Number(i===j)));
 return {id:table.source_sha256+':'+table.method,modulus:0,weights:{A:w,B:w},planes:{A:planes,B:planes},products:w.flatMap((a,i)=>w.map((b,j)=>({a:i,b:j,numerator:a*b}))),denominator:1,encode:v=>table.values[String(v)]};
}
export function computeMatrix(plan:Plan,a:Matrix,b:Matrix){
 const reference=multiply(a,b),p=BigInt(plan.modulus);
 const tuples=(m:Matrix,side:'A'|'B')=>m.map(row=>row.map(v=>{
  const t=plan.encode(v,side);if(!t)throw Error('符号化表未収録');
  const decoded=weightedTuple(t,plan.weights[side]);if(p?modulo(decoded-v,p)!==0n:decoded!==v)throw Error('符号化表と不一致');
  return t;
 }));
 const ta=tuples(a,'A'),tb=tuples(b,'B');
 const limbs=(rows:number[][][],side:'A'|'B')=>plan.weights[side].map((_,i)=>rows.map(row=>row.map(t=>BigInt(t[i]))));
 const planes=(rows:number[][][],side:'A'|'B')=>plan.planes[side].map((coeff,plane)=>rows.map(row=>row.map(t=>plan.faceValue?plan.faceValue(side,plane,t):coeff.reduce((sum,v,i)=>sum+BigInt(v)*BigInt(t[i]),0n))));
 const la=limbs(ta,'A'),lb=limbs(tb,'B'),fa=planes(ta,'A'),fb=planes(tb,'B');
 for(const term of plan.products)if([...fa[term.a].flat(),...fb[term.b].flat()].some(v=>!FP4_VALUES.includes(Number(v))))throw Error('S範囲外・未補正');
 const products=plan.products.map(t=>multiply(fa[t.a],fb[t.b]));
 const numerator=reference.map((row,i)=>row.map((_,j)=>plan.products.reduce((sum,t,k)=>sum+BigInt(t.numerator)*products[k][i][j],0n)));
 const d=BigInt(plan.denominator);if(d<=0n)throw Error('分母不正');
 const reconstructed=numerator.map(row=>row.map(n=>p?modulo(n*inverse(d,p),p):n%d===0n?n/d:null));
 const expected=reference.map(row=>row.map(n=>p?modulo(n,p):n));
 const residual=expected.map((row,i)=>row.map((v,j)=>reconstructed[i][j]===null?null:reconstructed[i][j]!-v));
 return {la,lb,fa,fb,products,numerator,reconstructed,reference,expected,residual,matches:residual.every(row=>row.every(v=>v===0n)),k:a[0].length};
}
export function crt(residues:bigint[],moduli:bigint[]){
 if(!moduli.length||moduli.length!==residues.length||moduli.some(p=>p<=1n))throw Error('法未収録');
 const P=moduli.reduce((v,p)=>v*p,1n),coefficients=moduli.map(p=>(P/p)*inverse(P/p,p));
 const nonnegative=modulo(residues.reduce((sum,r,i)=>sum+r*coefficients[i],0n),P),centered=2n*nonnegative>=P?nonnegative-P:nonnegative;
 return {P,coefficients,nonnegative,centered};
}
