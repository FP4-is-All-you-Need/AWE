import {parseExclusions,type EncodingDiff} from './encodingDiff.ts';
import {correctionLabel} from './wording.ts';
import {useEffect,useState} from 'react';
import {MathText} from './PaperFigures.tsx';
import {useLanguage} from './i18n.tsx';
import {useParameter} from './parameters.ts';
import {setTex,type PlaneDistribution} from './planeDistribution.ts';
import {originalIndices} from './limbOrder.ts';
import {planeValue} from './encoding.ts';
import {planeColor,textInk} from './compact.ts';
import type {Construction} from './visual.ts';
const expression=(row:number[],s:string)=>row.map((v,i)=>v?`${v<0?'-':'+'}${Math.abs(v)===1?'':Math.abs(v)}${s}_{${i}}`:'').join('').replace(/^\+/,'')||'0';
export function PlaneSets({c,side,onSelectPlane}:{c:Construction;side:'A'|'B';onSelectPlane:(i:number)=>void}){
 const ja=useLanguage()==='ja',key=`plane_input.${c.id}.${side}`;
 const [input,setInput]=useParameter(key,'0',s=>s),[choice,setChoice]=useParameter(`plane_choice.${c.id}.${side}`,'',s=>s);
 const [exclusions,setExclusions]=useParameter(`plane_exclude.${c.id}.${side}`,'',s=>s);
 const indices=originalIndices(c,side),storedTuple=(tuple:number[])=>indices.map((original,index)=>({original,value:tuple[index]})).sort((a,b)=>a.original-b.original).map(v=>v.value).join(',');
 const [state,setState]=useState<{key:string;result?:PlaneDistribution;diff?:EncodingDiff}>();
 const request=JSON.stringify({c,side,excluded:parseExclusions(exclusions),override:choice&&/^-?\d+$/.test(input)?{input:Number(input),tuple:indices.map(original=>Number(choice.split(',')[original]))}:undefined});
 useEffect(()=>{const worker=new Worker(new URL('./planeDistribution.worker.ts',import.meta.url),{type:'module'});worker.onmessage=e=>setState({key:request,result:e.data.result,diff:e.data.diff});worker.onerror=()=>setState({key:request});worker.postMessage(JSON.parse(request));return()=>worker.terminate();},[request]);
 const ready=state?.key===request,result=ready?state?.result:undefined;
 if(!result)return <div data-plane-sets={side} role="status">{ready?(ja?'未計算':'Not computed'):(ja?'計算中':'Computing')}</div>;
 if(result.reason==='limit_or_unknown')return <div data-plane-sets={side}>{ja?'未計算':'Not computed'}</div>;
 const diff=state?.diff;
 const exclude=(plane:number,value:number)=>{setChoice('');const rows=parseExclusions(exclusions);setExclusions((rows.some(e=>e.plane===plane&&e.value===value)?rows.filter(e=>e.plane!==plane||e.value!==value):[...rows,{plane,value}]).map(e=>`${e.plane}:${e.value}`).join(','));};
 const rows=result.alternatives[input]??[],chosen=result.chosen[input],saved=c.saved_encoding?.[side]?.[input]??c.canonical?.encoding[side][Number(input)];
 const reference= saved??diff?.referenceChoices[input]??rows[0];
 const current=chosen&&c.planes?.[side].map((_,i)=>Number(planeValue(c,side,i,chosen)));
 const chooseInput=(x:string)=>{setInput(x);setChoice('');};
 return <div className="plane-sets" data-plane-sets={side} data-plane-sets-complete={result.complete}>
 <div className="plane-set-summary"><strong>{ja?'面の値の集合':'Plane value sets'}</strong> <MathText tex={`${side}\\in[${result.domain?.join(',')??'?'}]`}/><span>{choice||exclusions?(ja?'選択した表現':'Selected representation'):result.method==='saved_lut'?(ja?'表の採用値':'Table choice'):(ja?'検算に使う符号化':'Encoding used for checking')}</span>{result.holes.length>0&&<span>{ja?'穴':'Holes'} {result.holes.length}</span>}{!result.complete&&<span>{ja?'一部未計算':'Partly computed'}</span>}</div>
 <div data-alternative-explanation><strong>{ja?'別の符号化':'Alternative encodings'}</strong><p>{ja?`同じ${c.modulus?'剰余':'整数'}を別のリムの組で表すと、いくつもの面の値が同時に変わります。ある面の範囲を狭めると、別の面の範囲が広がることがあります。`:`Representing the same ${c.modulus?'residue':'integer'} with different limb values changes several planes at once. Reducing the range of one plane can increase the range of another.`}</p>
 <span>{ja?'消す値を選ぶ':'Choose a value to remove'}</span>{exclusions&&<button name="plane_diff_reset" onClick={()=>setExclusions('')}>{ja?'元に戻す':'Reset'}</button>}
 {diff?.blocked&&<span role="status">{ja?'この値は消せません':'Cannot remove these values'}</span>}
 </div>
 {result.planes.map((plane,i)=>{
  const before=diff?.reference[i]??plane.values,values=[...new Set([...before,...plane.values])].sort((a,b)=>a-b);
  return <div key={i} data-plane-set={i} data-values={plane.values.join(',')} data-histogram={JSON.stringify(plane.histogram)} className="plane-set-row" style={{borderLeftColor:planeColor(c,side,i)}}>
   <div className="plane-set-label"><button name="plane_set_focus" value={i} onClick={()=>onSelectPlane(i)} style={{color:textInk(planeColor(c,side,i))}}><MathText tex={`F_{${i+1}}=${expression(c.planes![side][i],side.toLowerCase())}`}/></button><MathText tex={`\\in ${setTex(plane.values).replaceAll(',',',\\allowbreak ')}`}/>
   <span data-plane-range={i}><MathText tex={`\\max |F_{${i+1}}|: ${Math.max(0,...before.map(Math.abs))}\\to ${Math.max(0,...plane.values.map(Math.abs))}`}/></span></div>
   <div className="plane-value-diff" data-plane-diff={i}>{[-1,1].map(sign=><div className="plane-value-slots" data-plane-sign={sign} key={sign}>
    <span aria-hidden="true">{sign<0?'−':'+'}</span>{[0,1,2,3,4,6,8,12].map(magnitude=>{
     const value=sign*magnitude,removed=before.includes(value)&&!plane.values.includes(value),added=!before.includes(value)&&plane.values.includes(value),active=diff?.excluded.some(e=>e.plane===i&&e.value===value),can=diff?.removable.some(e=>e.plane===i&&e.value===value);
     if(sign<0&&magnitude===0)return <span key={magnitude} data-value-seat={magnitude} className="plane-zero-seat" aria-hidden="true">—</span>;
     return <button key={magnitude} data-value-seat={magnitude} name="plane_remove_value" value={`${i}:${value}`} data-value={value} data-diff={removed?'removed':added?'added':plane.values.includes(value)?'same':'absent'} aria-label={`${side} F${i+1}: ${value}`} aria-pressed={!!active} disabled={!active&&!can} onClick={()=>exclude(i,value)}><MathText tex={String(magnitude)}/></button>;
    })}</div>)}
    {values.filter(v=>![0,1,2,3,4,6,8,12].includes(Math.abs(v))).map(value=>{
     const removed=before.includes(value)&&!plane.values.includes(value),added=!before.includes(value)&&plane.values.includes(value),active=diff?.excluded.some(e=>e.plane===i&&e.value===value),can=diff?.removable.some(e=>e.plane===i&&e.value===value);
     return <button key={value} data-extra-plane-value name="plane_remove_value" value={`${i}:${value}`} data-value={value} data-diff={removed?'removed':added?'added':'same'} aria-pressed={!!active} disabled={!active&&!can} onClick={()=>exclude(i,value)}><MathText tex={String(value)}/></button>;
    })}
   </div>
  </div>;
 })}
 {diff&&<span data-encoding-changed={diff.changedInputs.length}>{ja?'符号化が変わる入力':'Inputs with changed encoding'}: {diff.changedInputs.length}</span>}
 <form className="plane-set-controls" onSubmit={e=>e.preventDefault()}><label>{ja?'整数':'Integer'} <input name="plane_input" data-url-key={key} type="number" min={result.domain?.[0]} max={result.domain?.[1]} value={input} onChange={e=>chooseInput(e.target.value)}/></label><label>{ja?'符号化表（LUT）':'Encoding table (LUT)'} <select name="plane_choice" value={choice} onChange={e=>setChoice(e.target.value)}><option value="">{result.method==='saved_lut'?(ja?'表の採用値':'Table choice'):(ja?'検算に使う符号化':'Encoding used for checking')}</option>{rows.map(tuple=><option value={storedTuple(tuple)} key={tuple.join(',')}>({tuple.join(',')}){tuple.join()===reference?.join()?` · ${result.method==='saved_lut'?(ja?'表の採用値':'Table choice'):(ja?'検算':'Check')}`:''}</option>)}</select></label><span>{ja?'表現数':'Representations'} {rows.length}</span></form>
 <div className="plane-representations">{rows.map(tuple=><button name="plane_representation" key={tuple.join(',')} value={storedTuple(tuple)} data-reference={tuple.join()===reference?.join()} aria-pressed={tuple.join()===chosen?.join()} onClick={()=>setChoice(storedTuple(tuple))} style={{borderStyle:tuple.join()===reference?.join()?'dashed':'solid'}}><MathText tex={`(${tuple.join(',')})`}/>{tuple.join()===reference?.join()&&<span>{result.method==='saved_lut'?(ja?'表の採用値':'Table choice'):(ja?'検算':'Check')}</span>}</button>)}</div>
 {current&&<div className="plane-set-summary" data-current-plane-values>{current.map((v,i)=><MathText key={i} tex={`F_{${i+1}}=${v}`}/>)}</div>}
 {!result.alternativesComplete&&<span>{ja?'別の符号化：未計算':'Alternative encodings: not computed'}</span>}
 {c.correction&&<div data-plane-correction><span>{ja?'補正':'Correction'}: {correctionLabel(c.correction.kind)}</span> {c.correction.max_abs_shift!==undefined&&<MathText tex={`|\\delta|\\le${c.correction.max_abs_shift}`}/>} <span>{ja?'採用する補正：未収録':'Correction choice: not recorded'}</span></div>}
 </div>;
}
