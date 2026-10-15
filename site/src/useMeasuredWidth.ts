import {useLayoutEffect,useRef,useState} from 'react';
export function useMeasuredWidth(){
 const ref=useRef<HTMLDivElement>(null),[width,setWidth]=useState(0);
 useLayoutEffect(()=>{const el=ref.current;if(!el)return;const measure=()=>setWidth(Math.floor(el.clientWidth));measure();const observer=new ResizeObserver(measure);observer.observe(el);return()=>observer.disconnect();},[]);
 return {ref,width};
}
