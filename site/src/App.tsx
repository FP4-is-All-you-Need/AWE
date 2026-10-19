import {PeriodicViews} from './PolarPeriodic.tsx';
import {PeriodicFormatProvider,PeriodicFormatControl} from './PeriodicFormat.tsx';
import {PreviousResearchSection} from './PreviousResearch.tsx';
import {PrimeTable} from './PrimeTable.tsx';
import {primeSets,type PrimeForm} from './primeTable.ts';
import {storedModulusLanes,modulusComparisonLanes} from './modulusLanes.ts';
import {SwapDrawer} from './SwapDrawer.tsx';
import {SameInputsContext} from './SideDetails.tsx';
import {TableOfContents} from './TableOfContents.tsx';
import {useDiagramSizing} from './useDiagramSizing.ts';
import {useParameter} from './parameters.ts';
import {Share} from './Share.tsx';
import {storedConstructions,cleanViewQuery} from './share.ts';
import {CostContext} from './CostContext.tsx';
import {CostControls} from './CostControls.tsx';
import {defaultCostSettings,type CostSettings} from './cost.ts';
import {useAnimatedDetails} from './AnimatedDetails.tsx';
import {LanguageControl,useLanguage} from './i18n.tsx';
import {useEffect,useState,useMemo,useReducer} from 'react';
import {inputReducer,readInputs,writeInputs,mapAction,selectedMapCell} from './InputSelection.ts';
import {read,catalog,search} from './catalog.ts';
import type {Group} from './types.ts';
import {MathText,LawRow,PaperLegend} from './PaperFigures.tsx';
import {INT8,PRECISIONS,connect,pool,holePercent,inFilter,totals,canonicalLane,PAPER_16384,type VisualCatalog,type Lane,type Construction} from './visual.ts';
import {mergeModularCatalogs,type ModularCatalog} from './modular.ts';
import './paper.css';
import {IntegerResults} from './IntegerResults.tsx';
import {PrecisionBands} from './PrecisionBands.tsx';
import {CRTExample} from './CRTExample.tsx';
import {NumericExamples} from './NumericExamples.tsx';
import {EncodingExamples} from './EncodingExamples.tsx';
import {DimensionContext} from './Dimensions.tsx';
import {HoleContext} from './HoleContext.tsx';
import {HoleControl} from './HoleControl.tsx';
import {JointComparison,jointConstruction,type JointRecord} from './JointComparison.tsx';
import {Candidates} from './Candidates.tsx';
import {Expansion} from './Expansion.tsx';
import {FP32Sets} from './FP32Sets.tsx';
import {ModulusSets} from './ModulusSets.tsx';
import {ModularFormsList} from './ModularForms.tsx';
import {SourceFigure} from './SourceFigure.tsx';

