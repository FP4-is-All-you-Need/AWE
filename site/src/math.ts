import type { Solution, MatrixSolution } from './types.ts';
export const COLORS=['#21796f','#cf9145','#7d6aa9','#c56364','#468bb0','#97a04f','#b579a8','#66788c','#b75d32'];
const gcd=(a:bigint,b:bigint):bigint=>b?gcd(b,a%b):a<0n?-a:a;
export function fraction(n:bigint,d:bigint=1n):string {const g=gcd(n,d);return d/g===1n?String(n/g):`${n/g}/${d/g}`;}
export function contribution(s:MatrixSolution,k:number,i:number,j:number):bigint {
 const p=s.products[k];return BigInt(p.numerator)*BigInt(s.planes.A[p.a][i])*BigInt(s.planes.B[p.b][j]);
}
export function identity(s:Solution):boolean {
 return s.weights.A.every((a,i)=>s.weights.B.every((b,j)=>s.products.reduce((t,_,k)=>t+contribution(s,k,i,j),0n)===BigInt(s.denominator)*BigInt(a)*BigInt(b)));
}
export function linear(v:number[],letter:string):string {
 const terms=v.flatMap((c,i)=>c?[`${c<0?'−':'+'} ${Math.abs(c)===1?'':Math.abs(c)+'·'}${letter}${i}`]:[]).join(' ');
 return terms.startsWith('+ ')?terms.slice(2):terms||'0';
}
