import type { Solution, Side } from './types.ts';

// Browser imports: 1 MiB JSON, 4 limbs, 256 planes, 1024 products,
// 1,000,000 tuples and 2,000,000 domain values per operand.
// A further 20,000,000 coefficient-operation limit bounds worker work.
export const IMPORT_BYTES = 1024 * 1024;
const SAFE = BigInt(Number.MAX_SAFE_INTEGER);
const SIDES: Side[] = ['A', 'B'];
const FIELDS = ['schema_version','kind','weights','limb_sets','planes','plane_sets','products','denominator','domain'];
const OPTIONAL = ['id','widths','coverage','accumulation','verified','provenance'];
const fp8 = new Set<number>([0]);
for (const [lo,hi,step] of [[1,16,1],[18,32,2],[36,64,4],[72,128,8],[144,256,16],[288,448,32]]) {
  for(let n=lo;n<=hi;n+=step) { fp8.add(n); fp8.add(-n); }
}
export const SETS: Record<string,number[]> = {
  '2xE2M1': [-12,-8,-6,-4,-3,-2,-1,0,1,2,3,4,6,8,12],
  E4M3_integer: [...fp8].sort((a,b)=>a-b),
};
const fail = (code:string):never => { throw new Error(code); };
const object = (x:unknown):Record<string,unknown> => {
  if (!x || typeof x!=='object' || Array.isArray(x)) return fail('invalid_object');
  return x as Record<string,unknown>;
};
const keys = (x:Record<string,unknown>, required:string[], optional:string[]=[]) => {
  if (required.some(k=>!Object.hasOwn(x,k)) || Object.keys(x).some(k=>!required.includes(k)&&!optional.includes(k))) fail('invalid_fields');
};
const integer = (x:unknown,lo=-Number.MAX_SAFE_INTEGER,hi=Number.MAX_SAFE_INTEGER):number => {
  if(typeof x!=='number'||!Number.isSafeInteger(x)||x<lo||x>hi) return fail('invalid_integer');
  return Object.is(x,-0)?0:x;
};
const safe = (x:bigint):number => x < -SAFE || x > SAFE ? fail('invalid_integer') : Number(x);
const array = (x:unknown,lo:number,hi:number):unknown[] => {
  if(!Array.isArray(x)||x.length<lo||x.length>hi) return fail('invalid_dimension');
  return x;
};
const storage = (x:unknown):string => typeof x==='string'&&Object.hasOwn(SETS,x)?x:fail('unknown_storage_set');
const abs = (x:bigint)=>x<0n?-x:x;
const gcd = (a:bigint,b:bigint):bigint=> b ? gcd(b,a%b) : abs(a);
// The mathematical payload has only ASCII strings, safe integers and arrays.
// Recursively sorted keys therefore reproduce Python packed(...ensure_ascii=True).
function packed(x:unknown):string {
  if(Array.isArray(x)) return '['+x.map(packed).join(',')+']';
  if(x!==null&&typeof x==='object') return '{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+packed((x as Record<string,unknown>)[k])).join(',')+'}';
  return JSON.stringify(x);
}
function payload(input:unknown):Solution {
  const source=object(input); keys(source,FIELDS,OPTIONAL);
  if(source.schema_version!==1||source.kind!=='integer') fail('unsupported_schema');
  const out={schema_version:1,kind:'integer',denominator:integer(source.denominator,1)} as Solution;
  for(const field of ['weights','limb_sets','planes','plane_sets','domain'] as const) {
    const pair=object(source[field]); keys(pair,['A','B']);
    (out as unknown as Record<string,unknown>)[field]={A:[],B:[]};
  }
  for(const side of SIDES) {
    const at=(k:string)=>object(source[k])[side];
    out.weights[side]=array(at('weights'),1,4).map(x=>integer(x));
    out.limb_sets[side]=array(at('limb_sets'),out.weights[side].length,out.weights[side].length).map(storage);
    out.planes[side]=array(at('planes'),1,256).map(p=> {
      const row=array(p,out.weights[side].length,out.weights[side].length).map(x=>integer(x));
      if(!row.some(Boolean)) fail('invalid_plane'); return row;
    });
    out.plane_sets[side]=array(at('plane_sets'),out.planes[side].length,out.planes[side].length).map(storage);
    out.domain[side]=array(at('domain'),2,2).map(x=>integer(x));
    if(out.domain[side][0]>0||out.domain[side][1]<0) fail('invalid_domain');
  }
  out.products=array(source.products,1,1024).map(p=> {
    const product=object(p);keys(product,['a','b','numerator']);
    return {a:integer(product.a,0,out.planes.A.length-1),b:integer(product.b,0,out.planes.B.length-1),numerator:integer(product.numerator)};
  });
  out.provenance=source.provenance===undefined?[]:array(source.provenance,0,1024).map(p=> {
    const row=object(p);keys(row,['source_sha256','position']);
    if(typeof row.source_sha256!=='string'||! /^[0-9a-f]{64}$/.test(row.source_sha256)) fail('invalid_provenance');
    return {source_sha256:row.source_sha256 as string,position:integer(row.position,1)};
  });
  return out;
}
function canonical(s:Solution):Record<string,unknown> {
  const maps={A:[] as number[],B:[] as number[]},signs={A:[] as number[],B:[] as number[]};
  for(const side of SIDES) {
    const entries=s.planes[side].map((p,i)=> {
      const sign=p.find(x=>x!==0)!>0?1:-1;signs[side].push(sign);
      return {p:p.map(x=>x===0?0:x*sign),set:s.plane_sets[side][i]};
    });
    const ordered=entries.filter((e,i)=>entries.findIndex(f=>packed(e)===packed(f))===i).sort((a,b)=> {
      for(let i=0;i<a.p.length;i++) if(a.p[i]!==b.p[i]) return a.p[i]<b.p[i]?-1:1;
      return a.set<b.set?-1:a.set>b.set?1:0;
    });
    maps[side]=entries.map(e=>ordered.findIndex(f=>packed(e)===packed(f)));
    s.planes[side]=ordered.map(e=>e.p);s.plane_sets[side]=ordered.map(e=>e.set);
  }
  const terms=new Map<string,{a:number;b:number;n:bigint}>();
  for(const p of s.products) {
    const a=maps.A[p.a],b=maps.B[p.b],key=`${a},${b}`;
    const n=BigInt(p.numerator)*BigInt(signs.A[p.a])*BigInt(signs.B[p.b]);
    const old=terms.get(key);terms.set(key,{a,b,n:(old?.n??0n)+n});
  }
  const rows=[...terms.values()].filter(p=>p.n!==0n).sort((a,b)=>a.a-b.a||a.b-b.b);
  if(!rows.length) fail('invalid_products');
  const common=rows.reduce((g,p)=>gcd(g,p.n),BigInt(s.denominator));
  s.denominator=safe(BigInt(s.denominator)/common);
  s.products=rows.map(p=>({a:p.a,b:p.b,numerator:safe(p.n/common)}));
  return Object.fromEntries(FIELDS.map(k=>[k,(s as unknown as Record<string,unknown>)[k]]));
}
function encoding(s:Solution,side:Side):{count:number;maxima:number[]} {
  const w=s.weights[side].map(BigInt),ps=s.planes[side].map(p=>p.map(BigInt));
  const sets=s.limb_sets[side].map(k=>SETS[k]),allowed=s.plane_sets[side].map(k=>new Set(SETS[k].map(BigInt)));
  const tuples=sets.reduce((n,v)=>n*v.length,1);
  if(tuples>1_000_000||tuples*ps.length*w.length>20_000_000) fail('encoding_resource_limit');
  const [lo,hi]=s.domain[side].map(BigInt),size=hi-lo+1n;
  if(size>2_000_000n) fail('domain_resource_limit');
  const seen=new Set<bigint>(),maxima=ps.map(()=>0);
  const t:bigint[]=w.map(()=>0n);
  function visit(depth:number) {
    if(depth<w.length) {for(const x of sets[depth]) {t[depth]=BigInt(x);visit(depth+1);} return;}
    const values=ps.map(p=>p.reduce((n,c,i)=>n+c*t[i],0n));
    if(values.some((v,i)=>!allowed[i].has(v))) return;
    const n=w.reduce((total,c,i)=>total+c*t[i],0n);
    if(n<lo||n>hi||seen.has(n)) return;
    seen.add(n);values.forEach((v,i)=>{maxima[i]=Math.max(maxima[i],safe(abs(v)));});
  }
  visit(0);
  if(BigInt(seen.size)!==size) fail('encoding_missing');
  return {count:seen.size,maxima};
}
export async function verifyImported(input:unknown):Promise<Solution> {
  let raw:string;
  try {raw=JSON.stringify(input);} catch {return fail('invalid_json');}
  if(typeof raw!=='string'||new TextEncoder().encode(raw).length>IMPORT_BYTES) fail('input_resource_limit');
  const s=payload(input),core=canonical(s);
  for(let i=0;i<s.weights.A.length;i++) for(let j=0;j<s.weights.B.length;j++) {
    const sum=s.products.reduce((n,p)=>n+BigInt(p.numerator)*BigInt(s.planes.A[p.a][i])*BigInt(s.planes.B[p.b][j]),0n);
    if(sum!==BigInt(s.denominator)*BigInt(s.weights.A[i])*BigInt(s.weights.B[j])) fail('identity_failed');
  }
  const a=encoding(s,'A');
  const symmetric=['weights','limb_sets','planes','plane_sets','domain'].every(k=> {
    const pair=(s as unknown as Record<string,Record<Side,unknown>>)[k];return packed(pair.A)===packed(pair.B);
  });
  const b=symmetric?a:encoding(s,'B');
  const bounds=s.products.map(p=>safe(BigInt(a.maxima[p.a])*BigInt(b.maxima[p.b]))),maximum=Math.max(...bounds);
  s.accumulation={precision_bits:24,mode:'separate_products',product_bounds:bounds,max_k:maximum?Math.floor(2**24/maximum):null};
  s.coverage={A:Math.min(-s.domain.A[0],s.domain.A[1]),B:Math.min(-s.domain.B[0],s.domain.B[1])};
  s.widths={A:(BigInt(s.coverage.A)+1n).toString(2).length,B:(BigInt(s.coverage.B)+1n).toString(2).length};
  s.verified={method:'exhaustive_encoding_and_bilinear_identity',n_pairs:0,n_pairs_proven:safe(BigInt(a.count)*BigInt(b.count)),date:new Date().toISOString().slice(0,10),verifier_version:'1.0.0'};
  const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(packed(core)));
  s.id='awe1_'+[...new Uint8Array(hash)].map(n=>n.toString(16).padStart(2,'0')).join('');
  return s;
}

