import {useMemo,useState} from 'react';
import {bounded,useParameter} from './parameters.ts';
import {kind,type PolarRow} from './polarModel.ts';
import './star-map.css';

export type StarSize='cost'|'products'|'products_per_bit'|'constant';
const MODULUS_BITS=16,TAU=2*Math.PI;
export function starPosition(m:number,period:number,growth:number){
 const bits=Math.log2(m),turn=Math.max(0,Math.ceil(bits/period)-1),turns=Math.ceil(MODULUS_BITS/period);
 const angle=-Math.PI/2+TAU*(bits-turn*period)/period,radius=60+260*Math.pow((turn+.5)/turns,growth);
 return {x:360+radius*Math.cos(angle),y:360+radius*Math.sin(angle),radius,turn,bits};
}
export function starRadius(value:number|null,low:number,high:number){
 if(value===null||!Number.isFinite(value))return 1.6;
 return high<=low?4:1.8+3.7*(1-Math.min(1,Math.max(0,(value-low)/(high-low))));
}
export function StarMap({chosen,costs,savings,colorOf,selected,onSelect,tip,en,sizeMetric,setSizeMetric}:{chosen:Map<number,PolarRow|undefined>;costs:Map<string,number|null>;savings:Map<number,number|null>;colorOf:(r:PolarRow|undefined)=>string;selected:number;onSelect:(m:number)=>void;tip:(m:number)=>string;en:boolean;sizeMetric:StarSize;setSizeMetric:(v:StarSize)=>void}){
 const [period,setPeriod]=useParameter('polar_period_bits',4,s=>bounded(s,1,32,4));
 const [growth,setGrowth]=useParameter('polar_radius_growth',1,s=>bounded(s,.4,2,1));
 const [composites,setComposites]=useParameter<'all'|'saving'>('polar_composites','all',s=>s==='saving'?'saving':'all');
 const [hover,setHover]=useState<number|null>(null),[zoom,setZoom]=useState(1);
 const turns=Math.ceil(MODULUS_BITS/period);
 const metric=(r:PolarRow):number|null=>sizeMetric==='constant'?1:sizeMetric==='products'?r.R:sizeMetric==='products_per_bit'?r.R/Math.log2(r.m):costs.get(r.id)==null?null:costs.get(r.id)!/Math.log2(r.m);
 const allStars=useMemo(()=>[...chosen].filter((v):v is [number,PolarRow]=>!!v[1]).map(([m,r])=>({m,r,...starPosition(m,period,growth),value:metric(r),kind:kind(m)})),[chosen,costs,period,growth,sizeMetric]);
 const stars=allStars.filter(v=>composites==='all'||v.kind!=='composite'||(savings.get(v.m)??0)>0);
 const values=stars.map(v=>v.value).filter((v):v is number=>v!==null&&Number.isFinite(v)).sort((a,b)=>a-b),low=values[0]??0,high=values[Math.floor(Math.max(0,values.length-1)*.95)]??1;
 // Draw the smaller marks first so better-ranked constructions remain selectable.
 const ordered=[...stars].sort((a,b)=>(b.value??Infinity)-(a.value??Infinity)||a.m-b.m);
 const focus=hover??selected,position=starPosition(selected,period,growth),side=720/zoom;
 const x0=zoom===1?0:Math.min(720-side,Math.max(0,position.x-side/2)),y0=zoom===1?0:Math.min(720-side,Math.max(0,position.y-side/2));
 return <div className="star-map">
  <div className="star-controls">
   <label>{en?'Bits per revolution':'一周の bit 数'} <output>{period}</output><input aria-label="polar period bits" type="range" min="1" max="32" step=".25" value={period} onChange={e=>{setPeriod(Number(e.target.value));setZoom(1);}}/></label>
   <label>{en?'Radius growth':'半径の伸び方'} <output>{growth}</output><input aria-label="polar radius growth" type="range" min=".4" max="2" step=".05" value={growth} onChange={e=>{setGrowth(Number(e.target.value));setZoom(1);}}/></label>
   <label className="star-size-label">{en?'Size':'点の大きさ'}<select aria-label="polar size metric" value={sizeMetric} onChange={e=>setSizeMetric(e.target.value as StarSize)}><option value="cost">{en?'Cost / bit':'費用 / bit'}</option><option value="products">{en?'Products':'積の本数'}</option><option value="products_per_bit">{en?'Products / bit':'積 / bit'}</option><option value="constant">{en?'Uniform':'一定'}</option></select></label>
   <label className="star-size-label">{en?'Composites':'合成数'}<select aria-label="polar composites" value={composites} onChange={e=>setComposites(e.target.value as 'all'|'saving')}><option value="all">{en?'All; emphasize fewer products':'全て・積が減る法を強調'}</option><option value="saving">{en?'Fewer than component sum':'成分の和より積が少ない法'}</option></select></label>
  </div>
  <p className="star-description">{en?`${stars.length} / ${allStars.length} published moduli · primes, prime powers and composites`:`公開構成の ${stars.length} / ${allStars.length} 法 · 素数・素数べき・合成数`}</p>
  <div className="star-surface">
   <svg viewBox={`${x0} ${y0} ${side} ${side}`} data-star-chart data-period={period} data-growth={growth} data-stars={stars.length} aria-label={en?'Modulus star map; angle follows log2 of the modulus, radius follows the revolution':'法の星図。角度は法の log2、半径は周回で決まります'}>
    {Array.from({length:turns},(_,turn)=>{const radius=60+260*Math.pow((turn+.5)/turns,growth);return <g key={turn} className="star-ring"><circle cx="360" cy="360" r={radius} fill="none" stroke="#6E6E6E" strokeWidth=".6" opacity=".35"/><text x="366" y={360-radius-8} fontSize="10" fill="#6E6E6E">{turn*period}–{Math.min(16,(turn+1)*period)} bit</text></g>;})}
    {ordered.map(v=>{const composite=v.kind==='composite',saving=savings.get(v.m),dim=composite&&!(saving!==null&&saving!==undefined&&saving>0),unknown=composite&&(saving===null||saving===undefined),radius=dim?1.5:sizeMetric==='constant'?3:starRadius(v.value,low,high),fill=unknown?'#6E6E6E':colorOf(v.r),active=focus===v.m,opacity=dim?.2:sizeMetric==='constant'?.85:.4+.6*(radius-1.6)/3.9;return <g key={v.m} data-star-modulus={v.m} data-kind={v.kind} data-turn={v.turn} data-radius={radius} data-saving={saving??'unknown'} data-value-set={v.r.vs} role="button" tabIndex={0} aria-label={`${en?'Modulus':'法'} ${v.m}`} aria-pressed={selected===v.m} onClick={()=>onSelect(v.m)} onFocus={()=>setHover(v.m)} onBlur={()=>setHover(null)} onPointerEnter={()=>setHover(v.m)} onPointerLeave={()=>setHover(null)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onSelect(v.m);}}}>
     <title>{tip(v.m)}</title><circle cx={v.x} cy={v.y} r={Math.max(4,radius)} fill="transparent"/>
     {v.kind==='prime'?<circle cx={v.x} cy={v.y} r={radius} fill={fill} fillOpacity={opacity}/>:v.kind==='power'?<rect x={v.x-radius} y={v.y-radius} width={radius*2} height={radius*2} fill={fill} fillOpacity={opacity}/>:<path d={`M${v.x},${v.y-radius*1.25}l${radius*1.25},${radius*1.25}l${-radius*1.25},${radius*1.25}l${-radius*1.25},${-radius*1.25}Z`} fill={fill} fillOpacity={opacity}/>}
     {active&&<circle cx={v.x} cy={v.y} r={radius+3} fill="none" stroke="#1A1A1A" strokeWidth="1.4" pointerEvents="none"/>}
    </g>;})}
    <text x="360" y="344" textAnchor="middle" fontSize="12" fill="#6E6E6E">{en?'Modulus':'法'}</text><text x="360" y="372" textAnchor="middle" fontSize="25">{focus}</text><text x="360" y="393" textAnchor="middle" fontSize="11">{Math.log2(focus).toFixed(3)} bit</text>
   </svg>
   {hover!==null&&<pre className="star-tooltip" role="tooltip">{tip(hover)}</pre>}
  </div>
  <div className="star-actions"><button type="button" onClick={()=>setZoom(z=>Math.min(8,z*2))}>{en?'Zoom to selected modulus':'選択した法を拡大'}</button><button type="button" onClick={()=>setZoom(1)}>{en?'Show all':'全体へ'}</button><button type="button" onClick={()=>{setPeriod(4);setGrowth(1);setZoom(1);}}>{en?'Default layout':'既定の配置へ'}</button><span>{zoom}×</span></div>
  <p className="star-description">{en?'Circle: prime · square: prime power · diamond: composite with distinct prime factors. Larger, brighter marks mean a lower selected cost or product count. Unknown costs use the smallest marks.':'丸：素数・四角：素数べき・ひし形：異なる素因数を持つ合成数。選んだ費用や積が小さい法ほど、大きく濃い点になります。費用未確認は最小の点です。'}</p>
  <p className="star-description">{en?'Composites are emphasized only when their minimum product count is below the sum for their coprime prime-power components. Grey composites: a component is unrecorded. CRT reconstruction cost is excluded.':'合成数は、素数べきの成分ごとの最少の積の和より、まとめた積が少ない法を強調します。灰色の合成数は成分が未収録で比較未確認です。CRT の復元費は含みません。'}</p>
  <p className="star-description">{en?'Clockwise angle follows log₂(m) within each revolution. Radius is constant within a revolution. Close moduli can overlap; select a modulus with the input and zoom to inspect it.':'時計回りの角度は各周の log₂(m) に対応し、同じ周では半径が一定です。近い法は重なることがあります。入力欄で法を選び、拡大して確認できます。'}</p>
 </div>;
}
