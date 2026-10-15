import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {savedPlaneValues,FP4_VALUES} from '../src/encoding.ts';
import {fromCanonical,residual} from '../src/visual.ts';
import type {ModularCatalog} from '../src/modular.ts';
const catalog=JSON.parse(readFileSync(new URL('../../data/modular/catalog.json',import.meta.url),'utf8')) as ModularCatalog;
test('actual saved plane images and polynomial coefficients hold for every connected canonical construction',()=>{
 for(const s of catalog.solutions){const c=fromCanonical(s);assert.ok(residual(c)?.every(r=>r.every(v=>v==='0')));
 for(const side of ['A','B'] as const){assert.equal(s.encoding[side].length,s.modulus);s.encoding[side].forEach((tuple,x)=>{const value=tuple.reduce((sum,v,i)=>sum+v*s.weights[side][i],0);assert.equal(((value%s.modulus)+s.modulus)%s.modulus,x);});
 for(let p=0;p<s.planes[side].length;p++){const values=savedPlaneValues(c,side,p)!;assert.ok(values.every(v=>FP4_VALUES.includes(v)));assert.deepEqual(values,[...new Set(s.encoding[side].map(row=>row.reduce((n,v,i)=>n+v*s.planes[side][p][i],0)))].sort((a,b)=>a-b));}
 }
 }
});
test('missing encoding is unknown rather than the full FP4 set',()=>{const c=fromCanonical(catalog.solutions[0]);delete c.canonical;assert.equal(savedPlaneValues(c,'A',0),null);});
