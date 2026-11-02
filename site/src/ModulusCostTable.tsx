import {useMemo,useState,type ReactNode} from 'react';
import {bounded,useParameter} from './parameters.ts';
import {factors} from './visual.ts';
import {PrimeFactors} from './PrimeFactors.tsx';
import {cost,groupRows,kind,pick,type Coefficients,type PolarRow} from './polarModel.ts';
const fmt=(n:number|null)=>n===null?'—':n.toLocaleString(undefined,{maximumFractionDigits:3});
export function ModulusCostTable({rows,s,en,onOpen,children}:{rows:PolarRow[];s:Coefficients;en:boolean;onOpen:()=>void;children:ReactNode}){
 const [open,setOpen]=useState(false);
 const [holes,setHoles]=useParameter('cost_holes',false,v=>v==='1',v=>v?'1':'0');
 const [filter,setFilter]=useParameter('cost_prime','',v=>/^\d+$/.test(v)&&Number(v)>=2&&Number(v)<=65536?v:'');
 const [sort,setSort]=useParameter('cost_sort','cost',v=>['cost','products','modulus'].includes(v)?v:'cost');
 const [page,setPage]=useParameter('cost_page',0,v=>Math.floor(bounded(v,0,10000,0)));
 const list=useMemo(()=>{
  if(!open)return [];
  const groups=groupRows(rows.filter(r=>r.inCatalog&&(holes||(!r.hA&&!r.hB))));
  return [...groups].filter(([m])=>!filter||factors(m).some(f=>f.prime===Number(filter))).map(([m,rs])=>{
   const row=pick(rs,s,'cost')??pick(rs,s,'products')!,total=cost(row,s);
   return {m,row,perBit:total===null?null:total/Math.log2(m)};
  }).sort((a,b)=>(sort==='cost'?(a.perBit??Infinity)-(b.perBit??Infinity):sort==='products'?a.row.R-b.row.R:0)||a.m-b.m);
 },[rows,s,open,holes,filter,sort]);
 const pages=Math.max(1,Math.ceil(list.length/15)),current=Math.min(page,pages-1);
 return <details data-section="modulus-cost" data-no-i18n className="molecule-table" onToggle={e=>{setOpen(e.currentTarget.open);if(e.currentTarget.open)onOpen();}}><summary>{en?'Cost by modulus':'法ごとの費用'}</summary>
 <p>{en?'Prime factors keep the same colours in primes, powers and composites, including when switching FP4/FP6. Products and planes have a separate colour legend.':'素数・素数べき・合成数を一緒に比べます。同じ素因数は、FP4／FP6を切り替えても同じ色です。積・面の配色とは別の凡例です。'}</p>
 <div className="paper-controls"><label>{en?'Sort':'並べ替え'} <select aria-label="cost sort" value={sort} onChange={e=>{setSort(e.target.value);setPage(0);}}><option value="cost">{en?'Cost / bit':'費用 / bit'}</option><option value="products">{en?'Products':'積の本数'}</option><option value="modulus">{en?'Modulus':'法の値'}</option></select></label><label>{en?'Prime factor':'素因数'} <input aria-label="cost prime" type="number" min="2" max="65536" value={filter} onChange={e=>{setFilter(e.target.value);setPage(0);}}/></label><button type="button" onClick={()=>{setFilter('');setPage(0);}}>{en?'All primes':'全ての素数'}</button><label><input aria-label="cost holes" type="checkbox" checked={holes} onChange={e=>{setHoles(e.target.checked);setPage(0);}}/>{en?'Include holes':'穴ありも含む'}</label><span>{en?`${list.length} moduli`:`法は ${list.length} 個`}</span></div>
 {children}<div className="polar-table-scroll"><table><thead><tr>{[en?'Modulus':'法',en?'Prime powers':'素数べき',en?'Kind':'種類',en?'Cost / bit':'費用 / bit',en?'Products':'積の本数',en?'Planes A / B':'面 A / B',en?'Holes A / B':'穴 A / B',en?'Construction':'構成'].map(v=><th key={v}>{v}</th>)}</tr></thead><tbody>{list.slice(current*15,current*15+15).map(({m,row,perBit})=><tr key={m} data-cost-modulus={m} data-cost-value={perBit??''} data-value-set={row.vs}><td>{m}</td><td><PrimeFactors m={m}/></td><td>{en?kind(m):({prime:'素数',power:'素数べき',composite:'合成数'}[kind(m)])}</td><td>{fmt(perBit)}</td><td>{row.R}</td><td>{row.FA} / {row.FB}</td><td>{row.hA} / {row.hB}{row.exact?'':'*'}</td><td><a href={import.meta.env.BASE_URL+row.source} title={row.id}>{en?'Source data':'元のデータ'}</a></td></tr>)}</tbody></table></div>
 <div className="paper-controls"><button type="button" disabled={!current} onClick={()=>setPage(current-1)}>{en?'Previous':'前'}</button><span>{current+1} / {pages}</span><button type="button" disabled={current+1>=pages} onClick={()=>setPage(current+1)}>{en?'Next':'次'}</button></div>
 <p>{en?'The lowest modeled cost among published constructions under the selected format and hole filter. Unknown cost is shown as — and sorted last. This is not measured runtime or a ranking of CRT sets. * is an upper bound on holes.':'選んだ形式と穴の条件で、公開構成のうち費用が最少の形を表示します。費用が未確認なら — として末尾に置きます。実行時間の測定や、CRTで使う法の組の順位ではありません。* は穴の上限です。'}</p>
 </details>;
}
