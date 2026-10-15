import {useEffect,useRef,useState,type PointerEvent,type ReactNode,type CSSProperties} from 'react';
import {useLanguage} from './i18n.tsx';
import './contents.css';
import {MathText} from './PaperFigures';

type LabelPart={text:string;tex?:string};
function labelParts(summary:HTMLElement):LabelPart[]{
 const parts:LabelPart[]=[];const visit=(node:Node)=>{if(node.nodeType===Node.TEXT_NODE){const text=node.textContent??'';const last=parts.at(-1);if(last&&last.tex===undefined)last.text+=text;else parts.push({text});return;}if(!(node instanceof Element))return;
  if(node.matches('.math[data-tex]')){parts.push({text:node.textContent??'',tex:node.getAttribute('data-tex')!});return;}
  if(node.tagName==='BR')parts.push({text:' '});else node.childNodes.forEach(visit);};summary.childNodes.forEach(visit);return parts;
}
type Entry={parts:LabelPart[];key:string;target:string;label:string;parent:string|null;node:HTMLDetailsElement;number:string;depth:number;numberWidth:string};
// Optional side values keep their slot when a construction is replaced.
const detailSlots=['side:plane-values:B','flow','matrix','encoding','construction-cost'];
function sectionKind(node:HTMLDetailsElement){
 if(node.dataset.sideDetails)return `side:${node.dataset.sideKind}:${node.dataset.sideDetails}`;
 const section=node.dataset.section??node.id;
 if(section){const parts=section.split('.'),kind=parts.find(p=>['detail','flow','matrix','encoding','construction-cost','cost'].includes(p));return kind??section;}
 return node.className||'disclosure';
}
const storage={width:'awe.contents.width',open:'awe.contents.open'};
const bounded=(width:number)=>Math.min(420,Math.max(180,width));
function saved(key:string){try{return localStorage.getItem(key);}catch{return null;}}
function write(key:string,value:string){try{localStorage.setItem(key,value);}catch{/* Navigation also works when storage is unavailable. */}}

