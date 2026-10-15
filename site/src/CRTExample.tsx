import {CRTFlow} from './CRTFlow.tsx';
import {useParameter} from './parameters.ts';
import {MathText} from './PaperFigures.tsx';
import {integer,modulo} from './savedEncoding.ts';
import {constructionPlan,computeMatrix,crt} from './numericExample.ts';
import type {Lane} from './visual.ts';
export function CRTExample({lane,slot,onSelect}:{lane?:Lane;slot:number;onSelect:(slot:number)=>void}){
 const [rawA,setA]=useParameter('crt_a','5',r=>r),[rawB,setB]=useParameter('crt_b','2',r=>r);
 const a=integer(rawA),b=integer(rawB),valid=a!==null&&b!==null;
 const rows=valid&&lane?lane.mods.map(c=>{
  const ra=c.modulus>1?modulo(a,BigInt(c.modulus)):null,rb=c.modulus>1?modulo(b,BigInt(c.modulus)):null;
  try{if(ra===null||rb===null)throw Error('未収録');const plan=constructionPlan(c),value=computeMatrix(plan,[[a]],[[b]]);return {c,ra,rb,value,error:''};}
  catch(e){return {c,ra,rb,error:(e as Error).message,value:undefined};}
 }):[];
 let output:ReturnType<typeof crt>|undefined,error='';
 if(rows.length){try{if(rows.some(r=>r.value?.reconstructed[0][0]===undefined||r.value?.reconstructed[0][0]===null))throw Error('CRT未計算');output=crt(rows.map(r=>r.value!.reconstructed[0][0]!),rows.map(r=>BigInt(r.c.modulus)));}catch(e){error=(e as Error).message;}}
 const chosen=rows[slot],expected=valid?a*b:null;
 return <details data-section="crt-example" className="crt-example" open><summary>CRT：剰余から整数へ復元する</summary>
 <form id="crt_example" name="crt_example" className="paper-controls" onSubmit={e=>e.preventDefault()}><label><MathText tex="A"/><input name="crt_a" inputMode="numeric" value={rawA} onChange={e=>setA(e.target.value)}/></label><label><MathText tex="B"/><input name="crt_b" inputMode="numeric" value={rawB} onChange={e=>setB(e.target.value)}/></label></form>

 {!valid?<p role="alert">整数のみ</p>:!lane?<p role="status">未収録</p>:<>
 <CRTFlow a={a!} b={b!} rows={rows.map(r=>({modulus:r.c.modulus,a:r.ra,b:r.rb,result:r.value?.reconstructed[0][0]??null,products:r.c.products.length}))} selected={slot} result={output?.centered} onSelect={onSelect}/><div className="paper-scroll"><table className="crt-flow"><thead><tr><th>法</th><th>入力の剰余</th><th>符号化表のリム</th><th>面の積から復元</th><th>CRTの係数</th></tr></thead><tbody>{rows.map((r,i)=><tr key={i} data-crt-mod={r.c.modulus} data-construction={r.c.id} data-selected={slot===i}><th><button type="button" form="crt_example" name="crt_slot" value={i} aria-pressed={slot===i} onClick={()=>onSelect(i)}><MathText tex={`\\operatorname{mod}\\;${r.c.modulus}`}/></button></th><td><MathText tex={`A\\mapsto${r.ra??'?'},\\quad B\\mapsto${r.rb??'?'}`}/></td><td>{r.value?<><MathText tex={`a=(${r.value.la.map(m=>m[0][0]).join(',')})`}/><br/><MathText tex={`b=(${r.value.lb.map(m=>m[0][0]).join(',')})`}/></>:<span>{r.error}</span>}</td><td>{r.value?<><MathText tex={`r_{${i}}=${r.value.reconstructed[0][0]??'?'}\\equiv ${r.value.numerator[0][0]}\\cdot ${r.c.denominator}^{-1}\\pmod{${r.c.modulus}}`}/>{!r.value.matches&&<p>不一致</p>}</>:<span>未計算</span>}</td><td>{output?<MathText tex={`e_{${i}}=${output.coefficients[i]}`}/>:<span>未計算</span>}</td></tr>)}</tbody></table></div>
 {chosen?.value&&<div className="crt-selected paper-scroll"><MathText tex={`\\operatorname{mod}\\;${chosen.c.modulus}:\\quad ${chosen.value.products.map((m,i)=>`T_{${i}}=(${chosen.value!.fa[chosen.c.products[i].a][0][0]})(${chosen.value!.fb[chosen.c.products[i].b][0][0]})=${m[0][0]}`).join(',\\quad ')}`}/><br/><MathText tex={`r_{${slot}}\\equiv (${chosen.c.products.map((p,i)=>`(${p.numerator})T_{${i}}`).join('+')})\\cdot ${chosen.c.denominator}^{-1}\\pmod{${chosen.c.modulus}}`}/></div>}
 {error&&<p role="status">{error}</p>}{output&&<div className="crt-reconstruction" data-modulus-product={String(output.P)} data-result={String(output.centered)} data-matches={output.centered===expected}><div className="paper-scroll"><MathText tex={`P=\\prod_{i} p_{i}=${output.P},\\quad e_{i}=\\dfrac{P}{p_{i}}\\left[\\left(\\dfrac{P}{p_{i}}\\right)^{-1}\\bmod p_{i}\\right]`}/></div><div className="paper-scroll"><MathText tex={`C=\\left(\\sum_{i} r_{i} e_{i}\\right)\\bmod P=${output.nonnegative}\\quad\\longrightarrow\\quad C_{\\mathrm{centered}}=${output.centered}`}/></div><p>{output.centered===expected?'一致':'不一致'}<MathText tex={`AB=${expected},\\quad \\Delta=${output.centered-expected!}`}/></p><div className="paper-scroll"><MathText tex={`P ${output.P>2n*(expected!<0n?-expected!:expected!)?'>':'\\le'} 2|AB|=${2n*(expected!<0n?-expected!:expected!)}`}/></div><p>{output.P>2n*(expected!<0n?-expected!:expected!)?'範囲内':'範囲外'}</p></div>}
 </>}
 </details>;
}
