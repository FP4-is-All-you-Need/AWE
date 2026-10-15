import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./pages-tests',workers:1,timeout:180000,use:{baseURL:'http://127.0.0.1:4176/AWE/',viewport:{width:1440,height:1000}},webServer:{command:'nice -n 10 python3 ../tools/serve_pages.py --directory dist',url:'http://127.0.0.1:4176/AWE/',reuseExistingServer:false}});
