// Keep the math font's advance and line box; draw its tall delimiter with a
// constant stroke instead of magnifying the weight of the font glyph.
export function GroupBrace({side,size}:{side:'left'|'right';size:number}){
 return <span className="numeric-group-brace" data-group-brace={side} aria-hidden="true" style={{fontSize:size}}>
  <span className="brace-metric">{side==='left'?'{':'}'}</span>
  <svg viewBox="0 0 100 100" preserveAspectRatio="none" focusable="false">
   <path transform={side==='right'?'translate(100 0) scale(-1 1)':undefined}
    d="M87 0 C50 0 50 12 50 25 L50 37 C50 44 32 48 13 50 C32 52 50 56 50 63 L50 75 C50 88 50 100 87 100"
    fill="none" stroke="currentColor" strokeWidth="1.1" vectorEffect="non-scaling-stroke"/>
  </svg>
 </span>;
}
