import {createContext} from 'react';
import {defaultCostSettings,type CostSettings} from './cost.ts';
export const CostContext=createContext<CostSettings>(defaultCostSettings);
