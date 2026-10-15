import { verifyImported, workedExample, IMPORT_BYTES } from './verify.ts';
import type { Solution } from './types.ts';

self.onmessage = async (event:MessageEvent<{id:string;solutions:unknown[];example?:{solution:unknown;a:number;b:number}}>) => {
  const request=event.data;
  const id=typeof request?.id==='string'?request.id:'';
  try {
    if(request?.example){
      if(new TextEncoder().encode(JSON.stringify(request)).length>IMPORT_BYTES)throw new Error('input_resource_limit');
      const result=await workedExample(request.example.solution,request.example.a,request.example.b);self.postMessage({id,result});return;
    }
    if(!request||typeof request.id!=='string'||!Array.isArray(request.solutions)||request.solutions.length<1||request.solutions.length>20) throw new Error('invalid_request');
    if(new TextEncoder().encode(JSON.stringify(request)).length>IMPORT_BYTES) throw new Error('input_resource_limit');
    const solutions:Solution[]=[];
    for(const input of request.solutions) solutions.push(await verifyImported(input));
    self.postMessage({id,solutions});
  } catch(error) {
    const code=error instanceof SyntaxError?'invalid_json':error instanceof Error?error.message:'verification_failed';
    self.postMessage({id,error:code});
  }
};
