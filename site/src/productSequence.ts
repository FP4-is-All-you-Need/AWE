/** Product indices in a diagram label, without an ellipsis for one or two terms. */
export function productSequence(count:number):string{
 return count<=2?Array.from({length:count},(_,i)=>`T_{${i}}`).join(', '):`T_{0},\\ldots,T_{${count-1}}`;
}
