import {useMemo} from 'react';
import {MoleculeDetail} from './MoleculeDetail.tsx';
import {componentComparison,kind,type Coefficients,type PolarRow} from './polarModel.ts';

/** Under the ribbon, for a composite that needs fewer products than its CRT components: the same detail as the
 * composite table (components, the combined construction and its limb-pair grid). Other moduli show nothing here. */
export function CompositeSplit({m,groups,s,en}:{m:number;groups:Map<number,PolarRow[]>;s:Coefficients;en:boolean}){
 const comparison=useMemo(()=>componentComparison(m,groups,s),[m,groups,s]);
 if(kind(m)!=='composite'||!comparison.best||!((comparison.saving??0)>0))return null;
 return <section className="composite-split" data-composite-split={m} data-split-sum={comparison.sum} data-split-combined={comparison.best.R} data-split-saving={comparison.saving}>
  <h4>{en?`Selected composite ${m}: CRT ${comparison.sum} products → ${comparison.best.R}`:`選択中の合成数 ${m}：CRT ${comparison.sum} 本 → ${comparison.best.R} 本`}</h4>
  <MoleculeDetail key={m} m={m} groups={groups} s={s} en={en}/>
 </section>;
}
