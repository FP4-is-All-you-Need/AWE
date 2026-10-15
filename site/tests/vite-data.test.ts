import test from 'node:test';
import assert from 'node:assert/strict';
import config from '../vite.config.ts';
import {resolve} from 'node:path';
test('legacy preview env cannot replace the dev catalog with four test entries',async()=>{
 const previous=[process.env.AWE_PREVIEW,process.env.AWE_PUBLIC];
 try{
  process.env.AWE_PREVIEW='1';delete process.env.AWE_PUBLIC;
  const dev=await config({command:'serve',mode:'development'});
  assert.equal(dev.publicDir,resolve(import.meta.dirname,'../../data'));
  const fixture=await config({command:'build',mode:'production'});
  assert.equal(fixture.publicDir,resolve(import.meta.dirname,'../../build/preview-data'));
 }finally{for(const [i,key] of ['AWE_PREVIEW','AWE_PUBLIC'].entries())if(previous[i]===undefined)delete process.env[key];else process.env[key]=previous[i];}
});
