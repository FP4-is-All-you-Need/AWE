import {useEffect,useRef,useState,type ReactNode,type PointerEvent} from 'react';
import {useLanguage} from './i18n.tsx';
import './swap-drawer.css';
const clamp=(n:number)=>Math.max(260,Math.min(520,n));
function saved(key:string){try{return localStorage.getItem('awe.swap.'+key);}catch{return null;}}
export function SwapDrawer({children}:{children:ReactNode}){
 const ja=useLanguage()==='ja',query=new URLSearchParams(location.search);
 const [open,setOpen]=useState(()=>query.has('swap')?query.get('swap')==='1':saved('open')==='1');
 const [width,setWidth]=useState(()=>clamp(Number(saved('width'))||360)),[count,setCount]=useState(0);
 const ref=useRef<HTMLDivElement>(null),drag=useRef<{x:number;width:number}|null>(null);
 const change=(value:boolean)=>{setOpen(value);const q=new URLSearchParams(location.search);q.set('swap',value?'1':'0');history.replaceState(null,'','?'+q+location.hash);};
 useEffect(()=>{const show=()=>change(true);window.addEventListener('awe-open-swap',show);return()=>window.removeEventListener('awe-open-swap',show);},[]);
 useEffect(()=>{try{localStorage.setItem('awe.swap.open',open?'1':'0');localStorage.setItem('awe.swap.width',String(width));}catch{}const workspace=ref.current?.closest<HTMLElement>('.workspace');workspace?.classList.toggle('swap-open',open);workspace?.style.setProperty('--swap-width',width+'px');return()=>{workspace?.classList.remove('swap-open');};},[open,width]);
 useEffect(()=>{const node=ref.current;if(!node)return;const read=()=>setCount(Number(node.querySelector('[data-candidate-count]')?.getAttribute('data-candidate-count')??0));read();const observer=new MutationObserver(read);observer.observe(node,{subtree:true,childList:true,attributes:true,attributeFilter:['data-candidate-count']});return()=>observer.disconnect();},[]);
 const label=ja?`入れ替え候補 ${count}`:`Swap candidates ${count}`;
 const start=(e:PointerEvent<HTMLDivElement>)=>{e.preventDefault();drag.current={x:e.clientX,width};e.currentTarget.setPointerCapture(e.pointerId);};
 return <div ref={ref} className="swap-shell" data-swap-open={open} style={{'--swap-width':width+'px'} as React.CSSProperties}>
 <button type="button" form="visual-actions" name="swap_toggle" className="swap-tab" aria-expanded={open} aria-controls="swap-panel" onClick={()=>change(!open)}>{label}</button>
 <div id="swap-panel" className="swap-panel" hidden={!open}><button type="button" form="visual-actions" name="swap_close" className="swap-close" onClick={()=>change(false)}>{ja?'閉じる':'Close'}</button>{children}
 <div className="swap-resize" role="separator" aria-label={ja?'候補欄の幅':'Candidates width'} aria-orientation="vertical" aria-valuenow={width} aria-valuemin={260} aria-valuemax={520} tabIndex={0} onPointerDown={start} onPointerMove={e=>{if(drag.current)setWidth(clamp(drag.current.width+drag.current.x-e.clientX));}} onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}} onKeyDown={e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();setWidth(clamp(width+(e.key==='ArrowLeft'?10:-10)));}}}/></div>
 </div>;
}
