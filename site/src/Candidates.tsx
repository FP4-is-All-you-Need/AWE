import {useLanguage} from './i18n.tsx';
import {base13ModProducts,withinReference} from './base13Reference.ts';
import {useParameter,bounded} from './parameters.ts';
import {CostContext} from './CostContext.tsx';
import {DimensionContext} from './Dimensions.tsx';
import {constructionCost} from './cost.ts';
import {useState,useContext} from 'react';
import {HoleContext} from './HoleContext.tsx';
import {MathText} from './PaperFigures.tsx';
import {conflicts,factors,holeLabel,holePercent,inFilter,totals,type Construction,type Lane} from './visual.ts';
export function Candidates({lane,slot,candidates,bits,k,onSwap,wider,onWider}:{lane:Lane;slot:number;candidates:Construction[];bits:number;k:number;onSwap:(c:Construction)=>void;wider:boolean;onWider:(v:boolean)=>void}){
 const [prime,setPrime]=useParameter('prime',0,r=>bounded(r,0,100000,0)),[same,setSame]=useParameter('same_modulus',true,r=>r!=='0',v=>v?'1':'0');const {max:maxHole}=useContext(HoleContext);
 const cost=useContext(CostContext),dimensions=useContext(DimensionContext),enabled=Object.values(cost).some(v=>typeof v==='string'&&v!==''&&v!=='unknown'&&v!=='additive'&&v!=='max');
 const estimate=(c:Construction)=>constructionCost(c,dimensions,cost),en=useLanguage()==='en';
 const totalLabel=(c:Construction)=>{const value=estimate(c);if(value.total!==null)return value.total.toLocaleString('en-US',{maximumSignificantDigits:6});return value.unknown.some(r=>r?.includes('未計算'))?(en?'not computed':'未計算'):value.unknown.some(r=>r?.includes('未確認'))?(en?'unknown':'未確認'):(en?'not set':'未設定');};
 const current=lane.mods[slot];if(!current)return null;
 const used=[...new Set(lane.mods.flatMap(c=>factors(c.modulus).map(f=>f.prime)))].sort((a,b)=>a-b);
 const available=candidates.filter(c=>c.id!==current.id&&(!same||c.modulus===current.modulus)&&(!prime||factors(c.modulus).some(f=>f.prime===prime))&&inFilter(c,maxHole));
 const filtered=available.filter(c=>withinReference(c.products.length,base13ModProducts(c.modulus),wider));
 const min=Math.min(...filtered.filter(c=>!conflicts(lane.mods,slot,c).length).map(c=>c.products.length));
 const tier=(c:Construction)=>enabled?(estimate(c).total===null?'未設定':'総費用順'):holePercent(c)===null?'率未測定':(holePercent(c)??0)>0||c.carry||c.block_shift?'穴・補正あり':c.products.length===min?'積数最少':'穴なし';
 const allPrimes=[...new Set(candidates.flatMap(c=>factors(c.modulus).map(f=>f.prime)))].sort((a,b)=>a-b);
 return <aside className="candidates"><h2><MathText tex={`\\mathrm{mod}\\;${current.modulus}`}/> の入れ替え候補</h2><form name="candidates" onSubmit={e=>e.preventDefault()}><p>使用中の素因数</p><p className="prime-list">{used.map(p=><button type="button" name="prime" value={p} key={p} aria-pressed={prime===p} onClick={()=>setPrime(prime===p?0:p)}>{p}</button>)}</p>
 <label><input type="checkbox" name="show_worse_than_base13" checked={wider} onChange={e=>onWider(e.target.checked)}/>広い入力範囲用の構成も表示(16 積まで)</label><p data-candidate-count={filtered.length} data-hidden-count={available.length-filtered.length}>表示 {filtered.length}件（隠した {available.length-filtered.length}件）</p><label><input type="checkbox" name="same_modulus" checked={same} onChange={e=>setSame(e.target.checked)}/> 同じ法に限る</label>
 <label>素因数 <select name="prime" value={prime} onChange={e=>setPrime(Number(e.target.value))}><option value="0">すべて</option>{allPrimes.map(p=><option key={p}>{p}</option>)}</select></label></form>
 <p>許容する非被覆率 {maxHole}%</p>
 {(enabled?['総費用順','未設定']:['積数最少','穴なし','穴・補正あり','率未測定']).map(label=>{const list=filtered.filter(c=>tier(c)===label).sort((a,b)=>(enabled?(estimate(a).total??Infinity)-(estimate(b).total??Infinity):0)||a.products.length-b.products.length||a.modulus-b.modulus||a.id.localeCompare(b.id));if(!list.length)return null;return <details data-section={'candidates.'+(label==='穴なし'?'完全':label)} open key={label}><summary>{label}：{list.length}</summary>{list.map(c=>{const collision=conflicts(lane.mods,slot,c),mods=lane.mods.map((old,i)=>i===slot?c:old),sum=totals(mods,bits,k),factorization=factors(c.modulus),composite=factorization.length>1||factorization.some(f=>f.exponent>1);return <div key={c.id} className="candidate" data-candidate={c.id} data-product-count={c.products.length} data-base13-products={base13ModProducts(c.modulus)}><MathText tex={`\\mathrm{mod}\\;${c.modulus}${composite?' = '+factorization.map(f=>f.exponent===1?f.prime:`${f.prime}^{${f.exponent}}`).join('\\cdot'):''}`}/><p>重み <MathText tex={'('+c.weights.A.join(',')+')'}/> / <MathText tex={'('+c.weights.B.join(',')+')'}/></p><p>{Number((c.canonical?.measurement?.bits??Math.log2(c.modulus)).toFixed(3))} bit · {c.products.length}積・面 A {c.faces_a} / B {c.faces_b??'?'}・穴 {holeLabel(c)}</p><p>入替え後 {sum.products}積・面 {sum.facesA} / {sum.facesB??'?'}</p>{collision.length>0?<p>共通の素因数：{collision.map(x=>`${x.prime}（法${x.modulus}）`).join('、')}</p>:!sum.crtOK?<p>法の積が不足</p>:null}<p data-no-i18n data-cost-total={estimate(c).total??'unknown'}>{en?'Cost: ':'費用：'}{totalLabel(c)}</p><button type="button" form="visual-actions" name="replacement_id" value={c.id} disabled={collision.length>0} onClick={()=>onSwap(c)} aria-label={`法 ${c.modulus} の ${c.products.length}積へ入れ替え`}>入れ替え</button></div>;})}</details>;})}
 {!filtered.length&&<p>未収録</p>}
 </aside>;
}
