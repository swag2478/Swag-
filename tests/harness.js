// Banc d'essai Playwright : sert dist/ sur http://swag.test/, les bibliothèques CDN depuis node_modules,
// et simule Supabase (connexion par code, table members avec les mêmes règles que le SQL de CLAUDE.md).
// La version de référence (artefact, commit ade14bc) est servie sur http://ref.test/ pour les comparaisons.
const {chromium}=require('playwright');const fs=require('fs'),path=require('path'),{execSync}=require('child_process');
const ROOT=path.join(__dirname,'..'),NM=path.join(ROOT,'node_modules'),DIST=path.join(ROOT,'dist');
const FIX=path.join(__dirname,'fixtures');
const SB='https://test.supabase.co';
const LIBS={
  'pdf.js/3.11.174/pdf.min.js':NM+'/pdfjs-dist/build/pdf.min.js',
  'pdf.js/3.11.174/pdf.worker.min.js':NM+'/pdfjs-dist/build/pdf.worker.min.js',
  'pdf-lib/1.17.1/pdf-lib.min.js':NM+'/pdf-lib/dist/pdf-lib.min.js',
  '@supabase/supabase-js@2.45.4/dist/umd/supabase.js':NM+'/@supabase/supabase-js/dist/umd/supabase.js'};
const TYPES={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png'};
const TEST_CONFIG=`window.SWAG_CONFIG={supabaseUrl:"${SB}",supabaseAnonKey:"anon-test-key",offlineDays:30};`;

/* ---------- Supabase simulé ---------- */
function makeSupabase(members){
  const st={members:new Map(),codes:new Map(),tokens:new Map(),refresh:new Map(),sent:[],down:false,n:0,log:[]};
  for(const [email,role] of Object.entries(members||{}))st.members.set(email,{email,role,note:null,added_at:new Date().toISOString()});
  const user=email=>({id:'u-'+Buffer.from(email).toString('hex').slice(0,16),aud:'authenticated',role:'authenticated',email,email_confirmed_at:new Date().toISOString(),app_metadata:{provider:'email'},user_metadata:{},created_at:new Date().toISOString()});
  st.session=email=>{const t='at_'+(++st.n)+'_'+Math.random().toString(36).slice(2),r='rt_'+st.n;st.tokens.set(t,email);st.refresh.set(r,email);
    return{access_token:t,token_type:'bearer',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,refresh_token:r,user:user(email)}};
  const isAdmin=email=>!!email&&st.members.get(email)?.role==='admin';
  const filt=(u)=>{const f={};for(const [k,v] of u.searchParams)if(!['select','order','columns'].includes(k)&&/^eq\./.test(v))f[k]=v.slice(3);return f};
  const H={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'*','access-control-expose-headers':'*'};
  const json=(route,status,body)=>route.fulfill({status,headers:{...H,'content-type':'application/json'},body:body===undefined?'':JSON.stringify(body)});
  st.handle=async route=>{const req=route.request(),u=new URL(req.url()),m=req.method();
    if(m==='OPTIONS')return route.fulfill({status:204,headers:H});
    if(st.down)return route.abort('internetdisconnected');
    const body=req.postData()?JSON.parse(req.postData()):null;
    const bearer=(req.headers()['authorization']||'').replace(/^Bearer\s+/,'');const me=st.tokens.get(bearer)||null;
    st.log.push(m+' '+u.pathname);
    if(u.pathname==='/auth/v1/otp'&&st.rateLimit)return json(route,429,{code:429,error_code:'over_email_send_rate_limit',msg:'For security purposes, you can only request this after 42 seconds.'});
    if(u.pathname==='/auth/v1/otp'){const email=body.email;const code=String(10000000+Math.floor(Math.random()*89999999)); /* codes à 8 chiffres, comme Supabase par défaut */st.codes.set(email,code);st.sent.push({email,code,redirect:u.searchParams.get('redirect_to')});return json(route,200,{})}
    if(u.pathname==='/auth/v1/verify'){if(st.codes.get(body.email)!==body.token)return json(route,403,{code:403,error_code:'otp_expired',msg:'Token has expired or is invalid'});st.codes.delete(body.email);return json(route,200,st.session(body.email))}
    if(u.pathname==='/auth/v1/user'){if(!me)return json(route,401,{code:401,msg:'invalid JWT'});return json(route,200,user(me))}
    if(u.pathname==='/auth/v1/token'){const e=st.refresh.get(body.refresh_token);if(!e)return json(route,400,{error:'invalid_grant'});return json(route,200,st.session(e))}
    if(u.pathname==='/auth/v1/logout')return route.fulfill({status:204,headers:H});
    if(u.pathname==='/rest/v1/rpc/can_join')return json(route,200,st.members.has(String(body.e).trim().toLowerCase()));
    if(u.pathname==='/rest/v1/members'){const f=filt(u);const rows=[...st.members.values()].filter(r=>Object.entries(f).every(([k,v])=>String(r[k])===decodeURIComponent(v)));
      if(m==='GET'){const vis=rows.filter(r=>me&&(r.email===me||isAdmin(me))).sort((a,b)=>a.email.localeCompare(b.email));return json(route,200,vis)}
      if(!isAdmin(me))return json(route,403,{code:'42501',message:'new row violates row-level security policy for table "members"'});
      if(m==='POST'){for(const r of [].concat(body)){if(st.members.has(r.email))return json(route,409,{code:'23505',message:'duplicate key'});if(r.email!==r.email.toLowerCase())return json(route,400,{code:'23514',message:'check'})}
        for(const r of [].concat(body))st.members.set(r.email,{email:r.email,role:r.role||'member',note:r.note||null,added_at:new Date().toISOString()});return json(route,201)}
      if(m==='DELETE'){rows.forEach(r=>st.members.delete(r.email));return json(route,204)}
      if(m==='PATCH'){rows.forEach(r=>Object.assign(r,body));return json(route,204)}}
    return json(route,404,{message:'non simulé : '+m+' '+u.pathname})};
  return st;
}

/* ---------- version de référence (artefact) ---------- */
const REF_REV='ade14bc';
let refHtml=null;
function refPage(){if(refHtml)return refHtml;// lecteur et contrôle : ceux du dépôt actuel (les deux versions doivent masquer pareil) ; interface : celle de la version artefact
  const g=f=>/^(parse3|check-core)\.js$/.test(f)?fs.readFileSync(path.join(ROOT,'src',f),'utf8'):execSync(`git show ${REF_REV}:src/${f}`,{cwd:ROOT,encoding:'utf8',maxBuffer:1<<26});
  const SKEL=b=>`<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light;box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;font:14px system-ui}img{max-width:100%}[hidden]{display:none!important}</style></head><body>${b}</body></html>`;
  // les caches qui touchent un bord du cadre débordent de 2 px dans le site : même règle appliquée à la référence
  const OLD='    el.style.left=(l-x0)/cw*100+"%";el.style.top=(t-seg.y0)/ch*100+"%";el.style.width=(r-l)/cw*100+"%";el.style.height=(b-t)/ch*100+"%";wrap.appendChild(el)}';
  const cur=fs.readFileSync(path.join(ROOT,'src','app.js'),'utf8');const i=cur.indexOf('    // un cache qui touche un bord du cadre'),j=cur.indexOf('wrap.appendChild(el)}',i)+'wrap.appendChild(el)}'.length;
  let refApp=g('app.js');if(i>0&&refApp.includes(OLD))refApp=refApp.replace(OLD,cur.slice(i,j));
  refHtml=SKEL(g('style.html')+g('shell.html')+"<script>const CATALOG=[];</script>\n<script>\n"+g('parse3.js')+"\n</script>\n<script>\n"+g('check-core.js')+"\n</script>\n<script>\n"+refApp+"\n</script>\n");return refHtml}

/* ---------- ouverture d'une page ---------- */
// locale UTF-8 : sans elle, Chromium sous Linux remplace par « download » les noms de fichiers accentués
const LAUNCH={env:{...process.env,LANG:'C.UTF-8',LC_ALL:'C.UTF-8'}};
async function newBrowser(){return chromium.launch(LAUNCH)}
async function open(opts={}){
  const browser=opts.browser||await chromium.launch(LAUNCH);
  const ctx=await browser.newContext({viewport:opts.vp||{width:1180,height:820},deviceScaleFactor:1,locale:'fr-FR',timezoneId:'Europe/Paris',colorScheme:opts.dark?'dark':'light',hasTouch:!!opts.touch,isMobile:!!opts.mobile,userAgent:opts.ua,acceptDownloads:true,...(opts.ctx||{})});
  const sb=opts.sb||makeSupabase(opts.members||{'membre@exemple.fr':'member','admin@exemple.fr':'admin'});
  const page=await ctx.newPage();const errors=[];
  page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error'&&!/net::ERR_|Failed to load resource/.test(m.text()))errors.push(m.text())});
  const state={cdnDown:false};
  await ctx.route('**/*',async r=>{const u=r.request().url();
    if(u.startsWith(SB))return sb.handle(r);
    for(const [k,f] of Object.entries(LIBS))if(u.includes(k)){if(state.cdnDown)return r.abort('internetdisconnected');return r.fulfill({body:fs.readFileSync(f),contentType:'text/javascript',headers:{'access-control-allow-origin':'*'}})}
    if(u.includes('fonts.g'))return r.abort();
    if(/^http:\/\/(localhost|127\.0\.0\.1)[:/]/.test(u))return r.continue();
    if(u.startsWith('http://ref.test/'))return r.fulfill({body:refPage(),contentType:'text/html'});
    if(u.startsWith('http://swag.test/')){let p=decodeURIComponent(new URL(u).pathname).replace(/^\//,'')||'index.html';
      if(p==='config.js'&&!opts.realConfig)return r.fulfill({body:opts.config||TEST_CONFIG,contentType:'text/javascript'});
      const f=path.join(DIST,p);if(!f.startsWith(DIST)||!fs.existsSync(f))return r.fulfill({status:404,body:''});
      return r.fulfill({body:fs.readFileSync(f),contentType:TYPES[path.extname(f)]||'application/octet-stream'})}
    return r.abort();});
  if(opts.init)await page.addInitScript(opts.init);
  return{browser,ctx,page,errors,sb,state,close:()=>opts.browser?ctx.close():browser.close()};
}
async function openRef(opts={}){const o=await open(opts);await o.page.goto('http://ref.test/');await o.page.waitForSelector('#nav button');return o}
// connexion complète par l'interface : adresse, code reçu « par e-mail » (lu dans le Supabase simulé)
async function login(o,email){const {page,sb}=o;
  await page.waitForSelector('#aEmail');await page.fill('#aEmail',email);await page.click('#aSend');
  await page.waitForSelector('#aCode',{timeout:10000});const code=sb.sent.filter(x=>x.email===email).pop().code;
  await page.fill('#aCode',code);await page.click('#aOk');await page.waitForSelector('#nav button',{timeout:10000})}
async function openApp(opts={}){const o=await open(opts);await o.page.goto('http://swag.test/');if(opts.login!==false)await login(o,opts.email||'membre@exemple.fr');return o}
// import en masse par l'interface ; renvoie le texte du récapitulatif
async function importFiles(page,files){
  await page.click('[data-tab=annales]');await page.click('[data-add]');await page.waitForSelector('#imFile',{state:'attached'});
  await page.setInputFiles('#imFile',files);
  await page.waitForFunction(()=>/Terminé|Arrêté/.test(document.querySelector('#imNow')?.textContent||''),null,{timeout:300000});
  return page.evaluate(()=>[...document.querySelectorAll('.imrow')].map(r=>r.className.split(' ')[1]+' | '+r.querySelector('.imn b').textContent+' | '+(r.querySelector('.imw')?.textContent||r.querySelector('small')?.textContent||'')));
}
const fixtures=(re)=>fs.readdirSync(FIX).filter(f=>/\.pdf$/i.test(f)&&(!re||re.test(f))).sort().map(f=>path.join(FIX,f));
let failures=0;
function check(cond,msg){console.log((cond?'  ok   ':'  ÉCHEC ')+msg);if(!cond){failures++;process.exitCode=1}return cond}
module.exports={open,openApp,openRef,login,importFiles,fixtures,check,makeSupabase,newBrowser,FIX,ROOT,DIST,SB,failures:()=>failures};
