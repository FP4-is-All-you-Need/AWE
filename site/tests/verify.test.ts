import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {IMPORT_BYTES, verifyImported} from '../src/verify.ts';
import type {Solution} from '../src/types.ts';

const data=new URL('../../build/preview-data/',import.meta.url);
const index=JSON.parse(readFileSync(new URL('index.json',data),'utf8'));
const examples:Solution[]=index.files.flatMap((entry:{path:string})=>
 JSON.parse(readFileSync(new URL(entry.path,data),'utf8')));
const withoutDate=(proof:Solution['verified'])=>{
 const {date,...rest}=proof;return rest;
};

test('browser proof reproduces Python preview IDs and exact derived claims',async()=>{
 assert.equal(examples.length,4);
 for(const expected of examples){
  const before=structuredClone(expected);
  const actual=await verifyImported(expected);
  for(const field of ['id','weights','planes','products','denominator','domain','coverage','widths','accumulation'] as const)
   assert.deepEqual(actual[field],expected[field],`${expected.id}: ${field}`);
  assert.deepEqual(withoutDate(actual.verified),withoutDate(expected.verified));
  assert.deepEqual(expected,before,'verification must not mutate imported JSON');
 }
});

test('untrusted derived claims are discarded and recomputed',async()=>{
 const expected=examples[0];
 const forged={...structuredClone(expected),id:'forged',coverage:{A:999,B:999},widths:{A:99,B:99},
  accumulation:{precision_bits:999,mode:'forged',max_k:999,product_bounds:[999]},
  verified:{method:'forged',n_pairs:999,n_pairs_proven:999,date:'invalid',verifier_version:'999'}};
 const actual=await verifyImported(forged);
 assert.equal(actual.id,expected.id);
 assert.deepEqual(actual.coverage,expected.coverage);
 assert.deepEqual(actual.widths,expected.widths);
 assert.deepEqual(actual.accumulation,expected.accumulation);
 assert.deepEqual(withoutDate(actual.verified),withoutDate(expected.verified));
});

test('damaged algebra, free text, and unsafe numeric values are rejected',async()=>{
 const damaged=structuredClone(examples[0]);damaged.products[0].numerator++;
 await assert.rejects(verifyImported(damaged),/^Error: identity_failed$/);
 await assert.rejects(verifyImported({...examples[0],notes:'untrusted free text'}),/^Error: invalid_fields$/);
 const unsafe=structuredClone(examples[0]);unsafe.weights.A[0]=Number.MAX_SAFE_INTEGER+1;
 await assert.rejects(verifyImported(unsafe),/^Error: invalid_integer$/);
 const boolean=structuredClone(examples[0]) as unknown as {denominator:unknown};boolean.denominator=true;
 await assert.rejects(verifyImported(boolean),/^Error: invalid_integer$/);
});

test('input, tuple, and domain budgets reject work before enumeration',async()=>{
 await assert.rejects(verifyImported({...examples[0],notes:'x'.repeat(IMPORT_BYTES)}),/^Error: input_resource_limit$/);
 const tuples=structuredClone(examples.find(s=>s.weights.A.length===3)!);
 tuples.limb_sets.A=Array(3).fill('E4M3_integer');
 await assert.rejects(verifyImported(tuples),/^Error: encoding_resource_limit$/);
 const domain=structuredClone(examples[0]);domain.domain.A=[-1_000_000,1_000_000];
 await assert.rejects(verifyImported(domain),/^Error: domain_resource_limit$/);
});

test('plane permutation, signs, duplicate terms and common denominator preserve ID',async()=>{
 const expected=examples[0],changed=structuredClone(expected);
 for(const side of ['A','B'] as const){
  changed.planes[side]=changed.planes[side].slice().reverse().map(p=>p.map(c=>side==='A'?-c:c));
  changed.plane_sets[side].reverse();
 }
 changed.denominator*=2;
 changed.products=expected.products.slice().reverse().map(p=>({
  a:expected.planes.A.length-1-p.a,b:expected.planes.B.length-1-p.b,numerator:-2*p.numerator}));
 const first=changed.products.shift()!;
 changed.products.push({...first,numerator:first.numerator/2},{...first,numerator:first.numerator/2});
 const actual=await verifyImported(changed);
 assert.equal(actual.id,expected.id);
 assert.deepEqual(actual.products,expected.products);
 assert.deepEqual(actual.planes,expected.planes);
 assert.equal(actual.denominator,expected.denominator);
});
