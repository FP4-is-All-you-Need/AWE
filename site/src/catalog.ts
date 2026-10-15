import type {Catalog,Filters,Group,Row,Search,Solution} from './types.ts';
const cache=new Map<string,Promise<unknown>>();
export async function read<T>(path:string,sha?:string):Promise<T> {
 if(!/^(index\.json|(solutions|search|modular|visualization)\/[A-Za-z0-9_.-]+\.json)$/.test(path))throw Error('データのURLが不正');
 const key=path+':'+(sha||'');
 if(cache.has(key)){const value=cache.get(key)!;cache.delete(key);cache.set(key,value);return value as Promise<T>;}
 if(cache.size>=16)cache.delete(cache.keys().next().value!);
 if(!cache.has(key))cache.set(key,(async()=>{
  const response=await fetch(import.meta.env.BASE_URL+path);if(!response.ok)throw Error(`データ読込失敗 (${response.status})`);
  if(response.headers.get('content-type')?.includes('text/html'))throw Error('JSON未収録');
  const bytes=await response.arrayBuffer();
  if(sha){const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),x=>x.toString(16).padStart(2,'0')).join('');if(hash!==sha)throw Error('データの検査値が不一致');}
  return JSON.parse(new TextDecoder().decode(bytes));
 })().catch(error=>{cache.delete(key);throw error;}));
 return cache.get(key)! as Promise<T>;
}
export const catalog=()=>read<Catalog>('index.json');
export const search=(c:Catalog)=>read<Search>(c.search.path,c.search.sha256);
export function eligible(g:Group,f:Filters){return g.width_a>=f.a&&g.width_b>=f.b&&(!f.r||g.r<=f.r)&&(f.mixed||!g.mixed);}
export function filterRows(rows:Row[],f:Filters):Row[]{
 const weights=f.weight.trim().split(/[ ,]+/).filter(Boolean).map(Number);
 return rows.filter(x=>x[1]>=f.a&&x[2]>=f.b&&(!f.r||x[5]<=f.r)&&(!f.limbs||(x[3]===f.limbs&&x[4]===f.limbs))&&(!f.planes||x[6]+x[7]<=f.planes)&&(!f.denominator||x[8]===f.denominator)&&(!f.minK||x[9]===null||x[9]>=f.minK)&&(f.mixed||!x[12])&&weights.every(w=>x[10].includes(w)||x[11].includes(w)))
 .sort((a,b)=>(a[5]*f.costProduct+(a[6]+a[7])*f.costPlane)-(b[5]*f.costProduct+(b[6]+b[7])*f.costPlane)||a[5]-b[5]||a[0].localeCompare(b[0]));
}
export async function solution(c:Catalog,id:string):Promise<Solution>{
 if(!/^awe1_[0-9a-f]{64}$/.test(id))throw Error('ID不正');
 const entry=c.files.find(x=>x.path===`solutions/${id.slice(5,7)}.json`);if(!entry)throw Error('未収録');
 const found=(await read<Solution[]>(entry.path,entry.sha256)).find(x=>x.id===id);if(!found)throw Error('未収録');return found;
}
