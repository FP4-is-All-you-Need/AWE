import type {Construction} from './visual.ts';
/** Read the geometric weights; evaluate only powers present in their product grid. */
export function vanishingPowers(c:Construction):number[]{
 if(c.modulus<=1)return [];
 const a=[...c.weights.A].sort((a,b)=>a-b),b=[...c.weights.B].sort((a,b)=>a-b),w=a[1]??b[1];
 if(!Number.isSafeInteger(w)||w<=1||a.some((v,i)=>BigInt(v)!==BigInt(w)**BigInt(i))||b.some((v,i)=>BigInt(v)!==BigInt(w)**BigInt(i)))return [];
 return Array.from({length:a.length+b.length-1},(_,i)=>i).filter(i=>BigInt(w)**BigInt(i)%BigInt(c.modulus)===0n);
}
export function shapeFormula(c:Construction):string{
 const zero=vanishingPowers(c);if(zero.length)return zero.map(k=>`w^{${k}}`).join(',\\,')+'\\equiv0';
 if(c.weights.A.length===1&&c.weights.B.length===1)return '1\\times1';
 if(c.shape==='A'||c.shape==='sum')return '\\text{Karatsuba}';
 if(['three_limbs','limbs3','vanishing_sum','vanishA'].includes(c.shape))return `${c.weights.A.length}\\times${c.weights.B.length}`;
 return ({B:'w^2\\equiv0',vanishing:'w^2\\equiv0',direct:'2\\times2'} as Record<string,string>)[c.shape]??'\\text{'+c.shape+'}';
}
