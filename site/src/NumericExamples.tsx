import {PreviousResearch} from './PreviousResearch.tsx';
import {useEffect,useState} from 'react';
import {read} from './catalog.ts';
import {MathText} from './PaperFigures.tsx';
import {NumericMatrixFigure} from './NumericMatrixFigure.tsx';
import {useParameter} from './parameters.ts';
import type {Construction} from './visual.ts';
import type {EncodingTable} from './savedEncoding.ts';
import {base13Plan,constructionPlan,computeMatrix,parseMatrix,MatrixInputError,type Matrix,type Plan} from './numericExample.ts';

type Example={source_sha256:string;source_page:number;printed_slide:number;A:number[][];B:number[][];product:number[][]};
export const matrixTex=(m:(bigint|null)[][])=>`\\begin{bmatrix}${m.map(r=>r.map(v=>v===null?'?':String(v)).join('&')).join('\\\\')}\\end{bmatrix}`;
function MatrixDiagram({plan,a,b,kind,c}:{plan:Plan;a:Matrix;b:Matrix;kind:string;c?:Construction}){
 const [index,setIndex]=useParameter('example_product_'+kind,0,Number),selected=Number.isInteger(index)&&index>=0&&index<plan.products.length?index:0;
 let result:ReturnType<typeof computeMatrix>;
 try{result=computeMatrix(plan,a,b);}catch(e){return <p role="alert" className="matrix-input-error">{e instanceof MatrixInputError&&<><MathText tex={`${e.side}_{${e.row},${e.column}}=${e.value}`}/>{' — '}</>}{(e as Error).message}{e instanceof MatrixInputError&&e.range&&<> <MathText tex={`[${e.range[0]},${e.range[1]}]`}/></>}</p>;}
 return <div data-matrix-diagram={kind} data-construction={plan.id}>
 <NumericMatrixFigure plan={plan} result={result} kind={kind} selected={selected} onSelect={setIndex} c={c}/>
 <div className="numeric-row paper-scroll numeric-reconstruction" data-result={result.reconstructed.map(r=>r.map(String).join(',')).join(';')} data-matches={result.matches}><MathText tex={`C=${plan.modulus?matrixTex(result.reference)+"\\equiv ":""}${matrixTex(result.reconstructed)}${plan.modulus?`\\pmod{${plan.modulus}}`:""}`}/></div>
 <p>{result.matches?'一致':'不一致'}<MathText tex={`\\Delta=${matrixTex(result.residual)}`}/></p>
 </div>;
}
function InputBounds({plan,side}:{plan?:Plan;side:'A'|'B'}){
 const range=plan?.inputRanges?.[side];
 return <div data-input-range={side}>{range?<><span>入力の範囲</span> <MathText tex={`[${range[0]},${range[1]}]`}/></>:plan?.modulus?<><MathText tex={`\\operatorname{mod}\\;${plan.modulus}`}/> <span>整数は10進数で、符号を除き100文字までです。</span></>:<span>入力の範囲は未収録</span>}</div>;
}
export function NumericExamples({selected}:{selected?:Construction}){
 const [source,setSource]=useState<Example>(),[tables,setTables]=useState<EncodingTable[]>(),[error,setError]=useState('');
 useEffect(()=>{Promise.all([read<Example>('visualization/numeric-example.json'),read<{tables:EncodingTable[]}>('visualization/encoding-examples.json')]).then(([s,t])=>{setSource(s);setTables(t.tables);}).catch(e=>setError(e instanceof Error?e.message:String(e)));},[]);
 const [rawA,setA]=useParameter<string|null>('example_matrix_a',null,r=>r,v=>v??''),[rawB,setB]=useParameter<string|null>('example_matrix_b',null,r=>r,v=>v??'');
 const [method,setMethod]=useParameter('example_encoding','min_nonzero',r=>r);
 if(error)return <p role="alert">{error}</p>;if(!source||!tables)return <p>読込中</p>;
 const format=(m:number[][])=>m.map(r=>r.join(' ')).join('\n'),ta=rawA??format(source.A),tb=rawB??format(source.B),table=tables.find(t=>t.method===method)??tables[0];
 let a:Matrix|undefined,b:Matrix|undefined,message='';try{a=parseMatrix(ta);b=parseMatrix(tb);if(a[0].length!==b.length)throw Error('次元不一致');}catch(e){message=(e as Error).message;}
 const basePlan=base13Plan(table);
 let plan:Plan|undefined,planError='';if(selected)try{plan=constructionPlan(selected);}catch(e){planError=(e as Error).message;}
 return <details data-section="numeric-matrix" className="numeric-examples" open><summary>AWE の行列の例</summary>

 <p className="matrix-input-limits">行列の各辺は1〜4。表せない整数は穴として表示します。</p>
 <form name="numeric_matrix" className="paper-controls" onSubmit={e=>e.preventDefault()}><div className="matrix-input"><label><MathText tex="A"/><textarea name="example_matrix_a" rows={3} value={ta} onChange={e=>setA(e.target.value)}/></label><InputBounds plan={plan} side="A"/></div><div className="matrix-input"><label><MathText tex="B"/><textarea name="example_matrix_b" rows={3} value={tb} onChange={e=>setB(e.target.value)}/></label><InputBounds plan={plan} side="B"/></div><button type="button" name="example_reset" value="1" onClick={()=>{setA(format(source.A));setB(format(source.B));}}>既定の行列へ戻す</button></form>
 {message?<p role="alert">{message}</p>:a&&b&&<><h3>AWE — 選択中の構成</h3>{plan?<MatrixDiagram plan={plan} a={a} b={b} kind="awe" c={selected}/>:<p>{planError||'未選択'}</p>}</>}
 <PreviousResearch slot="matrix"><details data-section="base13-matrix" open><summary>基数13の行列の例</summary><p className="matrix-input-limits">行列の各辺は1〜4。表せない整数は穴として表示します。</p><form className="paper-controls" onSubmit={e=>e.preventDefault()}><div className="matrix-input"><label>A<textarea name="base13_matrix_a" rows={3} value={ta} onChange={e=>setA(e.target.value)}/></label><InputBounds plan={basePlan} side="A"/></div><div className="matrix-input"><label>B<textarea name="base13_matrix_b" rows={3} value={tb} onChange={e=>setB(e.target.value)}/></label><InputBounds plan={basePlan} side="B"/></div><label>選び方 <select name="example_encoding" value={method} onChange={e=>setMethod(e.target.value)}>{tables.map(t=><option key={t.method} value={t.method}>{t.method==='min_nonzero'?'非零リムが少ない順':'剰余の代表を固定'}</option>)}</select></label></form>{message?<p role="alert">{message}</p>:a&&b&&<MatrixDiagram plan={basePlan} a={a} b={b} kind="base13"/>}</details></PreviousResearch>
 </details>;
}
