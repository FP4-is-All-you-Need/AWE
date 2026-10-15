// Reads every served record; computes rendering colours without enumerating encodings.
import fs from 'node:fs';
import path from 'node:path';
import * as colors from '../src/compact.ts';
import {fromInteger,fromCanonical,type Construction} from '../src/visual.ts';
const directory=process.argv[2];if(!directory)throw Error('output directory required');fs.mkdirSync(directory,{recursive:true});
const out=fs.openSync(path.join(directory,'violations.jsonl'),'w');
const luma=(hex:string)=>{const rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;};
const contrast=(a:string,b:string)=>(Math.max(luma(a),luma(b))+.05)/(Math.min(luma(a),luma(b))+.05);
const api=colors as typeof colors&{textInk?:(s:string)=>string;miniWeightStyle?:(c:Construction,side:'A'|'B',i:number)=>{ink:string;background:string};planeColor?:(c:Construction,side:'A'|'B',i:number)=>string};
const text=(s:string)=>api.textInk?.(s)??s;
let records=0,violations=0,affected=0;const types:Record<string,number>={},seen=new Set<string>(), examples:Record<string,number>={};
function inspect(c:Construction,source:string){
 const key=JSON.stringify([c.id,c.weights,c.planes,c.products]);if(seen.has(key))return;seen.add(key);records++;
 const issues:any[]=[];
 const add=(type:string,place:string,item:unknown,color:string,extra:any={})=>{issues.push({type,place,item,color,...extra});types[type]=(types[type]??0)+1;};
 const unique=(place:string,entries:{key:string;color:string}[])=>{const prior=new Map<string,string>();for(const e of entries){const old=prior.get(e.color);if(old!==undefined&&old!==e.key)add('duplicate',place,e.key,e.color,{other:old});else prior.set(e.color,e.key);}};
 const readable=(place:string,item:unknown,ink:string,background:string)=>{const ratio=contrast(ink,background);if(ratio<4.5)add('contrast',place,item,ink,{background,ratio});};
 if(c.planes){
  const terms=c.products.map((_,i)=>({key:String(i),color:colors.coefficientColor(c,i)}));unique('terms: tile/expansion/compact/equation/candidate/matrix',terms);
  unique('term-text',terms.map(t=>({...t,color:text(t.color)})));
  terms.forEach((t,i)=>{readable('term/formula',i,text(t.color),'#FFFFFF');readable('term/filled-cell',i,text(t.color),colors.productFillColor(c,i));});
  for(const side of ['A','B'] as const){const faces=c.planes[side].map((_,i)=>{const k=c.products.findIndex(p=>p[side==='A'?'a':'b']===i),ink=api.planeColor?.(c,side,i)??(k<0?'#9E9E9E':colors.coefficientColor(c,k));readable(`plane/${side}`,i,text(ink),k<0?'#FFFFFF':colors.productFillColor(c,k));return {key:String(i),color:ink};});unique(`plane/${side}`,faces);}
 }
 for(const side of ['A','B'] as const){const entries=c.weights[side].map((w,i)=>{const style=api.miniWeightStyle?.(c,side,i)??{ink:w===1?'#1A1A1A':'#8E24AA',background:w===1?'#FFFFFF':'#dbdbdb'};readable(`mini-weight/${side}`,w,style.ink,style.background);return {key:String(w),color:style.ink};});unique(`mini-weight/${side}`,entries);}
 if(issues.length){affected++;violations+=issues.length;fs.writeSync(out,JSON.stringify({id:c.id,source,weights:c.weights,issues})+'\n');}
 if(c.weights.A.join(',')==='9,15,28'&&c.products.length===5)examples[c.id]=issues.length;
}
for(const name of fs.readdirSync('../data/solutions').filter(n=>n.endsWith('.json')).sort())for(const raw of JSON.parse(fs.readFileSync('../data/solutions/'+name,'utf8')))inspect(fromInteger(raw),'integer');
for(const file of ['catalog','powers'])for(const raw of JSON.parse(fs.readFileSync(`../data/modular/${file}.json`,'utf8')).solutions)inspect(fromCanonical(raw),'modular/'+file);
for(const width of JSON.parse(fs.readFileSync('../data/visualization/modsets.json','utf8')).widths)for(const row of width.rows)for(const c of row.mods)inspect(c,'saved-set');
for(const r of JSON.parse(fs.readFileSync('../data/visualization/joint-examples.json','utf8')).references)inspect({id:'joint_'+r.id,modulus:0,weights:{A:r.weights,B:r.weights},planes:{A:r.planes,B:r.planes},products:r.products.map((p:any)=>({...p,numerator:p.coefficient,group:null})),denominator:r.denominator} as Construction,'joint');
fs.closeSync(out);const summary={records,affected,violations,types,examples};fs.writeFileSync(path.join(directory,'summary.json'),JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify(summary));
