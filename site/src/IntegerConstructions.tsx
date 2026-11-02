import {useEffect,useState} from 'react';
import {read} from './catalog.ts';
import {Expansion} from './Expansion.tsx';
import {jointConstruction,type JointRecord} from './JointComparison.tsx';
export function IntegerConstructions({active,selected,onSelect,en}:{active:boolean;selected:string;onSelect:(id:string)=>void;en:boolean}){
 const [rows,setRows]=useState<JointRecord[]>(),[error,setError]=useState('');
 useEffect(()=>{if(active&&!rows)read<{references:JointRecord[]}>('modular/integer-examples.json').then(d=>setRows(d.references)).catch(e=>setError(String(e)));},[active,rows]);
 const current=rows?.find(r=>'joint_'+r.id===selected);
 return <details className="integer-constructions" data-section="integer-constructions" open={!!current}><summary>{en?'Integer constructions with holes (no modulus)':'穴のある整数の構成（法の指定なし）'} {rows?.length??''}</summary>
  <p>{en?'These preserved constructions cover the integer interval −128…127 except for the listed holes. They have no modular interpretation assigned here. Their coefficients, encoding tables and correction metadata are unchanged.':'整数範囲 −128〜127 を対象とし、表示した値に穴があります。ここでは法を割り当てていません。係数・符号化表・補正の記録を元のまま残しています。'}</p>
  {error&&<p role="alert">{error}</p>}<div className="integer-choices">{rows?.map(r=><button key={r.id} type="button" data-integer-form={r.id} aria-pressed={current?.id===r.id} onClick={()=>onSelect('joint_'+r.id)}><span>A / B: ({r.weights.join(', ')})</span><span>{r.products.length} {en?'products':'積'} · {en?'planes':'面'} A {r.planes.length} / B {r.planes.length}</span><span>{en?'Holes':'穴'}: {r.holes.length} / 256 ({100*r.share}%)</span></button>)}</div>
  {current&&<div data-selected-integer={current.id}><p><a href={import.meta.env.BASE_URL+'modular/integer-examples.json'}>{en?'Source construction':'元の構成'}</a> · {current.id}</p><p data-no-i18n>{en?'Holes':'穴'}: {current.holes.length} / 256</p><Expansion key={current.id} c={jointConstruction(current)}/></div>}
 </details>;
}
