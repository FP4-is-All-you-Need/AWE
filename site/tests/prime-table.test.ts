import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {formCells,fp4Fewest,isFP6Lane,onFP6ValueSet,pendingSource,primeSets,primeTableData,primesThrough,rowConstruction,weightVariants,type PrimeForm} from '../src/primeTable.ts';
import {connect,pool,factors} from '../src/visual.ts';
import {mergeModularCatalogs} from '../src/modular.ts';
import {storedModulusLanes} from '../src/modulusLanes.ts';
const read=(p:string)=>JSON.parse(fs.readFileSync(new URL('../dist/'+p,import.meta.url),'utf8'));
const catalog=read('modular/catalog.json'),powers=read('modular/powers.json');
catalog.solutions.push(...powers.solutions);catalog.sets.push(...powers.sets);
const records=pool(connect(read('visualization/modsets.json'),catalog),catalog),sets=primeSets(catalog,connect(read('visualization/modsets.json'),catalog)),table=primeTableData(records,sets);
test('every prime in range is present once, including primes without constructions',()=>{
 assert.equal(table.primeMax,157);assert.equal(table.primes.length,37);
 assert.ok(!table.primes.includes(163)&&!table.primes.includes(167));
 assert.deepEqual(primesThrough(13),[2,3,5,7,11,13]);
 assert.deepEqual(table.columns.map(g=>g.prime),table.primes);
 assert.equal(table.primes.filter(p=>!table.byModulus.has(p)).length,8);
});
test('all powers through 169 have their base column, including unrecorded powers',()=>{
 const powers=table.columns.flatMap(c=>c.powers).filter(p=>p.exponent>1).map(p=>p.modulus).sort((a,b)=>a-b);
 assert.deepEqual(powers,[4,8,9,16,25,27,32,49,64,81,121,125,128,169,343,512,625,729,1331,2197,2401]);
 assert.equal(table.modulusMax,2401);assert.equal(table.columns.flatMap(c=>c.powers).length,58);
 assert.equal(table.byModulus.has(155),false);
 assert.ok(table.byModulus.has(343));
});
test('weight variants retain every saved construction and do not merge distinct full weight lists',()=>{
 for(const list of table.byModulus.values()){
  const groups=weightVariants(list);
  assert.equal(groups.flatMap(g=>g.items).length,list.length);
  for(const g of groups)assert.ok(g.items.every(c=>JSON.stringify(c.weights)===g.key));
 }
 assert.equal(weightVariants(table.byModulus.get(73)!).length,4);
 assert.equal(weightVariants(table.byModulus.get(343)!).length,5);
});

test('every recorded or used prime power is present, without a fixed exponent ceiling',()=>{
 const expected=new Set([...records.map(c=>c.modulus),...sets.flatMap(s=>s.moduli)].filter(m=>{const f=factors(m);return f.length===1&&f[0].exponent>1;}));
 const shown=new Set(table.columns.flatMap(c=>c.powers.map(p=>p.modulus)));
 assert.equal(expected.size,16);for(const m of expected)assert.ok(shown.has(m),String(m));
 const future=primeTableData(records,[...sets,{id:'test',bits:1,k:1,products:1,moduli:[8192],solutionIds:[],measured:false}]);
 assert.ok(future.columns.find(c=>c.prime===2)!.powers.some(p=>p.modulus===8192&&p.exponent===13));
});
test('343 has evidence for the 61-leading measured set, not the 107-leading build-only set',()=>{
 const sets=table.usedIn.get(343)!;
 assert.equal(sets.find(s=>s.moduli[0]===61)!.measured,true);
 assert.equal(sets.find(s=>s.moduli[0]===107)!.measured,false);
 assert.equal(table.usedIn.get(49)!.some(s=>s.measured),false);
});

const form=(modulus:number,prime:number,exponent:number,value_set:string,kind:PrimeForm['kind'],products:number,holes=0):PrimeForm=>({modulus,prime,exponent,value_set,kind,products,planes:[products,products],id:`awem2_${modulus}_${value_set}_${kind}`,...(kind==='excluded'?{reason:'nonunit_denominator_needs_table'}:{holes:{A:holes,B:holes,exact:true}})});
const forms:PrimeForm[]=[form(529,23,2,'2xE2M1','hole_free',5),form(512,2,9,'2xE2M1','hole_free',5),form(163,163,1,'2xE2M1','holes',3,4),
 form(1024,2,10,'8xE2M3','hole_free',4),form(1024,2,10,'8xE2M3','excluded',3),form(169,13,2,'8xE2M3','hole_free',2),form(1597,1597,1,'2xE2M1','hole_free',3)];
