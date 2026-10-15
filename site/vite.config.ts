import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
export default defineConfig(({command})=>{
  // The small test catalog is an explicit build target, never the dev site.
  const preview=command==='build'&&process.env.AWE_PREVIEW==='1'&&process.env.AWE_PUBLIC!=='1';
  const data=resolve(import.meta.dirname,process.env.AWE_PUBLIC==='1'?'../build/pages-data':preview?'../build/preview-data':'../data');
  const required=preview?['index.json']:['index.json','visualization/modsets.json','modular/catalog.json','modular/powers.json','modular/fp32.json','modular/fp32-history.json'];
  for(const file of required)if(!existsSync(resolve(data,file)))throw new Error(`AWE ${file} is missing. Prepare the selected catalog before starting Vite.`);
  return {base:'./',publicDir:data,plugins:[{name:'build-revision',apply:'build',generateBundle(){
    const cwd=resolve(import.meta.dirname,'..');
    const revision=execFileSync('git',['rev-parse','HEAD'],{cwd,encoding:'utf8'}).trim();
    const dirty=execFileSync('git',['status','--porcelain'],{cwd,encoding:'utf8'}).trim().length>0;
    this.emitFile({type:'asset',fileName:'build-version.json',source:JSON.stringify({revision,dirty})+'\n'});
  }}],build:{target:'es2022'}};
});
