const {open}=require('./harness');
(async()=>{const {browser,page,errors}=await open();
await page.waitForTimeout(800);await page.screenshot({path:'01-accueil.png'});
await page.click('[data-tab=annales]');await page.waitForTimeout(300);await page.screenshot({path:'02-annales.png',fullPage:false});
const sw=await page.evaluate(()=>[document.documentElement.scrollWidth,innerWidth]);console.log('scroll',sw);
// Cardio 2024 entraînement -> Q2 (Tilt-test)
await page.evaluate(()=>{const A=S.annales.get('bcard24');startSeries(itemsOf(A),'test','train')});
await page.waitForSelector('#qc canvas');await page.waitForTimeout(300);
await page.click('#go');await page.waitForTimeout(200);await page.click('#go');await page.waitForSelector('#qc canvas');await page.waitForTimeout(400);
await page.screenshot({path:'03-c24-q2.png'});
await page.fill('#qin','tilt test');await page.click('#go');await page.waitForTimeout(300);await page.screenshot({path:'04-c24-q2-done.png'});
console.log('errors',errors);await browser.close()})();
