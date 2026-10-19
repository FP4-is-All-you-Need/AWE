import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {formCells,primeSets,primeTableData,primesThrough,weightVariants,type PrimeForm} from '../src/primeTable.ts';
import {connect,pool,factors} from '../src/visual.ts';
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
