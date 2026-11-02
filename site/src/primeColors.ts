import {DIRECT_COLORS,directPalette} from './productPalette.ts';
// Stable across catalogues, filters, sorting and FP4/FP6. Never cycle nine colours.
// Separate the six most-used primes by hue; orange is an existing AWE block colour.
const firstSix=[DIRECT_COLORS[0],DIRECT_COLORS[1],DIRECT_COLORS[8],DIRECT_COLORS[3],'#E8710A',DIRECT_COLORS[6]];
const swatches=[...new Set([...firstSix,...directPalette(72)])];
const used=new Set(swatches);
// Discrete RGB swatches extend the existing palette; no interpolated gradient.
for(let i=0;swatches.length<6542;i++){
 const code=(i*4051)%32768;
 const color='#'+[code>>10,(code>>5)&31,code&31].map(v=>(v*8).toString(16).padStart(2,'0')).join('');
 if(!used.has(color)){used.add(color);swatches.push(color);}
}
const composite=new Uint8Array(65537);
export const PRIME_COLORS=new Map<number,string>();
for(let p=2;p<=65536;p++)if(!composite[p]){
 PRIME_COLORS.set(p,swatches[PRIME_COLORS.size]);
 for(let n=p*p;n<=65536;n+=p)composite[n]=1;
}
