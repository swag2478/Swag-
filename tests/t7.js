const {open}=require('./harness');
(async()=>{const {browser,page,errors}=await open();
await page.click('[data-tab=annales]');await page.waitForTimeout(500);
console.log(await page.evaluate(()=>[S.annales.size,document.querySelectorAll('.card').length,document.querySelectorAll('.uesec').length]));
await page.screenshot({path:'full-annales.png'});
// lancer une annale du Drive au format couleur et une fmt1
const ids=await page.evaluate(()=>{const a=[...S.annales.values()].filter(A=>A.id.startsWith('d'));return [a[0].id,a[50].id,a[120].id,a[200].id]});
for(const id of ids){await page.evaluate(id=>startSeries(itemsOf(S.annales.get(id)),'t','train'),id);await page.waitForSelector('#qc canvas',{timeout:20000});await page.waitForTimeout(300)}
await page.screenshot({path:'full-play.png'});
await page.click('[data-tab=series]');await page.waitForTimeout(300);await page.screenshot({path:'full-series.png'});
await page.click('[data-tab=reglages]');await page.waitForTimeout(300);
console.log(errors.filter(e=>!e.includes('ERR_FAILED')));await browser.close()})();
