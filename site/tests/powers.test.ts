import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {fromCanonical,pool,connect} from '../src/visual.ts';import {decode,records} from '../src/share.ts';
import {constructionPlan,computeMatrix} from '../src/numericExample.ts';import {savedPlaneValues} from '../src/encoding.ts';
const data=JSON.parse(readFileSync(new URL('../../data/modular/powers.json',import.meta.url),'utf8'));
test('folded planes survive JSONL and perform modular matrix reconstruction',async()=>{
 for(const s of data.solutions.filter(s=>s.modulus===343&&s.plane_moduli)){
  const c=fromCanonical(s),text=records([c],'?b=53').map(r=>JSON.stringify(r)).join('\n');
  const result=await decode(text,[]);assert.equal(result.rejected.length,0);const imported=result.constructions[0];
  assert.deepEqual(imported.plane_moduli,c.plane_moduli);assert.deepEqual(imported.limbs_stored,c.limbs_stored);
  for(const side of ['A','B'] as const)for(let i=0;i<c.planes![side].length;i++)assert.deepEqual(savedPlaneValues(imported,side,i),s.measurement.plane_values[side][i]);
  const m=computeMatrix(constructionPlan(imported),[[100n,20n],[0n,342n]],[[5n,8n],[4n,10n]]);assert.ok(m.matches);
  assert.deepEqual(imported.additional?.correction_source,c.additional?.correction_source);
 }
});

test('catalog candidates retain different saved encodings and accumulator plans',()=>{
 const base=JSON.parse(readFileSync(new URL('../../data/modular/catalog.json',import.meta.url),'utf8'));
 const visual=JSON.parse(readFileSync(new URL('../../data/visualization/modsets.json',import.meta.url),'utf8'));
 const merged={...base,solutions:[...base.solutions,...data.solutions],sets:[...base.sets,...data.sets]};
 const candidates=pool(connect(visual,merged),merged),ids=new Set(candidates.map(c=>c.id));
 for(const s of merged.solutions)assert.ok(ids.has(s.id),s.id);
 assert.equal(ids.size,candidates.length);
});
