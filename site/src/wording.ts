// Display names are separate from stable values in imported JSON.
export function correctionLabel(kind:string):string{
 const labels:Record<string,string>={nearest_shift:'近い値へずらす',block_shift:'塊ずらし',carry:'繰り上がり',unspecified:'不明',none:'不要'};
 return labels[kind]??'不明';
}
