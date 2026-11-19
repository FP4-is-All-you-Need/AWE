import {useLanguage} from './i18n.tsx';
import {sourceLink,sourceName,sourcesOf} from './sources.ts';
import type {Construction} from './visual.ts';

/** The external publications of a construction, as its record names them; nothing is shown for a construction without one. */
export function SourceNote({c}:{c:Construction}){
 const en=useLanguage()==='en',sources=sourcesOf(c);
 if(!sources?.length)return null;
 return <p data-construction-sources={sources.length} data-no-i18n>{en?'Source':'出所'}: {sources.map((s,i)=><span key={i} data-source-repository={s.repository}>{i>0&&' · '}{sourceName(s.repository)} <a href={sourceLink(s)}>{s.path}{s.lines?.length?`:${s.lines.join('–')}`:''}</a> <code>{s.commit.slice(0,7)}</code>{s.date?`, ${s.date}`:null}</span>)}</p>;
}
