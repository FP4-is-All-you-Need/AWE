import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {primeSets,primeTableData,primesThrough,weightVariants} from '../src/primeTable.ts';
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
