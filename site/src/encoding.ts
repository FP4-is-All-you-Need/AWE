import type {Construction} from './visual.ts';
export const FP4_VALUES=[-12,-8,-6,-4,-3,-2,-1,0,1,2,3,4,6,8,12];
// Project saved tuples; do not enumerate new encodings or substitute the ambient domain.
export function savedPlaneValues(c:Construction,side:'A'|'B',plane:number):number[]|null{
 const measured=c.canonical?.measurement?.plane_values[side][plane];if(measured)return measured;
 const row=c.planes?.[side][plane],table=c.saved_encoding?Object.values(c.saved_encoding[side]):c.canonical?.encoding[side];
 const encoding=table?.filter((v):v is number[]=>v!==null);
 if(!row||!encoding||encoding.some(tuple=>tuple.length!==row.length))return null;
 return [...new Set(encoding.map(tuple=>Number(planeValue(c,side,plane,tuple))))].sort((a,b)=>a-b);
}

export function planeValue(c:Construction,side:'A'|'B',plane:number,tuple:number[]):bigint{
 const value=c.planes![side][plane].reduce((n,v,i)=>n+BigInt(v)*BigInt(tuple[i]),0n),m=c.plane_moduli?.[side][plane];
 if(!m)return value;
 const values=FP4_VALUES.filter(v=>(BigInt(v)-value)%BigInt(m)===0n).sort((a,b)=>Math.abs(a)-Math.abs(b)||a-b);
 if(!values.length)throw Error('S範囲外・未補正');return BigInt(values[0]);
}
