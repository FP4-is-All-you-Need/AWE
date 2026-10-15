import assert from 'node:assert/strict';
import test from 'node:test';
import {connect, conflicts, holePercent, inFilter, initialState, PRECISIONS, residual, stateQuery, totals} from '../src/visual.ts';
import type {Construction, Lane, VisualCatalog} from '../src/visual.ts';
import type {ModularCatalog, ModularSolution} from '../src/modular.ts';

function construction(modulus:number, extra:Partial<Construction>={}):Construction {
 return {id:`p${modulus}`,modulus,weights:{A:[1],B:[1]},planes:{A:[[1]],B:[[1]]},products:[{a:0,b:0,group:null,numerator:1}],denominator:1,shape:'one',faces_a:1,faces_b:1,holes:{count:0,share:0},carry:false,block_shift:false,source_sha256:'fixture',max_k:null,...extra};
}

test('CRT multiplication and its strict bound use exact integers beyond Number precision',()=>{
 const mods=[construction(1000000007),construction(1000000009),construction(998244353)];
 const result=totals(mods,24,65536,23);
 const product=1000000007n*1000000009n*998244353n;
 const bound=2n*16777215n*8388607n;
 assert.equal(result.crtMax,(product-1n)/bound);
 assert.ok(product>BigInt(Number.MAX_SAFE_INTEGER));
 assert.equal(result.coprime,true);
 assert.equal(result.crtOK,true);
 // P = 3*7 = 21 and the magnitude-one bound is 2: K=10 fits, K=11 does not.
 assert.equal(totals([construction(3),construction(7)],1,10).crtOK,true);
 assert.equal(totals([construction(3),construction(7)],1,11).crtOK,false);
});

test('a sufficient modulus product never makes a noncoprime set CRT-valid',()=>{
 const result=totals([construction(9),construction(15)],1,1);
 assert.equal(result.crtMax,67n);
 assert.equal(result.coprime,false);
 assert.equal(result.crtOK,false);
});

test('prime collisions omit the removed slot and retain collisions with every other modulus',()=>{
 const mods=[construction(9),construction(25),construction(14)];
 assert.deepEqual(conflicts(mods,0,construction(27)),[]);
 assert.deepEqual(conflicts(mods,0,construction(15)),[{prime:5,modulus:25}]);
 assert.deepEqual(conflicts(mods,1,construction(21)),[{prime:3,modulus:9},{prime:7,modulus:14}]);
});

test('10 percent coverage filter distinguishes unknown coverage from measured zero',()=>{
 const unknown=construction(101,{holes:{count:null,share:null}});
 assert.equal(holePercent(unknown),null);
 assert.equal(inFilter(unknown,10,false),false);
 assert.equal(inFilter(unknown,10,true),true);
 assert.equal(totals([unknown],1,1).unknownCoverage,true);
 assert.equal(inFilter(construction(100,{holes:{count:10,share:null}}),10,false),true);
 assert.equal(inFilter(construction(100,{holes:{count:11,share:null}}),10),false);
 assert.equal(inFilter(construction(101,{holes:{count:null,share:0.004}}),10),true);
 assert.equal(inFilter(construction(100),0,false),true);
});

test('residual exposes integer and modular identity mismatches and unknown coefficients',()=>{
 const c=construction(0,{weights:{A:[1,2],B:[1,3]},planes:{A:[[1,2]],B:[[1,3]]},products:[{a:0,b:0,group:2,numerator:2}]});
 assert.deepEqual(residual(c),[['1','2'],['3','6']]);
 assert.deepEqual(residual({...c,modulus:5}),[['1','2'],['3','1']]);
 assert.deepEqual(residual({...c,products:[{a:0,b:0,group:2,numerator:0}],modulus:5}),[['4','3'],['2','4']]);
 assert.deepEqual(residual({...c,products:[{a:0,b:0,group:2,numerator:1}]}),[['0','0'],['0','0']]);
 assert.equal(residual({...c,products:[{a:0,b:0,group:0,numerator:null}]}),null);
});

test('precision presets preserve signed widths separately from magnitude bits',()=>{
 assert.deepEqual([PRECISIONS.fp32.ma,PRECISIONS.fp32.b],[25,24]);
 assert.deepEqual([PRECISIONS.fp64.ma,PRECISIONS.fp64.b],[54,53]);
 assert.deepEqual([PRECISIONS.complex_fp64.ma,PRECISIONS.complex_fp64.b],[54,53]);
});

test('URL roundtrip restores replacements, asymmetric widths, costs and the unknown flag',()=>{
 const state={...initialState(new URLSearchParams()),b:24,b_b:53,k:16384,matrix_m:1024,matrix_n:2048,hole_pct_max:0.4,precision_a:'fp32',precision_b:'fp64',set_id:'set-fixture',selected_slot:3,prime:7,include_unknown:false,replace:{0:'candidate-a',3:'candidate-b'},cp:'0.125',cf:'2'};
 const query=stateQuery(state);
 assert.deepEqual(query.getAll('replace'),['0:candidate-a','3:candidate-b']);
 assert.equal(query.get('include_unknown'),'0');
 assert.equal(query.get('input_ma'),'25');
 assert.equal(query.get('input_mb'),'54');
 assert.deepEqual(initialState(new URLSearchParams(query.toString())),state);
 assert.equal(initialState(new URLSearchParams('include_unknown=1')).include_unknown,true);
});

test('connect maps coefficients by used face vectors while keeping saved accumulator groups and order',()=>{
 const canonical:ModularSolution={id:'canonical-fixture',kind:'modular',modulus:7,weights:{A:[1,2],B:[1,2]},planes:{A:[[1,0],[0,1],[1,1]],B:[[1,0],[0,1],[1,1]]},products:[{a:0,b:0,numerator:3},{a:1,b:1,numerator:-2},{a:2,b:2,numerator:5}],denominator:2,encoding:{A:[],B:[]},plane_sets:{A:[],B:[]},verified:{method:'full_pairs',identity:'modulo_p',encoding:'all_residues',date:'',n_pairs:49,n_residues:{A:7,B:7},verifier_version:'fixture'}};
 const saved=construction(7,{id:'saved-fixture',weights:canonical.weights,planes:{A:[[1,1],[1,0],[0,1]],B:[[0,1],[1,1],[1,0]]},products:[{a:2,b:0,group:0,numerator:null},{a:0,b:1,group:2,numerator:null},{a:1,b:2,group:null,numerator:null}]});
 const row:Lane={id:'row',lane:'a',selection_kind:'products',tag:'fixture',moduli:[7],products:3,faces_a:3,faces_b:3,k_max:'1',mods:[saved]};
 const catalog:VisualCatalog={schema_version:1,source_sha256:'fixture',widths:[{bits:53,rows:[row]}]};
 const modular:ModularCatalog={schema_version:1,sets:[],solutions:[canonical]};
 const linked=connect(catalog,modular).widths[0].rows[0].mods[0];
 assert.equal(linked.id,canonical.id);
 assert.equal(linked.denominator,2);
 assert.deepEqual(linked.products,[{a:2,b:0,group:0,numerator:-2},{a:0,b:1,group:2,numerator:5},{a:1,b:2,group:null,numerator:3}]);
 assert.deepEqual(saved.products.map(p=>p.numerator),[null,null,null]);
});
