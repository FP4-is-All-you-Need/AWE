import type {Construction} from './visual.ts';

export type CostSettings={product:string;plane:string;add:string;correction:string;modulus:string;output:string;frequency:string;model:'additive'|'max';additionModel:'unknown'|'naive';stages:Record<string,string>;overlaps:Record<string,string>};
export const defaultCostSettings:CostSettings={product:'',plane:'',add:'',correction:'',modulus:'',output:'',frequency:'',model:'additive',additionModel:'unknown',stages:{product:'1',plane:'1',add:'0',correction:'0',modulus:'0',output:'0'},overlaps:{'1':'','2':'','3':''}};
export type CostTerm={name:string;value:number|null;reason:string|null};
export function nonnegative(value:string):number|null{if(value.trim()==='')return null;const n=Number(value);return Number.isFinite(n)&&n>=0?n:null;}
const finite=(n:number|null)=>n!==null&&Number.isFinite(n)?n:null;
export type CostCounts={products:number;facesA:number;facesB:number|null;addA:number|null;addB:number|null;needsCorrection:boolean;modular:boolean};
export function constructionCost(c:Construction,dims:{m:number;n:number;k:number},settings:CostSettings){
 const naive=(side:'A'|'B')=>{const planes=c.planes?.[side];if(!planes)return null;const used=[...new Set(c.products.map(p=>p[side==='A'?'a':'b']))].map(i=>planes[i]);if(used.some(p=>!p||p.some(v=>v!==0&&Math.abs(v)!==1)))return null;return used.reduce((sum,p)=>sum+Math.max(0,p.filter(v=>v!==0).length-1),0);};
 const a=naive('A'),b=naive('B');
 return countedCost({products:c.products.length,facesA:c.faces_a,facesB:c.faces_b,addA:a,addB:b,needsCorrection:!((c.holes.count===0||c.holes.share===0)&&!c.carry&&!c.block_shift&&!c.correction),modular:c.modulus>0},dims,settings);
}
export function countedCost(c:CostCounts,dims:{m:number;n:number;k:number},settings:CostSettings){
 const a=c.addA,b=c.addB;
 const {m,n,k}=dims,valid=[m,n,k].every(v=>Number.isFinite(v)&&v>0);
 const term=(name:string,count:number|null,unit:string,reason:string):CostTerm=>({name,value:valid&&count!==null&&nonnegative(unit)!==null?finite(count*nonnegative(unit)!):null,reason:!valid?'行列サイズ未設定':count===null?reason:nonnegative(unit)===null?'単価未設定':null});
 const product=term('積',c.products*m*n*k,settings.product,'積数未確認');
 const plane=term('面',c.facesB===null?null:(c.facesA*m+c.facesB*n)*k,settings.plane,'B側の面数未確認');
 const add=term('加減算',settings.additionModel==='naive'&&a!==null&&b!==null?(a*m+b*n)*k:null,settings.add,settings.additionModel==='unknown'?'面の加減算：計算法未設定':'加減算回数は未計算');
 const frequency=nonnegative(settings.frequency);
 const noHoles=!c.needsCorrection;
 const correction:CostTerm=noHoles?{name:'補正',value:0,reason:null}:term('補正',frequency===null?null:frequency*m*n*k,settings.correction,'補正イベント頻度未設定');
 const modulus:CostTerm=!c.modular?{name:'法の固定費',value:0,reason:null}:term('法の固定費',1,settings.modulus,'法の数未確認');
 const output:CostTerm=!c.modular?{name:'法ごとの出力費',value:0,reason:null}:term('法ごとの出力費',m*n,settings.output,'出力費未設定');
 const terms={product,plane,add,correction,modulus,output};
 const unknown=Object.values(terms).filter(t=>t.value===null).map(t=>`${t.name}：${t.reason}`);
 const groups=new Map<string,number[]>();let combined=0;
 for(const [key,t] of Object.entries(terms)){
  if(t.value===null)continue;
  const stage=settings.model==='max'?settings.stages[key]??'0':'0';
  if(stage==='0')combined+=t.value;else groups.set(stage,[...groups.get(stage)??[],t.value]);
 }
 let saving=0;
 for(const [stage,values] of groups){const sum=values.reduce((a,b)=>a+b,0),overlap=nonnegative(settings.overlaps[stage]??'');
  if(values.length>1&&(overlap===null||overlap>1))unknown.push(`実行段階 ${stage}：重なり率：未設定`);
  const discount=values.length>1&&overlap!==null&&overlap<=1?overlap*(sum-Math.max(...values)):0;
  combined+=sum-discount;saving+=discount;
 }
 return {terms,total:unknown.length?null:finite(combined),combined, saving,assumptions:{addition:settings.additionModel,model:settings.model,stages:settings.stages,overlaps:settings.overlaps},unknown};
}
