// Paper Figure 3: Xcarry(L) = (13^L - 1) / 3.
export function base13Width(width:number){const required=(1n<<BigInt(width-1))-1n;let radius=0n,limbs=0;while(radius<required){radius=13n*radius+4n;limbs++;}return {limbs,radius};}
export function base13Products(a:number,b:number){return base13Width(a).limbs*base13Width(b).limbs;}
const cache=new Map<number,number>();
// Fixed base-13 digits, reduced modulo p. This measures coverage, not new weights.
export function base13ModProducts(p:number){if(cache.has(p))return cache.get(p)!;let residues=new Set([0]),weight=1,limbs=0;const S=[-12,-8,-6,-4,-3,-2,-1,0,1,2,3,4,6,8,12];while(residues.size<p){const next=new Set<number>();for(const r of residues)for(const digit of S)next.add(((r+digit*weight)%p+p)%p);residues=next;weight=weight*13%p;limbs++;if(limbs>32)throw Error('Base-13 coverage limit');}cache.set(p,limbs*limbs);return limbs*limbs;}
export function withinReference(products:number,reference:number,include:boolean,maximum=0){return products<=reference||maximum>=17||include&&products<=16;}
