const {open}=require('./harness');const fs=require('fs');
const shot=async(page,name)=>{await page.waitForSelector('#qc canvas');await page.waitForTimeout(350);await page.screenshot({path:name,fullPage:true})};
(async()=>{const {browser,page,errors}=await open();
const find=await page.evaluate(async()=>{const A=S.annales.get('bmalinf25');await ensureData(A);const out={};A.data.cases.forEach((c,ci)=>c.qs.forEach((q,qi)=>{if(!out.just&&q.hide.some(h=>h.kind==='just'))out.just=[ci,qi];if(!out.com&&q.hide.some(h=>h.kind==='comment'))out.com=[ci,qi];if(!out.tcs&&q.type==='TCS')out.tcs=[ci,qi];if(!out.qroc&&q.type==='QROC')out.qroc=[ci,qi]}));return out});
console.log(find);
for(const [k,[c,q]] of Object.entries(find)){
  await page.evaluate(([c,q])=>startSeries([{a:'bmalinf25',c,q}],'test '+c+'/'+q,'train'),[c,q]);
  await shot(page,`m-${k}-a.png`);
  if(await page.$('#qin'))await page.fill('#qin','uretrite');else await page.evaluate(()=>document.querySelectorAll('#qc .opt')[1].click());
  await page.click('#go');await page.waitForTimeout(400);await page.screenshot({path:`m-${k}-b.png`,fullPage:true});
}
// fmt2 TCS
await page.evaluate(async()=>{const A=S.annales.get('bcard24');await ensureData(A);const c=A.data.cases.findIndex(x=>x.qs.some(q=>q.type==='TCS'));startSeries([{a:'bcard24',c,q:0},{a:'bcard24',c,q:1}],'tcs2','exam')});
await shot(page,'c24-tcs-a.png');await page.evaluate(()=>document.querySelectorAll('#qc .opt')[2].click());await page.click('#go');await page.waitForTimeout(400);await page.click('#prev');await page.waitForTimeout(500);
await page.screenshot({path:'c24-tcs-exam-back.png',fullPage:true});
await page.click('#stop');await page.waitForTimeout(500);await page.screenshot({path:'bilan.png',fullPage:true});
console.log('errors',errors);await browser.close()})();
