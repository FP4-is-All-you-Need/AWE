import {enumerateRepresentations,type RepresentationSpec} from './representations.ts';
self.onmessage=(event:MessageEvent<RepresentationSpec|null>)=>self.postMessage(enumerateRepresentations(event.data));
