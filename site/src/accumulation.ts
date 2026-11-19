/** A construction counts towards a fewest number of products unless its max_k (the longest sum of its products that is
 exact in the FP32 accumulator) is known to be below 2; an unknown max_k counts. One with max_k 1 is still listed and shown
 on its card. */
export const accumulable=(maxK:number|null|undefined)=>maxK==null||maxK>=2;
