const {open}=require('./harness');
(async()=>{const {browser,page,errors}=await open({vp:{width:1180,height:820}});
 await page.waitForTimeout(1500);
 await page.click('#nav button:has-text("Annales")');await page.waitForTimeout(500);
 console.log('bandeau', await page.locator('.warn').first().textContent().catch(()=>null));
 // ouvrir une annale -> écran d'erreur
 await page.evaluate(()=>{const A=S.annales.get('bcard24')||[...S.annales.values()].find(a=>a.file==='cardio-mm1-nov2024.pdf');startSeries(itemsOf(A),'t','x')}).catch(e=>console.log('start err',e.message));
 await page.waitForTimeout(3000);
 console.log('ecran', (await page.locator('#view h3').first().textContent().catch(()=>''))); 
 await page.screenshot({path:'/tmp/claude-0/g1.png'});
 await page.click('#pickLoc');
 // mauvais fichier d'abord (psy) puis le bon
 await page.setInputFiles('#lfile',['/tmp/claude-0/orig/7816cc57-MM2-Psy-Juin-2025.pdf']);
 await page.waitForFunction(()=>document.querySelector('#ldrop')&&/reli/.test(document.querySelector('#ldrop').textContent),null,{timeout:120000});
 console.log('rep1',await page.locator('#lrep').textContent());
 await page.setInputFiles('#lfile',['/tmp/claude-0/orig/3c6bee2e-MM1-Cardiologie-Nov-2024.pdf']);
 await page.waitForTimeout(500);
 await page.waitForFunction(()=>!document.querySelector('.modal'),null,{timeout:120000}).catch(()=>console.log('modal still open'));
 await page.waitForTimeout(2500);
 await page.screenshot({path:'/tmp/claude-0/g2.png'});
 console.log('question visible', await page.locator('canvas').count());
 // import multiple depuis l'onglet annales
 await page.evaluate(()=>{play=null;go('annales')});await page.waitForTimeout(500);
 await page.click('#locImp');
 await page.setInputFiles('#lfile',['/tmp/claude-0/orig/22656a47-Corrige__Cardio_MM1_Nov_25.pdf','/tmp/claude-0/orig/7816cc57-MM2-Psy-Juin-2025.pdf']);
 await page.waitForFunction(()=>/reli/.test(document.querySelector('#ldrop').textContent),null,{timeout:180000});
 console.log('rep2',await page.locator('#lrep').textContent());
 // sujet vierge sur cardio 2025
 const ok=await page.evaluate(async()=>{const A=[...S.annales.values()].find(a=>a.file==='cardio-mm1-nov2025.pdf');await ensureData(A);const b=await buildBlankPdf(A);return [A.loaded,b.length]});console.log('vierge',ok);
 // persistance après rechargement
 await page.reload();await page.waitForSelector('#nav button');await page.waitForTimeout(1500);
 console.log('apres reload',await page.evaluate(async()=>{const A=[...S.annales.values()].find(a=>a.file==='mm2-psy-juin2025.pdf'||/psy/i.test(a.file)&&a.date==='2025-06');await ensureData(A);return [A.id,A.loaded,A.data.nq,S.locCount]}));
 console.log('errors',errors);await browser.close()})();