export function TableOfContents(){
 const language=useLanguage(),japanese=language==='ja';
 const [width,setWidth]=useState(()=>{const value=Number(saved(storage.width));return value?bounded(value):260;});
 const [open,setOpen]=useState(()=>{const preference=saved(storage.open);return preference==='1'||preference!=='0'&&!window.matchMedia('(max-width: 767px)').matches;});
 const [mobile,setMobile]=useState(()=>window.matchMedia('(max-width: 767px)').matches);
 const [entries,setEntries]=useState<Entry[]>([]),[active,setActive]=useState('');
 const shell=useRef<HTMLDivElement>(null),entryRef=useRef<Entry[]>([]),ids=useRef(new WeakMap<HTMLDetailsElement,string>()),counter=useRef(0);
 const slots=useRef(new Map<string,Map<string,number>>());
 const drag=useRef<{start:number;width:number}|null>(null);
 useEffect(()=>{
  const media=window.matchMedia('(max-width: 767px)');
  const change=()=>setMobile(media.matches);
  media.addEventListener('change',change);return()=>media.removeEventListener('change',change);
 },[]);
 useEffect(()=>{
  document.documentElement.classList.toggle('contents-open',open);
  document.documentElement.style.setProperty('--contents-width',`${width}px`);
  write(storage.width,String(width));write(storage.open,open?'1':'0');
  return()=>{document.documentElement.classList.remove('contents-open');document.documentElement.style.removeProperty('--contents-width');};
 },[open,width]);
 useEffect(()=>{
  const root=document.querySelector('.paper-app');if(!root)return;
  let frame=0;
  const refresh=()=>{
   const nodes=[...root.querySelectorAll<HTMLDetailsElement>('details')].filter(n=>!shell.current?.contains(n)&&n.querySelector(':scope > summary'));
   for(const node of nodes)if(!ids.current.has(node))ids.current.set(node,`contents-${++counter.current}`);
   const next:Entry[]=nodes.map(node=>{
    const parent=node.parentElement?.closest('details') as HTMLDetailsElement|null;
    const summary=node.querySelector<HTMLElement>(':scope > summary')!;
    return {parts:labelParts(summary),key:ids.current.get(node)!,target:node.getAttribute('data-section')||node.id||ids.current.get(node)!,label:(summary.innerText||summary.textContent||'').replace(/\s+/g,' ').replace(/\bmod(?=\d)/g,'mod ').trim(),parent:parent&&nodes.includes(parent)?ids.current.get(parent)!:null,node,number:'',depth:0,numberWidth:''};
   });
   const paths=new Map<string,string>(),widths=new Map<number,number>(),localSlots=new Map<string,Map<string,number>>();
   for(const entry of next){
    const parent=entry.parent?next.find(e=>e.key===entry.parent):undefined,parentPath=parent?paths.get(parent.key)!:'root',kind=sectionKind(entry.node),path=`${parentPath}/${kind}`;
    let siblings=localSlots.get(parentPath);if(!siblings){siblings=parent&&sectionKind(parent.node)==='detail'?slots.current.get(parentPath):undefined;if(!siblings){siblings=new Map();if(parent&&sectionKind(parent.node)==='detail'){detailSlots.forEach((kind,i)=>siblings!.set(kind,i+1));slots.current.set(parentPath,siblings);}}localSlots.set(parentPath,siblings);}
    // Repeated saved rows remain distinct, while replacement construction IDs
    // do not change the slot for flow, matrix, encoding or costs.
    const occurrence=next.slice(0,next.indexOf(entry)).filter(e=>e.parent===entry.parent&&sectionKind(e.node)===kind).length,slotKey=occurrence?`${kind}#${occurrence}`:kind;
    if(!siblings.has(slotKey))siblings.set(slotKey,Math.max(0,...siblings.values())+1);
    entry.depth=(parent?.depth??0)+1;entry.number=parent?`${parent.number.replace(/\.$/,'')}.${siblings.get(slotKey)}`:`${siblings.get(slotKey)}.`;paths.set(entry.key,occurrence?`${path}#${occurrence}`:path);widths.set(entry.depth,Math.max(widths.get(entry.depth)??0,entry.number.length));
   }
   for(const entry of next){entry.numberWidth=`${(widths.get(entry.depth)??1)+.5}ch`;const summary=entry.node.querySelector<HTMLElement>(':scope > summary')!;summary.dataset.contentsKey=entry.key;summary.dataset.sectionNumber=entry.number;summary.dataset.sectionDepth=String(entry.depth);summary.style.setProperty('--section-number-width',entry.numberWidth);}
   entryRef.current=next;
   setEntries(old=>old.length===next.length&&old.every((e,i)=>e.key===next[i].key&&e.target===next[i].target&&e.label===next[i].label&&JSON.stringify(e.parts)===JSON.stringify(next[i].parts)&&e.parent===next[i].parent&&e.number===next[i].number&&e.numberWidth===next[i].numberWidth)?old:next);
  };
  const schedule=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(refresh);};
  refresh();
  const observer=new MutationObserver(records=>{if(records.some(r=>!shell.current?.contains(r.target)))schedule();});
  observer.observe(root,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['open','data-section']});
  return()=>{observer.disconnect();cancelAnimationFrame(frame);};
 },[]);
 useEffect(()=>{
  let frame=0;
  const update=()=>{
   const visible=entryRef.current.flatMap(entry=>{const summary=entry.node.querySelector('summary');return summary?.getClientRects().length?[{key:entry.key,top:summary.getBoundingClientRect().top}]:[];});
   const above=visible.filter(e=>e.top<=64).sort((a,b)=>b.top-a.top)[0];
   const atBottom=window.scrollY+window.innerHeight>=document.documentElement.scrollHeight-1;
   const next=atBottom?visible.sort((a,b)=>b.top-a.top)[0]:above??visible.filter(e=>e.top>64).sort((a,b)=>a.top-b.top)[0];
   if(next)setActive(next.key);
  };
  const schedule=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(update);};
  window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',schedule);schedule();
  return()=>{window.removeEventListener('scroll',schedule);window.removeEventListener('resize',schedule);cancelAnimationFrame(frame);};
 },[entries]);
 useEffect(()=>{
  const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){setOpen(false);drag.current=null;}};
  window.addEventListener('keydown',escape);return()=>window.removeEventListener('keydown',escape);
 },[]);
 useEffect(()=>{const panel=shell.current?.querySelector<HTMLElement>('.contents-panel'),item=panel?.querySelector<HTMLElement>('[aria-current="location"]');if(panel&&item){const a=panel.getBoundingClientRect(),b=item.getBoundingClientRect();if(b.top<a.top+44)panel.scrollTop-=a.top+44-b.top;else if(b.bottom>a.bottom-12)panel.scrollTop+=b.bottom-a.bottom+12;}},[active,open]);
 const navigate=(entry:Entry)=>{
  let ancestor:HTMLElement|null=entry.node;
  while(ancestor){if(ancestor instanceof HTMLDetailsElement)ancestor.open=true;ancestor=ancestor.parentElement;}
  setActive(entry.key);if(mobile)setOpen(false);
  requestAnimationFrame(()=>entry.node.scrollIntoView({block:'start',behavior:'auto'}));
 };
 const startDrag=(event:PointerEvent<HTMLDivElement>)=>{event.preventDefault();drag.current={start:event.clientX,width};event.currentTarget.setPointerCapture(event.pointerId);};
 const moveDrag=(event:PointerEvent<HTMLDivElement>)=>{if(drag.current)setWidth(bounded(drag.current.width+event.clientX-drag.current.start));};
 const tree=(parent:string|null):ReactNode=><ol>{entries.filter(e=>e.parent===parent).map(entry=><li key={entry.key}><button type="button" form="visual-actions" name="section" value={entry.target} data-contents-target={entry.target} data-contents-key={entry.key} data-section-number={entry.number} data-section-depth={entry.depth} style={{'--section-number-width':entry.numberWidth} as CSSProperties} aria-current={active===entry.key?'location':undefined} onClick={()=>navigate(entry)}><span className={'contents-label'+(entry.parts.some(p=>p.tex)&&entry.parts.every(p=>p.tex||!/[\p{L}]/u.test(p.text))?' contents-formula':'')}>{entry.parts.map((part,i)=>part.tex===undefined?part.text:<MathText key={i} tex={part.tex}/>)}</span></button>{entries.some(e=>e.parent===entry.key)&&tree(entry.key)}</li>)}</ol>;
 return <div ref={shell} className="contents-shell" data-contents-open={open?'true':'false'}>
  <button className="contents-toggle" type="button" name="contents_toggle" form="visual-actions" aria-label={japanese?'目次を開閉':'Toggle contents'} aria-expanded={open} aria-controls="awe-contents" onClick={()=>setOpen(v=>!v)}><span aria-hidden="true">☰</span></button>
  {open&&<><button className="contents-overlay" type="button" name="contents_close" form="visual-actions" aria-label={japanese?'目次を閉じる':'Close contents'} onClick={()=>setOpen(false)}/><nav id="awe-contents" className="contents-panel" aria-label={japanese?'目次':'Contents'}><div className="contents-heading">{japanese?'目次':'Contents'}</div>{tree(null)}<div className="contents-resize" role="separator" aria-label={japanese?'目次の幅':'Contents width'} aria-orientation="vertical" aria-valuemin={180} aria-valuemax={420} aria-valuenow={width} tabIndex={0} onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}} onKeyDown={event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();setWidth(v=>bounded(v+(event.key==='ArrowRight'?10:-10)));}}}/></nav></>}
 </div>;
}
