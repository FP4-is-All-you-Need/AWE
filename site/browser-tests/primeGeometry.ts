// Font boxes include unused ascenders/descenders. Measure the painted glyphs
// when checking compact SVG labels, using the loaded font and actual transform.
export function primeGeometry(nodes:Element[]){
 const ctx=document.createElement('canvas').getContext('2d')!;
 return nodes.map(n=>{
  const frame=n.querySelector('[data-prime-frame]')!.getBoundingClientRect();
  const texts=[...n.querySelectorAll('text')].map(t=>{
   const style=getComputedStyle(t);ctx.font=`${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
   const m=ctx.measureText(t.textContent??''),ctm=t.getScreenCTM()!;
   const x=Number(t.getAttribute('x')),y=Number(t.getAttribute('y'));
   const start=x-(style.textAnchor==='middle'?m.width/2:style.textAnchor==='end'?m.width:0);
   return {text:t.textContent!,number:t.hasAttribute('data-prime-number'),bits:t.hasAttribute('data-prime-bits'),unit:t.hasAttribute('data-prime-bit-unit'),fontSize:parseFloat(style.fontSize),center:x*ctm.a+ctm.e,r:{left:(start-m.actualBoundingBoxLeft)*ctm.a+ctm.e,right:(start+m.actualBoundingBoxRight)*ctm.a+ctm.e,top:(y-m.actualBoundingBoxAscent)*ctm.d+ctm.f,bottom:(y+m.actualBoundingBoxDescent)*ctm.d+ctm.f}};
  });
  const a=texts.find(t=>t.number)!,b=texts.find(t=>t.bits)!,u=texts.find(t=>t.unit)!;
  return {m:Number(n.getAttribute('data-prime-modulus')),bits:b.text,unit:u.text,width:frame.width,height:frame.height,numberBits:b.r.top-a.r.bottom,bitsUnit:u.r.top-b.r.bottom,centerOffset:Math.abs(a.center-b.center),fonts:texts.map(t=>t.fontSize),overflow:texts.filter(t=>t.r.left<frame.left||t.r.right>frame.right||t.r.top<frame.top||t.r.bottom>frame.bottom).map(t=>t.text),collisions:texts.flatMap((a,i)=>texts.slice(i+1).filter(b=>a.r.left<b.r.right&&a.r.right>b.r.left&&a.r.top<b.r.bottom&&a.r.bottom>b.r.top).map(b=>[a.text,b.text]))};
 });
}
