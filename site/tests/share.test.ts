import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {fromCanonical} from '../src/visual.ts';import {decode,portable,records} from '../src/share.ts';
const catalog=JSON.parse(readFileSync(new URL('../../data/modular/catalog.json',import.meta.url),'utf8'));const c=fromCanonical(catalog.solutions[0]);
test('JSONL preserves meaningful mismatches and unknown corrections, deduplicates copies and retains broken rows',async()=>{
 const row=portable(c),other={...row,id:'custom',correction:{kind:'deferred_accumulation'},carry:true,products:row.products.map((p,i)=>i===0?{...p,numerator:(p.numerator??0)+1}:p),additional:{scope:{limb_storage:'not asserted'}}};
 const text=[...records([c],'?b=53&lang=ja'),{type:'construction',value:row},{type:'construction',value:other},{type:'construction',value:{modulus:1}}].map(v=>JSON.stringify(v)).join('\n');
 const decoded=await decode(text,[c]);assert.equal(decoded.constructions.length,2);assert.equal(decoded.duplicates,1);assert.equal(decoded.rejected.length,1);assert.equal(decoded.query!.get('b'),'53');assert.equal(decoded.constructions[0].id,c.id);assert.equal(decoded.constructions[1].correction!.kind,'deferred_accumulation');
 const again=await decode(JSON.stringify(records(decoded.constructions,'?b=53',decoded.rejected)),[c]);assert.equal(again.constructions.length,2);assert.equal(again.rejected.length,1);assert.deepEqual(portable(again.constructions[1]),portable(decoded.constructions[1]));
});
