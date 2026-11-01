// Largeurs iPad (paysage, portrait) et téléphone, clair et sombre : aucun défilement horizontal, sur chaque écran.
// Captures dans tests/out/ pour un contrôle à l'œil.
const H=require('./harness');const path=require('path');
const SIZES=[['ipad-paysage',{width:1180,height:820},false],['ipad-portrait',{width:820,height:1180},false],['telephone',{width:390,height:844},true],['petit-telephone',{width:320,height:640},false]];
(async()=>{const browser=await H.newBrowser();
  for(const [name,vp,dark] of SIZES){const o=await H.open({browser,vp,dark,touch:vp.width<1000,email:'admin@exemple.fr',members:{'admin@exemple.fr':'admin'}});const {page}=o;
    const sw=async where=>{const [s,w]=await page.evaluate(()=>[document.documentElement.scrollWidth,innerWidth]);H.check(s<=w,`${name} · ${where} : pas de défilement horizontal (${s} ≤ ${w})`);
      await page.screenshot({path:path.join(H.FIX,'..','out',`${name}-${where}.png`)})};
    await page.goto('http://swag.test/');await page.waitForSelector('#aEmail');await sw('connexion');
    await page.fill('#aEmail','admin@exemple.fr');await page.click('#aSend');await page.waitForSelector('#aCode');await sw('code');
    await page.fill('#aCode',o.sb.sent.at(-1).code);await page.click('#aOk');await page.waitForSelector('#nav button');await sw('accueil-vide');
    await page.click('[data-add]');await page.setInputFiles('#imFile',H.fixtures());
    await page.waitForFunction(()=>/Terminé/.test(document.querySelector('#imNow').textContent),null,{timeout:300000});await sw('import-recap');await page.click('#imClose');
    for(const t of ['accueil','annales','series','stats','reglages','membres']){await page.click(`[data-tab=${t}]`);await page.waitForTimeout(250);await sw(t)}
    await page.evaluate(()=>{const A=[...S.annales.values()].find(a=>a.data.cases.some(c=>c.enonce.length));startSeries(itemsOf(A),'Essai','train')});
    await page.waitForSelector('#qc canvas');await page.waitForTimeout(300);await sw('question');
    await page.click('#go');await page.waitForSelector('#qc.done');await sw('correction');
    await page.click('#stop');await page.waitForTimeout(300);await sw('bilan');
    await page.click('[data-tab=carnet]');await page.waitForSelector('.err canvas');await sw('carnet');
    await page.evaluate(()=>openEdit([...S.annales.values()][0]));await sw('modifier');
    H.check(o.errors.length===0,`${name} : aucune erreur JavaScript ${JSON.stringify(o.errors)}`);await o.close()}
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
