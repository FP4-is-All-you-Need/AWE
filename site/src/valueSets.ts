/** The arithmetic formats of the page and their value sets. Each value set is the format's values divided by its smallest
 subnormal, so every value is an integer: 2×E2M1, 8×E2M3, 16×E3M2 and 512×E4M3. */
export const FORMAT_SETS={fp4:['2xE2M1'],fp6:['8xE2M3','16xE3M2'],fp8:['512xE4M3']} as const;
export type PageFormat=keyof typeof FORMAT_SETS;
export const PAGE_FORMATS=Object.keys(FORMAT_SETS) as PageFormat[];
export const VALUE_SET_LABEL:Record<string,string>={'2xE2M1':'FP4 (2×E2M1)','8xE2M3':'FP6 (8×E2M3)','16xE3M2':'FP6 (16×E3M2)','512xE4M3':'FP8 (512×E4M3)'};
export const pageFormat=(s:string|null):PageFormat=>PAGE_FORMATS.includes(s as PageFormat)?s as PageFormat:'fp4';
