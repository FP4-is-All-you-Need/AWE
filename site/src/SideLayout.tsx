import {useRef,type CSSProperties,type ReactNode} from 'react';
import {useParameter} from './parameters.ts';
import './side-layout.css';
const clamp=(n:number)=>Math.round(Math.max(240,Math.min(720,n)));
function saved(key:string){try{return localStorage.getItem(key);}catch{return null;}}
function store(key:string,value:string){try{localStorage.setItem(key,value);}catch{}}
// Two columns: the first child is the main view, the second the side panel, which can be folded or resized.
// Open state and width are kept in the URL (<name>_side, <name>_side_width) and in localStorage.
export function SideLayout({name,className,en,children}:{name:string;className?:string;en:boolean;children:ReactNode}){
 const key='awe.side.'+name+'.';
 const [open,setOpen]=useParameter(name+'_side',saved(key+'open')!=='0',v=>v!=='0',v=>v?'1':'0');
 const [width,setWidth]=useParameter(name+'_side_width',clamp(Number(saved(key+'width'))||340),v=>clamp(Number(v)||340));
 const drag=useRef<{x:number;width:number}|null>(null);
 const toggle=()=>{setOpen(!open);store(key+'open',open?'0':'1');};
 const resize=(n:number)=>{const w=clamp(n);setWidth(w);store(key+'width',String(w));};
 return <div className={className?'side-layout '+className:'side-layout'} data-side-open={open} style={{'--side-width':width+'px'} as CSSProperties}>
  {children}
  <div className="side-controls">
   <button type="button" className="side-toggle" name={name+'_side'} aria-expanded={open} onClick={toggle}>{open?(en?'Hide panel':'右の欄を閉じる'):(en?'Show panel':'右の欄を開く')}</button>
   {open&&<div className="side-resize" role="separator" aria-orientation="vertical" aria-label={en?'Side panel width':'右の欄の幅'} aria-valuenow={width} aria-valuemin={240} aria-valuemax={720} tabIndex={0} onPointerDown={e=>{e.preventDefault();drag.current={x:e.clientX,width};e.currentTarget.setPointerCapture(e.pointerId);}} onPointerMove={e=>{if(drag.current)resize(drag.current.width+drag.current.x-e.clientX);}} onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}} onKeyDown={e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();resize(width+(e.key==='ArrowLeft'?10:-10));}}}/>}
  </div>
 </div>;
}
