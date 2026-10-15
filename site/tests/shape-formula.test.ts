import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {shapeFormula,vanishingPowers} from '../src/shapeFormula.ts';import {fromCanonical} from '../src/visual.ts';
test('vanishing powers use the actual modulus and weights',()=>{
 const records=JSON.parse(fs.readFileSync(new URL('../../data/modular/powers.json',import.meta.url),'utf8')).solutions.map(fromCanonical);
 for(const [mod,zero] of [[1331,[3,4]],[2197,[3,4]],[625,[4,5,6]]] as const){const c=records.find((c:any)=>c.modulus===mod);assert.deepEqual(vanishingPowers(c),zero);assert.ok(!shapeFormula(c).includes('limb'));}
 for(const c of records)for(const p of vanishingPowers(c)){const w=[...c.weights.A].sort((a,b)=>a-b)[1];assert.equal(BigInt(w)**BigInt(p)%BigInt(c.modulus),0n);}
});
