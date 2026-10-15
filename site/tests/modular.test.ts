import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {modularInitial,rankModular,validModularK,verifiedModular,modularSources,tableCheckLabel} from '../src/modular.ts';
import type {ModularCatalog} from '../src/modular.ts';
const catalog=JSON.parse(readFileSync(new URL('../../data/modular/catalog.json',import.meta.url),'utf8')) as ModularCatalog;
const allSets=catalog.sets;
const sets=allSets.filter(s=>['awems1_5b05738257bbabf8901c9dfaa2c8b7d03469ce483316bd6e8f9b0b46197e5757','awems1_a5885349a9a7ded35f1072e1509027c38f41c3e8b6033865068b05d0de7893a0'].includes(s.id));
const defaults=modularInitial(new URLSearchParams());
test('default candidates include 59 and 62 products with 59 ranked first',()=>{
 assert.deepEqual(rankModular(sets,defaults).map(s=>s.verification.products),[59,62]);
 assert.equal(rankModular(sets,defaults)[1].verification.moduli.length,18);
});
test('face cost can rank 62 products first without changing the input',()=>{
 const ids=sets.map(s=>s.id);
 assert.deepEqual(rankModular(sets,{...defaults,cf:1}).map(s=>s.verification.products),[62,59]);
 assert.deepEqual(sets.map(s=>s.id),ids);
});
test('K and magnitude limits filter available verified sets',()=>{
 assert.deepEqual(rankModular(sets,{...defaults,k:'16384'}).map(s=>s.verification.products),[59]);
 assert.equal(rankModular(sets,{...defaults,k:'18827'}).length,0);
 assert.equal(rankModular(sets,{...defaults,bits:54}).length,0);
});
test('URL parameters restore settings and reject invalid values',()=>{
 assert.deepEqual(modularInitial(new URLSearchParams('m_bits=52&m_k=16384&m_cp=0.5&m_cf=1')),{bits:52,k:'16384',cp:0.5,cf:1});
 assert.deepEqual(modularInitial(new URLSearchParams('m_bits=NaN&m_k=-1&m_cp=-1&m_cf=Infinity')),{...defaults,k:'-1'});
 assert.equal(rankModular(sets,{...defaults,k:'-1'}).length,0);
});

test('K rejects unsafe integers and excessively long strings before BigInt conversion',()=>{
 for(const k of ['9007199254740992','1'.repeat(10000),'0','1.5']){assert.equal(validModularK(k),false);assert.deepEqual(rankModular(sets,{...defaults,k}),[]);}
 assert.equal(validModularK('9007199254740991'),true);
});
test('only the supported modular proof methods are accepted',()=>{
 const {solutions}=JSON.parse(readFileSync(new URL('../../data/modular/catalog.json',import.meta.url),'utf8')) as ModularCatalog;
 const s=solutions[0];assert.equal(verifiedModular(s),true);
 for(const key of ['method','identity','encoding'] as const)assert.equal(verifiedModular({...s,verified:{...s.verified,[key]:'unknown'}}),false);
});

test('expanded candidates have monotonic cost and satisfy declared limits',()=>{
 for(const cf of [0,1,2]){const f={...defaults,cf};const ranked=rankModular(allSets,f);for(let i=0;i<ranked.length;i++){const s=ranked[i];assert.ok(s.magnitude_bits>=f.bits);assert.ok(BigInt(s.verification.max_k)>=BigInt(f.k));if(i)assert.ok(ranked[i-1].verification.products+cf*ranked[i-1].verification.faces<=s.verification.products+cf*s.verification.faces);}}
 const eligible=rankModular(allSets,{...defaults,k:'16384'});assert.ok(eligible.some(s=>s.id===sets.find(s=>s.verification.products===59)!.id));assert.ok(!eligible.some(s=>s.id===sets.find(s=>s.verification.products===62)!.id));
});
test('source associations keep declarations separate from independent proof',()=>{
 const s=catalog.solutions[0];const sha=s.provenance![0].source_sha256;
 const withIntake={...catalog,intake:[{source_sha256:sha,copies:1,status:'accepted' as const,reason:'independently_verified',declarations:[{scope_id:null,pool:'extension',table_check:'not_applicable' as const,selection:'saved_selection' as const}]}]};
 assert.equal(modularSources(withIntake,s)[0].intake?.declarations[0].table_check,'not_applicable');
 assert.equal(tableCheckLabel('unsupported_output_width'),'出力幅が未対応');
 assert.equal(modularSources({...catalog,intake:undefined},s)[0].intake,undefined);
});
