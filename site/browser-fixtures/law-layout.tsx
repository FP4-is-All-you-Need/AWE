import {createRoot} from 'react-dom/client';
import {Expansion} from '../src/Expansion';
import {ConstructionTile} from '../src/PaperFigures';
import {LawRow} from '../src/PaperFigures';
import {pool,type Lane} from '../src/visual';
import '../src/style.css';
import '../src/paper.css';
const [saved,base,powers]=await Promise.all(['visualization/modsets.json','modular/catalog.json','modular/powers.json'].map(p=>fetch('/'+p).then(r=>r.json())));
const constructions=pool(saved,{...base,solutions:[...base.solutions,...powers.solutions],sets:[...base.sets,...powers.sets]});
const detailId=new URLSearchParams(location.search).get('detail');
const detail=constructions.find(c=>c.id===detailId);
const root=createRoot(document.getElementById('root')!);
// One row per record avoids deduplicating different constructions of the same modulus.
root.render(<main className="paper-app">{detail&&<><ConstructionTile c={detail}/><Expansion c={detail}/></>}<section className="paper-comparison" data-all-count={constructions.length}>{constructions.map(c=>{const lane:Lane={id:c.id,lane:'test',selection_kind:'saved',tag:'test',moduli:[c.modulus],products:c.products.length,faces_a:c.faces_a,faces_b:c.faces_b,k_max:'0',mods:[c]};return <details open key={c.id} data-comparison-lane={c.id}><summary>{c.id}</summary><LawRow lane={lane}/></details>;})}</section></main>);
