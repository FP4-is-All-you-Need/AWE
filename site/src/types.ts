export type Side = 'A' | 'B';
export type Pair<T> = { A: T; B: T };
export type Solution = {
  schema_version: 1; kind: 'integer'; id: string;
  weights: Pair<number[]>; limb_sets: Pair<string[]>; planes: Pair<number[][]>; plane_sets: Pair<string[]>;
  products: {a:number;b:number;numerator:number}[]; denominator:number; domain:Pair<number[]>;
  widths:Pair<number>; coverage:Pair<number>;
  accumulation:{precision_bits:number;mode:string;max_k:number|null;product_bounds:number[]};
  verified:{method:string;n_pairs:number;n_pairs_proven:number;date:string;verifier_version:string};
  provenance:{source_sha256:string;position:number}[];
};
export type RowCost = {add_a:number|null;add_b:number|null;domain_a?:[number,number];domain_b?:[number,number]};
export type Row = [string,number,number,number,number,number,number,number,number,number|null,number[],number[],boolean,RowCost?];
export type Group = {path:string;sha256:string;count:number;width_a:number;width_b:number;r:number;mixed:boolean};
export type Search = {schema_version:number;complete:boolean;count:number;groups:Group[]};
export type MatrixSolution = Pick<Solution,'weights'|'planes'|'products'|'denominator'>;
export type Catalog = {schema_version:number;complete:boolean;count:number;data_version:string;files:{path:string;sha256:string;count:number}[];search:{path:string;sha256:string};modular?:{path:string;sha256:string}};
export type Filters = {a:number;b:number;r:number;limbs:number;planes:number;denominator:number;minK:number;weight:string;mixed:boolean;costProduct:number;costPlane:number};
