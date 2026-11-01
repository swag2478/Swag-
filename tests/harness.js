const {chromium}=require('playwright');const fs=require('fs'),path=require('path');
const ROOT='/home/claude/swag',NM='/tmp/claude-0/t/node_modules';
const SKEL=b=>`<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light;box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;font:14px system-ui}img{max-width:100%}[hidden]{display:none!important}</style></head><body>${b}</body></html>`;
async function open(opts={}){
  const browser=await chromium.launch();const ctx=await browser.newContext({viewport:opts.vp||{width:1180,height:820},deviceScaleFactor:1,colorScheme:opts.dark?'dark':'light'});
  const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  await page.route('**/*',async r=>{const u=r.request().url();
    if(process.env.GUEST&&/\/(_blob|annales|data)\//.test(u))return r.fulfill({status:404,body:''});
    if(u.startsWith('http://swag.test/_blob/')){const id=u.split('/_blob/')[1];if(id==='33ebfa339b9f669570664ef60ae52fc3')return r.fulfill({body:fs.readFileSync(path.join(ROOT,'alldata.json')),contentType:'application/json'});const BM=global.__BM||(global.__BM=Object.fromEntries(fs.readFileSync(path.join(ROOT,'blobmap.txt'),'utf8').trim().split('\n').map(l=>l.split(' ').reverse())));if(BM[id])return r.fulfill({body:fs.readFileSync(path.join(ROOT,'annales',BM[id]+'.pdf')),contentType:'application/pdf'});return r.fulfill({status:404,body:''})}
    if(process.env.BLOCK403&&(u.startsWith('http://swag.test/annales/')||u.startsWith('http://swag.test/data/')))return r.fulfill({status:403,body:''});
    if(u.startsWith('http://swag.test/annales/'))return r.fulfill({body:fs.readFileSync(path.join(ROOT,'annales',decodeURIComponent(u.split('/annales/')[1]))),contentType:'application/pdf'});
    if(u.startsWith('http://swag.test/data/'))return r.fulfill({body:fs.readFileSync(path.join(ROOT,'data',decodeURIComponent(u.split('/data/')[1]))),contentType:'application/json'});
    if(u==='http://swag.test/')return r.fulfill({body:SKEL(fs.readFileSync(ROOT+'/index.html','utf8')),contentType:'text/html'});
    if(u.includes('pdf.js/3.11.174/pdf.min.js'))return r.fulfill({body:fs.readFileSync(NM+'/pdfjs-dist/build/pdf.min.js'),contentType:'text/javascript'});
    if(u.includes('pdf.js/3.11.174/pdf.worker.min.js'))return r.fulfill({body:fs.readFileSync(NM+'/pdfjs-dist/build/pdf.worker.min.js'),contentType:'text/javascript'});
    if(u.includes('pdf-lib/1.17.1/pdf-lib.min.js'))return r.fulfill({body:fs.readFileSync(NM+'/pdf-lib/dist/pdf-lib.min.js'),contentType:'text/javascript'});
    if(u.includes('fonts.g'))return r.abort();
    return r.continue();});
  await page.addInitScript(()=>{window.__dl=[];window.claude={use:async n=>n==='downloads'?{save:async({filename,data})=>{const b=new Uint8Array(await data.arrayBuffer());window.__dl.push({filename,b64:btoa(Array.from(b,c=>String.fromCharCode(c)).join(''))})}}:null}});
  await page.goto('http://swag.test/');await page.waitForSelector('#nav button');
  return{browser,page,errors};
}
module.exports={open};
