import type {Construction} from './visual.ts';
/** Read the geometric weights; evaluate only powers present in their product grid. */
export function vanishingPowers(c:Pick<Construction,'modulus'|'weights'>):number[]{
 if(c.modulus<=1)return [];
 const a=[...c.weights.A].sort((a,b)=>a-b),b=[...c.weights.B].sort((a,b)=>a-b),w=a[1]??b[1];
 if(!Number.isSafeInteger(w)||w<=1||a.some((v,i)=>BigInt(v)!==BigInt(w)**BigInt(i))||b.some((v,i)=>BigInt(v)!==BigInt(w)**BigInt(i)))return [];
 return Array.from({length:a.length+b.length-1},(_,i)=>i).filter(i=>BigInt(w)**BigInt(i)%BigInt(c.modulus)===0n);
}
// The products as pairs of A and B planes, each plane by the limbs it reads.
const productPlanes=(c:Construction)=>c.planes?c.products.map(p=>`${c.planes!.A[p.a].map(Math.abs).join(',')}|${c.planes!.B[p.b].map(Math.abs).join(',')}`).sort().join(';'):'';
/** Karatsuba: two limbs a side and three products a0b0, a1b1 and (a0±a1)(b0±b1). */
function karatsuba(c:Construction){return c.weights.A.length===2&&c.weights.B.length===2&&c.products.length===3&&productPlanes(c)==='0,1|0,1;1,0|1,0;1,1|1,1';}
/** w²≡0: equal second weights w with w² a multiple of the modulus, and the three direct products a0b0, a0b1, a1b0. */
function squareVanishes(c:Construction){const w=c.weights.A[1];return c.weights.A.length===2&&c.weights.B.length===2&&c.weights.B[1]===w&&c.modulus>1&&BigInt(w)*BigInt(w)%BigInt(c.modulus)===0n&&productPlanes(c)==='0,1|1,0;1,0|0,1;1,0|1,0';}
export function shapeFormula(c:Construction):string{
 const zero=vanishingPowers(c);if(zero.length)return zero.map(k=>`w^{${k}}`).join(',\\,')+'\\equiv0';
 if(c.weights.A.length===1&&c.weights.B.length===1)return '1\\times1';
 const grid=`${c.weights.A.length}\\times${c.weights.B.length}`;
 if(c.shape==='A'||c.shape==='sum')return karatsuba(c)?'\\text{Karatsuba}':grid;
 if(c.shape==='B'||c.shape==='vanishing')return squareVanishes(c)?'w^2\\equiv0':grid;
 if(['three_limbs','limbs3','vanishing_sum','vanishA'].includes(c.shape))return `${c.weights.A.length}\\times${c.weights.B.length}`;
 // A shape without its own name (records read from the catalog files) is named by its limb grid, as the direct shapes are.
 return grid;
}
