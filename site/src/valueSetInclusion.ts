import {useEffect,useState} from 'react';
import {read} from './catalog.ts';
import type {FormsIndex,Inclusion} from './modularForms.ts';

/** The value-set inclusion of the data (forms-index.json value_set_inclusion); undefined until it is read. */
export function useInclusion(){
 const [inclusion,setInclusion]=useState<Inclusion>();
 useEffect(()=>{read<FormsIndex>('modular/forms-index.json').then(d=>setInclusion(d.value_set_inclusion)).catch(console.error);},[]);
 return inclusion;
}
