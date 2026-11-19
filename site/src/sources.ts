import type {FormSource} from './modularForms.ts';
import type {SetSource} from './modular.ts';

const known=new Map<string,FormSource[]>();
const sourceKey=(s:FormSource)=>JSON.stringify([s.repository,s.commit,s.path,s.lines??[],s.scheme??'']);
/** The sources of both lists, each once; a source given with and without its commit date keeps the date. */
export function mergeSources(a:FormSource[],b:FormSource[]):FormSource[]{
 const out=new Map<string,FormSource>();
 for(const s of [...a,...b]){const old=out.get(sourceKey(s));out.set(sourceKey(s),old?.date&&!s.date?old:s);}
 return [...out.values()];
}
/** Records where the construction with this id appears outside this catalog. */
export function noteSources(id:string,sources:FormSource[]){known.set(id,mergeSources(known.get(id)??[],sources));}
/** The external sources recorded for a construction, if any. */
export function sourcesOf(c:{id:string}):FormSource[]|undefined{return known.get(c.id);}

/** "repo (owner)" for https://github.com/owner/repo; other locations are shown as given. */
export function sourceName(repository:string){
 const m=/^https:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/.exec(repository);
 return m?`${m[2]} (${m[1]})`:repository;
}
/** The file lines at the recorded commit, for a GitHub repository; otherwise the repository itself. */
export function sourceLink(s:FormSource){
 const [first,last]=s.lines??[];
 const lines=first?`#L${first}`+(last&&last!==first?`-L${last}`:''):'';
 return /^https:\/\/github\.com\//.test(s.repository)?`${s.repository.replace(/\.git$|\/$/,'')}/blob/${s.commit}/${s.path}${lines}`:s.repository;
}
/** The name of a set at its source, with its short commit and the commit date in parentheses. */
export function setSourceTitle(s:SetSource){return `${s.name} (${s.commit.slice(0,7)}, ${s.date})`;}
