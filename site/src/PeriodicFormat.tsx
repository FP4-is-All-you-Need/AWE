import {createContext,useContext} from 'react';
import type {ReactNode} from 'react';
import {useParameter} from './parameters.ts';
import {useLanguage} from './i18n.tsx';
import type {ValueSet} from './polarModel.ts';
const Context=createContext<{tab:'fp4'|'fp6';setTab:(tab:'fp4'|'fp6')=>void;valueSet:ValueSet;setFP6:(v:ValueSet)=>void}>({tab:'fp4',setTab:()=>{},valueSet:'2xE2M1',setFP6:()=>{}});
export const usePeriodicFormat=()=>useContext(Context);
export function PeriodicFormatProvider({children}:{children:ReactNode}){
 const [tab,setTab]=useParameter<'fp4'|'fp6'>('prime_set','fp4',s=>s==='fp6'?'fp6':'fp4');
 const [fp6,setFP6]=useParameter<ValueSet>('periodic_fp6','8xE2M3',s=>s==='16xE3M2'?'16xE3M2':'8xE2M3');
 return <Context.Provider value={{tab,setTab,valueSet:tab==='fp4'?'2xE2M1':fp6,setFP6}}>{children}</Context.Provider>;
}
export function PeriodicFormatControl(){
 const {tab,setTab,valueSet,setFP6}=usePeriodicFormat(),en=useLanguage()==='en';
 return <nav className="periodic-format" aria-label={en?'Periodic tables: arithmetic format':'周期表の演算形式'} data-no-i18n><span>{en?'Periodic tables':'周期表'}</span><div role="group" aria-label="FP4 / FP6">{(['fp4','fp6'] as const).map(v=><button key={v} type="button" aria-pressed={v===tab} onClick={()=>setTab(v)}>{v.toUpperCase()}</button>)}</div>{tab==='fp6'&&<label>FP6 <select aria-label="FP6 value set" value={valueSet} onChange={e=>setFP6(e.target.value as ValueSet)}><option value="8xE2M3">8×E2M3</option><option value="16xE3M2">16×E3M2</option></select></label>}</nav>;
}
