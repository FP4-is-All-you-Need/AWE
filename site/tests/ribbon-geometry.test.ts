import test from 'node:test';
import assert from 'node:assert/strict';
import {ribbonCell,modulusRibbonCell,rankedModuli,spiralArcLength,spiralAngle,RIBBON_DEFAULTS} from '../src/ribbonGeometry.ts';
const ARC_PARAMETERS={...RIBBON_DEFAULTS,spacing:'arc' as const,taper:0};
const near=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
test('sparse recorded moduli occupy successive cells without integer gaps',()=>{
 const ms=rankedModuli([7387,2,3,2,169,65536],2,4);assert.deepEqual(ms,[2,3,169,7387]);
 const a=modulusRibbonCell(3,ms,ARC_PARAMETERS)!,b=modulusRibbonCell(169,ms,ARC_PARAMETERS)!;
 near(a.angleEnd,b.angleStart);near(a.outerEnd,b.outerStart);assert.equal(modulusRibbonCell(4,ms,ARC_PARAMETERS),null);
});
test('inverse arc length, fixed cell arc width and equal band area hold at inner and outer turns',()=>{
 const p=ARC_PARAMETERS;
 for(const i of [0,1,12,13,85,168,1000]){const c=ribbonCell(i,p);near(spiralArcLength(c.angleEnd,p)-spiralArcLength(c.angleStart,p),p.cellWidth);near(c.area,ribbonCell(0,p).area);near(spiralArcLength(spiralAngle(i*p.cellWidth,p),p),i*p.cellWidth);}
 assert.ok(ribbonCell(168,p).angleEnd-ribbonCell(168,p).angleStart<ribbonCell(0,p).angleEnd-ribbonCell(0,p).angleStart);
});
test('outer complete turns contain more cells',()=>{
 const groups=new Map<number,number>();for(let i=0;i<169;i++){const t=ribbonCell(i,ARC_PARAMETERS).turn;groups.set(t,(groups.get(t)??0)+1);}
 const complete=[...groups.values()].slice(0,-1);assert(complete.length>=3);for(let i=1;i<complete.length;i++)assert(complete[i]>complete[i-1]);
});
test('start filters recorded moduli; tier width is explicit and circle option keeps cell arc width',()=>{
 assert.deepEqual(rankedModuli([2,8,128,4096,65536],9,2),[128,4096]);
 const p={...ARC_PARAMETERS,layout:'rings' as const},a=ribbonCell(0,p),b=ribbonCell(168,p);near(a.area,b.area);near(ribbonCell(0,p,.25).area,a.area/4);near((b.angleEnd-b.angleStart)*b.center.radius,p.cellWidth);
});

test('power mode assigns exact base boundaries and equal angles inside each displayed interval',()=>{
 const p={...RIBBON_DEFAULTS,spacing:'powers' as const,arc:'step' as const},ms=[2,3,12,13,17,168,169,180,2196,2197];
 for(const [m,turn] of [[2,0],[12,0],[13,1],[168,1],[169,2],[2196,2],[2197,3]])assert.equal(modulusRibbonCell(m,ms,p)!.turn,turn);
 near(modulusRibbonCell(13,ms,p)!.angleStart,2*Math.PI);near(modulusRibbonCell(169,ms,p)!.angleStart,4*Math.PI);
 const a=modulusRibbonCell(13,ms,p)!,b=modulusRibbonCell(168,ms,p)!;near(a.angleEnd-a.angleStart,b.angleEnd-b.angleStart);
 assert.equal(modulusRibbonCell(13,ms,{...p,base:2})!.turn,3);
});

// Coordinates use every integer, independent of which constructions are recorded.
test('missing integers keep their positions and power boundaries remain fixed',()=>{
 const p=RIBBON_DEFAULTS,ms=[4,8,9,10];
 const a=modulusRibbonCell(4,ms,p)!,b=modulusRibbonCell(9,ms,p)!;
 assert(a.angleStart<b.angleStart);assert(a.angleEnd<b.angleStart);
 near(a.angleStart,modulusRibbonCell(4,[2,3,4,5,6,7,8,9,10,11,12],p)!.angleStart);
 for(const base of [10,11,13]){const q={...p,base},m=base**3;const before=modulusRibbonCell(m-1,[m-1,m],q)!,after=modulusRibbonCell(m,[m-1,m],q)!;near(before.angleEnd,after.angleStart);near(before.innerEnd,after.innerStart);near(before.outerEnd,after.outerStart);}
});
test('default thickness decreases within each cell without a step at a power boundary',()=>{
 const p=RIBBON_DEFAULTS,ms=[12,13,168,169,2196,2197];
 let last=Infinity;for(const m of ms){const c=modulusRibbonCell(m,ms,p)!,start=c.outerStart-c.innerStart,end=c.outerEnd-c.innerEnd;assert(end<start);assert(start<=last+1e-9);last=end;}
});
