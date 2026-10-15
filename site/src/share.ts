import type {Construction} from './visual.ts';
export function cleanViewQuery(query:URLSearchParams){const q=new URLSearchParams(query);for(const key of [...q.keys()])if(key==='open.int8-comparison'||/^(open\.)?compare\.(int8|selected)\./.test(key))q.delete(key);if(q.get('section')==='int8-comparison')q.delete('section');return q;}
export const IMPORT_KEY='awe.imported.constructions.v1';
export type Rejected={line:number;reason:string;raw:unknown};
export const REJECTED_KEY='awe.imported.rows.v1';
export function portable(c:Construction){
 const encoding=c.saved_encoding??(c.canonical?{A:Object.fromEntries(c.canonical.encoding.A.flatMap((v,i)=>v?[[i,v]]:[])),B:Object.fromEntries(c.canonical.encoding.B.flatMap((v,i)=>v?[[i,v]]:[]))}:undefined);
 return {additional:c.additional??{},plane_moduli:c.plane_moduli,limbs_stored:c.limbs_stored,id:c.id,modulus:c.modulus,weights:c.weights,planes:c.planes,products:c.products,denominator:c.denominator,shape:c.shape,faces_a:c.faces_a,faces_b:c.faces_b,holes:c.holes,carry:c.carry,block_shift:c.block_shift,correction:c.correction??null,source_sha256:c.source_sha256,saved_encoding:encoding??null,encoding_domain:c.encoding_domain??null,hole_values:c.hole_values??null,max_k:c.max_k??null};
}
const integer=(n:unknown)=>typeof n==='number'&&Number.isSafeInteger(n);
const vector=(v:unknown,n?:number):v is number[]=>Array.isArray(v)&&v.length>0&&v.length<=32&&(n===undefined||v.length===n)&&v.every(integer);
function parseConstruction(raw:any):Construction{
 if(!raw||typeof raw!=='object'||!integer(raw.modulus)||raw.modulus<0||!integer(raw.denominator)||raw.denominator<=0)throw Error('Invalid modulus or denominator');
 if(!vector(raw.weights?.A)||!vector(raw.weights?.B))throw Error('Invalid limb weights');
 if(raw.planes!==null&&(!raw.planes||!['A','B'].every(s=>Array.isArray(raw.planes[s])&&raw.planes[s].length>0&&raw.planes[s].length<=256&&raw.planes[s].every((p:unknown)=>vector(p,raw.weights[s].length)))))throw Error('Invalid planes');
 if(!Array.isArray(raw.products)||!raw.products.length||raw.products.length>4096||raw.products.some((p:any)=>!p||!integer(p.a)||!integer(p.b)||p.a<0||p.b<0||raw.planes&&(p.a>=raw.planes.A.length||p.b>=raw.planes.B.length)||p.numerator!==null&&!integer(p.numerator)||p.group!==null&&(!integer(p.group)||p.group<0)))throw Error('Invalid products or reconstruction coefficients');
 if(!integer(raw.faces_a)||raw.faces_a<0||raw.faces_b!==null&&(!integer(raw.faces_b)||raw.faces_b<0))throw Error('Invalid plane counts');
 if(!raw.holes||raw.holes.share!==null&&(typeof raw.holes.share!=='number'||!Number.isFinite(raw.holes.share)||raw.holes.share<0||raw.holes.share>1)||raw.holes.count!==null&&(!integer(raw.holes.count)||raw.holes.count<0))throw Error('Invalid hole measurements');
 if(typeof raw.carry!=='boolean'||typeof raw.block_shift!=='boolean')throw Error('Missing correction attributes');
 if(raw.saved_encoding!=null)for(const s of ['A','B']){const table=raw.saved_encoding[s];if(!table||typeof table!=='object'||Array.isArray(table)||Object.keys(table).length>65536||Object.entries(table).some(([x,v])=>!/^[-]?\d+$/.test(x)||!vector(v,raw.weights[s].length)))throw Error('Invalid saved encoding');}
 if(raw.hole_values!=null&&(!Array.isArray(raw.hole_values)||raw.hole_values.length>65536||!raw.hole_values.every(integer)))throw Error('Invalid hole values');
 if(raw.encoding_domain!=null&&(!Array.isArray(raw.encoding_domain)||raw.encoding_domain.length!==2||!raw.encoding_domain.every(integer)||raw.encoding_domain[0]>raw.encoding_domain[1]))throw Error('Invalid input domain');
 if(raw.correction!=null&&(typeof raw.correction.kind!=='string'||raw.correction.max_abs_shift!==undefined&&(!integer(raw.correction.max_abs_shift)||raw.correction.max_abs_shift<0)))throw Error('Invalid correction record');
 for(const field of ['plane_moduli','limbs_stored'])if(raw[field]!==undefined&&!['A','B'].every(s=>Array.isArray(raw[field][s])&&raw[field][s].length===(field==='plane_moduli'?raw.planes?.[s]?.length:raw.weights[s].length)&&raw[field][s].every((v:unknown)=>field==='plane_moduli'?integer(v)&&Number(v)>0&&raw.modulus%Number(v)===0:typeof v==='boolean')))throw Error('Invalid storage constraints');
 const fields=new Set(['plane_moduli','limbs_stored','additional','id','modulus','weights','planes','products','denominator','shape','faces_a','faces_b','holes','carry','block_shift','source_sha256','correction','saved_encoding','encoding_domain','hole_values','max_k']);const additional={...raw.additional,...Object.fromEntries(Object.entries(raw).filter(([k])=>!fields.has(k)))};
 return {additional,plane_moduli:raw.plane_moduli,limbs_stored:raw.limbs_stored,id:typeof raw.id==='string'?raw.id:'',modulus:raw.modulus,denominator:raw.denominator,weights:raw.weights,planes:raw.planes,products:raw.products,shape:typeof raw.shape==='string'?raw.shape:'',faces_a:raw.faces_a,faces_b:raw.faces_b,holes:raw.holes,carry:raw.carry,block_shift:raw.block_shift,source_sha256:typeof raw.source_sha256==='string'?raw.source_sha256:'',correction:raw.correction??undefined,saved_encoding:raw.saved_encoding??undefined,encoding_domain:raw.encoding_domain??undefined,hole_values:raw.hole_values??undefined,max_k:integer(raw.max_k)&&raw.max_k>=0?raw.max_k:null};
}
const stable=(value:any):string=>JSON.stringify(value===undefined?null:value===null||typeof value!=='object'?value:Array.isArray(value)?value.map(v=>JSON.parse(stable(v))):Object.fromEntries(Object.keys(value).filter(k=>value[k]!==undefined).sort().map(k=>[k,JSON.parse(stable(value[k]))])));
const signature=(c:Construction)=>{const {id,source_sha256,...value}=portable(c);return stable(value);};
export function records(constructions:Construction[],query=location.search,rejected:Rejected[]=[]){return [{type:'awe_view',version:1,query:[...cleanViewQuery(new URLSearchParams(query))]},...constructions.map(c=>({type:'construction',value:portable(c)})),...rejected.map(r=>({type:'retained_row',...r}))];}
export async function decode(text:string,known:Construction[]){
 if(new TextEncoder().encode(text).length>8*1024*1024)throw Error('File exceeds 8 MB');
 let rows:any[];try{const parsed=JSON.parse(text);rows=Array.isArray(parsed)?parsed:parsed.records??[parsed];}catch{rows=text.split(/\r?\n/).filter(s=>s.trim()).map(line=>{try{return JSON.parse(line);}catch{return {type:'invalid_json',raw:line};}});}
 if(!Array.isArray(rows)||rows.length>5000)throw Error('Too many records (max 5,000)');
 const bySignature=new Map(known.map(c=>[signature(c),c]));const seen=new Set<string>(),constructions:Construction[]=[],rejected:Rejected[]=[],aliases=new Map<string,string>();let query:URLSearchParams|undefined,duplicates=0;
 for(const [i,row] of rows.entries()){
  if(row?.type==='awe_view'){
   if(row.version===1&&Array.isArray(row.query)&&row.query.length<=1000&&row.query.every((p:any)=>Array.isArray(p)&&p.length===2&&p.every((s:any)=>typeof s==='string'&&s.length<=2048)))query=new URLSearchParams(row.query);else rejected.push({line:i+1,raw:row,reason:'Invalid display settings'});continue;
  }
  if(row?.type==='retained_row'){rejected.push({line:i+1,raw:row.raw,reason:String(row.reason)});continue;}
  if(row?.type==='invalid_json'){rejected.push({line:i+1,raw:row.raw,reason:'Invalid JSON'});continue;}
  try{
   const c=parseConstruction(row?.type==='construction'?row.value:row),sig=signature(c);const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(sig))),b=>b.toString(16).padStart(2,'0')).join('');const previous=bySignature.get(sig);const next=previous??{...c,id:'user_'+hash};if(c.id)aliases.set(c.id,next.id);
   if(seen.has(sig)){duplicates++;continue;}seen.add(sig);constructions.push(next);
  }catch(e){rejected.push({line:i+1,raw:row,reason:e instanceof Error?e.message:'Unsupported record'});}
 }
 if(query){const mapped=new URLSearchParams();for(const [key,value] of query){let k=key,v=value;for(const [before,after] of aliases)if(before!==after){if(k.endsWith('.'+before))k=k.slice(0,-before.length)+after;if(v===before)v=after;if(key==='replace'&&v.endsWith(':'+before))v=v.slice(0,-before.length)+after;}mapped.append(k,v);}query=cleanViewQuery(mapped);}
 return {constructions,rejected,query,duplicates};
}
export function storedConstructions():Construction[]{try{const rows=JSON.parse(sessionStorage.getItem(IMPORT_KEY)??'[]');return Array.isArray(rows)?rows.map(parseConstruction):[];}catch{return [];}}
