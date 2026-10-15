import {measurePlaneDistribution} from './planeDistribution.ts';
import {encodingDiff} from './encodingDiff.ts';
self.onmessage=e=>{try{const base=measurePlaneDistribution(e.data.c,e.data.side,e.data.override);self.postMessage(encodingDiff(e.data.c,e.data.side,base,e.data.excluded??[]));}catch{self.postMessage({error:'invalid_encoding'});}};