export default function App(){return <PeriodicFormatProvider><MainApp/></PeriodicFormatProvider>;}
function MainApp(){
 useAnimatedDetails();useDiagramSizing();
 const english=useLanguage()==='en';
 useEffect(()=>{const q=cleanViewQuery(new URLSearchParams(location.search));history.replaceState(null,'','?'+q.toString()+location.hash);},[]);
 const [imported]=useState(storedConstructions);
 const [integerExample,setIntegerExample]=useState<Construction>();
 const [wider,setWider]=useParameter('show_worse_than_base13',false,r=>r==='1',v=>v?'1':'0');
 const [exampleId,setExampleId]=useParameter('example_construction','selected',r=>r);
 const [data,setData]=useState<VisualCatalog>();const [error,setError]=useState('');
 const query=new URLSearchParams(location.search);
 const [cost,setCost]=useState<CostSettings>(()=>{const c={...defaultCostSettings,stages:{...defaultCostSettings.stages},overlaps:{...defaultCostSettings.overlaps}};for(const key of ['product','plane','add','correction','modulus','output','frequency'] as const)c[key]=query.get('cost_'+key)??'';c.model=query.get('cost_model')==='max'?'max':'additive';c.additionModel=query.get('cost_addition_model')==='naive'?'naive':'unknown';for(const k of Object.keys(c.stages))c.stages[k]=query.get('cost_stage_'+k)??c.stages[k];for(const k of Object.keys(c.overlaps))c.overlaps[k]=query.get('cost_overlap_'+k)??'';return c;});
 useEffect(()=>{const q=new URLSearchParams(location.search);for(const [key,v] of Object.entries(cost)){if(key==='stages'||key==='overlaps'){for(const [k,n] of Object.entries(v))if(n!=='')q.set('cost_'+(key==='stages'?'stage_':'overlap_')+k,n);else q.delete('cost_overlap_'+k);}else {const param='cost_'+(key==='additionModel'?'addition_model':key);if(v!=='')q.set(param,String(v));else q.delete(param);}}history.replaceState(null,'','?'+q.toString());},[cost]);
 const number=(v:string|null,d:number,min:number,max:number)=>v!==null&&/^\d+$/.test(v)&&Number(v)>=min&&Number(v)<=max?Number(v):d;
 const [maxHole,setMaxHole]=useState(()=>{const n=Number(query.get('hole_pct_max')??1);return Number.isFinite(n)&&n>=0&&n<=100?n:1;});
 const [joint,setJoint]=useState<JointRecord[]>([]);useEffect(()=>{read<{references:JointRecord[]}>('visualization/joint-examples.json').then(d=>setJoint(d.references)).catch(e=>setError(e instanceof Error?e.message:String(e)));},[]);
 useEffect(()=>{const q=new URLSearchParams(location.search);q.set('hole_pct_max',String(maxHole));history.replaceState(null,'','?'+q.toString());},[maxHole]);
 const [inputs,dispatchInputs]=useReducer(inputReducer,query,readInputs);
 const {a:bits,b:bitsB,same:sameInputs,precisionA:precision,precisionB}=inputs;
 const widthPair=[bits+1,bitsB+1],mapCell=selectedMapCell(inputs);
 const [autoCRT,setAutoCRT]=useState(false),[integerGroups,setIntegerGroups]=useState<Group[]>();
 useEffect(()=>{catalog().then(search).then(s=>setIntegerGroups(s.groups)).catch(e=>setError(e instanceof Error?e.message:String(e)));},[]);
 useEffect(()=>{if(autoCRT&&integerGroups&&inputs.method==='awe'&&!integerGroups.some(g=>g.width_a>=bits+1&&g.width_b>=bitsB+1)){dispatchInputs({type:'method',value:'crt'});}},[autoCRT,integerGroups,bits,bitsB,inputs.method]);
 const selectWidths=(a:number,b:number)=>{setAutoCRT(true);dispatchInputs({type:'widths',a,b});};
 const setBits=(value:number)=>{setAutoCRT(true);dispatchInputs({type:'bits',side:'A',value});};
 const setBitsB=(value:number)=>{setAutoCRT(true);dispatchInputs({type:'bits',side:'B',value});};
 const setPrecision=(value:string)=>{setAutoCRT(true);dispatchInputs({type:'precision',side:'A',value});};
 const setPrecisionB=(value:string)=>{setAutoCRT(true);dispatchInputs({type:'precision',side:'B',value});};
 const setSameInputs=(value:boolean)=>{setAutoCRT(true);dispatchInputs({type:'same',value});};
 useEffect(()=>{const q=new URLSearchParams(location.search);writeInputs(q,inputs);history.replaceState(null,'','?'+q.toString());},[inputs]);
 const [m,setM]=useState(()=>number(query.get('matrix_m'),8192,1,65536));const [n,setN]=useState(()=>number(query.get('matrix_n'),8192,1,65536));
 const [k,setK]=useState(()=>number(query.get('K')??query.get('k'),8192,1,65536));
 const [modular,setModular]=useState<ModularCatalog>();
 useEffect(()=>{Promise.all([read<ModularCatalog>('modular/catalog.json'),read<ModularCatalog>('modular/powers.json'),read<ModularCatalog>('modular/fp32.json'),read<ModularCatalog>('modular/fp32-history.json')]).then(parts=>setModular(mergeModularCatalogs(parts))).catch(e=>setError(e.message));},[]);
 useEffect(()=>{const q=new URLSearchParams(location.search);q.set('K',String(k));q.set('matrix_m',String(m));q.set('matrix_n',String(n));q.delete('k');history.replaceState(null,'','?'+q.toString());},[k,m,n]);
 useEffect(()=>{const restore=()=>{const q=new URLSearchParams(location.search);dispatchInputs({type:'restore',value:readInputs(q)});setK(number(q.get('K')??q.get('k'),8192,1,65536));};addEventListener('popstate',restore);return()=>removeEventListener('popstate',restore);},[]);
 useEffect(()=>{read<VisualCatalog>('visualization/modsets.json').then(setData).catch(e=>setError(e.message));},[]);
 const connected=useMemo(()=>data&&modular?connect(data,modular):data,[data,modular]);
 const [selection,setSelection]=useState(()=>({view:query.get('view')??'main',slot:number(query.get('slot'),1,-1,100)}));
 const choose=(view:string,slot:number)=>{setSelection({view,slot});const q=new URLSearchParams(location.search);q.set('view',view);q.set('slot',String(slot));history.replaceState(null,'','?'+q.toString());};
 const candidates=useMemo(()=>{const known=connected&&modular?pool(connected,modular):[];return [...new Map([...imported.filter(c=>c.modulus>1),...known].map(c=>[c.id,c])).values()];},[connected,modular,imported]);
 const primeSetHistory=useMemo(()=>primeSets(modular,connected),[modular,connected]);
 const [primeForms,setPrimeForms]=useState<PrimeForm[]>();
 useEffect(()=>{read<{prime_powers:PrimeForm[]}>('modular/forms-index.json').then(i=>setPrimeForms(i.prime_powers)).catch(()=>undefined);},[]);
 const [replacements,setReplacements]=useState<Record<string,Record<number,string>>>(()=>{const out:Record<string,Record<number,string>>={};for(const v of query.getAll('replace')){const [id,slot,c]=v.split(':');if(id&&/^\d+$/.test(slot)&&c)(out[id]??={})[Number(slot)]=c;}return out;});
 const apply=(r:Lane):Lane=>{if(!replacements[r.id])return r;const mods=r.mods.map((m,i)=>candidates.find(c=>c.id===replacements[r.id][i])??m),t=totals(mods,r.bits??bits,r.plan_k??k);return {...r,mods,moduli:mods.map(m=>m.modulus),products:t.products,faces_a:t.facesA,faces_b:t.facesB,k_max:String(t.accMax===null?t.crtMax:t.crtMax<BigInt(t.accMax)?t.crtMax:BigInt(t.accMax)),usage:undefined,tag:'manual'};};
 const rows=(bits===bitsB?connected?.widths.find(w=>w.bits===bits)?.rows??[]:[]).map(apply).filter(r=>r.mods.every(c=>inFilter(c,maxHole)));
 const [modsetId,setModsetId]=useParameter('modset_id','',r=>r);
 const allSavedLanes=useMemo(()=>modular?storedModulusLanes(modular,connected):[],[modular,connected]);
 const allComparisonLanes=useMemo(()=>modulusComparisonLanes(allSavedLanes,connected).filter(l=>l.mods.every(c=>inFilter(c,maxHole))),[allSavedLanes,connected,maxHole]);
 const savedLanes=useMemo(()=>allSavedLanes.filter(l=>(l.bits??0)>=Math.max(bits,bitsB)&&BigInt(l.k_max)>=BigInt(k)&&l.mods.every(c=>inFilter(c,maxHole))),[allSavedLanes,bits,bitsB,k,maxHole]);
 const comparisonRows=rows.length?rows:bits>=20&&bits<=25?allSavedLanes.filter(l=>l.format==='FP32'&&l.mods.every(c=>inFilter(c,maxHole))).map(apply):[];
 const chosenSet=savedLanes.find(l=>l.id===modsetId);
 const a=rows.find(r=>r.lane==='products');
 const savedPaper=bits===bitsB&&bits===53&&k>8192&&modular?canonicalLane(modular,PAPER_16384):undefined;const paperK=savedPaper?apply(savedPaper):undefined;
 const b=chosenSet?apply(chosenSet):paperK??rows.find(r=>r.selection_kind==='measured')??rows.find(r=>r.lane!=='products')??rows[0]??[...savedLanes].sort((a,b)=>a.products-b.products||a.id.localeCompare(b.id))[0];
 if(paperK){paperK.faces_a=paperK.mods.reduce((n,m)=>n+m.faces_a,0);paperK.faces_b=paperK.mods.reduce((n,m)=>n+(m.faces_b??0),0);}
 const comparisonRowsShown=b?(a?[a,b,...rows.filter(r=>r!==a&&r!==b&&(!paperK||r.selection_kind==='model'))]:[b,...comparisonRows.filter(r=>r.id!==b.id)]):[];
 const selectedLane=selection.view==='main'?b:comparisonRows.find(r=>r.id===selection.view);
 useEffect(()=>{if(connected&&modular&&selection.view!=='main'&&!selectedLane)choose('main',0);},[connected,modular,selection.view,selectedLane]);
 const exampleConstructions=useMemo(()=>joint.map(r=>({...jointConstruction(r),additional:{widths:{A:8,B:8}}})),[joint]);
 const integerExtras=useMemo(()=>[...exampleConstructions,...imported.filter(c=>c.modulus===0)],[exampleConstructions,imported]);
 const exampleConstruction=exampleId==='selected'?(inputs.method==='crt'?selectedLane?.mods[selection.slot]:integerExample):exampleConstructions.find(c=>c.id===exampleId);
 const openPaperExample=()=>{const q=cleanViewQuery(new URLSearchParams(location.search));writeInputs(q,inputReducer(inputs,{type:'widths',a:8,b:8,method:'awe',precisionA:'int8',precisionB:'int8'}));for(const key of [...q.keys()])if(key.startsWith('integer_'))q.delete(key);q.set('integer_id',INT8);q.set('K','8192');q.set('example_construction','selected');location.assign('?'+q.toString()+'#integer-results');};
 const swap=(c:Construction)=>{if(!selectedLane)return;const next={...replacements,[selectedLane.id]:{...replacements[selectedLane.id],[selection.slot]:c.id}};setReplacements(next);const q=new URLSearchParams(location.search);q.delete('replace');for(const [row,mods] of Object.entries(next))for(const [slot,id] of Object.entries(mods))q.append('replace',`${row}:${slot}:${id}`);history.replaceState(null,'','?'+q.toString());};
 return <SameInputsContext.Provider value={sameInputs}><CostContext.Provider value={cost}><HoleContext.Provider value={{max:maxHole,onChange:setMaxHole}}><DimensionContext.Provider value={{m,n,k,onSize:(key,v)=>{if(key==='m')setM(v);else if(key==='n')setN(v);else setK(v);}}}><main className="paper-app"><PeriodicFormatControl/><TableOfContents/><form id="visual-actions" name="visual_actions" onSubmit={e=>e.preventDefault()}/>
 <details open data-section="settings" className="settings-section"><summary>入力条件と地図</summary><div className="top-layout"><div className="top-inputs">
  <details open data-section="precision"><summary>精度と入力範囲</summary><form name="selection" className="selection-controls" onSubmit={e=>e.preventDefault()}><div className="paper-controls"><label>精度 <select name="precision" value={precision} onChange={e=>{setPrecision(e.target.value);}}>{Object.entries(PRECISIONS).map(([id,p])=><option key={id} value={id}>{p.label}</option>)}<option value="custom">任意bit (b = {bits})</option></select></label>
  <label><MathText tex={"b"}/> <input aria-label="b スライダー" name="b_range" type="range" min="1" max="256" value={bits} onChange={e=>{setBits(Number(e.target.value));}}/><input aria-label="b 数値" name="b" type="number" min="1" max="256" value={bits} onChange={e=>{if(e.target.value&&Number.isInteger(Number(e.target.value))&&Number(e.target.value)>=1&&Number(e.target.value)<=256){setBits(Number(e.target.value));}}}/></label>
  <label><MathText tex={"K"}/> <input aria-label="K スライダー" name="K_range" type="range" min="0" max="16" step="0.25" value={Math.log2(k)} onChange={e=>setK(Math.round(2**Number(e.target.value)))}/><input aria-label="K 数値" name="K" type="number" min="1" max="65536" value={k} onChange={e=>{if(e.target.value&&Number.isInteger(Number(e.target.value))&&Number(e.target.value)>=1&&Number(e.target.value)<=65536)setK(Number(e.target.value));}}/></label><label>CRT <select name="crt" value={inputs.method==='crt'?'1':'0'} onChange={e=>{setAutoCRT(false);dispatchInputs({type:'method',value:e.target.value==='1'?'crt':'awe'});}}><option value="1">使う</option><option value="0">使わない</option></select></label><LanguageControl/></div><PrecisionBands precision={precision} bits={bits} onSelect={setPrecision}/><div className="paper-controls"><label><input type="checkbox" name="same_inputs" checked={sameInputs} onChange={e=>setSameInputs(e.target.checked)}/> A・B の入力範囲を同じにする</label>{!sameInputs&&<><label>B の精度 <select name="precision_b" value={precisionB} onChange={e=>{setPrecisionB(e.target.value);}}>{Object.entries(PRECISIONS).map(([id,p])=><option key={id} value={id}>{p.label}</option>)}<option value="custom">任意bit (b = {bitsB})</option></select></label><label><MathText tex={"b_{B}"}/><input aria-label="B の b スライダー" type="range" name="b_b_range" min="1" max="256" value={bitsB} onChange={e=>{setBitsB(Number(e.target.value));}}/><input aria-label="B の b 数値" type="number" name="b_b" min="1" max="256" value={bitsB} onChange={e=>{const n=Number(e.target.value);if(Number.isInteger(n)&&n>=1&&n<=256){setBitsB(n);}}}/></label></>}</div></form></details>
 <details data-section="coverage" className="coverage-controls"><summary>許容する非被覆率 {maxHole}%</summary><HoleControl percentages={[...candidates.map(holePercent),...joint.map(r=>100*r.share)]} max={maxHole} onChange={setMaxHole}/></details>
 <details data-section="cost" className="cost-controls"><summary>費用の設定</summary><CostControls settings={cost} onChange={setCost}/></details>
 </div>
 <details open data-section="map" className="map-section"><summary>幅の組の地図 <MathText tex={"M_{A}\\times M_{B}"}/></summary><form name="widths" className="paper-controls" onSubmit={e=>e.preventDefault()}>{[0,1].map(i=><label key={i}><MathText tex={i===0?'M_{A}':'M_{B}'}/><input name={i===0?'input_ma':'input_mb'} type="number" min="2" max="257" value={widthPair?.[i]??bits+1} onChange={e=>{const n=Number(e.target.value);if(Number.isInteger(n)&&n>=2&&n<=257){const pair=widthPair??[bits+1,bits+1];selectWidths(i===0?n:pair[0],i===1?n:pair[1]);}}}/></label>)}</form><p className="map-selection-note">FP32・FP64：地図の札 b、整数幅 b + 1</p><p data-map-caption>{english?'FP4 products · lower right: AWE · upper left: AWE + CRT':'FP4行列積の本数・右下：AWE・左上：AWE + CRT'} <MathText tex={'(M_{B},M_{A})'}/></p>{!mapCell&&<p role="status">未収録</p>}<SourceFigure name="figure4" label="図4：正方セルの幅の組の地図" selectedCell={mapCell} onCell={(row,column)=>{setAutoCRT(false);const action=mapAction(row,column);dispatchInputs(row===column?{...action,method:inputs.method} as typeof action:action);}} holeCandidates={joint.filter(r=>r.share*100<=maxHole).length}/><p>8×8：穴あり {joint.filter(r=>r.share*100<=maxHole).length}件</p></details>
 </div></details>
 {inputs.method==='awe'&&<IntegerResults onShowCRT={()=>{setAutoCRT(false);dispatchInputs({type:'method',value:'crt'});}} wider={wider} onWider={setWider} onPaperExample={openPaperExample} ma={widthPair[0]} mb={widthPair[1]} onSelection={setIntegerExample} extra={integerExtras}/>}
  <div className="workspace"><div className="workspace-main">
  {error&&<p role="alert">{error}</p>}
  {!data&&!error&&<p>読込中</p>}
  {inputs.method==='crt'&&<>{modular?.fp32_groups&&bits>=20&&bits<=25&&<FP32Sets catalog={modular} selected={chosenSet?.id??''} onSelect={id=>{const s=modular.sets.find(s=>s.id===id)!;dispatchInputs({type:'widths',a:s.magnitude_bits+1,b:s.magnitude_bits+1,method:'crt'});setK(s.k);setModsetId(id);choose('main',0);}}/>}<ModulusSets lanes={savedLanes} selected={chosenSet?.id??''} onSelect={id=>{setModsetId(id);choose('main',0);requestAnimationFrame(()=>document.querySelector('.paper-lane')?.scrollIntoView({block:'start'}));}}/>
  {data&&!rows.length&&!b&&<p>未収録{bits!==bitsB&&<MathText tex={`(b_{A},b_{B})=(${bits},${bitsB})`}/>}</p>}
  {b&&<details data-section="main" open className="paper-lane" aria-label={`${bits} bit の既定の組`}><summary><h1>{english?`${bits}-bit ${b.tag==='manual'?'user-created set':paperK?'paper set':b.selection_kind==='measured'?'set selected by measurement':'saved set'}`:<>{bits} bit　{b.tag==='manual'?'利用者が作った組':paperK?'論文の組':b.selection_kind==='measured'?'実測で選ばれた組':'保存された組'}</>}　{b.mods.length}法・{b.products}積 <span>面 A {b.faces_a} / B {b.faces_b}　<MathText tex={`K\\le ${b.k_max}`}/></span></h1></summary><LawRow lane={{...b,bits}} other={a} groups={!paperK&&b.tag!=='manual'} selected={selection.view==='main'?selection.slot:-1} onSelect={slot=>choose('main',slot)} detail={selection.view==='main'&&b.mods[selection.slot]&&<Expansion key={b.mods[selection.slot].id} c={b.mods[selection.slot]}/>}/>{(k>Number(b.k_max)||k>(b.plan_k??8192))&&<p role="status">K範囲外</p>}{b.usage&&<p data-set-usage>{b.usage.some(e=>e.state==='measured')?'測定で使用':b.usage.some(e=>e.state==='build_only')?'コンパイル済・実行未確認':'未確認'}</p>}<PaperLegend/></details>}
  </>}{inputs.method==='crt'&&<>
  <details data-section="tile-controls"><summary>比較する組と構成を選ぶ</summary><form name="tile" className="paper-controls" onSubmit={e=>e.preventDefault()}><label>比較する組 <select name="view" value={selection.view} onChange={e=>choose(e.target.value,0)}><option value="main">既定</option>{comparisonRows.map(r=><option key={r.id} value={r.id}>{r.format?`${r.format} · ${r.bits} bit · K ${r.plan_k} · `:''}{r.format==='FP32'?(english?'saved set':'保存された組'):r.selection_kind==='products'?'収録した組の最少積':r.selection_kind==='measured'?'実測で選ばれた組':r.tag==='beyond_2x2'?'大きいリム格子を含む組':'費用模型で選んだ組（2×2まで）'} / {r.products}積</option>)}</select></label><label>構成の番号 <input type="number" name="slot" min="0" max={Math.max(0,(selectedLane?.mods.length??0)-1)} value={selection.slot} onChange={e=>{const n=Number(e.target.value);if(Number.isInteger(n)&&n>=0&&n<(selectedLane?.mods.length??0))choose(selection.view,n);}}/></label></form></details>
  {b&&comparisonRows.length>0&&<details data-section="comparison" open className="paper-comparison" aria-label="保存された組の比較"><summary><h2>{bits} bit の比較</h2></summary>{comparisonRowsShown.map((r,i)=><details key={r.id} data-section={'comparison-lane.'+r.id} open={r.selection_kind==='products'||r.tag==='beyond_2x2'} data-comparison-lane={r.id} data-bits={r.bits} data-moduli-count={r.mods.length}><summary><h3>({String.fromCharCode(97+i)}) {!a?`${r.format??''} ${r.bits} bit · ${english?'saved set':'保存された組'}`:r.tag==='manual'?'利用者が作った組':i>1?(r.tag==='beyond_2x2'?'大きいリム格子を含む組':'費用模型で選んだ組（2×2まで）'):r===a?'収録した組の最少積':paperK?'論文の組':b.selection_kind==='measured'?'実測で選ばれた組':(r.tag==='beyond_2x2'?'大きいリム格子を含む組':'費用模型で選んだ組（2×2まで）')}　{r.mods.length}法・{r.products}積　面 A {r.faces_a} / B {r.faces_b}　<MathText tex={`K\\le ${r.k_max}`}/></h3></summary><LawRow lane={r} other={r===a?b:a} groups={k<=8192&&r.tag!=='manual'} selected={selection.view===r.id?selection.slot:-1} onSelect={slot=>choose(r.id,slot)} detail={selection.view===r.id&&r.mods[selection.slot]&&<Expansion key={r.mods[selection.slot].id} c={r.mods[selection.slot]}/>}/></details>)}</details>}
  </>}<PrimeTable comparisonLanes={inputs.method==='crt'?allComparisonLanes:[]} selectedConstruction={inputs.method==='crt'?selectedLane?.mods[selection.slot]:undefined} sets={primeSetHistory} records={candidates} lane={inputs.method==='crt'?selectedLane:undefined} forms={primeForms}/><PeriodicViews/><ModularFormsList/><JointComparison records={joint}/><form name="example_selection" className="paper-controls" onSubmit={e=>e.preventDefault()}><label>数値例の構成 <select name="example_construction" value={exampleId} onChange={e=>setExampleId(e.target.value)}><option value="selected">一覧で選んだ構成</option>{exampleConstructions.map(c=><option key={c.id} value={c.id}>符号化表（LUT） ({c.weights.A.join(',')}) / {c.id}</option>)}</select></label></form><EncodingExamples selected={exampleConstruction}/>
  <details data-section="steps" className="paper-source-plots" open><summary>幅ごとの積の本数（論文の図3）</summary><SourceFigure name="figure3" label="図3：幅ごとの本数の階段" selectedWidth={widthPair?.[0]??bits+1} onWidth={w=>{dispatchInputs({type:'widths',a:w,b:w,method:'awe'});requestAnimationFrame(()=>document.querySelector('.integer-results')?.scrollIntoView());}}/></details><NumericExamples selected={exampleConstruction}/><CRTExample lane={inputs.method==='crt'?selectedLane:undefined} slot={selection.slot} onSelect={slot=>choose(selection.view,slot)}/><Share constructions={[...candidates,...joint.map(jointConstruction)]} imported={imported}/>

 </div>{inputs.method==='crt'&&selectedLane&&selection.slot>=0&&<SwapDrawer><Candidates wider={wider} onWider={setWider} lane={selectedLane} slot={selection.slot} candidates={candidates} bits={selection.view==='main'?bits:selectedLane.bits??bits} k={selection.view==='main'?k:selectedLane.plan_k??k} onSwap={swap}/></SwapDrawer>}</div>
 <PreviousResearchSection/></main></DimensionContext.Provider></HoleContext.Provider></CostContext.Provider></SameInputsContext.Provider>;
}
