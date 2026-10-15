// Labels describe the evidence checked by the verifier, not an imported claim.
export const PROOF_LABELS:Record<string,string>={
 full_pairs:'全対の照合',
 exhaustive_encoding_and_bilinear_identity:'係数の式の一致 ＋ 片側の全数',
 coverage_proof_and_bilinear_identity:'係数の式の一致 ＋ 被覆の証明',
};
export function proofLabel(method:string):string{return Object.hasOwn(PROOF_LABELS,method)?PROOF_LABELS[method]:'未検証';}
