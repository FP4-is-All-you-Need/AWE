import {createContext,useContext} from 'react';
import type {ReactNode} from 'react';
import {useParameter} from './parameters.ts';
import {LanguageControl,useLanguage} from './i18n.tsx';
import type {ValueSet} from './polarModel.ts';
import {FORMAT_SETS,PAGE_FORMATS,pageFormat,type PageFormat} from './valueSets.ts';
const Context=createContext<{tab:PageFormat;setTab:(tab:PageFormat)=>void;valueSet:ValueSet;setFP6:(v:ValueSet)=>void}>({tab:'fp4',setTab:()=>{},valueSet:'2xE2M1',setFP6:()=>{}});
export const usePeriodicFormat=()=>useContext(Context);
export function PeriodicFormatProvider({children}:{children:ReactNode}){
 const [tab,setTab]=useParameter<PageFormat>('prime_set','fp4',pageFormat);
 const [fp6,setFP6]=useParameter<ValueSet>('periodic_fp6','8xE2M3',s=>s==='16xE3M2'?'16xE3M2':'8xE2M3');
 return <Context.Provider value={{tab,setTab,valueSet:tab==='fp6'?fp6:FORMAT_SETS[tab][0],setFP6}}>{children}</Context.Provider>;
}
export function PeriodicFormatControl(){
 const {tab,setTab,valueSet,setFP6}=usePeriodicFormat(),en=useLanguage()==='en';
 return <nav className="periodic-format" aria-label={en?'Page arithmetic format':'ページ全体の演算形式'} data-no-i18n><span>{en?'Arithmetic format':'演算形式'}</span><div role="group" aria-label={PAGE_FORMATS.map(v=>v.toUpperCase()).join(' / ')}>{PAGE_FORMATS.map(v=><button key={v} type="button" aria-pressed={v===tab} onClick={()=>setTab(v)}>{v.toUpperCase()}</button>)}</div>{tab==='fp6'&&<label>FP6 <select aria-label="FP6 value set" value={valueSet} onChange={e=>setFP6(e.target.value as ValueSet)}><option value="8xE2M3">8×E2M3</option><option value="16xE3M2">16×E3M2</option></select></label>}{tab==='fp8'&&<span data-value-set={valueSet}>FP8 · 512×E4M3</span>}<LanguageControl/></nav>;
}
