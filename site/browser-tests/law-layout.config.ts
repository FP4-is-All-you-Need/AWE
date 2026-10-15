import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'.',testMatch:'law-layout.spec.ts',workers:1,timeout:60000,use:{baseURL:'http://127.0.0.1:4177',headless:true},webServer:{command:'AWE_PUBLIC=1 npm run dev -- --port 4177',cwd:new URL('..',import.meta.url).pathname,url:'http://127.0.0.1:4177',reuseExistingServer:true}});
