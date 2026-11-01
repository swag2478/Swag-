const {open}=require('./harness');const fs=require('fs');
(async()=>{const {browser,page,errors}=await open();
for(const id of ['bmalinf25','bcard24','bpedia25']){
  await page.evaluate(async id=>{await downloadBlank(S.annales.get(id),document.createElement('button'))},id);
  const d=await page.evaluate(()=>window.__dl.pop());if(!d){console.log('no dl',id);continue}
  fs.writeFileSync('blank-'+id+'.pdf',Buffer.from(d.b64,'base64'));console.log(d.filename,fs.statSync('blank-'+id+'.pdf').size)}
await page.evaluate(()=>{const A=S.annales.get('bcard24');const c=A.data.cases.findIndex(x=>x.qs.some(q=>q.type==='TCS'));startSeries([{a:'bcard24',c,q:0}],'tcs2','train')});
await page.waitForSelector('#qc canvas');await page.waitForTimeout(400);
const el=await page.$('#qc');await el.screenshot({path:'tcs2-zoom.png'});
await page.evaluate(()=>document.querySelectorAll('#qc .opt')[2].click());await page.click('#go');await page.waitForTimeout(400);await (await page.$('#qc')).screenshot({path:'tcs2-done.png'});
console.log(errors.filter(e=>!e.includes('ERR_FAILED')));await browser.close()})();
