import {factors} from './visual.ts';
import {PRIME_COLORS} from './primeColors.ts';
import {textInk,whiteFill} from './compact.ts';
export function PrimeFactors({m,onSelect}:{m:number;onSelect?:(m:number)=>void}){
 return <span className="polar-factors">{factors(m).map(f=>{
  const base=PRIME_COLORS.get(f.prime)??'#6E6E6E',background=whiteFill(base,.30);
  const style={color:textInk(base,background),background,border:`1px solid ${base}`,borderRadius:4,padding:'2px 5px'};
  const label=<>{f.prime}{f.exponent>1&&<sup>{f.exponent}</sup>}</>;
  return onSelect?<button type="button" key={f.prime} data-prime={f.prime} data-prime-color={base} style={style} onClick={()=>onSelect(f.prime**f.exponent)}>{label}</button>:<span key={f.prime} data-prime={f.prime} data-prime-color={base} style={style}>{label}</span>;
 })}</span>;
}
