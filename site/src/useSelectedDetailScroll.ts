import {useLayoutEffect,useRef,useState} from 'react';

export function useSelectedDetailScroll(selection:string|number,ready:boolean){
 const ref=useRef<HTMLDivElement>(null),requested=useRef(false);
 const [click,setClick]=useState(0);
 const request=()=>{requested.current=true;setClick(value=>value+1);};
 useLayoutEffect(()=>{
  if(!requested.current||!ready)return;
  requested.current=false;
  const frame=requestAnimationFrame(()=>{
   const heading=ref.current?.querySelector('summary,h1,h2,h3');
   if(!heading)return;
   const box=heading.getBoundingClientRect();
   if(box.top>=0&&box.bottom<=window.innerHeight)return;
   heading.scrollIntoView({block:'start',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  });
  return()=>cancelAnimationFrame(frame);
 },[selection,ready,click]);
 return {ref,request};
}
