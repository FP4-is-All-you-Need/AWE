import {useId,useLayoutEffect,useRef,useState,type ReactNode} from 'react';
import {useLanguage} from './i18n.tsx';
import './line-fold.css';

// One line: the lead, then the leading items that fit whole, then the toggle. Expanded, all items wrap on their own lines below.
export function LineFold({lead,items,expanded,onToggle,className,name,value}:{lead?:ReactNode;items:ReactNode[];expanded:boolean;onToggle:(expanded:boolean)=>void;className?:string;name?:string;value?:string}){
 const en=useLanguage()==='en',id=useId(),list=useRef<HTMLDivElement>(null);
 const [fit,setFit]=useState(items.length);
 // Items past the line are hidden but keep their boxes, so hiding them does not move the positions that are measured.
 useLayoutEffect(()=>{
  const el=list.current;if(!el||expanded)return;
  const measure=()=>{const left=el.getBoundingClientRect().left,limit=el.clientWidth+.5;let n=0;for(const item of Array.from(el.children)){if(item.getBoundingClientRect().right-left>limit)break;n++;}setFit(n);};
  measure();const observer=new ResizeObserver(measure);observer.observe(el);document.fonts?.ready.then(measure);return()=>observer.disconnect();
 },[expanded,items.length]);
 const hidden=expanded?0:items.length-Math.min(fit,items.length);
 return <div className={className?'line-fold '+className:'line-fold'} data-expanded={expanded} data-hidden-count={hidden}>
  {lead&&<div className="line-fold-lead">{lead}</div>}
  <div id={id} ref={list} className="line-fold-items">{items.map((item,i)=><span key={i} data-beyond-line={!expanded&&i>=fit?'':undefined}>{item}</span>)}</div>
  <button type="button" className="line-fold-toggle" name={name} value={value} aria-expanded={expanded} aria-controls={id} style={expanded||hidden?undefined:{visibility:'hidden'}} onClick={()=>onToggle(!expanded)}>{expanded?(en?'Less':'閉じる'):(en?'More':'続き')}</button>
 </div>;
}
