import {DIRECT_COLORS} from './productPalette.ts';
import {constructionTier,type ConstructionTier} from './constructionTier.ts';
import type {PolarRow} from './polarModel.ts';
export const PRODUCT_BANDS=[
 {max:1,label:'1'},{max:2,label:'2'},{max:3,label:'3'},{max:4,label:'4'},
 {max:6,label:'5–6'},{max:8,label:'7–8'},{max:12,label:'9–12'},
 {max:16,label:'13–16'},{max:Infinity,label:'17+'}
].map((band,i)=>({...band,color:DIRECT_COLORS[i]}));
export const TIER_COLORS:Record<ConstructionTier,string>={'積数最少':DIRECT_COLORS[0],'穴なし':DIRECT_COLORS[3],'穴・補正あり':'#E8710A','率未測定':'#6E6E6E'};
export const TIER_EN:Record<ConstructionTier,string>={'積数最少':'Fewest products','穴なし':'Hole-free','穴・補正あり':'Holes/correction','率未測定':'Coverage unknown'};
export function ribbonTier(r:PolarRow,minimum:number){return constructionTier(r.R,r.exact?Math.max(r.hA,r.hB):null,Boolean(r.hA||r.hB),minimum);}
export function productBand(products:number){return PRODUCT_BANDS.find(b=>products<=b.max)!;}
