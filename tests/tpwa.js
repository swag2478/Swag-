// PWA : manifest, icônes, service worker ; fonctionnement hors ligne complet (serveur arrêté, réseau coupé).
process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS='1'; // les requêtes du service worker passent aussi par le banc d'essai
const H=require('./harness');const http=require('http'),fs=require('fs'),path=require('path');
const TYPES={'.html':'text/html; charset=utf-8','.js':'text/javascript','.webmanifest':'application/manifest+json','.png':'image/png'};
(async()=>{
  const srv=http.createServer((req,res)=>{let p=decodeURIComponent(new URL(req.url,'http://x').pathname).replace(/^\//,'')||'index.html';
    if(p==='config.js'){res.writeHead(200,{'content-type':'text/javascript'});return res.end('window.SWAG_CONFIG={supabaseUrl:"'+H.SB+'",supabaseAnonKey:"anon",offlineDays:30};')}
    const f=path.join(H.DIST,p);if(!f.startsWith(H.DIST)||!fs.existsSync(f)){res.writeHead(404);return res.end()}
    res.writeHead(200,{'content-type':TYPES[path.extname(f)]||'application/octet-stream'});res.end(fs.readFileSync(f))});
  await new Promise(r=>srv.listen(0,'127.0.0.1',r));const BASE=`http://localhost:${srv.address().port}/`;
  const o=await H.open({});const {page,ctx,sb,state}=o;
  await page.goto(BASE);await H.login(o,'membre@exemple.fr');
  await page.waitForFunction(()=>navigator.serviceWorker.controller||navigator.serviceWorker.ready.then(()=>true),null,{timeout:20000});
  await page.evaluate(()=>navigator.serviceWorker.ready);
  if(!(await page.evaluate(()=>!!navigator.serviceWorker.controller))){await page.reload();await page.waitForSelector('#nav button')}
  H.check(await page.evaluate(()=>!!navigator.serviceWorker.controller),'service worker actif');
  const man=await page.evaluate(async()=>{const m=await (await fetch('manifest.webmanifest')).json();const sizes=[];for(const i of m.icons){const im=new Image();im.src=i.src;await im.decode();sizes.push(im.width+'x'+im.height+'='+i.sizes)}return{m,sizes,link:!!document.querySelector('link[rel=manifest]'),apple:!!document.querySelector('link[rel=apple-touch-icon]')}});
  H.check(man.link&&man.apple&&man.m.display==='standalone'&&man.m.lang==='fr'&&man.m.start_url==='./','manifest lié, mode standalone, langue fr, icône Apple');
  H.check(man.sizes.every(s=>s.split('=')[0]===s.split('=')[1])&&man.m.icons.some(i=>i.purpose==='maskable'),'icônes aux bonnes dimensions ('+man.sizes.join(', ')+'), dont une « maskable »');
  const cached=await page.evaluate(async()=>{const out=[];for(const k of await caches.keys())for(const r of await (await caches.open(k)).keys())out.push(r.url);return out});
  for(const lib of ['pdf.js/3.11.174/pdf.min.js','pdf.js/3.11.174/pdf.worker.min.js','pdf-lib/1.17.1/pdf-lib.min.js','supabase-js@2.45.4/dist/umd/supabase.js','index.html','config.js'])
    H.check(cached.some(u=>u.includes(lib)),'en cache hors ligne : '+lib);
  H.check(await page.evaluate(()=>S.persist!==null),'stockage persistant demandé (navigator.storage.persist : '+await page.evaluate(()=>S.persist)+')');
  await H.importFiles(page,[H.FIX+'/fx-MM1_Pneumo_2023-12.pdf']);await page.click('#imClose');
  // tout couper : serveur, Supabase, CDN, réseau
  await new Promise(r=>srv.close(r));sb.down=true;state.cdnDown=true;await ctx.setOffline(true);
  await page.reload();await page.waitForSelector('#nav button',{timeout:20000});
  H.check(await page.isVisible('#offBadge'),'hors ligne (serveur arrêté) : Swag s\'ouvre depuis le cache, badge « hors ligne »');
  await page.evaluate(()=>{const A=[...S.annales.values()][0];startSeries(itemsOf(A),'hors ligne','train')});await page.waitForSelector('#qc canvas',{timeout:20000});
  H.check(true,'hors ligne : question affichée (pdf.js en cache)');
  await page.click('[data-tab=annales]');const id=await page.evaluate(()=>[...S.annales.values()][0].id);
  const [dl]=await Promise.all([page.waitForEvent('download',{timeout:60000}),page.click(`[data-blank="${id}"]`)]);
  H.check(/Sujet vierge/.test(dl.suggestedFilename()),'hors ligne : sujet vierge créé (pdf-lib en cache)');
  H.check(o.errors.filter(e=>!/sw\.js|ServiceWorker|Failed to fetch|internet/i.test(e)).length===0,'aucune erreur JavaScript '+JSON.stringify(o.errors));
  await o.close();
})().catch(e=>{console.error(e);process.exit(1)});
