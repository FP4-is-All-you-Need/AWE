import {PRECISIONS} from './visual.ts';
export const MAP_WIDTHS=[4,5,6,7,8,9,10,11,12,13,14,15,16,17,24,32,53];
export type InputSelection={a:number;b:number;same:boolean;precisionA:string;precisionB:string;method:'awe'|'crt';showResults:boolean};
export const precisionFor=(b:number)=>Object.entries(PRECISIONS).find(([id,p])=>!id.startsWith('complex')&&p.b===b)?.[0]??'custom';
const number=(v:string|null,fallback:number,min=1,max=256)=>v!==null&&/^\d+$/.test(v)&&Number(v)>=min&&Number(v)<=max?Number(v):fallback;
const format=(id:string|null,b:number)=>id&&PRECISIONS[id]?.b===b?id:precisionFor(b);
export function readInputs(q:URLSearchParams):InputSelection{
 const a=number(q.get('b'),q.has('input_ma')?number(q.get('input_ma'),54,2,257)-1:(PRECISIONS[q.get('precision')??'fp64']?.b??53));
 const same=q.get('same_inputs')!=='0'&&(!q.has('input_mb')||q.has('same_inputs')||Number(q.get('input_ma'))===Number(q.get('input_mb')));
 const b=same?a:number(q.get('b_b'),q.has('input_mb')?number(q.get('input_mb'),a+1,2,257)-1:a);
 const precisionA=format(q.get('precision'),a),precisionB=same?precisionA:format(q.get('precision_b'),b);
 return {a,b,same,precisionA,precisionB,method:q.has('crt')?(q.get('crt')==='0'?'awe':'crt'):'crt',showResults:q.get('width_results')==='1'||(q.has('input_ma')&&!q.has('width_results'))};
}
export type InputAction={type:'method';value:'awe'|'crt'}|{type:'bits';side:'A'|'B';value:number}|{type:'precision';side:'A'|'B';value:string}|{type:'same';value:boolean}|{type:'widths';a:number;b:number;method?:'awe'|'crt';precisionA?:string;precisionB?:string}|{type:'restore';value:InputSelection};
export function inputReducer(s:InputSelection,action:InputAction):InputSelection{
 if(action.type==='restore')return action.value;
 if(action.type==='method')return {...s,method:action.value,showResults:true};
 if(action.type==='same')return {...s,same:action.value,b:action.value?s.a:s.b,precisionB:action.value?s.precisionA:s.precisionB};
 if(action.type==='widths'){
  const a=action.a-1,b=action.b-1;
  return {...s,a,b,same:a===b,precisionA:format(action.precisionA??null,a),precisionB:format(action.precisionB??null,b),method:action.method??s.method,showResults:true};
 }
 const value=action.type==='precision'?PRECISIONS[action.value]?.b:action.value;
 if(value===undefined||value<1||value>256||!Number.isInteger(value))return s;
 const id=action.type==='precision'?action.value:precisionFor(value);
 if(action.side==='B'&&!s.same)return {...s,b:value,precisionB:id};
 return {...s,a:value,precisionA:id,...(s.same?{b:value,precisionB:id}:{})};
}
// The original source places FP32/FP64 reference names beside 24/53 (REF_NAMES).
export const mapAxis=(width:number)=>width===54?53:width===25?24:width;
const mapFormat:Record<number,string>={4:'int4',5:'fp8',8:'int8',9:'bf16',12:'fp16',24:'fp32',53:'fp64'};
export function mapAction(row:number,column:number):InputAction{
 const a=Math.min(row,column),b=Math.max(row,column),width=(v:number)=>v===53?54:v===24?25:v;
 return {type:'widths',a:width(a),b:width(b),method:row>column?'crt':'awe',precisionA:mapFormat[a],precisionB:mapFormat[b]};
}
export function selectedMapCell(s:InputSelection):number[]|undefined{
 const a=mapAxis(s.a+1),b=mapAxis(s.b+1);if(!MAP_WIDTHS.includes(a)||!MAP_WIDTHS.includes(b))return undefined;
 const pair=[Math.min(a,b),Math.max(a,b)];return s.method==='crt'?pair.reverse():pair;
}
export function writeInputs(q:URLSearchParams,s:InputSelection){
 for(const [key,value] of Object.entries({b:s.a,b_b:s.b,same_inputs:s.same?'1':'0',precision:s.precisionA,precision_b:s.precisionB,input_ma:s.a+1,input_mb:s.b+1,crt:s.method==='crt'?'1':'0',map_method:s.method,width_results:s.showResults?'1':'0'}))q.set(key,String(value));
}
