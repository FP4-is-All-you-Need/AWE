import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
// The FP8 page says that each of the 66 encodings of src/oz2/common/fp8_plan.hpp in GEMMul8 can be written in AWE form and
// that this catalog lists all of them: each is a checked record of the single constructions whose sources name that file.
test('the single constructions hold the 66 GEMMul8 FP8 encodings as checked records',()=>{
 const dir=new URL('../../data/modular/',import.meta.url);
 const rows:{modulus:number;sources?:{repository:string;path:string;scheme?:string}[];verified:{method:string;identity:string;encoding:string}}[]=
  fs.readdirSync(dir).filter(f=>/^forms-\d+-\d+\.json$/.test(f)).flatMap(f=>JSON.parse(fs.readFileSync(new URL(f,dir),'utf8')).solutions);
 const named=rows.flatMap(r=>(r.sources??[]).filter(s=>s.repository==='https://github.com/RIKEN-RCCS/GEMMul8'&&s.path==='src/oz2/common/fp8_plan.hpp').map(s=>({r,s})));
 assert.equal(new Set(named.map(({r})=>r.modulus)).size,66);
 const schemes:Record<string,number>={};for(const {s} of named)schemes[s.scheme??'']=(schemes[s.scheme??'']??0)+1;
 assert.deepEqual(schemes,{AWE:26,CRT:37,congruence:3});
 assert.ok(named.every(({r})=>r.verified.identity==='modulo_p'&&r.verified.encoding==='all_residues'));
});
