import {useEffect} from 'react';

/** Fit complete SVGs uniformly, never reducing their base labels below 14 px. */
export function useDiagramSizing(){
 useEffect(()=>{
  let frame=0;
  const resize=new ResizeObserver(()=>schedule());
  const observed=new WeakSet<Element>();
  const generatedViewBoxes=new WeakSet<SVGSVGElement>();
  function update(){
   frame=0;
   for(const svg of document.querySelectorAll<SVGSVGElement>('.paper-scroll > svg')){
    const parent=svg.parentElement!;if(!observed.has(parent)){observed.add(parent);resize.observe(parent);}
    if(!parent.clientWidth||!svg.getBoundingClientRect().height)continue;
    const original={w:Number(svg.getAttribute('width')),h:Number(svg.getAttribute('height'))};if(!original.w||!original.h)continue;
    if(!svg.hasAttribute('viewBox'))generatedViewBoxes.add(svg);
    const viewBox=`0 0 ${original.w} ${original.h}`;
    if(generatedViewBoxes.has(svg)&&svg.getAttribute('viewBox')!==viewBox)svg.setAttribute('viewBox',viewBox);
    const fonts=[...svg.querySelectorAll('text,.svg-math')].map(e=>parseFloat(getComputedStyle(e).fontSize)).filter(n=>n>0);
    const min=fonts.length?Math.min(...fonts):14;
    const scale=Math.min(1,Math.max(14/min,parent.clientWidth/original.w));
    svg.style.width=`${Math.ceil(original.w*scale)}px`;svg.style.height=`${Math.ceil(original.h*scale)}px`;
    svg.dataset.diagramScale=String(scale);
   }
  }
  function schedule(){if(!frame)frame=requestAnimationFrame(update);}
  const mutation=new MutationObserver(schedule);mutation.observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['open','width','height']});
  document.fonts.ready.then(schedule);schedule();
  return()=>{resize.disconnect();mutation.disconnect();cancelAnimationFrame(frame);};
 },[]);
}
