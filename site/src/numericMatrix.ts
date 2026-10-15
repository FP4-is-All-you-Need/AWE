import type {Matrix} from './numericExample.ts';

export const FP4_SCALE_COLOR='#6B9E23';
export function scaledEntry(value:bigint,denominator=2n):string{
 const negative=value<0n,n=negative?-value:value;
 const whole=n/denominator,remainder=n%denominator;
 if(!remainder)return (negative?'-':'')+whole;
 if(denominator===2n)return (negative?'-':'')+whole+'.5';
 if(denominator===4n)return (negative?'-':'')+whole+(['','.25','.5','.75'][Number(remainder)]);
 return `${value}/${denominator}`;
}
export const scaledMatrixTex=(matrix:(bigint|null)[][],denominator=2n)=>`\\begin{bmatrix}${matrix.map(row=>row.map(value=>value===null?'?':scaledEntry(value,denominator)).join('&')).join('\\\\')}\\end{bmatrix}`;
export const scaledEntries=(matrix:Matrix,denominator=2n)=>matrix.map(row=>row.map(value=>scaledEntry(value,denominator)));
