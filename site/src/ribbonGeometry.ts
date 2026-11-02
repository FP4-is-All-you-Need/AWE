export type RibbonLayout='spiral'|'rings';
export type RibbonParameters={cellWidth:number;growth:number;innerRadius:number;width:number;start:number;layout:RibbonLayout;spacing:'arc'|'powers'|'linear';base:number;taper?:number;arc?:'arith'|'geom'|'step'};
export const RIBBON_DEFAULTS:RibbonParameters={cellWidth:24,growth:5,innerRadius:36,width:.85,start:2,layout:'spiral',spacing:'linear',base:13,taper:.1,arc:'arith'};
export const TAU=2*Math.PI;
const primitive=(r:number,b:number)=>(r*Math.hypot(r,b)+b*b*Math.asinh(r/b))/2;
export function spiralArcLength(theta:number,p:RibbonParameters){return (primitive(p.innerRadius+p.growth*theta,p.growth)-primitive(p.innerRadius,p.growth))/p.growth;}
export function spiralAngle(distance:number,p:RibbonParameters){
 let lo=0,hi=distance/p.innerRadius;
 for(let i=0;i<48;i++){const mid=(lo+hi)/2;if(spiralArcLength(mid,p)<distance)lo=mid;else hi=mid;}
 return (lo+hi)/2;
}
export function ribbonHalfWidth(p:RibbonParameters,theta=0){return Math.min(Math.PI*p.growth*p.width,.4*p.innerRadius)/(1+(p.taper??0)*theta/TAU);}
function point(theta:number,p:RibbonParameters,offset=0,ringRadius?:number){
 const a=theta-Math.PI/2,r=ringRadius??p.innerRadius+p.growth*theta,b=ringRadius===undefined?p.growth:0;
 const cos=Math.cos(a),sin=Math.sin(a),norm=Math.hypot(r,b),nx=(r*cos+b*sin)/norm,ny=(r*sin-b*cos)/norm;
 const x=r*cos+offset*nx,y=r*sin+offset*ny;
 return {x,y,radius:Math.hypot(x,y),angle:a};
}
function ringSlot(index:number,p:RibbonParameters){
 let ring=0,slot=index,r=p.innerRadius,capacity=Math.max(1,Math.floor(TAU*r/p.cellWidth));
 while(slot>=capacity){slot-=capacity;r=p.innerRadius+(++ring)*TAU*p.growth;capacity=Math.max(1,Math.floor(TAU*r/p.cellWidth));}
 return {ring,slot,r};
}
/** Each displayed index spans cellWidth units of centreline arc, independent of modulus gaps. */
export function powerBand(m:number,base:number){let band=0,upper=base;while(m>=upper){band++;upper*=base;}return band;}
export function powerInterval(band:number,base:number){const lower=band===0?2:base**band;return {lower,count:base**(band+1)-lower};}
export function linearBand(m:number,base:number){const offset=Math.max(0,m-2);let band=Math.floor((Math.sqrt(1+8*offset/base)-1)/2);while(base*(band+1)*(band+2)/2<=offset)band++;while(base*band*(band+1)/2>offset)band--;return band;}
export function turnBand(m:number,p:RibbonParameters){return p.spacing==='linear'?linearBand(m,p.base):powerBand(m,p.base);}
export function turnInterval(band:number,p:RibbonParameters){return p.spacing==='linear'?{lower:2+p.base*band*(band+1)/2,count:p.base*(band+1)}:powerInterval(band,p.base);}
const alternatingIntegrals=[Math.LN2];
function linearEndpoint(band:number){while(alternatingIntegrals.length<=band){const k=alternatingIntegrals.length;alternatingIntegrals.push(1/k-alternatingIntegrals[k-1]);}return 2*TAU*alternatingIntegrals[band];}
function geometricStart(mean:number,end:number){let lo=end,hi=2*mean;const logMean=(a:number)=>a===end?end:(a-end)/Math.log1p((a-end)/end);while(logMean(hi)<mean)hi*=2;for(let i=0;i<64;i++){const mid=(lo+hi)/2;if(logMean(mid)<mean)lo=mid;else hi=mid;}return (lo+hi)/2;}
let linearGeometric:number[]|undefined;
function linearGeometricEndpoint(band:number){
 if(!linearGeometric){const last=1024,a=new Array<number>(last+2);a[last+1]=linearEndpoint(last+1);for(let k=last;k>=0;k--)a[k]=geometricStart(TAU/(k+1),a[k+1]);linearGeometric=a;}
 return linearGeometric[band];
}
const profileCache=new Map<string,{start:number;end:number;count:number}>();
/** Angular width per integer. Adjacent bands share an endpoint and integrate to one turn. */
export function angularProfile(band:number,p:RibbonParameters){
 const mode=p.arc??'arith',key=`${p.spacing}:${mode}:${p.base}:${band}`,cached=profileCache.get(key);if(cached)return cached;
 const {count}=turnInterval(band,p),q=1/p.base;
 if(count<=0)return {start:0,end:0,count};
 let start:number,end:number;
 if(mode==='step'){start=end=TAU/count;}
 else if(p.spacing==='linear'){start=(mode==='arith'?linearEndpoint(band):linearGeometricEndpoint(band))/p.base;end=(mode==='arith'?linearEndpoint(band+1):linearGeometricEndpoint(band+1))/p.base;}
 else if(band>0){start=mode==='arith'?2*TAU/(count*(1+q)):TAU*Math.log(p.base)/(count*(1-q));end=start*q;}
 else{
  end=angularProfile(1,p).start;
  if(mode==='arith')start=2*TAU/count-end;
  else start=geometricStart(TAU/count,end);
 }
 const result={start,end,count};profileCache.set(key,result);return result;
}
export function interpolated(a:number,b:number,u:number,mode:RibbonParameters['arc']){return mode==='geom'?a*Math.exp(Math.log(b/a)*u):a+(b-a)*u;}
function angularOffset(u:number,band:number,p:RibbonParameters){
 if(u<=0)return 0;if(u>=1)return TAU;
 const a=angularProfile(band,p),q=Math.log(a.end/a.start);
 return a.count*(p.arc==='geom'?a.start*Math.expm1(q*u)/q:a.start*u+(a.end-a.start)*u*u/2);
}
function angularFraction(theta:number,band:number,p:RibbonParameters){
 const a=angularProfile(band,p),z=Math.max(0,Math.min(TAU,theta-band*TAU))/a.count;
 if(p.arc==='geom'){const q=Math.log(a.end/a.start);return Math.log1p(z*q/a.start)/q;}
 const d=a.end-a.start;return Math.abs(d)<1e-15?z/a.start:2*z/(a.start+Math.sqrt(Math.max(0,a.start*a.start+2*d*z)));
}
/** Width as a continuous function of the integer-modulus position, for comparison plots. */
export function angularWidth(m:number,p:RibbonParameters){const band=turnBand(m,p),{lower,count}=turnInterval(band,p),a=angularProfile(band,p);return interpolated(a.start,a.end,(m-lower)/count,p.arc);}
export function ribbonCell(index:number,p:RibbonParameters,widthScale=1,moduli:readonly number[]=[]){
 const ring=p.layout==='rings'?ringSlot(index,p):null;
 const usePowers=p.spacing!=='arc'&&moduli.length>0,band=usePowers?turnBand(moduli[index],p):0;
 const {lower,count:capacity}=turnInterval(band,p),slot=usePowers?moduli[index]-lower:0;
 const t0=usePowers?TAU*band+angularOffset(slot/capacity,band,p):ring?ring.slot*p.cellWidth/ring.r:spiralAngle(index*p.cellWidth,p),t1=usePowers?TAU*band+angularOffset((slot+1)/capacity,band,p):ring?(ring.slot+1)*p.cellWidth/ring.r:spiralAngle((index+1)*p.cellWidth,p);
 const ringRadius=p.layout==='rings'?(usePowers?p.innerRadius+band*TAU*p.growth:ring!.r):undefined;
 const halfAt=(theta:number)=>(usePowers&&p.arc!=='step'?interpolated(ribbonHalfWidth(p,band*TAU),ribbonHalfWidth(p,(band+1)*TAU),angularFraction(theta,band,p),p.arc):ribbonHalfWidth(p,theta))*widthScale,n=Math.max(4,Math.ceil((t1-t0)*32));
 const points=(side:number)=>Array.from({length:n+1},(_,i)=>{const theta=t0+(t1-t0)*i/n;return point(theta,p,side*halfAt(theta),ringRadius);});
 const polygon=[...points(1),...points(-1).reverse()];
 const inner0=point(t0,p,-halfAt(t0),ringRadius),outer0=point(t0,p,halfAt(t0),ringRadius),inner1=point(t1,p,-halfAt(t1),ringRadius),outer1=point(t1,p,halfAt(t1),ringRadius);
 const mid=ring||usePowers?(t0+t1)/2:spiralAngle((index+.5)*p.cellWidth,p);
 const arcStart=usePowers?spiralArcLength(t0,p):index*p.cellWidth,arcEnd=usePowers?spiralArcLength(t1,p):(index+1)*p.cellWidth;
 const pointAt=(fraction:number,normalFraction=0)=>{const theta=t0+(t1-t0)*fraction;return point(theta,p,normalFraction*halfAt(theta),ringRadius);};
 const divider=(fraction:number)=>{const a=pointAt(fraction,-1),b=pointAt(fraction,1);return `M${a.x},${a.y}L${b.x},${b.y}`;};
 return {pointAt,divider,path:polygon.map((v,i)=>`${i?'L':'M'}${v.x},${v.y}`).join('')+'Z',angleStart:t0,angleEnd:t1,
  innerStart:inner0.radius,outerStart:outer0.radius,innerEnd:inner1.radius,outerEnd:outer1.radius,
  center:point(mid,p,0,ringRadius),turn:usePowers?band:ring?.ring??Math.floor(mid/TAU),arcStart,arcEnd,area:(halfAt(t0)+halfAt(t1))*(usePowers?(ringRadius===undefined?arcEnd-arcStart:ringRadius*(t1-t0)):p.cellWidth)};
}
export function modulusRibbonCell(m:number,moduli:readonly number[],p:RibbonParameters,widthScale=1){const i=moduli.indexOf(m);return i<0?null:ribbonCell(i,p,widthScale,moduli);}
export function integerModuli(start:number,count:number){return Array.from({length:Math.max(0,Math.min(count,65537-start))},(_,i)=>start+i);}
export function rankedModuli(moduli:Iterable<number>,start:number,count:number){return [...new Set(moduli)].filter(m=>m>=start).sort((a,b)=>a-b).slice(0,count);}
export function ribbonBackground(count:number,p:RibbonParameters,moduli:readonly number[]=[]){return Array.from({length:count},(_,i)=>ribbonCell(i,p,1,moduli).path);}
export function ribbonExtent(count:number,p:RibbonParameters,moduli:readonly number[]=[]){
 if(!count)return p.innerRadius+24;
 const c=ribbonCell(count-1,p,1,moduli);return Math.max(c.outerStart,c.outerEnd)+24;
}
