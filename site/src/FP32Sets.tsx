import {useLanguage} from './i18n.tsx';
import {MathText} from './PaperFigures.tsx';
import type {ModularCatalog,FP32Run} from './modular.ts';

export function FP32Sets({catalog,selected,onSelect}:{catalog:ModularCatalog;selected:string;onSelect:(id:string)=>void}){
 const en=useLanguage()==='en',groups=catalog.fp32_groups??[],sets=new Map(catalog.sets.map(s=>[s.id,s]));
 const result=(r:FP32Run)=>r.association==='unconfirmed'?(en?'Run link unconfirmed':'実行版との対応未確認'):r.qualified===false?(en?'Failed':'不合格'):r.qualified===true?(en?'Passed':'合格'):(en?'Run recorded':'実行記録あり');
 const failures=groups.flatMap(g=>g.engines.flatMap(e=>e.measurements.filter(r=>r.qualified===false).map(r=>({g,e,r}))));
 return <details open data-section="fp32-sets" className="fp32-sets"><summary>{en?'FP32 modulus sets':'FP32の法の組'}{' · '}{groups.length}{en?' sets':'組'}</summary>
 <div className="fp32-group-list">{groups.map(g=>{
 const first=sets.get(g.set_ids[0])!,measured=g.engines.some(e=>e.state==='measured');
 return <details key={g.id} data-fp32-group={g.id} data-section={'fp32-set.'+g.id}><summary><span>{[...new Set(g.engines.map(e=>e.bits))].sort((a,b)=>a-b).join('/')} bit · {g.moduli.length}{en?' moduli':'法'} · {first.verification.products}{en?' products':'積'} · {measured?(en?'Used in measurements':'測定で使用'):(en?'Run link unconfirmed':'実行版との対応未確認')}</span></summary>
 <MathText tex={`\\operatorname{mod}\\;(${g.moduli.join(',')})`}/>
 <div className="fp32-records"><table><thead><tr>{[en?'Engine':'engine', 'bit',en?'K limit (engine / construction)':'K上限（engine / 構成）',en?'Device':'機器',en?'Routine / result':'routine / 結果',en?'Select':'選択'].map(h=><th key={h}>{h}</th>)}</tr></thead>
 <tbody>{g.engines.map(e=>{const s=sets.get(e.set_id)!;return <tr key={e.id} data-fp32-engine={e.id}><td><code>{e.id}</code><details><summary>{en?'Version / hashes':'版 / hash'}</summary><dl><dt>{en?'Source revision':'出所の版'}</dt><dd>{e.source_revision}</dd><dt>{en?'Table':'表'}</dt><dd>{e.header_sha256}</dd><dt>{en?'Record':'記録'}</dt><dd>{e.evidence_sha256}</dd></dl></details></td><td>{e.bits}</td><td>{e.k_limit} / {s.verification.max_k}</td><td>{e.device}{e.measurements.find(r=>r.recorded_device)?.recorded_device?' ('+e.measurements.find(r=>r.recorded_device)!.recorded_device+')':''}</td><td>{e.measurements.length?<ul>{e.measurements.map((r,i)=><li key={i} data-fp32-result={r.qualified===false?'failed':r.association==='unconfirmed'?'unconfirmed':r.qualified===true?'passed':'recorded'}>{r.routine} · {r.shape.join(' × ')} · {en?r.distribution:r.distribution==='uniform'?'一様':'正規'} · {result(r)}</li>)}</ul>:en?'Build only':'buildのみ'}</td><td><button name="fp32_set" value={s.id} aria-pressed={selected===s.id} onClick={()=>onSelect(s.id)}>{en?'Select':'選ぶ'}</button></td></tr>;})}</tbody></table></div>
 </details>;})}</div>
 {!!failures.length&&<details data-section="fp32-failed" data-fp32-failed><summary>{en?'Failed precision checks':'精度試験の不合格'} · {failures.length}</summary><p>{en?'Saved 1,024-point checks; these results apply to the listed inputs.':'保存された1,024点での検査。この合否は記載した入力条件に対するものです。'}</p><ul>{failures.map(({e,r},i)=><li key={i}>{e.bits} bit · {e.id} · {r.device} · {r.routine} {r.shape.join(' × ')} · {en?r.distribution:r.distribution==='uniform'?'一様':'正規'} · {result(r)}</li>)}</ul></details>}
 </details>;
}
