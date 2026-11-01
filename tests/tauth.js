// Connexion et adhésions (Supabase simulé) : code par e-mail, lien magique, refus d'un non-membre,
// accès hors ligne, administration des membres, retrait d'un membre, déconnexion.
const H=require('./harness');
const txt=p=>p.evaluate(()=>document.querySelector('#view').innerText);
(async()=>{const browser=await H.newBrowser();let o;
  // configuration absente
  o=await H.open({browser,config:'window.SWAG_CONFIG={supabaseUrl:"",supabaseAnonKey:""};'});await o.page.goto('http://swag.test/');await o.page.waitForSelector('.auth h2');
  H.check(/pas encore configuré/.test(await txt(o.page)),'config.js vide : écran « pas encore configuré »');await o.close();

  // membre : code à 6 chiffres
  o=await H.open({browser});let {page,sb}=o;await page.goto('http://swag.test/');await page.waitForSelector('#aEmail');
  H.check(await page.evaluate(()=>document.querySelector('#nav').children.length===0),'écran de connexion avant l\'app (aucun onglet)');
  H.check(/contrôle d'accès se fait dans ton navigateur/.test(await txt(page)),'écran de connexion honnête sur le contrôle côté navigateur');
  await page.fill('#aEmail','  Membre@Exemple.FR ');await page.click('#aSend');await page.waitForSelector('#aCode');
  H.check(sb.sent.length===1&&sb.sent[0].email==='membre@exemple.fr'&&sb.sent[0].redirect==='http://swag.test/','code envoyé à l\'adresse normalisée, lien de retour vers le site');
  await page.fill('#aCode','000000');await page.click('#aOk');await page.waitForSelector('.msg.live');
  H.check(/Code incorrect ou expiré/.test(await txt(page)),'mauvais code : message clair');
  sb.rateLimit=true;await page.click('#aResend');await page.waitForFunction(()=>/42 secondes/.test(document.querySelector('.msg.live').textContent));H.check(true,'renvoi trop rapproché : « attends 42 secondes »');sb.rateLimit=false;
  await page.reload();await page.waitForSelector('#aCode');H.check(true,'après rechargement, la saisie du code est conservée (app installée qui se recharge)');
  await page.fill('#aCode',sb.sent.at(-1).code);await page.click('#aOk');await page.waitForSelector('#nav button');
  const tabs=await page.evaluate(()=>[...document.querySelectorAll('#nav button')].map(b=>b.dataset.tab));
  H.check(!tabs.includes('membres'),'membre simple : pas d\'onglet Membres');
  await page.click('[data-tab=reglages]');H.check(/membre@exemple\.fr/.test(await txt(page)),'Réglages : adresse de connexion affichée');
  // hors ligne : Supabase injoignable, accès gardé
  await H.importFiles(page,[H.FIX+'/fx-MM1_Pneumo_2023-12.pdf']);await page.click('#imClose');
  sb.down=true;await page.reload();await page.waitForSelector('#nav button');
  H.check(await page.isVisible('#offBadge'),'Supabase injoignable : app ouverte, badge « hors ligne »');
  H.check(await page.evaluate(()=>S.annales.size)===1,'hors ligne : annales toujours là');
  // bibliothèque de connexion absente (CDN injoignable, pas de cache) : accès gardé si vérifié récemment
  o.state.cdnDown=true;await page.reload();await page.waitForSelector('#nav button');H.check(await page.isVisible('#offBadge'),'supabase-js non chargé : accès hors ligne grâce à la vérification récente');o.state.cdnDown=false;
  // vérification trop ancienne
  await page.evaluate(()=>{const a=JSON.parse(localStorage.getItem('swag-access'));a.at=Date.now()-40*864e5;localStorage.setItem('swag-access',JSON.stringify(a))});
  await page.reload();await page.waitForSelector('.auth h2');H.check(/Connexion nécessaire/.test(await txt(page)),'hors ligne et vérification de plus de 30 jours : connexion demandée');
  sb.down=false;await page.reload();await page.waitForSelector('#nav button');H.check(!(await page.isVisible('#offBadge')),'de retour en ligne : adhésion revérifiée, session conservée');
  // retrait du membre : détecté à la vérification suivante
  sb.members.delete('membre@exemple.fr');
  await page.evaluate(()=>{const a=JSON.parse(localStorage.getItem('swag-access'));a.at=Date.now()-7*3600e3;localStorage.setItem('swag-access',JSON.stringify(a));dispatchEvent(new Event('online'))});
  await page.waitForSelector('.auth .msg');H.check(/pas sur la liste des membres/.test(await txt(page)),'membre retiré : accès refusé à la vérification suivante');
  H.check(await page.evaluate(()=>localStorage.getItem('swag-access'))===null,'membre retiré : plus d\'accès hors ligne');
  sb.members.set('membre@exemple.fr',{email:'membre@exemple.fr',role:'member'});await H.login(o,'membre@exemple.fr');
  H.check(await page.evaluate(()=>S.annales.size)===1,'reconnexion : les données locales sont intactes');
  await page.click('[data-tab=reglages]');await page.click('#signOut');await page.waitForSelector('#aEmail');
  H.check(await page.evaluate(()=>!localStorage.getItem('swag-auth')&&!localStorage.getItem('swag-access')),'déconnexion : session et accès effacés');
  H.check(o.errors.length===0,'aucune erreur JavaScript '+JSON.stringify(o.errors));await o.close();

  // non-membre : refusé, aucun e-mail envoyé
  o=await H.open({browser});({page,sb}=o);await page.goto('http://swag.test/');await page.waitForSelector('#aEmail');
  await page.fill('#aEmail','inconnu@exemple.fr');await page.click('#aSend');await page.waitForSelector('.auth .msg');
  H.check(/pas sur la liste des membres/.test(await txt(page))&&sb.sent.length===0,'non-membre : refus clair, aucun code envoyé');
  H.check(!/admin@/.test(await page.content()),'l\'adresse de l\'administrateur n\'apparaît pas');
  await page.fill('#aEmail','pas-une-adresse');await page.click('#aSend');H.check(/ne semble pas valide/.test(await txt(page)),'adresse invalide : message');
  // retiré entre l'envoi du code et la saisie
  await page.fill('#aEmail','membre@exemple.fr');await page.click('#aSend');await page.waitForSelector('#aCode');sb.members.delete('membre@exemple.fr');
  await page.fill('#aCode',sb.sent.at(-1).code);await page.click('#aOk');await page.waitForSelector('.auth .msg');
  H.check(/pas sur la liste des membres/.test(await txt(page))&&!(await page.evaluate(()=>localStorage.getItem('swag-auth'))),'connecté mais absent de la table : refus et déconnexion');
  await o.close();

  // lien magique (ouvert dans le navigateur)
  o=await H.open({browser});({page,sb}=o);const ses=sb.session('membre@exemple.fr');
  await page.goto(`http://swag.test/#access_token=${ses.access_token}&expires_at=${ses.expires_at}&expires_in=3600&refresh_token=${ses.refresh_token}&token_type=bearer&type=magiclink`);
  await page.waitForSelector('#nav button');H.check(!(await page.evaluate(()=>location.hash)).includes('access_token'),'lien magique : connecté, jetons retirés de l\'adresse');await o.close();
  o=await H.open({browser});({page}=o);await page.goto('http://swag.test/#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired');
  await page.waitForSelector('.auth .msg');H.check(/n'est plus valable/.test(await txt(page)),'lien expiré : message et nouvelle demande possible');await o.close();

  // administration
  o=await H.openApp({browser,email:'admin@exemple.fr'});({page,sb}=o);
  await page.click('[data-tab=membres]');await page.waitForSelector('#mAdd');
  H.check(/2 adresses/.test(await txt(page)),'admin : onglet Membres, liste lue');
  await page.fill('#mAdd','Nouvelle@Exemple.fr, faux@\nautre@exemple.fr');await page.click('#mGo');H.check(/non valide : faux@/.test(await page.textContent('#mRes')),'adresse invalide signalée, rien ajouté');
  await page.fill('#mAdd','Nouvelle@Exemple.fr\nautre@exemple.fr; membre@exemple.fr');await page.fill('#mNote','promo 2027');await page.click('#mGo');await page.waitForFunction(()=>/4 adresses/.test(document.querySelector('#view').innerText));
  H.check(sb.members.has('nouvelle@exemple.fr')&&sb.members.get('autre@exemple.fr').note==='promo 2027','ajout de 2 membres (minuscules, note), doublon ignoré');
  await page.click('[data-role="autre@exemple.fr"]');await page.waitForFunction(()=>document.querySelector('[data-role="autre@exemple.fr"]').textContent.includes('Retirer'));
  H.check(sb.members.get('autre@exemple.fr').role==='admin','rendre admin');
  await page.click('[data-del="nouvelle@exemple.fr"]');await page.click('[data-del="nouvelle@exemple.fr"]');await page.waitForFunction(()=>!document.querySelector('[data-del="nouvelle@exemple.fr"]'));
  H.check(!sb.members.has('nouvelle@exemple.fr'),'retrait d\'un membre (avec confirmation)');
  H.check(!(await page.$('[data-del="admin@exemple.fr"]')),'l\'admin ne peut pas se retirer lui-même');
  H.check(o.errors.length===0,'aucune erreur JavaScript '+JSON.stringify(o.errors));await o.close();
  // un membre simple ne peut pas modifier la table (règles RLS simulées)
  o=await H.openApp({browser});const r=await o.page.evaluate(async()=>{const {error}=await sb.from('members').insert({email:'pirate@exemple.fr'});const l=await sb.from('members').select('*');return[!!error,l.data.length]});
  H.check(r[0]&&r[1]===1,'membre simple : ajout refusé, ne voit que sa propre ligne');await o.close();
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
