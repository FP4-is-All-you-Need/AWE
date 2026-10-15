import {base13Products,base13Width,withinReference} from './base13Reference.ts';
import {useLimbOrderQuery,readLimbOrder} from './useLimbOrder.ts';
import {orderedConstruction} from './limbOrder.ts';
import {ConstructionDifference} from './ConstructionDifference.tsx';
import {useMeasuredWidth} from './useMeasuredWidth.ts';
import {useEffect,useState,useMemo,useContext} from 'react';
import {useSelectedDetailScroll} from './useSelectedDetailScroll.ts';
import {catalog,search,read,solution} from './catalog.ts';
import {MathText,ConstructionTile} from './PaperFigures.tsx';
import {Expansion} from './Expansion.tsx';
import {fromInteger,inFilter,type Construction} from './visual.ts';
import type {Row} from './types.ts';
import {CostContext} from './CostContext.tsx';
import {DimensionContext} from './Dimensions.tsx';
import {HoleContext} from './HoleContext.tsx';
import {constructionCost} from './cost.ts';
import {integerRows,integerRowCost} from './integerSearch.ts';
import {useParameter,bounded} from './parameters.ts';

export function IntegerResults({ma,mb,onShowCRT,wider,onWider,onPaperExample,onSelection,extra=[]}:{ma:number;mb:number;onShowCRT:()=>void;wider:boolean;onWider:(v:boolean)=>void;onPaperExample:()=>void;onSelection?:(c:Construction|undefined)=>void;extra?:Construction[]}){
 const measured=useMeasuredWidth(),orderQuery=useLimbOrderQuery();
 const cost=useContext(CostContext),dims=useContext(DimensionContext),holes=useContext(HoleContext);
 const [mixed,setMixed]=useParameter('include_mixed',false,r=>r==='1',v=>v?'1':'0');
 const [r,setR]=useParameter('integer_products_max',0,r=>bounded(r,0,4096,0));
 const [limbs,setLimbs]=useParameter('integer_limbs',0,r=>bounded(r,0,32,0));
 const [planes,setPlanes]=useParameter('integer_planes_max',0,r=>bounded(r,0,512,0));
 const [denominator,setDenominator]=useParameter('integer_denominator',0,r=>bounded(r,0,100000000,0));
 const [weight,setWeight]=useParameter('integer_weight','',r=>r);
 const [sort,setSort]=useParameter('integer_sort','products',r=>['products','planes','cost','range'].includes(r)?r:'products');
 const [page,setPage]=useParameter('integer_page',0,r=>Math.floor(bounded(r,0,100000,0)));
 const [id,setId]=useParameter('integer_id','',r=>r);
 const [base,setBase]=useState<Row[]>([]),[loaded,setLoaded]=useState<Map<string,Construction>>(new Map()),[error,setError]=useState(''),[loading,setLoading]=useState(true),[loadedWidth,setLoadedWidth]=useState('');
 const widthKey=`${ma}:${mb}:${mixed}`,pending=loading||loadedWidth!==widthKey;
 useEffect(()=>{let live=true;setLoading(true);setBase([]);setLoaded(new Map());setError('');(async()=>{
  const meta=await catalog(),index=await search(meta),groups=index.groups.filter(g=>g.width_a>=ma&&g.width_b>=mb&&(mixed||!g.mixed));
  const rows:Row[]=[];for(let i=0;i<groups.length;i+=4){if(!live)return;const parts=await Promise.all(groups.slice(i,i+4).map(g=>read<Row[]>(g.path,g.sha256)));rows.push(...parts.flat());}
  if(live){setBase(rows);setLoadedWidth(widthKey);setLoading(false);}
 })().catch(e=>{if(live){setError(e instanceof Error?e.message:String(e));setLoading(false);}});return()=>{live=false;};},[ma,mb,mixed]);
 const extras=useMemo(()=>new Map(extra.filter(c=>{const w=c.additional?.widths as {A:number;B:number}|undefined;return c.modulus===0&&w&&w.A>=ma&&w.B>=mb&&inFilter(c,holes.max);}).map(c=>[c.id,c])),[extra,ma,mb,holes.max]);
 const allRows=useMemo(()=>{
  const extraRows=[...extras.values()].filter(c=>!base.some(r=>r[0]===c.id)).map(c=>{const w=c.additional!.widths as {A:number;B:number};return [c.id,w.A,w.B,c.weights.A.length,c.weights.B.length,c.products.length,c.faces_a,c.faces_b??0,c.denominator,c.max_k??null,c.weights.A,c.weights.B,false,{add_a:null,add_b:null,domain_a:c.integer?.domain.A??c.encoding_domain,domain_b:c.integer?.domain.B??c.encoding_domain}] as Row;});
  const result=integerRows([...base,...extraRows],{r,limbs,planes,denominator,weight,mixed,sort},dims.k,dims,cost);
  if(sort==='cost'){const values=new Map(result.map(row=>[row[0],extras.has(row[0])?constructionCost(extras.get(row[0])!,dims,cost).total:integerRowCost(row,dims,cost).total]));result.sort((a,b)=>(values.get(a[0])??Infinity)-(values.get(b[0])??Infinity)||a[5]-b[5]||a[0].localeCompare(b[0]));}return result;
 },[base,extras,r,limbs,planes,denominator,weight,mixed,sort,dims.m,dims.n,dims.k,cost]);
 const reference=base13Products(ma,mb),rows=useMemo(()=>allRows.filter(row=>withinReference(row[5],reference,wider,r)),[allRows,reference,wider,r]);
 const hidden=allRows.length-rows.length;
 const pages=Math.max(1,Math.ceil(rows.length/12)),currentPage=Math.min(page,pages-1),pageRows=rows.slice(currentPage*12,currentPage*12+12);
 const ids=pageRows.map(r=>r[0]);if(id&&!ids.includes(id)&&rows.some(r=>r[0]===id))ids.push(id);
 const idsKey=ids.join('|');
 useEffect(()=>{if(!pending&&rows.length&&!rows.some(r=>r[0]===id))setId(rows[0][0]);},[rows,id,pending]);
 useEffect(()=>{let live=true;if(!idsKey){setLoaded(new Map());return;}setError('');(async()=>{const meta=await catalog();const canonical=new Set(base.map(r=>r[0]));const values=await Promise.all(idsKey.split('|').map(async id=>canonical.has(id)?fromInteger(await solution(meta,id)):extras.get(id)!));if(live)setLoaded(new Map(values.map(c=>[c.id,c])));})().catch(e=>live&&setError(e instanceof Error?e.message:String(e)));return()=>{live=false;};},[idsKey,extras,base]);
 const selected=rows.some(r=>r[0]===id)?loaded.get(id):undefined;
 useEffect(()=>{onSelection?.(selected);},[selected,onSelection]);
 const detailScroll=useSelectedDetailScroll(id,!!selected);
 const choose=(id:string)=>{detailScroll.request();setId(id);const index=rows.findIndex(r=>r[0]===id);if(index>=0)setPage(Math.floor(index/12));};
 const change=(set:(v:number)=>void,v:string)=>{const n=Number(v);if(Number.isSafeInteger(n)&&n>=0){set(n);setPage(0);}};
 const displayed=useMemo(()=>new Map([...loaded].map(([id,c])=>[id,orderedConstruction(c,readLimbOrder(c,orderQuery))])),[loaded,orderQuery]);
 const range=(row:Row)=>{const c=loaded.get(row[0]),a=row[13]?.domain_a??c?.integer?.domain.A??c?.encoding_domain,b=row[13]?.domain_b??c?.integer?.domain.B??c?.encoding_domain;const ratio=(v:number[]|undefined,width:number)=>v?((v[1]-v[0]+1)/Number(2n*base13Width(width).radius+1n)).toFixed(2):'?';return <strong data-encoding-range data-range-a={a?.join(',')} data-range-b={b?.join(',')} className={row[5]>reference?'wider-range':''}><MathText tex={`A\\in[${a?.join(',')??'?'}],\\;B\\in[${b?.join(',')??'?'}]`}/>{row[5]>reference&&<span>範囲比 A ×{ratio(a,ma)} / B ×{ratio(b,mb)}</span>}</strong>;};
 const summary=(row:Row)=><>{range(row)}<span>{row[5]}積・面 A {row[6]} / B {extras.has(row[0])?(extras.get(row[0])!.faces_b??'?'):row[7]}</span><MathText tex={`w_{A}=(${displayed.get(row[0])?.weights.A??row[10]}),\\quad w_{B}=(${displayed.get(row[0])?.weights.B??row[11]})`}/><MathText tex={extras.has(row[0])&&extras.get(row[0])!.max_k==null?'K_{\\max}=\\text{未測定}':`K\\le ${row[9]??'\\infty'}`}/><ConstructionDifference c={displayed.get(row[0])} id={row[0]}/></>;
 return <section id="integer-results" className="integer-results" data-list-kind="integer"><h2>CRTを使わない整数構成 <MathText tex={`(M_A,M_B)=(${ma},${mb})`}/></h2>

 <div className="integer-browser"><form name="integer_filters" className="integer-filters" onSubmit={e=>e.preventDefault()}><h3>検索条件</h3><label><input type="checkbox" name="show_worse_than_base13" checked={wider} onChange={e=>{onWider(e.target.checked);setPage(0);}}/>広い入力範囲用の構成も表示(16 積まで)</label><button type="button" name="paper_figure2" onClick={onPaperExample}>論文の図 2 の例</button>
 {([['integer_products_max','積の本数の上限',r,setR],['integer_limbs','両側のリム数',limbs,setLimbs],['integer_planes_max','面の総数の上限',planes,setPlanes],['integer_denominator','復元係数の分母',denominator,setDenominator]] as const).map(([name,label,value,set])=><label key={name}>{label}<input name={name} type="number" min="0" placeholder="—" value={value||''} onChange={e=>change(set,e.target.value)}/></label>)}
 <label>含めたい重み<input name="integer_weight" value={weight} onChange={e=>{setWeight(e.target.value);setPage(0);}}/></label>
 <label><input name="include_mixed" type="checkbox" checked={mixed} onChange={e=>{setMixed(e.target.checked);setPage(0);}}/> 面の格納集合が異なる構成も含める</label>
 <label>許容する非被覆率<input name="integer_hole_pct_max" data-url-key="hole_pct_max" type="number" min="0" max="100" step="any" value={holes.max} onChange={e=>{const v=Number(e.target.value);if(Number.isFinite(v)&&v>=0&&v<=100)holes.onChange(v);}}/>%</label>
 <label>並べ替え<select name="integer_sort" value={sort} onChange={e=>{setSort(e.target.value);setPage(0);}}><option value="products">積数順</option><option value="planes">面数順</option><option value="cost">総費用順</option><option value="range">符号化できる範囲の広い順</option></select></label>
 </form>
 <div className="integer-main">{error&&<p role="alert">{error}</p>}{pending?<p role="status">読込中</p>:<p data-integer-count={rows.length} data-hidden-count={hidden} data-base13-products={reference}>表示 {rows.length}件（隠した {hidden}件）</p>}
 {!pending&&!base.length&&!extras.size&&<div data-integer-unavailable><p>未収録</p><button type="button" name="show_crt_sets" onClick={onShowCRT}>CRT の法の組を見る</button></div>}{!pending&&(base.length>0||extras.size>0)&&!rows.length&&<p>0件</p>}
 <div className="integer-grid" ref={measured.ref}>{pageRows.map(row=><button key={row[0]} name="integer_id" form="visual-actions" type="button" value={row[0]} data-integer-tile={row[0]} data-product-count={row[5]} aria-pressed={id===row[0]} onClick={()=>choose(row[0])}><strong className="integer-selected" style={{visibility:id===row[0]?'visible':'hidden'}}>選択中</strong>{summary(row)}{loaded.has(row[0])&&<ConstructionTile c={loaded.get(row[0])!}/>}</button>)}</div>
 {selected&&<div className="integer-detail" data-selected-detail ref={detailScroll.ref}><Expansion key={selected.id} c={selected}/></div>}
 <form name="integer_paging" className="paper-controls" onSubmit={e=>e.preventDefault()}><button name="integer_previous" type="button" disabled={currentPage===0} onClick={()=>setPage(currentPage-1)}>前</button><label>ページ<input name="integer_page" type="number" min="1" max={pages} value={currentPage+1} onChange={e=>{const n=Number(e.target.value);if(Number.isInteger(n)&&n>=1&&n<=pages)setPage(n-1);}} data-url-offset="-1"/></label><span>/ {pages}</span><button name="integer_next" type="button" disabled={currentPage+1>=pages} onClick={()=>setPage(currentPage+1)}>次</button></form></div>
 <aside className="integer-candidates"><h3>構成の候補</h3>{pageRows.map(row=><button type="button" name="integer_candidate" form="visual-actions" key={row[0]} value={row[0]} aria-pressed={id===row[0]} onClick={()=>choose(row[0])}>{summary(row)}{sort==='cost'&&<span>総費用 {String((extras.has(row[0])?constructionCost(extras.get(row[0])!,dims,cost):integerRowCost(row,dims,cost)).total??'未設定')}</span>}</button>)}</aside></div></section>;
}
