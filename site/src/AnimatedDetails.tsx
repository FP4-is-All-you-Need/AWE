import {useEffect} from 'react';
import './details-animation.css';

type State={animation:Animation|null;target:boolean;attribute:boolean;token:number};

/** Keep native summaries and their keyboard activation; animate only geometry. */
export function useAnimatedDetails(){
 useEffect(()=>{
  const states=new Map<HTMLDetailsElement,State>();
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  const closedHeight=(d:HTMLDetailsElement)=>{
   const summary=d.querySelector(':scope > summary');
   if(!summary)return d.getBoundingClientRect().height;
   const style=getComputedStyle(d);
   return summary.getBoundingClientRect().height+['paddingTop','paddingBottom','borderTopWidth','borderBottomWidth'].reduce((sum,key)=>sum+(parseFloat(style[key as keyof CSSStyleDeclaration] as string)||0),0);
  };
  const stateFor=(d:HTMLDetailsElement)=>{let state=states.get(d);if(!state){const section=d.dataset.section,raw=section?new URLSearchParams(location.search).get('open.'+section):null;if(raw==='0'||raw==='1')d.open=raw==='1';state={animation:null,target:d.open,attribute:d.open,token:0};states.set(d,state);}d.classList.add('animated-details');return state;};
  const change=(d:HTMLDetailsElement,target:boolean)=>{
   const state=stateFor(d),start=d.getBoundingClientRect().height;
   if(d.dataset.section){const q=new URLSearchParams(location.search);q.set('open.'+d.dataset.section,target?'1':'0');history.replaceState(null,'','?'+q.toString());}
   state.token++;const token=state.token;
   state.animation?.cancel();state.animation=null;state.target=target;
   d.dataset.detailsExpanded=String(target);
   if(reduced.matches){d.open=target;state.attribute=target;d.removeAttribute('data-details-animating');return;}
   d.open=true;state.attribute=true;
   const end=target?d.getBoundingClientRect().height:closedHeight(d);
   d.dataset.detailsAnimating='true';
   const animation=d.animate([{height:`${start}px`},{height:`${end}px`}],{duration:180,easing:'ease-out'});
   state.animation=animation;
   animation.onfinish=()=>{
    if(state.token!==token)return;
    d.open=target;state.attribute=target;state.animation=null;
    d.removeAttribute('data-details-animating');animation.cancel();
   };
  };
  const discover=()=>document.querySelectorAll<HTMLDetailsElement>('details').forEach(d=>{const state=stateFor(d);if(!state.animation)d.dataset.detailsExpanded=String(d.open);});
  discover();
  const click=(event:MouseEvent)=>{
   const target=event.target instanceof Element?event.target:null;
   const summary=target?.closest('summary');
   const details=summary?.parentElement;
   if(!(details instanceof HTMLDetailsElement)||event.defaultPrevented||event.button!==0)return;
   if(target?.closest('a,button,input,select,textarea'))return;
   event.preventDefault();const state=stateFor(details);change(details,!state.target);
  };
  document.addEventListener('click',click);
  const observer=new MutationObserver(records=>{
   discover();
   for(const record of records){
    if(record.type==='attributes'&&record.attributeName==='open'&&record.target instanceof HTMLDetailsElement){
     const d=record.target,state=stateFor(d);
     // React or another controller wins over an in-progress user animation.
     if(d.open!==state.attribute){state.token++;state.animation?.cancel();state.animation=null;state.target=d.open;state.attribute=d.open;d.dataset.detailsExpanded=String(d.open);d.removeAttribute('data-details-animating');}
    }
   }
   for(const [d,state] of states){
    if(!d.isConnected){state.animation?.cancel();states.delete(d);continue;}
    if(state.animation&&state.target&&records.some(r=>r.type!=='attributes'&&d.contains(r.target)))change(d,true);
   }
  });
  observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['open']});
  const media=()=>{if(reduced.matches)for(const [d,state] of states)if(state.animation)change(d,state.target);};
  reduced.addEventListener('change',media);
  return ()=>{document.removeEventListener('click',click);observer.disconnect();reduced.removeEventListener('change',media);for(const [d,state] of states){state.animation?.cancel();d.open=state.target;d.classList.remove('animated-details');d.removeAttribute('data-details-animating');d.removeAttribute('data-details-expanded');}};
 },[]);
}
