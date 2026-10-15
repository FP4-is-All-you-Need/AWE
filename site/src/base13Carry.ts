// The source figure leaves stored nonnegative digits untouched, and carries
// only a digit outside 2×E2M1. This differs from nearest-residue encoding.
export const STORED_DIGITS=new Set([0,1,2,3,4,6,8,12]);
export type CarryEvent={exponent:number;digit:number;upperBefore:number;before:number[];after:number[]};
export function base13Carry(value:bigint){
 const sign=value<0n?-1:1,raw:number[]=[];let n=value<0n?-value:value;
 do{raw.push(Number(n%13n));n/=13n;}while(n);
 while(raw.length<3)raw.push(0);
 const digits=[...raw],events:CarryEvent[]=[];
 for(let i=0;i<digits.length;i++)if(!STORED_DIGITS.has(digits[i])){
  const before=[...digits],digit=digits[i],upperBefore=digits[i+1]??0;
  digits[i]=digit-13;digits[i+1]=upperBefore+1;
  events.push({exponent:i,digit,upperBefore,before,after:[...digits]});
 }
 return {value,sign,raw,digits,events};
}
export function digitsValue(digits:number[]):bigint{return digits.reduce((sum,d,i)=>sum+BigInt(d)*13n**BigInt(i),0n);}

export const SIGNED_STORED_DIGITS=[-12,-8,-6,-4,-3,-2,-1,0,1,2,3,4,6,8,12];
export function base13Greedy(value:bigint):number[]{
 const representatives=[...SIGNED_STORED_DIGITS].sort((a,b)=>Math.abs(a)-Math.abs(b));
 const tuple:number[]=[];let remainder=value;
 do{const digit=representatives.find(d=>(remainder-BigInt(d))%13n===0n)!;tuple.push(digit);remainder=(remainder-BigInt(digit))/13n;}while(remainder);
 return tuple;
}
// Exact enumeration for fixed positional weights. Divisibility prunes only
// impossible tuples, and does not select a representation or a construction.
export function base13Alternatives(value:bigint,limbs:number):number[][]{
 if(!Number.isInteger(limbs)||limbs<1||limbs>4)throw new Error('Expected 1–4 limbs');
 const rows:number[][]=[];
 function visit(remainder:bigint,tuple:number[]){
  if(tuple.length===limbs){if(remainder===0n)rows.push(tuple);return;}
  for(const digit of SIGNED_STORED_DIGITS){const next=remainder-BigInt(digit);if(next%13n===0n)visit(next/13n,[...tuple,digit]);}
 }
 visit(value,[]);return rows;
}
export type LimbTransfer={exponent:number;amount:number;before:number[];after:number[]};
export function transfersTo(value:bigint,target:number[]):LimbTransfer[]{
 if(digitsValue(target)!==value)throw new Error('Representation does not reconstruct the input');
 const c=base13Carry(value),working=c.raw.map(d=>d*c.sign),events:LimbTransfer[]=[];
 while(working.length<target.length)working.push(0);
 for(let i=0;i<target.length;i++){
  const delta=(working[i]??0)-target[i];if(delta%13)throw new Error('Nonintegral carry');
  if(!delta)continue;
  const before=[...working],amount=delta/13;working[i]=target[i];working[i+1]=(working[i+1]??0)+amount;
  events.push({exponent:i,amount,before,after:[...working]});
 }
 return events;
}
