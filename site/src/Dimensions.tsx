import {createContext} from 'react';
export type Dimensions={m:number;n:number;k:number;onSize:(key:'m'|'n'|'k',value:number)=>void};
export const DimensionContext=createContext<Dimensions>({m:8192,n:8192,k:8192,onSize:()=>{}});
