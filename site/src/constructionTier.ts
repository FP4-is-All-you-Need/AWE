/** Structural tiers shared with the existing replacement-candidate list. */
export type ConstructionTier='積数最少'|'穴なし'|'穴・補正あり'|'率の値なし';
export function constructionTier(products:number,holes:number|null,correction:boolean,minimum:number):ConstructionTier{
 return holes===null?'率の値なし':holes>0||correction?'穴・補正あり':products===minimum?'積数最少':'穴なし';
}
