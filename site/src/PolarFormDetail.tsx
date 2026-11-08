import {useEffect,useState} from 'react';
import {read} from './catalog.ts';
import {CompositeSplit} from './CompositeSplit.tsx';
import {Expansion} from './Expansion.tsx';
import {formConstruction} from './formConstruction.ts';
import {fromCanonical,type Construction} from './visual.ts';
import type {FormSolution} from './modularForms.ts';
import type {ModularSolution} from './modular.ts';
import type {Coefficients,PolarRow} from './polarModel.ts';
import './polar-form-detail.css';

/** Under the spiral: the composite split where it applies, then the selected construction in the periodic table's
 * expansion, opened on the paper's coverage figure. */
export function SpiralDetail({m,row,groups,s,en}:{m:number;row?:PolarRow;groups:Map<number,PolarRow[]>;s:Coefficients;en:boolean}){
 return <><CompositeSplit m={m} groups={groups} s={s} en={en}/>{row&&<PolarFormDetail key={row.id} row={row} en={en}/>}</>;
}

function PolarFormDetail({row,en}:{row:PolarRow;en:boolean}){
 const [c,setC]=useState<Construction>(),[error,setError]=useState('');
 useEffect(()=>{let alive=true;read<{solutions:(FormSolution|ModularSolution)[]}>(row.source).then(d=>{
  const found=d.solutions.find(v=>v.id===row.id);if(!found)throw Error(en?'Source construction was not found':'元の構成が見つかりません');
  const built=row.source.startsWith('modular/forms-')?formConstruction(found as FormSolution):fromCanonical(found as ModularSolution);
  if(built.modulus!==row.m||built.products.length!==row.R||JSON.stringify(built.weights)!==JSON.stringify(row.weights))throw Error(en?'Source and display index do not match':'元データと表示用索引が一致しません');
  if(alive)setC(built);
 }).catch(e=>{if(alive)setError(String(e));});return()=>{alive=false;};},[row,en]);
 return <section className="polar-form-detail" data-polar-form-detail={row.id} data-i18n>
  <h4>{en?'Selected construction':'表示中の形'} · mod {row.m} · {row.vs}</h4>
  {error?<p role="alert">{error}</p>:!c?<p>{en?'Loading the source construction…':'元の構成を読み込み中…'}</p>:<Expansion c={c} scope="polar." layout="paper"/>}
 </section>;
}
