// Parcours : entraînement, examen, carnet ; sauvegarde puis restauration sur un autre appareil ;
// partage iPad (navigator.share, « Enregistrer dans Fichiers ») ; conseil d'installation sur iPad.
const H=require('./harness');const fs=require('fs');
const IPAD='Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
(async()=>{const browser=await H.newBrowser();const sb=H.makeSupabase({'membre@exemple.fr':'member'});
  const files=[H.FIX+'/fx-Corrige_Cardio_MM1_Nov_25.pdf',H.FIX+'/fx-MM1_Pneumo_2023-12.pdf'];
  let o=await H.openApp({browser,sb});let {page}=o;
  await H.importFiles(page,files);await page.click('#imClose');
  H.check(await page.evaluate(()=>document.querySelectorAll('.uesec').length===2&&[...document.querySelectorAll('.uehead h3')].map(h=>h.textContent).join()==='Cardiologie,Pneumologie'),'Annales classées par UE puis par année');
  // entraînement : Q1 fausse (une seule case cochée), Q2 juste
  const card=await page.evaluate(()=>[...S.annales.values()].find(A=>A.ue==='Cardiologie').id);
  await page.click(`[data-go="${card}"]:not([data-mode])`);await page.waitForSelector('#qc canvas');
  await page.keyboard.press('b');await page.click('#go');await page.waitForSelector('#qc.done');
  H.check(/0 \/ 1|0,?\d* \/ 1/.test(await page.textContent('#res')),'question ratée : note affichée');
  await page.click('#go');await page.waitForSelector('#qc:not(.done) canvas');
  await page.evaluate(()=>{const it=play.items[play.i],Q=qOf(it.a,it.c,it.q);Q.opts.forEach((o,i)=>{if(o.v)document.querySelectorAll('#qc .opt')[i].click()})});
  await page.click('#go');await page.waitForSelector('#qc.done');H.check(/1 \/ 1/.test(await page.textContent('#res')),'bonne réponse : 1 / 1');
  await page.click('#stop');await page.waitForSelector('.big');H.check(true,'bilan affiché');
  await page.click('#toCarnet');await page.waitForSelector('.err .result');
  const carnet=await page.textContent('#view');
  H.check(/ta réponse et la correction officielle/.test(carnet)&&!/Claude|Expliquer|explication/i.test(carnet),'carnet : capture, réponse, correction officielle, sans explication IA');
  // examen
  await page.click('[data-tab=annales]');await page.click(`[data-go="${card}"][data-mode=exam]`);await page.waitForSelector('#chrono2');
  await page.click('#go');await page.waitForSelector('#qc canvas');await page.click('#stop');await page.waitForSelector('.big');H.check(true,'examen chronométré terminé, bilan');
  // sauvegarde
  await page.click('[data-tab=reglages]');
  const [dl]=await Promise.all([page.waitForEvent('download'),page.click('#bkSave')]);const BK=H.FIX+'/../out/sauvegarde.json';await dl.saveAs(BK);const B=JSON.parse(fs.readFileSync(BK,'utf8'));
  H.check(/^Swag - sauvegarde \d{4}-\d\d-\d\d\.json$/.test(dl.suggestedFilename()),'sauvegarde : '+dl.suggestedFilename());
  H.check(B.app==='swag'&&B.results.length>=5&&B.series.length===2&&B.annales.length===2,'sauvegarde : résultats, séries, liste des annales');
  H.check(B.annales.every(a=>!('data' in a))&&JSON.stringify(B).length<20000,'sauvegarde sans PDF ni contenu des annales ('+JSON.stringify(B).length+' octets)');
  const before=await page.evaluate(()=>{const s=statsFor(annList());return[s.done,errorsFor(annList()).length]});
  await o.close();
  // autre appareil : restauration puis réimport des mêmes PDF
  o=await H.openApp({browser,sb});page=o.page;
  await page.click('[data-tab=reglages]');await page.setInputFiles('#bkFile',BK);await page.waitForSelector('#pendList');
  H.check(/2 annales attendent/.test(await page.textContent('#pendList')),'restauration : 2 annales attendent leur PDF');
  await H.importFiles(page,files);const rec=await page.textContent('#imRec');await page.click('#imClose');
  H.check(/retrouvée dans ta sauvegarde/.test(rec),'réimport : annales reconnues grâce à la sauvegarde');
  const after=await page.evaluate(()=>{const s=statsFor(annList());return[s.done,errorsFor(annList()).length,S.pending.size,S.series.size]});
  H.check(after[0]===before[0]&&after[1]===before[1]&&after[2]===0&&after[3]===2,`progression retrouvée (${after[0]} questions faites, ${after[1]} erreurs, 2 séries)`);
  // restauration d'un mauvais fichier
  fs.writeFileSync(H.FIX+'/../out/pas-swag.json','{"x":1}');await page.click('[data-tab=reglages]');await page.setInputFiles('#bkFile',H.FIX+'/../out/pas-swag.json');
  await page.waitForSelector('.toast');H.check(/pas une sauvegarde Swag/.test(await page.textContent('.toast')),'fichier étranger refusé');
  H.check(o.errors.length===0,'aucune erreur JavaScript '+JSON.stringify(o.errors));await o.close();

  // iPad : partage de fichiers et conseil d'installation
  const init=()=>{window.__share=[];let first=true;navigator.canShare=d=>!!(d&&d.files&&d.files.length);
    navigator.share=async d=>{const f=d.files[0];window.__share.push({name:f.name,type:f.type,size:f.size});if(window.__denyFirst&&first){first=false;const e=new Error('geste');e.name='NotAllowedError';throw e}}};
  o=await H.openApp({browser,sb,vp:{width:820,height:1180},touch:true,mobile:true,ua:IPAD,init});page=o.page;
  H.check(await page.isVisible('#iosHint')&&/écran d'accueil/.test(await page.textContent('#iosHint'))&&/7 jours/.test(await page.textContent('#iosHint')),'iPad dans Safari : conseil « installe Swag sur l\'écran d\'accueil » (7 jours)');
  await page.click('#iosHideBtn');H.check(!(await page.isVisible('#iosHint')),'« Plus tard » masque le conseil sur l\'accueil');
  await page.click('[data-tab=reglages]');H.check(await page.isVisible('#iosHint'),'le conseil reste dans Réglages');
  await H.importFiles(page,[files[0]]);await page.click('#imClose');
  const id=await page.evaluate(()=>[...S.annales.values()][0].id);
  await page.click(`[data-orig="${id}"]`);await page.waitForFunction(()=>window.__share.length===1);
  let sh=await page.evaluate(()=>window.__share[0]);H.check(sh.name.startsWith('Corrigé - Cardiologie')&&sh.type==='application/pdf'&&sh.size>1000,'iPad : corrigé envoyé à la feuille de partage ('+sh.name+')');
  await page.evaluate(()=>{window.__denyFirst=true});await page.click(`[data-blank="${id}"]`);await page.waitForSelector('#ofSh',{timeout:60000});
  H.check(true,'préparation longue : Swag redemande un toucher (« Ton fichier est prêt »)');await page.click('#ofSh');await page.waitForFunction(()=>window.__share.length===3);
  sh=await page.evaluate(()=>window.__share[2]);H.check(sh.name.startsWith('Sujet vierge - Cardiologie')&&sh.size>10000,'iPad : sujet vierge partagé après le toucher');
  H.check(o.errors.length===0,'aucune erreur JavaScript '+JSON.stringify(o.errors));await o.close();
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
