import {useEffect,useState,type ReactNode} from 'react';
import {createPortal} from 'react-dom';

// Keep the same input state while placing previous-work examples at the end.
export function PreviousResearch({slot,children}:{slot:'encoding'|'matrix';children:ReactNode}){
 const [target,setTarget]=useState<HTMLElement|null>(null);
 useEffect(()=>setTarget(document.getElementById('previous-base13-'+slot)),[slot]);
 return target?createPortal(children,target):null;
}

export function PreviousResearchSection(){
 return <details data-section="previous-base13" open><summary>基数13のリム（前の研究）</summary>
 <div id="previous-base13-encoding"/><div id="previous-base13-matrix"/>
 </details>;
}
