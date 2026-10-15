// Exact integer bounds; work scales with the enumerated values, never with the
// (potentially much larger) interval between them.
export type CountPoint={value:bigint;count:number};
export type Interval={left:bigint;right:bigint};
export type DensityBin=Interval&{maximum:number;mean:number;holes:bigint;total:number;represented:number};
export function countPoints(values:Record<string,number[][]>):CountPoint[]{
 return Object.entries(values).map(([n,rows])=>({value:BigInt(n),count:rows.length})).sort((a,b)=>a.value<b.value?-1:a.value>b.value?1:0);
}
export function coverageInterval(points:CountPoint[],mode:'full'|'contiguous',positive:boolean):Interval|null{
 const p=points.filter(p=>p.count>0&&(!positive||p.value>0n));if(!p.length)return null;
 if(mode==='full')return {left:p[0].value,right:p[p.length-1].value};
 let start=p[0].value,end=start,best={left:start,right:end};
 const consider=()=>{const length=end-start,old=best.right-best.left;if(length>old||(length===old&&start<=0n&&end>=0n&&!(best.left<=0n&&best.right>=0n)))best={left:start,right:end};};
 for(const {value} of p.slice(1)){if(value===end+1n)end=value;else{consider();start=end=value;}}consider();return best;
}
export function densityBins(points:CountPoint[],range:Interval,pixels:number):DensityBin[]{
 const span=range.right-range.left+1n;if(span<=0n)return [];
 const count=Number(span<BigInt(Math.max(1,Math.floor(pixels)))?span:BigInt(Math.max(1,Math.floor(pixels))));
 const bins=Array.from({length:count},(_,i)=>{const left=range.left+BigInt(i)*span/BigInt(count),right=range.left+BigInt(i+1)*span/BigInt(count)-1n;return {left,right,maximum:0,mean:0,holes:right-left+1n,total:0,represented:0};});
 for(const p of points){if(p.value<range.left||p.value>range.right)continue;
  // Boundaries are floor(i*span/count); use the inverse of that partition.
  const index=Number(((p.value-range.left+1n)*BigInt(count)-1n)/span),bin=bins[index];bin.maximum=Math.max(bin.maximum,p.count);bin.total+=p.count;if(p.count){bin.holes--;bin.represented++;}
 }
 for(const bin of bins)bin.mean=bin.total/Number(bin.right-bin.left+1n);return bins;
}
export function zoomInterval(range:Interval,factor:number,anchor=.5):Interval{
 const old=range.right-range.left+1n,newSpan=BigInt(Math.max(1,Math.round(Number(old)/factor))),offset=BigInt(Math.round(Number(old-newSpan)*anchor));
 return {left:range.left+offset,right:range.left+offset+newSpan-1n};
}
