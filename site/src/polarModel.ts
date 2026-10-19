import {factors} from './visual.ts';
export type ValueSet='2xE2M1'|'8xE2M3'|'16xE3M2';
export type PolarModel={E32f:(number|null)[];E32i:(number|null)[];K32f:number|null;K32i:number|null;encA:number;encB:number;mP:number[];L:number|null;shiftLength:number|null};
export type PolarRow={id:string;m:number;vs:ValueSet;R:number;FA:number;FB:number;hA:number;hB:number;exact:boolean;weights:{A:number[];B:number[]};maxK:number|null;model:PolarModel|null;origin:string|null;inCatalog:boolean;source:string};
export type PolarCatalog={schema_version:number;source_commit?:string;base_commit?:string;forms_index_sha256?:string;model_source_sha256:string;model_index_sha256:string;rows:PolarRow[]};
export type Coefficients={wF:number;wE:number;wM:number;wA:number;kap:number;w6:number;lim:'f'|'i';K:number;b:number;pay:'min'|'kap'|'shift'};
export const DEFAULT_COEFFICIENTS:Coefficients={wF:.245,wE:0,wM:.63,wA:.24,kap:77.44,w6:3.1,lim:'f',K:1,b:0,pay:'min'};
export const COEFFICIENTS=[['wF','面','Planes',0,1,.005],['wE','符号化','Encoding',0,.5,.005],['wM','法','Modulus',0,2,.01],['wA','累積器','Accumulators',0,1,.01],['kap','穴の補正','Hole correction',0,400,.01],['w6','FP6 / FP4','FP6 / FP4',1,4,.05]] as const;
export function accumulator(r:PolarRow,s:Coefficients){return r.model?.[s.lim==='f'?'E32f':'E32i'][s.K]??null;}
export function shift(r:PolarRow){
 if(!r.hA&&!r.hB)return null;
 const two=Boolean(r.hA&&r.hB);
 if(r.model?.shiftLength&&!two)return {L:r.model.shiftLength,k:1};
 let L=Math.min(1024,Math.floor((r.m-1)/Math.max(r.hA,r.hB))-(two?2:1));
 if(two&&r.m%2===0&&L%2===1)L--;
 return L>=1?{L,k:two?2:1}:null;
}
export function cost(r:PolarRow,s:Coefficients):number|null{
 const d=r.model,E=accumulator(r,s);if(!d||E===null)return null;
 const w=r.vs==='2xE2M1'?1:s.w6;
 const base=s.wF*(r.FA+r.FB)+s.wE*(d.encA+d.encB)+s.wM+s.wA*E;
 const ck=r.R*w+base+s.kap*d.mP[s.b];
 if(!r.hA&&!r.hB)return ck;
 const sh=shift(r),cs=sh?r.R*w*(1+sh.k/sh.L)+base:Infinity;
 if(s.pay==='kap'||!Number.isFinite(cs))return ck;
 return s.pay==='shift'?cs:Math.min(ck,cs);
}
export function axes(r:PolarRow,s:Coefficients):number[]|null{
 if(!r.model)return null;
 const d=r.model,sh=shift(r),holey=Boolean(r.hA||r.hB),rs=holey?(sh?r.R*(1+sh.k/sh.L):Infinity):r.R;
 return [r.R,r.FA,r.FB,d.encA+d.encB,d.mP[s.b],d.L??Infinity,-(d[s.lim==='f'?'K32f':'K32i']||0),accumulator(r,s)??Infinity,rs,holey&&Number.isFinite(rs)?1:0];
}
/** Only compare the same modulus and the same checked value set. */
export function dominance(rows:PolarRow[],s:Coefficients){
 const result=new Map<string,string>();const a=rows.map(r=>axes(r,s));
 rows.forEach((r,i)=>{if(!a[i])return;let best:PolarRow|undefined;
 rows.forEach((other,j)=>{if(i===j||other.m!==r.m||other.vs!==r.vs||!a[j])return;
 if(a[j]!.every((v,k)=>v<=a[i]![k])&&a[j]!.some((v,k)=>v<a[i]![k])&&(!best||(cost(other,s)??Infinity)<(cost(best,s)??Infinity)))best=other;});
 if(best)result.set(r.id,best.id);});return result;
}
export type Layout='sacks'|'ulam';
export function position(m:number,layout:Layout):[number,number]{
 if(layout==='sacks'){const r=Math.sqrt(m),a=2*Math.PI*r;return [r*Math.cos(a),r*Math.sin(a)];}
 const k=Math.ceil((Math.sqrt(m)-1)/2),t=2*k,d=(2*k+1)**2-m;
 if(d<t)return [k-d,-k];if(d<2*t)return [-k,-k+d-t];if(d<3*t)return [-k+d-2*t,k];return [k,k-d+3*t];
}
export function kind(m:number){const f=factors(m);return f.length===1?(f[0].exponent===1?'prime':'power'):'composite';}
export function groupRows(rows:PolarRow[]){const groups=new Map<number,PolarRow[]>();for(const r of rows)groups.set(r.m,[...(groups.get(r.m)??[]),r]);return groups;}
export function pick(rows:PolarRow[],s:Coefficients,mode:'products'|'cost'){
 return [...rows].filter(r=>mode==='products'||cost(r,s)!==null).sort((a,b)=>mode==='products'?a.R-b.R||(cost(a,s)??Infinity)-(cost(b,s)??Infinity)||a.id.localeCompare(b.id):(cost(a,s)??Infinity)-(cost(b,s)??Infinity)||a.R-b.R||a.id.localeCompare(b.id))[0];
}
export function componentComparison(m:number,groups:Map<number,PolarRow[]>,s:Coefficients){
 const components=factors(m).map(f=>f.prime**f.exponent),whole=groups.get(m)??[];
 const componentRows=components.map(n=>groups.get(n)??[]);
 const best=pick(whole,s,'products'),parts=componentRows.map(r=>pick(r,s,'products'));
 const sum=parts.every(Boolean)?parts.reduce((n,r)=>n+r!.R,0):null;
 const combined=pick(whole,s,'cost'),cheapParts=componentRows.map(r=>pick(r,s,'cost'));
 const sumCost=cheapParts.every(Boolean)?cheapParts.reduce((n,r)=>n+cost(r!,s)!,0):null;
 return {components,best,parts,sum,saving:best&&sum!==null?sum-best.R:null,combined,cost:combined?cost(combined,s):null,sumCost};
}
