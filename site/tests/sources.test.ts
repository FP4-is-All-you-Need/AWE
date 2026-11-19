import assert from 'node:assert/strict';
import test from 'node:test';
import {mergeSources,sourceLink,sourceName,sourcesOf} from '../src/sources.ts';
import {formConstruction} from '../src/formConstruction.ts';
import {mergeModularCatalogs} from '../src/modular.ts';

const s={repository:'https://github.com/example-org/example-lib',commit:'0123456789abcdef0123456789abcdef01234567',path:'src/plan.hpp',lines:[220,229]};

test('a source names its repository and links the recorded lines at its commit',()=>{
 assert.equal(sourceName(s.repository),'example-lib (example-org)');
 assert.equal(sourceName(s.repository+'.git'),'example-lib (example-org)');
 assert.equal(sourceLink(s),'https://github.com/example-org/example-lib/blob/0123456789abcdef0123456789abcdef01234567/src/plan.hpp#L220-L229');
 assert.ok(sourceLink({...s,lines:[90,90]}).endsWith('#L90'));
 assert.ok(sourceLink({...s,lines:undefined}).endsWith('/src/plan.hpp'));
 assert.equal(sourceName('https://example.org/x'),'https://example.org/x');
 assert.equal(sourceLink({...s,repository:'https://example.org/x'}),'https://example.org/x');
});

test('a catalog row keeps its sources for the construction card',()=>{
 const row={schema_version:2,id:'example',modulus:343,weights:{A:[1,42],B:[1,42]},planes:{A:[[1,0],[1,-7]],B:[[1,0],[1,-7]]},plane_sets:{A:['8xE2M3','8xE2M3'],B:['8xE2M3','8xE2M3']},plane_moduli:{A:[49,343],B:[49,343]},products:[{a:0,b:0,numerator:7},{a:1,b:1,numerator:-6}],denominator:1};
 assert.deepEqual(sourcesOf(formConstruction({...row,sources:[s]})),[s]);
 assert.equal(sourcesOf(formConstruction({...row,id:'other'})),undefined);
});

test('a source given with and without its commit date is kept once, with the date',()=>{
 const dated={...s,date:'1999-12-31'};
 assert.deepEqual(mergeSources([s],[dated]),[dated]);
 assert.deepEqual(mergeSources([dated],[s]),[dated]);
 assert.equal(mergeSources([s],[{...s,lines:[1,2]}]).length,2);
});

test('merging catalogs keeps the sources that any copy of a construction names',()=>{
 const base={id:'example',kind:'modular' as const,modulus:7,weights:{A:[1],B:[1]},planes:{A:[[1]],B:[[1]]},products:[{a:0,b:0,numerator:1}],denominator:1,encoding:{A:[],B:[]}};
 const merged=mergeModularCatalogs([{schema_version:2,sets:[],solutions:[{...base,provenance:[{source_sha256:'a'}]}]},
  {schema_version:2,sets:[],solutions:[{...base,provenance:[{source_sha256:'b'}],sources:[s]}]}]);
 assert.deepEqual(merged.solutions[0].sources,[s]);
 assert.equal(merged.solutions[0].provenance?.length,2);
 assert.equal('sources' in mergeModularCatalogs([{schema_version:2,sets:[],solutions:[base]},{schema_version:2,sets:[],solutions:[base]}]).solutions[0],false);
});
