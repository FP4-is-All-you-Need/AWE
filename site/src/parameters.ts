import {useState} from 'react';
export function useParameter<T>(key:string,fallback:T,parse:(raw:string)=>T,format:(value:T)=>string=String):[T,(value:T)=>void]{
 const [value,set]=useState<T>(()=>{const raw=new URLSearchParams(location.search).get(key);return raw===null?fallback:parse(raw);});
 return [value,next=>{set(next);const q=new URLSearchParams(location.search);q.set(key,format(next));history.replaceState(null,'','?'+q.toString()+location.hash);}];
}
export const bounded=(raw:string,min:number,max:number,fallback:number)=>{const n=Number(raw);return raw!==''&&Number.isFinite(n)&&n>=min&&n<=max?n:fallback;};
