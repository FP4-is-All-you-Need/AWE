import {createContext,useContext,type ReactNode} from 'react';
import {useLanguage} from './i18n.tsx';
import type {Construction} from './visual.ts';

export const SameInputsContext=createContext(true);
const equal=(a:unknown,b:unknown)=>a!==undefined&&b!==undefined&&JSON.stringify(a)===JSON.stringify(b);

export function equalSides(c:Construction):boolean{
 const source=c.integer??c.canonical;
 if(!source||!source.limb_sets||!source.plane_sets||!c.planes)return false;
 if(!equal(source.weights.A,source.weights.B)||!equal(source.planes.A,source.planes.B)
   ||!equal(source.limb_sets.A,source.limb_sets.B)||!equal(source.plane_sets.A,source.plane_sets.B)
   ||!equal(c.weights.A,c.weights.B)||!equal(c.planes.A,c.planes.B))return false;
 if(c.plane_moduli&&!equal(c.plane_moduli.A,c.plane_moduli.B))return false;
 if(c.limbs_stored&&!equal(c.limbs_stored.A,c.limbs_stored.B))return false;
 if(c.integer&&!equal(c.integer.domain.A,c.integer.domain.B))return false;
 if(c.canonical&&!equal(c.canonical.encoding.A,c.canonical.encoding.B))return false;
 if(c.saved_encoding&&!equal(c.saved_encoding.A,c.saved_encoding.B))return false;
 return true;
}

export function SideDetails({c,side,kind,matching=true,children}:{c:Construction;side:'A'|'B';kind:string;matching?:boolean;children:ReactNode}){
 const sameInputs=useContext(SameInputsContext),language=useLanguage();
 const identical=matching&&equalSides(c),collapse=sameInputs&&identical;
 if(side==='A')return <div data-side-details="A" data-side-kind={kind}>{children}</div>;
 return <details data-side-details="B" data-side-kind={kind} data-sides-identical={identical} open={!collapse}>
 <summary>{identical?(language==='ja'?'B（A と同じ）':'B (same as A)'):'B'}</summary>
 {children}
 </details>;
}
