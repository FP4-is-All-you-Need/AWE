// Fixed colours follow increasing products of limb weights.
export const DIRECT_COLORS=['#C2185B','#884499','#4A53A8','#0277BD','#0097A7','#00897B','#43A047','#7CB342','#9E9D24'];
// After nine anchors use discrete darker swatches, not a continuous gradient.
// Additional cells in the served catalogue receive discrete darker swatches.
export const directPalette=(count:number)=>Array.from({length:Math.max(0,count)},(_,i)=>{
 const color=DIRECT_COLORS[i%DIRECT_COLORS.length],round=Math.floor(i/DIRECT_COLORS.length);
 if(!round)return color;
 return '#'+[1,3,5].map(offset=>Math.max(0,parseInt(color.slice(offset,offset+2),16)-round*19).toString(16).padStart(2,'0')).join('');
});
