import {useMemo} from 'react';
import {base13Alternatives,base13Carry,base13Greedy,transfersTo} from './base13Carry.ts';
import {Formula,MathText} from './PaperFigures.tsx';
import {useParameter} from './parameters.ts';
import {useLanguage} from './i18n.tsx';
const words={en:{title:'Carry operations and alternative representations',limbs:'Stored limbs',choice:'Representation',figure:'Procedure in the paper figure',greedy:'Greedy encoding',lut:'Table choice',unknown:'Table choice unavailable',count:'Representations',none:'Hole',step:'Transfer',unchanged:'No transfer',higher:'Carry beyond the stored limbs',values:'Result'},ja:{title:'繰り上がりの操作と別の表現',limbs:'格納するリム数',choice:'表現',figure:'論文の図の手順',greedy:'貪欲法の符号化',lut:'表の採用値',unknown:'未収録',count:'表現数',none:'Hole',step:'移動',unchanged:'移動不要',higher:'格納するリムを越える繰り上がり',values:'結果'}};
export function Base13CarryChoices({value,saved,onStep}:{value:bigint;saved?:number[];onStep:(exponent:number)=>void}){
 const lang=useLanguage(),t=words[lang];
 const [limbs,setLimbs]=useParameter('encode_limbs',3,r=>[1,2,3,4].includes(Number(r))?Number(r):3);
 const [choice,setChoice]=useParameter('encode_representation','figure',r=>r);
 const [step,setStep]=useParameter('encode_transfer',0,r=>Number.isInteger(Number(r))&&Number(r)>=0?Number(r):0);
 const rows=useMemo(()=>base13Alternatives(value,limbs),[value,limbs]);
 const greedy=base13Greedy(value),source=base13Carry(value),canonical=source.digits.map(d=>d*source.sign),selected=rows.find(row=>row.join(',')===choice),target=selected??canonical,events=transfersTo(value,target),event=events[Math.min(step,events.length-1)];
 const key=selected?choice:'figure',same=(a:number[],b?:number[])=>!!b&&Array.from({length:Math.max(a.length,b.length)},(_,i)=>a[i]??0).every((v,i)=>v===(b[i]??0));
 const equation=(digits:number[])=>`${value}=${digits.map((d,i)=>`(${d})${i?`\\cdot13^{${i}}`:''}`).join('+')}`;
 const pickStep=(i:number)=>{setStep(i);if(key==='figure')onStep(events[i].exponent);};
 return <details open data-section="base13-carries" className="base13-carry-choices"><summary>{t.title}</summary>
 <form name="base13_carries" className="paper-controls" onSubmit={e=>e.preventDefault()}><label>{t.limbs} <select name="encode_limbs" value={limbs} onChange={e=>{setLimbs(Number(e.target.value));setChoice('figure');setStep(0);}}>{[1,2,3,4].map(n=><option key={n}>{n}</option>)}</select></label><label>{t.choice} <select name="encode_representation" value={key} onChange={e=>{setChoice(e.target.value);setStep(0);}}><option value="figure">{t.figure}</option>{rows.map(row=><option key={row.join()} value={row.join()}>{`(${row.join(', ')})${same(row,saved)?' — '+t.lut:''}`}</option>)}</select></label></form>
 <p><MathText tex={`w=( ${Array.from({length:limbs},(_,i)=>String(13**i)).join(',')} )`}/></p>
 <p>{t.count}: <strong data-carry-candidate-count>{rows.length}</strong>. {!rows.length&&t.none} {!saved&&t.unknown}</p>
 <div className="encoding-candidates">{rows.map(row=><button type="button" form="visual-actions" name="encode_representation" value={row.join()} key={row.join()} data-carry-candidate={row.join()} data-adopted={same(row,saved)} aria-pressed={key===row.join()} onClick={()=>{setChoice(row.join());setStep(0);}}><svg width="20" height="20" aria-hidden="true"><circle cx="10" cy="10" r="7" fill="#FFFFFF" stroke={same(row,saved)?'#D81B60':'#0288D1'} strokeDasharray={same(row,saved)?'3 2':undefined}/></svg><MathText tex={`(${row.join(',')})`}/>{same(row,saved)&&t.lut}{same(row,canonical)&&` — ${t.figure}`}{same(row,greedy)&&` — ${t.greedy}`}</button>)}</div>

 <div className="paper-controls">{events.map((e,i)=><button type="button" form="visual-actions" name="encode_transfer" value={i} key={i} data-carry-transfer={i} aria-pressed={step===i||step>=events.length&&i===events.length-1} onClick={()=>pickStep(i)}>{t.step} {i+1}: <MathText tex={`a_{${e.exponent}}${e.amount>0?'-':'+'}=${13*Math.abs(e.amount)},\\quad a_{${e.exponent+1}}${e.amount>0?'+':'-'}=${Math.abs(e.amount)}`}/></button>)}</div>
 {event?<div className="paper-scroll"><svg data-transfer-diagram data-transfer-q={event.amount} data-transfer-exponent={event.exponent} width="680" height="162" viewBox="0 0 680 162" style={{background:'#FFFFFF'}} aria-label={t.title}>
 <defs><marker id="carry-transfer-arrow" viewBox="0 0 8 4" refX="8" refY="2" markerWidth="8" markerHeight="4" orient="auto"><path d="M0 0 L8 2 L0 4" fill="#EF6C00"/></marker></defs>
 <rect x="8" y="38" width="230" height="76" fill="#EF6C00" fillOpacity=".12" stroke="#EF6C00"/><rect x="442" y="38" width="230" height="76" fill="#689F38" fillOpacity=".12" stroke="#689F38"/>
 <Formula x={12} y={43} w={222} h={60} size={18} tex={`a_{${event.exponent}}:\\; ${event.before[event.exponent]??0}\\longmapsto ${event.after[event.exponent]}`}/>
 <Formula x={446} y={43} w={222} h={60} size={18} tex={`a_{${event.exponent+1}}:\\; ${event.before[event.exponent+1]??0}\\longmapsto ${event.after[event.exponent+1]}`}/>
 <line x1="246" y1="79" x2="434" y2="79" stroke="#EF6C00" strokeWidth="2" markerEnd="url(#carry-transfer-arrow)"/>
 <Formula x={246} y={10} w={188} h={42} size={18} tex={`q=${event.amount>0?'+':''}${event.amount}`}/>
 <Formula x={8} y={118} w={664} h={40} size={16} tex={`(${event.after[event.exponent]-event.before[event.exponent]})13^{${event.exponent}}+(${event.amount})13^{${event.exponent+1}}=0`}/>
 </svg></div>:<p>{t.unchanged}</p>}
 {event&&event.exponent+1>=limbs&&<p data-leading-carry>{t.higher}</p>}
 <p data-carry-choice-result={target.join(',')}>{t.values}: <MathText tex={equation(target)}/></p>
 </details>;
}