test('single constructions add prime powers inside the columns and list larger primes after the table',()=>{
 const cells=formCells(forms,'fp4',true,table.byModulus),t=primeTableData(records,sets,cells);
 assert.equal(t.primeMax,157);
 assert.ok(t.columns.find(c=>c.prime===23)!.powers.some(p=>p.modulus===529&&p.exponent===2));
 assert.deepEqual(t.beyond.map(p=>p.modulus),[163,1597]);
 assert.equal(cells.get(512)!.fewer,true);   // fewer products than the saved constructions of 512
 assert.equal(cells.has(1024),false);         // FP6 only
 const free=formCells(forms,'fp4',false,table.byModulus);
 assert.deepEqual(primeTableData(records,sets,free).beyond.map(p=>p.modulus),[1597]);
});
test('the FP6 tab is the union with FP4 and marks FP6-only, fewer and left-out constructions',()=>{
 const cells=formCells(forms,'fp6',true,table.byModulus);
 assert.ok(cells.has(529)&&cells.has(1024));
 const c1024=cells.get(1024)!;
 assert.equal(c1024.hole_free!.products,4);assert.equal(c1024.onlyWider,true);assert.equal(c1024.excludedFewer,true);
 assert.equal(cells.get(169)!.fewer,true);    // 2 products on 8xE2M3 against the saved FP4 constructions of 169
 assert.equal(cells.get(529)!.onlyWider,false);
 assert.ok(primeTableData(records,sets,cells).columns.find(c=>c.prime===2)!.powers.some(p=>p.modulus===1024&&p.exponent===10));
});
test('sets saved on an FP6 value set and their FP6 constructions stay out of the FP4 table',()=>{
 const merged=mergeModularCatalogs([catalog,read('modular/fp6-sets.json')]),saved=connect(read('visualization/modsets.json'),merged);
 const all=pool(saved,merged);
 assert.ok(primeTableData(all).primeMax>157);
 const fp4=primeTableData(all.filter(c=>!onFP6ValueSet(c)),primeSets({...merged,sets:merged.sets.filter(s=>!s.value_set)},saved));
 assert.equal(fp4.primeMax,157);assert.deepEqual(fp4.columns,table.columns);assert.deepEqual(fp4.beyond,table.beyond);
 const lanes=storedModulusLanes(merged);
 assert.deepEqual(lanes.filter(isFP6Lane).map(l=>l.id).sort(),merged.sets.filter(s=>s.value_set).map(s=>s.id).sort());
 assert.ok(lanes.some(l=>l.format==='FP64')&&!lanes.some(l=>l.format==='FP64'&&isFP6Lane(l)));
});
test('an FP6 page shows one value set, marks against the FP4 minima and runs its columns while primes have constructions',()=>{
 const fp4=fp4Fewest(records,forms);
 assert.equal(fp4.get(512),5);assert.equal(fp4.get(1331),6);assert.equal(fp4.has(1024),false);   // a single construction; a saved construction
 const shown=[...forms,...[[9,3],[25,5],[49,7],[121,11]].map(([m,p])=>form(m,p,2,'8xE2M3','hole_free',2)),form(251,251,1,'8xE2M3','hole_free',3)].filter(f=>f.value_set==='8xE2M3');
 // The FP6 page's own saved constructions do not stand in for FP4 in the marks.
 const savedFP6=new Map([[169,[{...records.find(c=>c.modulus===169)!,id:'fp6_169',products:[records.find(c=>c.modulus===169)!.products[0]]}]]]);
 const cells=formCells(shown,'fp6',true,savedFP6,fp4),t=primeTableData([],[],cells,true);
 assert.ok(!cells.has(529)&&cells.has(169)&&cells.has(1024));
 assert.equal(cells.get(169)!.fewer,true);assert.equal(cells.get(169)!.onlyWider,false);   // 2 products against the saved FP4 constructions of 169
 assert.equal(cells.get(1024)!.onlyWider,true);
 assert.equal(t.primeMax,13);assert.deepEqual(t.primes,[2,3,5,7,11,13]);   // 17 has nothing, so the columns stop at 13
 assert.ok(t.columns.find(c=>c.prime===2)!.powers.some(p=>p.modulus===1024&&p.exponent===10));
 assert.deepEqual(t.beyond.map(p=>p.modulus),[251]);
 assert.equal(primeTableData([],[],cells).primeMax,2);   // without contiguous columns, only saved constructions set the range
});
test('an FP6 row stands in for its construction until its forms file is read',()=>{
 const c=rowConstruction({id:'awem2_x',m:343,vs:'8xE2M3',R:2,FA:2,FB:2,hA:0,hB:3,exact:true,weights:{A:[1,7],B:[1,49]},maxK:null,model:null,origin:null,inCatalog:true,source:'modular/forms-0000286-0000728.json'});
 assert.equal(c.products.length,2);assert.equal(c.holes.count,3);assert.equal(pendingSource(c),'modular/forms-0000286-0000728.json');
 assert.equal(pendingSource(records[0]),undefined);
 assert.equal(weightVariants([c,{...c,id:'awem2_y'}]).length,1);
});