export async function workedExample(input:unknown,a:number,b:number){
 const s=await verifyImported(input);const operands={A:integer(a),B:integer(b)};
 const limbs={} as Record<Side,number[]>,faces={} as Record<Side,string[]>;
 for(const side of SIDES){
  const n=operands[side];if(n<s.domain[side][0]||n>s.domain[side][1])fail('operand_outside_domain');
  const sets=s.limb_sets[side].map(k=>SETS[k]),t:number[]=[];let found:number[]|undefined;
  function visit(depth:number):boolean{
   if(depth<sets.length){for(const x of sets[depth]){t[depth]=x;if(visit(depth+1))return true;}return false;}
   if(s.weights[side].reduce((sum,w,i)=>sum+BigInt(w)*BigInt(t[i]),0n)!==BigInt(n))return false;
   const values=s.planes[side].map(p=>p.reduce((sum,c,i)=>sum+BigInt(c)*BigInt(t[i]),0n));
   if(values.some((v,i)=>!SETS[s.plane_sets[side][i]].some(x=>BigInt(x)===v)))return false;
   found=[...t];faces[side]=values.map(String);return true;
  }
  visit(0);if(!found)fail('encoding_missing');limbs[side]=found!;
 }
 const products=s.products.map(p=>BigInt(faces.A[p.a])*BigInt(faces.B[p.b]));
 const numerator=products.reduce((sum,v,k)=>sum+v*BigInt(s.products[k].numerator),0n);
 if(numerator!==BigInt(s.denominator)*BigInt(a)*BigInt(b))fail('example_mismatch');
 return {operands,limbs,planes:faces,products:products.map(String),numerator:String(numerator),denominator:s.denominator,result:String(BigInt(a)*BigInt(b))};
}
