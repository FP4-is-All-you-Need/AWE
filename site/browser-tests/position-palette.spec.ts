import {test,expect,type Locator} from '@playwright/test';
import {coefficientColor} from '../src/compact.ts';
import {fromInteger} from '../src/visual.ts';
const anchors=['#C2185B','#884499','#4A53A8','#0277BD','#0097A7','#00897B','#43A047','#7CB342','#9E9D24'];
const cases=[
 {name:'six',id:'awe1_002b0cddfc3729fdb06a905e402dc9c2e9b5be0d8c4222c10571bc9a5cacc3bb',query:'crt=0&b=7&integer_weight=2,5,31',limbs:3},
 {name:'four_limb',id:'awe1_37e282e92ef5d7e7761ae3304ed06bc8e91ce78a9436d239851ebc3b0b2a9a07',query:'crt=0&b=11&width_results=1',limbs:4},
];
type Saved={id:string;weights:{A:number[];B:number[]};planes:{A:number[][];B:number[][]};products:{a:number;b:number}[]};
const colors=async(nodes:Locator)=>nodes.evaluateAll(elements=>elements.map(n=>({key:n.getAttribute('data-matrix-term')??n.getAttribute('data-lattice-cell')??n.getAttribute('data-directcell'),weight:n.getAttribute('data-weight'),color:n.getAttribute('data-product-color')})));
async function blocks(detail:Locator){
 const rows=await detail.locator('[data-expansion] [data-product-index][data-block-color]').evaluateAll(nodes=>nodes.map(n=>({index:Number(n.getAttribute('data-product-index')),color:n.getAttribute('data-block-color')!})));
 const map=new Map<number,string>();for(const row of rows){if(map.has(row.index))expect(row.color).toBe(map.get(row.index));map.set(row.index,row.color);}return [...map].sort(([a],[b])=>a-b);
}
for(const c of cases)test(`product palette follows weight and block positions in ${c.name}`,async({page})=>{
 test.setTimeout(120000);
 await page.goto(`/?${c.query}&integer_id=${c.id}&lang=en`);
 const tile=page.locator(`[data-integer-tile="${c.id}"]`);await expect(tile).toBeVisible();await tile.click();
 const detail=page.locator('.integer-detail .construction-detail');await expect(detail.locator('[data-expansion]')).toHaveAttribute('data-expansion',c.id);
 await detail.locator('[name=limb_order]').selectOption('weight');await detail.locator('[name=expansion_layout]').selectOption('products');
 const matrixSection=detail.locator(`details[data-section="matrix.${c.id}"]`);if(await matrixSection.getAttribute('open')===null)await matrixSection.locator(':scope > summary').click();
 const matrix=detail.locator('[data-matrix-size]'),terms=matrix.locator('[data-matrix-term]');await expect(terms).toHaveCount(c.limbs**2);
 const response=await page.request.get(`/solutions/${c.id.slice(5,7)}.json`);expect(response.ok()).toBe(true);
 const saved=((await response.json()) as Saved[]).find(r=>r.id===c.id)!;expect(saved).toBeDefined();
 const weights=saved.weights.A.flatMap(a=>saved.weights.B.map(b=>a*b)),sorted=[...new Set(weights)].sort((a,b)=>a-b),expected=new Map<number,string>();
 for(const term of await colors(terms)){const weight=Number(term.weight);if(expected.has(weight))expect(term.color).toBe(expected.get(weight));expected.set(weight,term.color!);}
 sorted.forEach((w,i)=>expect(expected.get(w)).toBe(anchors[i]??'#1A1A1A'));
 const before=await colors(terms);for(const term of before){expect(term.weight).not.toBeNull();expect(term.color).toBe(expected.get(Number(term.weight)));}
 const tileCells=tile.locator('[data-lattice-cell][data-product-color], [data-directcell][data-product-color]');await expect(tileCells).toHaveCount(c.limbs**2);
 for(const cell of await colors(tileCells))expect(cell.color).toBe(expected.get(Number(cell.weight)));
 const last=`${c.limbs-1},${c.limbs-1}`;await expect(matrix.locator(`[data-matrix-term="${last}"]`)).toHaveAttribute('data-product-color',expected.get(sorted.at(-1)!)!);
 await expect(tile.locator(`[data-lattice-cell="${last}"], [data-directcell="${last}"]`)).toHaveAttribute('data-product-color',expected.get(sorted.at(-1)!)!);
 await expect(matrix.locator(`[data-matrix-term="${last}"] > rect`).first()).toHaveAttribute('fill',expected.get(sorted.at(-1)!)!);
 await expect(tile.locator(`[data-lattice-cell="${last}"], [data-directcell="${last}"]`)).toHaveAttribute('fill',expected.get(sorted.at(-1)!)!);
 const beforeBlocks=await blocks(detail);expect(beforeBlocks.length).toBeGreaterThan(0);
 const ranks=(weights:number[])=>new Map(weights.map((weight,index)=>({weight,index})).sort((a,b)=>a.weight-b.weight||a.index-b.index).map(({index},rank)=>[index,rank]));
 const ar=ranks(saved.weights.A),br=ranks(saved.weights.B);
 const ordered=saved.products.flatMap((p,index)=>{const a=saved.planes.A[p.a].flatMap((v,i)=>v?[ar.get(i)!]:[]),b=saved.planes.B[p.b].flatMap((v,i)=>v?[br.get(i)!]:[]);if(a.length*b.length<=1)return [];const column=a.reduce((s,v)=>s+v,0)/a.length,row=b.reduce((s,v)=>s+v,0)/b.length;return [{index,position:column+row,column,row,signature:saved.planes.A[p.a].flatMap((u,i)=>u?saved.planes.B[p.b].flatMap((v,j)=>v?[`${saved.weights.A[i]}:${saved.weights.B[j]}:${u}:${v}`]:[]):[]).sort().join(';')}];}).sort((a,b)=>a.position-b.position||a.row-b.row||a.column-b.column||a.signature.localeCompare(b.signature));
 const blockMap=new Map(beforeBlocks),blockColors=ordered.map(b=>blockMap.get(b.index));
 for(const {index} of ordered)expect(blockMap.get(index)).toBe(coefficientColor(fromInteger(saved as any),index));
 for(const {index} of ordered){
  const swatches=page.locator(`.integer-candidates [name=integer_candidate][value="${c.id}"] [data-block-swatch][data-product-index="${index}"]`);
  expect(await swatches.count()).toBeGreaterThan(0);for(const swatch of await swatches.all())await expect(swatch).toHaveAttribute('data-block-color',blockMap.get(index)!);
  await expect(tile.locator(`[data-lattice-support][data-product-index="${index}"]`)).toHaveAttribute('data-block-color',blockMap.get(index)!);
 }
 for(const order of ['stored','block','weight']){await detail.locator('[name=limb_order]').selectOption(order);expect(await blocks(detail)).toEqual(beforeBlocks);}
 await matrix.locator('[data-matrix-term="0,0"]').click();expect(await colors(terms)).toEqual(before);expect(await blocks(detail)).toEqual(beforeBlocks);
 for(const cell of await colors(tileCells))expect(cell.color).toBe(expected.get(Number(cell.weight)));
 const select=detail.locator('[name=product_index]');await select.selectOption('0');expect(await colors(terms)).toEqual(before);expect(await blocks(detail)).toEqual(beforeBlocks);
 await page.evaluate(()=>document.fonts.ready);
 await tile.screenshot({path:`build/screens/position_palette_${c.name}_tile.png`});
 await matrix.screenshot({path:`build/screens/position_palette_${c.name}_matrix.png`});
 await detail.locator('[data-expansion]').screenshot({path:`build/screens/position_palette_${c.name}_expansion.png`});
});
