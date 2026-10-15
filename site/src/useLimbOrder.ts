import {useMemo,useSyncExternalStore} from 'react';
import {defaultLimbOrder,orderedConstruction,type LimbOrder} from './limbOrder.ts';
import type {Construction} from './visual.ts';
const event='awe-limb-order';
function subscribe(listener:()=>void){addEventListener(event,listener);addEventListener('popstate',listener);return()=>{removeEventListener(event,listener);removeEventListener('popstate',listener);};}
export function readLimbOrder(c:Construction,query:string,scope=''):LimbOrder{
 const value=new URLSearchParams(query).get(scope+'limb_order.'+c.id);
 return value==='stored'||value==='weight'||value==='block'?value:defaultLimbOrder(c);
}
export function useLimbOrderQuery(){return useSyncExternalStore(subscribe,()=>location.search);}
export function useLimbOrder(c:Construction,scope=''){
 const query=useLimbOrderQuery(),order=readLimbOrder(c,query,scope);
 const view=useMemo(()=>orderedConstruction(c,order),[c,order]);
 const setOrder=(next:LimbOrder)=>{const q=new URLSearchParams(location.search);q.set(scope+'limb_order.'+c.id,next);history.replaceState(null,'','?'+q+location.hash);dispatchEvent(new Event(event));};
 return {order,view,setOrder};
}
