import {useContext} from 'react';
import {DimensionContext} from './Dimensions.tsx';
import {MathText} from './PaperFigures.tsx';
import {nonnegative,type CostSettings} from './cost.ts';
export function CostControls({settings,onChange}:{settings:CostSettings;onChange:(value:CostSettings)=>void}){
 const dimensions=useContext(DimensionContext);
 const units:([keyof CostSettings,string])[]=[['product','積和1回の単価'],['plane','面の読込・生成の単価（加減算を除く）'],['add','加減算1回の単価'],['correction','補正1回の単価'],['frequency','入力対あたりの補正回数'],['modulus','行列積1回・1法の固定費'],['output','1法・出力1要素の費用']];
 const labels:Record<string,string>={product:'積',plane:'面',add:'加減算',correction:'補正',modulus:'法の固定費',output:'法ごとの出力費'};
 return <form name="cost" onSubmit={e=>e.preventDefault()}>
 <div className="paper-controls">{(['m','n','k'] as const).map(key=><label key={key}>{key.toUpperCase()}<input name={`cost_${key}`} type="number" min="1" max="65536" step="1" value={dimensions[key]} onChange={e=>{const n=Number(e.target.value);if(Number.isSafeInteger(n)&&n>0&&n<=65536)dimensions.onSize(key,n);}}/><input aria-label={`${key.toUpperCase()} のスライダー`} name={`cost_${key}_range`} type="range" min="1" max="65536" value={dimensions[key]} onChange={e=>dimensions.onSize(key,Number(e.target.value))}/></label>)}</div>
 <div className="cost-fields">{units.map(([key,label])=><label key={key}>{label}<input name={`cost_${key}`} type="number" min="0" step="any" value={String(settings[key])} onChange={e=>{const v=e.target.value;if(v===''||nonnegative(v)!==null)onChange({...settings,[key]:v});}}/>{String(settings[key])===''&&<span>未設定</span>}</label>)}</div>
 <div className="paper-controls"><label>面を作る加減算 <select name="cost_addition_model" value={settings.additionModel} onChange={e=>onChange({...settings,additionModel:e.target.value as CostSettings['additionModel']})}><option value="unknown">未設定</option><option value="naive">面ごとに計算</option></select></label>
 <label>費用の模型 <select name="cost_model" value={settings.model} onChange={e=>onChange({...settings,model:e.target.value as CostSettings['model']})}><option value="additive">費用を足す</option><option value="max">処理を重ねる（max）</option></select></label></div>
 {settings.model==='max'&&<><div className="cost-fields">{Object.entries(labels).map(([key,label])=><label key={key}>{label}<select name={'cost_stage_'+key} value={settings.stages[key]??'0'} onChange={e=>onChange({...settings,stages:{...settings.stages,[key]:e.target.value}})}><option value="0">重ねない</option>{[1,2,3].map(n=><option key={n} value={n}>実行段階 {n}</option>)}</select></label>)}{['1','2','3'].map(n=><label key={n}>実行段階 {n} の重なり率<input name={'cost_overlap_'+n} type="number" min="0" max="1" step="any" value={settings.overlaps[n]??''} onChange={e=>{const v=e.target.value,x=nonnegative(v);if(v===''||x!==null&&x<=1)onChange({...settings,overlaps:{...settings.overlaps,[n]:v}});}}/></label>)}</div></>}
 <p><MathText tex={'C_{P}=c_{P} rMNK,\\quad C_{F}=c_{F}(f_{A} M+f_{B} N)K,\\quad C_{\\mathrm{correction}}=c_{\\mathrm{correction}}qMNK'}/></p>
 <p><MathText tex={'w^3'}/>：積 ／ <MathText tex={'w^2'}/>：面・加減算・法ごとの出力費</p>
 {settings.model==='max'&&<p><MathText tex={'C_{s}=(1-o_{s})\\sum_{t\\in s}C_{t}+o_{s}\\max_{t\\in s}C_{t}'}/></p>}
 </form>;
}
