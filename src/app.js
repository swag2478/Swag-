/* ================= Swag : application ================= */
const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fr=(n,d=1)=>Number(n).toLocaleString("fr-FR",{maximumFractionDigits:d});
const f20=v=>v==null?"–":Number(v).toLocaleString("fr-FR",{minimumFractionDigits:1,maximumFractionDigits:1});
const rid=()=>"a"+Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const norm=s=>String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9]/g,"");
const r1=v=>Math.round(v*10)/10;
const pl=(n,s,p)=>`${n} ${n>1?(p||s+"s"):s}`;
const today=()=>Math.floor((Date.now()-new Date().getTimezoneOffset()*6e4)/864e5);
const dayDate=d=>new Date(d*864e5+new Date().getTimezoneOffset()*6e4+432e5);
const dShort=new Intl.DateTimeFormat("fr-FR",{day:"numeric",month:"short"});
const dWk=new Intl.DateTimeFormat("fr-FR",{weekday:"short",day:"numeric",month:"short"});
const mmss=s=>{s=Math.max(0,Math.ceil(s));const h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=s%60;return(h?h+":"+String(m).padStart(2,"0"):m)+":"+String(x).padStart(2,"0")};
function toast(msg){document.querySelectorAll(".toast").forEach(t=>t.remove());const t=document.createElement("div");t.className="toast";t.setAttribute("role","status");t.textContent=msg;document.body.appendChild(t);setTimeout(()=>t.remove(),3800)}
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
const qKey=(a,c,q)=>"r_"+a+"_"+c+"_"+q;
function sha1js(m){ // repli si crypto.subtle est absent (page servie hors HTTPS)
  const n=m.length,w=new Uint32Array(80),L=((n+8>>6)+1)*16,x=new Uint32Array(L);
  for(let i=0;i<n;i++)x[i>>2]|=m[i]<<(24-(i&3)*8);x[n>>2]|=0x80<<(24-(n&3)*8);x[L-1]=n*8>>>0;x[L-2]=Math.floor(n/0x20000000);
  let a=0x67452301,b=0xEFCDAB89,c=0x98BADCFE,d=0x10325476,e=0xC3D2E1F0;const rl=(v,k)=>v<<k|v>>>(32-k);
  for(let i=0;i<L;i+=16){let A=a,B=b,C=c,D=d,E=e;
    for(let j=0;j<80;j++){w[j]=j<16?x[i+j]:rl(w[j-3]^w[j-8]^w[j-14]^w[j-16],1);
      const t=(rl(A,5)+(j<20?(B&C|~B&D)+0x5A827999:j<40?(B^C^D)+0x6ED9EBA1:j<60?(B&C|B&D|C&D)+0x8F1BBCDC:(B^C^D)+0xCA62C1D6)+E+w[j])>>>0;E=D;D=C;C=rl(B,30)>>>0;B=A;A=t}
    a=a+A>>>0;b=b+B>>>0;c=c+C>>>0;d=d+D>>>0;e=e+E>>>0}
  return[a,b,c,d,e].map(v=>v.toString(16).padStart(8,"0")).join("");
}
async function sha1(bytes){try{if(window.crypto&&crypto.subtle){const h=await crypto.subtle.digest("SHA-1",bytes);return[...new Uint8Array(h)].map(b=>b.toString(16).padStart(2,"0")).join("")}}catch(e){}return sha1js(bytes)}

/* ---------- thème ---------- */
function curTheme(){try{return localStorage.getItem("swag-theme")||"auto"}catch(e){return"auto"}}
function setTheme(t){if(t==="auto")document.documentElement.removeAttribute("data-theme");else document.documentElement.setAttribute("data-theme",t);try{localStorage.setItem("swag-theme",t)}catch(e){}}
setTheme(curTheme());

/* ---------- UE, examens, sessions ---------- */
// UE, épreuve et date sont devinées par src/meta.js (même code que tools/meta.js)
const {guessUE,guessDate,guessExam}=META;
const UE_TODO="À classer";
const MONTHS=["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"];
function sessionLabel(d){if(!d)return"";const [y,m]=d.split("-").map(Number);return m?(MONTHS[m-1].charAt(0).toUpperCase()+MONTHS[m-1].slice(1))+" "+y:String(y)}
function cleanName(f){return f.replace(/\.pdf$/i,"").replace(/[_]+/g," ").replace(/\s+/g," ").trim()}
const UE_LIST=[...META.UE_NAMES,UE_TODO];
const ueOf=A=>A.ue||"Sans UE";
const dateOf=A=>A.date||guessDate(A.session||A.name)||"";
const yearOf=A=>(dateOf(A).split("-")[0])||"Année inconnue";
const titleOf=A=>[A.exam,sessionLabel(dateOf(A))||A.session].filter(Boolean).join(" · ")||A.name||"Annale";

/* ---------- barème ---------- */
function scoreQ(Q,sel,txt){
  const st=S.settings;
  if(Q.qroc){const ok=!!norm(txt)&&Q.qroc.ans.some(a=>norm(a)===norm(txt));return{s:ok?1:0,d:ok?"Réponse acceptée":"Réponse non reconnue"}}
  if(Q.type==="TCS"){const mx=Math.max(1,...Q.opts.map(o=>o.ex||0));if(!sel.size)return{s:0,d:"Aucune réponse"};const i=[...sel][0],e=Q.opts[i].ex||0;return{s:e/mx,d:`${pl(e,"expert")} sur ${Q.opts.reduce((s,o)=>s+(o.ex||0),0)} ont choisi cette réponse`}}
  const disc=Q.opts.filter((o,i)=>!!o.v!==sel.has(i)).length;
  if(Q.type==="QRU")return{s:disc?0:1,d:disc?"Mauvaise réponse":"Bonne réponse"};
  if(Q.type==="QRPL"||Q.type==="QRP"){
    const k=Q.k||Q.opts.filter(o=>o.v).length,n=sel.size,good=Q.opts.filter((o,i)=>o.v&&sel.has(i)).length;
    if(n>k)return{s:0,d:`${n} cochées pour ${k} attendue${k>1?"s":""}`};
    const inac=Q.opts.find((o,i)=>o.inac&&sel.has(i));if(inac)return{s:0,d:`${inac.L} est inacceptable`};
    const ind=Q.opts.find((o,i)=>o.ind&&!sel.has(i));if(ind)return{s:0,d:`${ind.L} était indispensable`};
    if(st.qrpl==="strict")return{s:good===k?1:0,d:`${good} bonne${good>1?"s":""} sur ${k}`};
    return{s:good/k,d:`${good} bonne${good>1?"s":""} sur ${k} attendue${k>1?"s":""}`}}
  return{s:[1,st.b1,st.b2][disc]??0,d:disc?`${disc} discordance${disc>1?"s":""}`:"Aucune discordance"};
}
const cls=s=>s>=1?"ok":s>0?"mid":"ko";
const single=Q=>Q.type==="QRU"||Q.type==="TCS";

/* ---------- stockage ---------- */
const DEF={b1:.5,b2:.2,qrpl:"prorata",nDos:5,tQ:90};
const S={mode:"local",annales:new Map(),results:new Map(),series:new Map(),settings:{...DEF},pdfs:new Map(),playSaved:null,pending:new Map(),persist:null};
let idbP=null;
function idb(){return idbP||(idbP=new Promise((res,rej)=>{const r=indexedDB.open("swag",1);r.onupgradeneeded=()=>{r.result.createObjectStore("pdf");r.result.createObjectStore("doc")};r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)}))}
function itx(store,mode,fn){return idb().then(d=>new Promise((res,rej)=>{const t=d.transaction(store,mode),q=fn(t.objectStore(store));t.oncomplete=()=>res(q&&q.result);t.onerror=()=>rej(t.error)}))}
function route(k,v){
  if(v.kind==="annale")S.annales.set(k,{...v,id:k});else if(v.kind==="result")S.results.set(k,v);
  else if(v.kind==="serie")S.series.set(k,v);else if(v.kind==="settings")S.settings={...DEF,...v};
  else if(v.kind==="play")S.playSaved=v;else if(v.kind==="pending")S.pending.set(k,v);
}
async function initStore(){ // tout reste sur l'appareil : IndexedDB (base « swag »)
  try{const keys=await itx("doc","readonly",s=>s.getAllKeys()),vals=await itx("doc","readonly",s=>s.getAll());(keys||[]).forEach((k,i)=>route(k,vals[i]))}catch(e){S.mode="none"}
  askPersist();
}
async function askPersist(){ // demande au navigateur de ne pas effacer les données de Swag
  try{if(navigator.storage&&navigator.storage.persist){S.persist=await navigator.storage.persisted();if(!S.persist)S.persist=await navigator.storage.persist()}}catch(e){S.persist=null}
}
const quotaErr=e=>e&&(e.name==="QuotaExceededError"||e.code==="quota_exceeded"||e.inner&&e.inner.name==="QuotaExceededError");
async function putDoc(k,v){
  const {id,...body}=v;
  if(S.mode==="local")await itx("doc","readwrite",s=>s.put(body,k));
}
async function delDoc(k){if(S.mode==="local")await itx("doc","readwrite",s=>s.delete(k))}
async function saveAnnale(A,bytes,keep){
  if(S.mode==="local")await itx("pdf","readwrite",s=>s.put(bytes,A.id));
  await putDoc(A.id,A);S.annales.set(A.id,A);if(keep!==false)S.pdfs.set(A.id,bytes);
}
async function removeAnnale(A){
  const ks=[...S.results.keys()].filter(k=>k.startsWith("r_"+A.id+"_"));
  for(const k of ks){await delDoc(k);S.results.delete(k)}
  await delDoc(A.id);
  if(S.mode==="local")await itx("pdf","readwrite",s=>s.delete(A.id));
  S.annales.delete(A.id);S.pdfs.delete(A.id);docCache.delete(A.id);
}
async function saveResult(a,c,q,s,sel,txt){
  const k=qKey(a,c,q),o=S.results.get(k),d=today();
  const hist=((o&&o.hist)||[]).concat([[d,s]]).slice(-20);
  const err=o&&o.err?o.err.slice():[0,0];if(s<1){err[0]++;err[1]=d}
  const v={kind:"result",a,c,q,last:s,best:Math.max(s,o?o.best:0),tries:(o?o.tries:0)+1,at:Date.now(),sel:[...sel],txt:txt||"",hist,err};
  S.results.set(k,v);
  try{await putDoc(k,v)}catch(e){toast(quotaErr(e)?"Stockage plein : supprime une annale pour continuer.":"Ce résultat n'a pas pu être enregistré.")}
}
async function saveSettings(p){Object.assign(S.settings,p);try{await putDoc("settings",{kind:"settings",...S.settings})}catch(e){toast("Le réglage n'a pas pu être enregistré.")}}
let playTimer=0;
function savePlay(){clearTimeout(playTimer);playTimer=setTimeout(()=>{if(play){const v={kind:"play",...play,key:undefined};delete v.key;S.playSaved=v;putDoc("play",v).catch(()=>{})}},600)}
function clearPlay(){clearTimeout(playTimer);S.playSaved=null;delDoc("play").catch(()=>{})}

async function pdfBytes(A){
  if(S.pdfs.has(A.id))return S.pdfs.get(A.id);
  const b=await itx("pdf","readonly",s=>s.get(A.id));
  if(!b)throw new Error("Le PDF de cette annale n'est plus sur cet appareil.");
  S.pdfs.set(A.id,b);if(S.pdfs.size>6)S.pdfs.delete(S.pdfs.keys().next().value);return b;
}
const docCache=new Map(),pageCache=new Map();
const PDFJS=window.pdfjsLib;
function pdfDoc(A){if(!docCache.has(A.id)){const p=pdfBytes(A).then(b=>PDFJS.getDocument({data:b.slice()}).promise);p.catch(()=>docCache.delete(A.id));docCache.set(A.id,p)}return docCache.get(A.id)}
async function pageCanvas(A,p,scale){
  const s=scale||Math.min(3,Math.max(2,(window.devicePixelRatio||1)*1.4)),key=A.id+":"+p+":"+s;if(pageCache.has(key))return pageCache.get(key);
  const pr=(async()=>{const doc=await pdfDoc(A),page=await doc.getPage(p),vp=page.getViewport({scale:s});
    const cv=document.createElement("canvas");cv.width=Math.floor(vp.width);cv.height=Math.floor(vp.height);
    await page.render({canvasContext:cv.getContext("2d"),viewport:vp}).promise;return{cv,s}})();
  if(!scale){pageCache.set(key,pr);if(pageCache.size>12)pageCache.delete(pageCache.keys().next().value)}
  pr.catch(()=>pageCache.delete(key));return pr;
}
/* ---------- calculs ---------- */
const ueCmp=(a,b)=>(a===UE_TODO)-(b===UE_TODO)||a.localeCompare(b,"fr");
const sortAnn=(a,b)=>ueCmp(ueOf(a),ueOf(b))||dateOf(b).localeCompare(dateOf(a))||(a.exam||"").localeCompare(b.exam||"");
const annList=()=>[...S.annales.values()].filter(A=>!A.broken).sort(sortAnn);
const ueNames=()=>[...new Set(annList().map(ueOf))].sort(ueCmp);
function resOf(list){const ids=new Set(list.map(A=>A.id));return[...S.results.values()].filter(v=>ids.has(v.a)&&S.annales.has(v.a)&&qOf(v.a,v.c,v.q))}
function qOf(a,c,q){const A=S.annales.get(a);return A&&A.data.cases[c]&&A.data.cases[c].qs[q]}
function statsFor(list){const rs=resOf(list);const n=list.reduce((s,A)=>s+A.nq,0);const sum=rs.reduce((s,v)=>s+v.last,0);
  return{n,done:rs.length,avg:rs.length?sum/rs.length*20:null,errs:rs.filter(v=>v.last<1).length}}
function errorsFor(list){return resOf(list).filter(v=>v.last<1).sort((x,y)=>x.a.localeCompare(y.a)||x.c-y.c||x.q-y.q)}
function activity(days){const t=today(),out=[];for(let i=days-1;i>=0;i--)out.push({d:t-i,n:0,p:0});
  for(const v of S.results.values())for(const [d,s] of v.hist||[]){const o=out.find(x=>x.d===d);if(o){o.n++;o.p+=s}}return out}
function streak(){const ds=new Set();for(const v of S.results.values())for(const [d] of v.hist||[])ds.add(d);let t=today();if(!ds.has(t))t--;let n=0;while(ds.has(t)){n++;t--}return n}
const itemsOf=(A,filter)=>{const out=[];A.data.cases.forEach((cs,c)=>cs.qs.forEach((_,q)=>{if(!filter||filter(A,c,q))out.push({a:A.id,c,q})}));return out};
function unitsOf(A,filter){const out=[];A.data.cases.forEach((cs,c)=>{const it=[];cs.qs.forEach((_,q)=>{if(!filter||filter(A,c,q))it.push({a:A.id,c,q})});
  if(!it.length)return;if(cs.qi){for(let i=0;i<it.length;i+=5)out.push(it.slice(i,i+5))}else out.push(it)});return out}
const caseLabel=(A,c)=>A.data.cases[c].qi?"Questions isolées":"Dossier "+(A.data.cases.slice(0,c+1).filter(x=>!x.qi).length);

/* ---------- navigation ---------- */
const V={tab:"accueil",annUE:"",annQ:"",errUE:"",errPer:"tout",errOnly:true,errShown:12,compUE:null,compAnn:null,compWhat:"all",compOrder:"ordre",compMode:"train",showTable:false};
let play=null,lastEnd=null;
function nav(){
  const errs=errorsFor(annList()).length;
  const tabs=[["accueil","Accueil",""],["annales","Annales",`<span class="pill soft">${S.annales.size}</span>`],["series","Séries",""],
    ...(play?[["play","Série en cours",`<span class="pill">${play.i+1}/${play.items.length}</span>`]]:[]),
    ["carnet","Carnet d'erreurs",errs?`<span class="pill">${errs}</span>`:""],["stats","Statistiques",""],["reglages","Réglages",""],...(isAdmin()?[["membres","Membres",""]]:[])];
  $("#nav").innerHTML=tabs.map(([id,t,b])=>`<button type="button" data-tab="${id}" ${V.tab===id||(V.tab==="bilan"&&id==="series")?'aria-current="page"':""}>${t}${b}</button>`).join("");
  $("#nav").querySelectorAll("button").forEach(b=>b.onclick=()=>go(b.dataset.tab));
}
function go(tab){V.tab=tab;render();scrollTo(0,0)}
const isAdmin=()=>typeof AUTH!=="undefined"&&AUTH.role==="admin"&&typeof vMembres==="function";
function render(){
  if(document.body.classList.contains("locked"))return; // écran de connexion affiché (auth.js)
  nav();const v=$("#view");stopChrono();
  document.querySelector(".act")?.remove();
  if(V.tab==="play"&&play)return showQ();
  if(V.tab==="play")V.tab="accueil";
  const f={accueil:vAccueil,annales:vAnnales,series:vSeries,carnet:vCarnet,stats:vStats,reglages:vReglages,bilan:vBilan,membres:isAdmin()?vMembres:null}[V.tab]||vAccueil;
  f(v);
}
function emptyHTML(){return`<div class="empty"><h3>Commence par tes corrigés</h3><p>Importe tes corrigés PDF (UNESS avec Valide / Faux, ou avec la colonne « Réponse attendue ») : tu peux en choisir plusieurs d'un coup. Swag les découpe en dossiers et en questions, masque les réponses et suit ta progression par UE. Les PDF restent sur ton appareil.</p>
  <div class="row"><button class="btn red" type="button" data-add>Importer mes PDF</button></div></div>`}
/* ---------- iPad / iPhone : installer Swag sur l'écran d'accueil ---------- */
const isIOS=()=>/iPad|iPhone|iPod/.test(navigator.userAgent)||navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1;
const isStandalone=()=>navigator.standalone===true||matchMedia("(display-mode: standalone)").matches;
function installHTML(force){
  if(!isIOS()||isStandalone())return"";
  let off=false;try{off=!force&&localStorage.getItem("swag-ios-hint")==="0"}catch(e){}if(off)return"";
  return`<div class="resume hint" id="iosHint"><div><b>Installe Swag sur l'écran d'accueil.</b> Dans Safari : bouton Partager, puis « Sur l'écran d'accueil ». Sinon Safari peut effacer tes annales et ta progression après 7 jours sans visite. Une fois installé, ouvre Swag depuis son icône (il faudra te reconnecter une fois, avec le code reçu par e-mail).</div>${force?"":`<button class="btn small" type="button" id="iosHideBtn">Plus tard</button>`}</div>`}
function wireInstall(v){const b=v.querySelector("#iosHideBtn");if(b)b.onclick=()=>{try{localStorage.setItem("swag-ios-hint","0")}catch(e){}v.querySelector("#iosHint").remove()}}
function wire(root){
  root.querySelectorAll("[data-add]").forEach(b=>b.onclick=()=>openImport());
  root.querySelectorAll("[data-go]").forEach(b=>b.onclick=()=>{const A=S.annales.get(b.dataset.go);startSeries(itemsOf(A),titleOf(A)+" · "+ueOf(A),b.dataset.mode||"train")});
  root.querySelectorAll("[data-err]").forEach(b=>b.onclick=()=>{const A=S.annales.get(b.dataset.err);startSeries(errorsFor([A]).map(r=>({a:r.a,c:r.c,q:r.q})),"Erreurs · "+titleOf(A),"train")});
  root.querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>openEdit(S.annales.get(b.dataset.edit)));
  root.querySelectorAll("[data-blank]").forEach(b=>b.onclick=()=>downloadBlank(S.annales.get(b.dataset.blank),b));
  root.querySelectorAll("[data-orig]").forEach(b=>b.onclick=()=>downloadOrig(S.annales.get(b.dataset.orig),b));
  root.querySelectorAll("[data-ue-go]").forEach(b=>b.onclick=()=>{V.annUE=b.dataset.ueGo;go("annales")});
}

/* ---------- Accueil ---------- */
function vAccueil(v){
  const all=annList();
  if(!all.length){v.innerHTML=`<div class="page"><div class="head"><div><h2>Tes annales, sans le corrigé sous les yeux</h2><p>Swag masque les réponses des corrigés et te note au barème EDN.</p></div></div>${installHTML()}${emptyHTML()}</div>`;wire(v);wireInstall(v);return}
  const a7=activity(7),n7=a7.reduce((s,x)=>s+x.n,0),p7=a7.reduce((s,x)=>s+x.p,0),errs=errorsFor(all).length,g=statsFor(all);
  const ser=[...S.series.values()].sort((a,b)=>b.at-a.at).slice(0,5);
  const sv=!play&&S.playSaved&&S.playSaved.items&&S.playSaved.items.some(it=>qOf(it.a,it.c,it.q))?S.playSaved:null;
  const cur=play||sv;
  v.innerHTML=`<div class="page">
   <div class="head"><div><h2>${new Date().getHours()<18?"Bonjour":"Bonsoir"}</h2><p>${pl(all.length,"annale")} · ${g.done} / ${g.n} questions faites · moyenne ${g.avg==null?"pas encore de note":f20(g.avg)+" / 20"}</p></div></div>
   ${installHTML()}
   ${cur?`<div class="resume"><div><b>Série en cours :</b> ${esc(cur.title)} <span style="color:var(--muted)">· question ${cur.i+1} sur ${cur.items.length}${cur.mode==="exam"?" · examen":""}</span></div><button class="btn red" type="button" id="resume">Reprendre</button></div>`:""}
   <div class="tiles"><div class="tile"><span>Note · 7 jours</span><b>${n7?f20(p7/n7*20):"–"}<small> /20</small></b></div><div class="tile"><span>Questions · 7 jours</span><b>${n7}</b></div><div class="tile"><span>Jours d'affilée</span><b>${streak()}</b></div><div class="tile hot"><span>À retravailler</span><b>${errs}</b></div></div>
   <div class="quick"><button class="btn red" type="button" id="qRand">Série au hasard · ${S.settings.nDos||"tous les"} dossiers</button><button class="btn" type="button" id="qErr" ${errs?"":"disabled"}>Refaire mes erreurs (${errs})</button><button class="btn" type="button" id="qComp">Composer une série</button></div>
   <section class="panel"><h3>Par UE</h3><div class="uegrid">${ueNames().map(u=>{const L=all.filter(A=>ueOf(A)===u),s=statsFor(L),ys=[...new Set(L.map(yearOf))];return`<button class="uetile" type="button" data-ue-go="${esc(u)}"><span class="n">${esc(u)}</span><span class="v"><span>${pl(L.length,"annale")} · ${ys.slice(0,3).join(", ")}${ys.length>3?"…":""}</span><b>${f20(s.avg)}</b></span><div class="bar"><i style="width:${s.n?s.done/s.n*100:0}%"></i></div><span class="v"><span>${s.done} / ${s.n} questions</span></span></button>`}).join("")}</div></section>
   <section class="panel"><h3>Dernières séries</h3>${ser.length?`<div class="tw"><table class="t"><thead><tr><th>Date</th><th>Série</th><th class="n">Questions</th><th class="n">Note</th></tr></thead><tbody>${ser.map(x=>`<tr><td>${dWk.format(new Date(x.at))}</td><td>${esc(x.title)}${x.mode==="exam"?' <span class="chip">Examen</span>':""}</td><td class="n">${x.n}</td><td class="n">${f20(x.n?x.pts/x.n*20:0)}</td></tr>`).join("")}</tbody></table></div>`:'<p style="margin:0;color:var(--muted)">Ta première série terminée apparaîtra ici.</p>'}</section>
  </div>`;
  wire(v);wireInstall(v);
  if($("#resume"))$("#resume").onclick=()=>{if(!play&&sv){play={...sv};delete play.kind}go("play")};
  $("#qRand").onclick=()=>{let us=[];all.forEach(A=>us.push(...unitsOf(A)));us=shuffle(us);if(S.settings.nDos)us=us.slice(0,S.settings.nDos);startSeries(us.flat(),"Série au hasard","train")};
  $("#qErr").onclick=()=>startSeries(errorsFor(all).map(r=>({a:r.a,c:r.c,q:r.q})),"Mes erreurs","train");
  $("#qComp").onclick=()=>go("series");
}

/* ---------- Annales ---------- */
function cardHTML(A){
  const s=statsFor([A]),pct=A.nq?s.done/A.nq*100:0,nd=A.data.cases.filter(c=>!c.qi).length,nqi=A.data.cases.filter(c=>c.qi).reduce((x,c)=>x+c.qs.length,0);
  return`<article class="card"><div class="tag">${esc(A.exam||"Annale")}</div>
   <h3>${esc(sessionLabel(dateOf(A))||A.session||A.name)}</h3><div class="meta">${[nd?pl(nd,"dossier"):"",nqi?pl(nqi,"question isolée","questions isolées"):""].filter(Boolean).join(" · ")} · ${A.nq} questions</div>
   <div class="bar"><i style="width:${pct}%"></i></div>
   <div class="note"><span class="meta">${s.done} / ${A.nq} faites</span><b>${f20(s.avg)}<small> / 20</small></b></div>
   <div class="row"><button class="btn red" type="button" data-go="${A.id}">Entraînement</button><button class="btn" type="button" data-go="${A.id}" data-mode="exam">Examen</button>${s.errs?`<button class="btn" type="button" data-err="${A.id}">Erreurs (${s.errs})</button>`:""}</div>
   <div class="row small"><button class="btn small" type="button" data-blank="${A.id}">Sujet vierge (PDF)</button><button class="btn small ghost" type="button" data-orig="${A.id}">Corrigé</button><button class="btn small ghost" type="button" data-edit="${A.id}">Modifier</button></div></article>`;
}
function vAnnales(v){
  const all=annList(),ues=ueNames();if(V.annUE&&!ues.includes(V.annUE))V.annUE="";
  const q=norm(V.annQ);
  const list=all.filter(A=>(!V.annUE||ueOf(A)===V.annUE)&&(!q||norm(titleOf(A)+" "+A.session+" "+A.ue+" "+A.name).includes(q)));
  const groups=[...new Set(list.map(ueOf))];
  v.innerHTML=`<div class="page"><div class="head"><div><h2>Annales</h2><p>${pl(all.length,"annale")} · ${all.reduce((s,A)=>s+A.nq,0)} questions · classées par UE puis par année</p></div><span style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn red" type="button" data-add>Importer des PDF</button></span></div>
   ${S.pending.size?`<div class="resume" style="background:var(--raise)"><div>${pl(S.pending.size,"annale de ta sauvegarde attend","annales de ta sauvegarde attendent")} son PDF : réimporte les mêmes fichiers, Swag les reconnaît et y rattache ta progression.</div></div>`:""}
   ${all.length?`<div class="filt"><div class="seg wrap" role="group" aria-label="UE"><button type="button" data-u="" aria-pressed="${!V.annUE}">Toutes</button>${ues.map(u=>`<button type="button" data-u="${esc(u)}" aria-pressed="${V.annUE===u}">${esc(u)}</button>`).join("")}</div>
   <input type="search" id="annQ" placeholder="Chercher (UE, année, MM2…)" value="${esc(V.annQ)}" aria-label="Chercher une annale"></div>
   ${list.length?groups.map(u=>{const L=list.filter(A=>ueOf(A)===u),ys=[...new Set(L.map(yearOf))];
     return`<section class="uesec"><div class="uehead"><h3>${esc(u)}</h3><span>${pl(L.length,"annale")} · ${L.reduce((s,A)=>s+A.nq,0)} questions</span></div>
     ${ys.map(y=>`<div class="yearhead">${esc(y)}</div><div class="cards">${L.filter(A=>yearOf(A)===y).map(cardHTML).join("")}</div>`).join("")}</section>`}).join(""):'<p style="color:var(--muted)">Aucune annale ne correspond.</p>'}`:emptyHTML()}</div>`;
  wire(v);
  v.querySelectorAll("[data-u]").forEach(b=>b.onclick=()=>{V.annUE=b.dataset.u;render()});
  const inp=$("#annQ");if(inp)inp.oninput=()=>{V.annQ=inp.value;clearTimeout(inp._t);inp._t=setTimeout(()=>{render();const n=$("#annQ");n.focus();n.setSelectionRange(n.value.length,n.value.length)},300)};
}

/* ---------- Séries (composer) ---------- */
function vSeries(v){
  const all=annList();
  if(!all.length){v.innerHTML=`<div class="page"><div class="head"><div><h2>Composer une série</h2></div></div>${emptyHTML()}</div>`;wire(v);return}
  const ues=ueNames();if(!V.compUE)V.compUE=new Set(ues);if(!V.compAnn)V.compAnn=new Set(all.map(A=>A.id));
  if(!V.compSeen)V.compSeen=new Set();all.forEach(A=>{if(!V.compSeen.has(A.id)){V.compSeen.add(A.id);V.compAnn.add(A.id)}});
  const chosen=all.filter(A=>V.compUE.has(ueOf(A))&&V.compAnn.has(A.id));
  const filt=V.compWhat==="new"?(A,c,q)=>!S.results.has(qKey(A.id,c,q)):V.compWhat==="err"?(A,c,q)=>{const r=S.results.get(qKey(A.id,c,q));return r&&r.last<1}:null;
  let us=[];chosen.forEach(A=>us.push(...unitsOf(A,filt)));
  if(V.compOrder==="hasard")us=shuffle(us);const n=S.settings.nDos;if(n)us=us.slice(0,n);
  const nq=us.reduce((s,x)=>s+x.length,0);
  const seg=(id,opts,val)=>`<div class="seg wrap" role="group">${opts.map(([k,t])=>`<button type="button" data-s="${id}" data-v="${k}" aria-pressed="${String(val)===String(k)}">${t}</button>`).join("")}</div>`;
  v.innerHTML=`<div class="page" style="max-width:900px"><div class="head"><div><h2>Composer une série</h2><p>Choisis les UE, les annales et le type de série. Les dossiers restent entiers ; les questions isolées vont par 5.</p></div></div>
   <section class="panel">
    <div class="row2"><span class="lbl">UE</span><div class="seg wrap" role="group">${ues.map(u=>`<button type="button" data-cu="${esc(u)}" aria-pressed="${V.compUE.has(u)}">${esc(u)}</button>`).join("")}</div></div>
    <div class="row2"><span class="lbl">Annales</span><div class="picklist">${ues.filter(u=>V.compUE.has(u)).map(u=>`<div class="pick-h"><span>${esc(u)}</span><button type="button" data-all="${esc(u)}">Tout / rien</button></div>${all.filter(A=>ueOf(A)===u).map(A=>`<label class="pick"><input type="checkbox" data-ca="${A.id}" ${V.compAnn.has(A.id)?"checked":""}><span>${esc(titleOf(A))}</span><small>${A.nq} q.</small></label>`).join("")}`).join("")||'<p style="padding:14px;margin:0;color:var(--muted)">Choisis au moins une UE.</p>'}</div></div>
    <div class="row2"><span class="lbl">Questions</span>${seg("what",[["all","Toutes"],["new","Jamais faites"],["err","Mes erreurs"]],V.compWhat)}</div>
    <div class="row2"><span class="lbl">Ordre</span>${seg("order",[["ordre","Dans l'ordre"],["hasard","Au hasard"]],V.compOrder)}</div>
    <div class="row2"><span class="lbl">Dossiers</span>${seg("n",[[3,"3"],[5,"5"],[10,"10"],[0,"Tous"]],S.settings.nDos)}</div>
    <div class="row2"><span class="lbl">Mode</span><div class="field">${seg("mode",[["train","Entraînement"],["exam","Examen"]],V.compMode)}<small>${V.compMode==="exam"?`Chronométré (${fr(S.settings.tQ/60,1)} min par question), sans correction avant la fin. Tu peux revenir sur tes réponses jusqu'à la fin.`:"Correction après chaque question."}</small></div></div>
    <div class="foot"><span><b>${pl(us.length,"dossier")}</b> · ${pl(nq,"question")}</span><button class="btn red" type="button" id="launch" ${nq?"":"disabled"}>Lancer la série</button></div>
   </section></div>`;
  v.querySelectorAll("[data-cu]").forEach(b=>b.onclick=()=>{const u=b.dataset.cu;V.compUE.has(u)?V.compUE.delete(u):V.compUE.add(u);render()});
  v.querySelectorAll("[data-ca]").forEach(b=>b.onchange=()=>{b.checked?V.compAnn.add(b.dataset.ca):V.compAnn.delete(b.dataset.ca);render()});
  v.querySelectorAll("[data-all]").forEach(b=>b.onclick=()=>{const L=all.filter(A=>ueOf(A)===b.dataset.all),on=L.every(A=>V.compAnn.has(A.id));L.forEach(A=>on?V.compAnn.delete(A.id):V.compAnn.add(A.id));render()});
  v.querySelectorAll("[data-s]").forEach(b=>b.onclick=()=>{const k=b.dataset.s,x=b.dataset.v;if(k==="what")V.compWhat=x;if(k==="order")V.compOrder=x;if(k==="mode")V.compMode=x;if(k==="n")saveSettings({nDos:+x});render()});
  $("#launch").onclick=()=>{const t=[...V.compUE].length===ues.length?"Toutes les UE":[...V.compUE].join(", ");startSeries(us.flat(),(V.compWhat==="err"?"Erreurs · ":V.compWhat==="new"?"Nouvelles · ":"")+t,V.compMode)};
}

/* ---------- rendu d'une question ---------- */
const X0=.044;
async function cropEl(A,seg,overlays){
  const pg=A.data.pages[seg.p-1],W=pg.w,x0=pg.x0!=null?Math.min(pg.x0,W*X0):W*X0,x1=pg.x1!=null?Math.max(pg.x1,W-W*X0):W-W*X0,cw=x1-x0,ch=seg.y1-seg.y0;
  const wrap=document.createElement("div");wrap.className="crop loading";wrap.style.setProperty("--cw",cw);wrap.style.aspectRatio=cw+" / "+ch;
  for(const o of overlays){if(o.p!==seg.p)continue;const t=Math.max(o.t,seg.y0),b=Math.min(o.b,seg.y1);if(b-t<1)continue;
    const l=Math.max(o.l,x0),r=Math.min(o.r,x1);if(r-l<1)continue;
    const el=o.el;
    el.style.left=(l-x0)/cw*100+"%";el.style.top=(t-seg.y0)/ch*100+"%";el.style.width=(r-l)/cw*100+"%";el.style.height=(b-t)/ch*100+"%";wrap.appendChild(el)}
  try{const {cv:src,s}=await pageCanvas(A,seg.p);
    const cv=document.createElement("canvas");cv.width=Math.round(cw*s);cv.height=Math.max(1,Math.round(ch*s));
    cv.getContext("2d").drawImage(src,x0*s,seg.y0*s,cw*s,ch*s,0,0,cv.width,cv.height);wrap.prepend(cv);wrap.classList.remove("loading");
  }catch(e){wrap.classList.remove("loading");wrap.querySelectorAll(".opt,.mask").forEach(x=>x.remove());wrap.style.aspectRatio="";wrap.insertAdjacentHTML("afterbegin",`<p style="padding:16px;margin:0;color:#666">Le PDF de cette annale n'a pas pu être chargé.<br><small style="word-break:break-all">${esc(String(e&&e.message||e))}</small></p>`)}
  return wrap;
}
function makeOverlays(Q,sel,interactive){
  const ov=[];
  Q.opts.forEach((o,i)=>{const el=document.createElement(interactive?"button":"span");if(interactive)el.type="button";
    el.className="opt "+(o.v?"v":"f")+(single(Q)?" round":"")+(sel.has(i)?" sel":"")+(o.nl?" nl":"");
    el.innerHTML=`<span class="box"></span>${o.nl?"":`<span class="lt">${esc(o.L)}</span>`}${o.ex!=null&&!o.nl?`<span class="exn">${o.ex}</span>`:""}`;
    if(interactive){el.setAttribute("aria-label","Proposition "+o.L);el.setAttribute("aria-pressed",String(sel.has(i)))}
    ov.push({...o,el,i})});
  (Q.hide||[]).forEach(h=>{const m=document.createElement("div");m.className="mask k-"+h.kind;if(h.kind==="qroc")m.textContent="Réponse masquée";ov.push({...h,el:m})});
  return ov;
}
async function cropsInto(box,A,segs,ov){for(const s of segs)box.appendChild(await cropEl(A,s,ov))}
function resultHTML(Q,r,txt,showOverride){
  const ans=Q.qroc?`<div class="ans">${txt!=null?`Ta réponse : <b>${esc(txt||"(vide)")}</b> · `:""}Réponses acceptées : <b>${Q.qroc.ans.map(esc).join(" · ")}</b></div>`:"";
  return`<div class="result ${cls(r.s)}"><div class="pts">${fr(r.s,2)}<small style="font-size:.5em;color:var(--muted)"> / 1</small></div><div class="why">${esc(r.d)}</div>${showOverride&&Q.qroc&&r.s<1?`<button class="btn small" type="button" data-ovr>Compter juste</button>`:""}${ans}</div>`;
}
const hasOfficial=Q=>(Q.hide||[]).some(h=>h.kind==="just"||h.kind==="comment");

/* ---------- série ---------- */
let chronoId=0;
function stopChrono(){if(chronoId)clearInterval(chronoId);chronoId=0}
function startSeries(items,title,mode){
  items=items.filter(it=>qOf(it.a,it.c,it.q));if(!items.length){toast("Rien à faire ici.");return}
  play={id:rid(),items,i:0,title,mode:mode||"train",ans:items.map(()=>null),t0:Date.now()};
  if(play.mode==="exam")play.limit=Date.now()+items.length*S.settings.tQ*1000;
  savePlay();V.tab="play";render();scrollTo(0,0);
}
function qtableHTML(){
  const groups=[];play.items.forEach((it,i)=>{const k=it.a+"|"+it.c;let g=groups[groups.length-1];if(!g||g.k!==k){g={k,it,list:[]};groups.push(g)}g.list.push(i)});
  return groups.map(g=>{const A=S.annales.get(g.it.a);return`<div class="qt-g"><div class="qt-h">${esc(A?caseLabel(A,g.it.c):"")}<small>${esc(A?titleOf(A):"")}</small></div><div class="qt-grid">${g.list.map(i=>{const a=play.ans[i];
    const st=a&&a.done&&play.mode!=="exam"?cls(a.s):a&&(a.sel&&a.sel.length||a.txt)?"rep":"";
    return`<button type="button" data-jump="${i}" class="${st}" ${i===play.i?'aria-current="true"':""} aria-label="Question ${i+1}">${i+1}</button>`}).join("")}</div></div>`}).join("");
}
async function showQ(){
  const it=play.items[play.i],A=S.annales.get(it.a);
  if(!A||!qOf(it.a,it.c,it.q)){play.items.splice(play.i,1);play.ans.splice(play.i,1);if(!play.items.length){play=null;clearPlay();go("accueil");return}play.i=Math.min(play.i,play.items.length-1);return showQ()}
  const C=A.data.cases[it.c],Q=C.qs[it.q],prev=play.items[play.i-1],exam=play.mode==="exam";
  const newCase=!prev||prev.a!==it.a||prev.c!==it.c;
  const a=play.ans[play.i]||(play.ans[play.i]={sel:[],txt:"",done:false});
  const v=$("#view");document.querySelector(".act")?.remove();
  const doneN=play.ans.filter(x=>x&&x.done).length,pts=play.ans.reduce((s,x)=>s+(x&&x.done?x.s:0),0);
  v.innerHTML=`<div class="playwrap"><div class="play">
   <div class="pbar"><div class="t">${esc(play.title)}${exam?' <span class="chip red">Examen</span>':""}</div>${exam?`<div class="chrono" id="chrono1"></div>`:""}<div class="count">${play.i+1} / ${play.items.length}</div><button class="btn small qt-toggle" type="button" id="qtT" aria-expanded="${V.showTable}">Questions</button><button class="btn small" type="button" id="stop">${exam?"Terminer l'examen":"Terminer"}</button></div>
   <div class="pprog"><i style="width:${(play.i+1)/play.items.length*100}%"></i></div>
   <aside class="qtable mobile" ${V.showTable?"":"hidden"}>${qtableHTML()}</aside>
   <div class="chips"><span class="chip red">${esc(ueOf(A))}</span><span class="chip">${esc(titleOf(A))}</span><span class="chip">${esc(caseLabel(A,it.c))}</span><span class="chip">Question ${it.q+1} / ${C.qs.length}</span><span class="chip">${Q.type}${(Q.type==="QRPL"||Q.type==="QRP")&&Q.k?` · ${Q.k} attendue${Q.k>1?"s":""}`:""}</span></div>
   ${A.note&&A.note.c===it.c&&A.note.q===it.q?`<div class="resume" style="background:var(--raise)"><div><b>Erratum discuté.</b> ${esc(A.note.text)}</div></div>`:""}
   ${C.enonce.length?`<details class="enonce" ${newCase?"open":""}><summary>Énoncé du dossier</summary><div class="crops" id="en"></div></details>`:""}
   <div class="crops" id="qc"></div>
   ${Q.qroc?`<div class="qroc"><input type="text" id="qin" placeholder="Ta réponse" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Ta réponse" value="${esc(a.txt||"")}"></div>`:""}
   <div id="res"></div>
   <div class="kbd">Clavier : lettres pour cocher, Entrée pour valider, flèches ← → pour changer de question.</div>
  </div><aside class="qtable side">${exam?`<div class="chrono big" id="chrono2"></div>`:`<div class="qt-score">Série : <b>${fr(pts,2)}</b> / ${doneN}</div>`}${qtableHTML()}</aside></div>`;
  const act=document.createElement("div");act.className="act gut";
  act.innerHTML=`<div class="in"><button class="btn" type="button" id="prev" ${play.i?"":"disabled"} aria-label="Question précédente">← Précédente</button><div class="sc">${exam?`Répondues : <b>${play.ans.filter(x=>x&&(x.sel&&x.sel.length||x.txt)).length}</b> / ${play.items.length}`:`Série : <b>${fr(pts,2)}</b> / ${doneN} pt${doneN>1?"s":""}`}</div><button class="btn red" type="button" id="go">${exam?(play.i+1<play.items.length?"Suivante →":"Terminer l'examen"):"Valider"}</button></div>`;
  document.body.appendChild(act);
  $("#stop").onclick=()=>finish();
  $("#qtT").onclick=()=>{V.showTable=!V.showTable;const m=v.querySelector(".qtable.mobile");m.hidden=!V.showTable;$("#qtT").setAttribute("aria-expanded",V.showTable)};
  v.querySelectorAll("[data-jump]").forEach(b=>b.onclick=()=>jump(+b.dataset.jump));
  $("#prev").onclick=()=>jump(play.i-1);
  stopChrono();
  if(exam){const tick=()=>{if(!play||play.mode!=='exam'){stopChrono();return}const left=(play.limit-Date.now())/1000;["#chrono1","#chrono2"].forEach(s=>{const e=$(s);if(e){e.textContent=mmss(left);e.classList.toggle("urgent",left<=60)}});if(left<=0){stopChrono();toast("Temps écoulé : l'examen est terminé.");finish()}};tick();chronoId=setInterval(tick,500)}
  const sel=new Set(a.sel||[]),ov=makeOverlays(Q,sel,true),state={done:!!a.done&&!exam};
  ov.forEach(o=>{if(o.i==null)return;o.el.onclick=()=>{if(state.done)return;
    if(single(Q)&&!sel.has(o.i)){sel.clear();ov.forEach(x=>{if(x.i!=null){x.el.classList.remove("sel");x.el.setAttribute("aria-pressed","false")}})}
    sel.has(o.i)?sel.delete(o.i):sel.add(o.i);o.el.classList.toggle("sel",sel.has(o.i));o.el.setAttribute("aria-pressed",String(sel.has(o.i)));
    if(exam){a.sel=[...sel];savePlay();refreshTable()}}});
  const qc=$("#qc"),en=$("#en"),me=play.i,pid=play.id;
  const still=()=>play&&play.id===pid&&play.i===me&&V.tab==="play";
  if(en)await cropsInto(en,A,C.enonce,[]);
  if(!still())return;
  await cropsInto(qc,A,Q.segs,ov);
  if(!still())return;
  const input=$("#qin");if(input&&!state.done&&matchMedia("(hover:hover)").matches)input.focus();
  if(input&&exam)input.oninput=()=>{a.txt=input.value;savePlay();refreshTable()};
  const go=$("#go");
  const showDone=()=>{qc.classList.add("done");if(input)input.disabled=true;
    const res=a.ovr?{s:1,d:"Comptée juste par toi"}:scoreQ(Q,sel,a.txt);
    $("#res").innerHTML=resultHTML(Q,res,input?a.txt:null,true)+(hasOfficial(Q)?`<p class="offi">Les commentaires du corrigé officiel sont affichés dans la question.</p>`:"");
    const o=$("[data-ovr]");if(o)o.onclick=()=>{a.s=1;a.ovr=1;saveResult(it.a,it.c,it.q,1,sel,a.txt);savePlay();showQ()};
    go.textContent=play.i+1<play.items.length?"Suivante →":"Voir le bilan"};
  if(state.done)showDone();
  const validate=()=>{a.sel=[...sel];a.txt=input?input.value:"";const r=scoreQ(Q,sel,a.txt);a.s=r.s;a.done=true;state.done=true;
    saveResult(it.a,it.c,it.q,r.s,sel,a.txt);savePlay();showDone();refreshTable();
    const sc=play.ans.reduce((s,x)=>s+(x&&x.done?x.s:0),0),n=play.ans.filter(x=>x&&x.done).length;$(".act .sc").innerHTML=`Série : <b>${fr(sc,2)}</b> / ${n} pt${n>1?"s":""}`;
    const qs=$(".qt-score");if(qs)qs.innerHTML=`Série : <b>${fr(sc,2)}</b> / ${n}`};
  go.onclick=()=>{if(exam){if(input){a.txt=input.value}a.sel=[...sel];savePlay();play.i+1<play.items.length?jump(play.i+1):finish();return}
    state.done?(play.i+1<play.items.length?jump(play.i+1):finish()):validate()};
  if(input)input.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();go.click()}});
  play.key=e=>{if(e.target.tagName==="INPUT"||e.metaKey||e.ctrlKey||e.altKey)return;
    if(e.key==="Enter"){e.preventDefault();go.click();return}
    if(e.key==="ArrowLeft"&&play.i>0){e.preventDefault();jump(play.i-1);return}
    if(e.key==="ArrowRight"&&play.i+1<play.items.length&&(exam||state.done)){e.preventDefault();jump(play.i+1);return}
    const k=e.key.toUpperCase(),j=Q.opts.findIndex(o=>o.L===k);if(j>=0&&!state.done){const o=ov.find(x=>x.i===j);o&&o.el.click()}};
}
function refreshTable(){document.querySelectorAll(".qtable").forEach(t=>{const keep=t.querySelector(".chrono,.qt-score");t.querySelectorAll(".qt-g").forEach(g=>g.remove());t.insertAdjacentHTML("beforeend",qtableHTML());t.querySelectorAll("[data-jump]").forEach(b=>b.onclick=()=>jump(+b.dataset.jump))})}
function jump(i){if(!play||i<0||i>=play.items.length)return;play.i=i;savePlay();nav();showQ();scrollTo(0,0)}
document.addEventListener("keydown",e=>{if(V.tab==="play"&&play&&play.key&&!document.querySelector(".modal"))play.key(e)});
async function finish(){
  stopChrono();const p=play;play=null;clearPlay();document.querySelector(".act")?.remove();
  if(p.mode==="exam"){
    p.items.forEach((it,i)=>{const a=p.ans[i]||{sel:[],txt:""},Q=qOf(it.a,it.c,it.q);if(!Q)return;const r=scoreQ(Q,new Set(a.sel||[]),a.txt||"");a.s=r.s;a.done=true;p.ans[i]=a;saveResult(it.a,it.c,it.q,r.s,new Set(a.sel||[]),a.txt||"")});
  }
  const idx=p.items.map((_,i)=>i).filter(i=>p.ans[i]&&p.ans[i].done);
  if(!idx.length){V.tab="series";render();return}
  const tot=idx.reduce((s,i)=>s+p.ans[i].s,0);
  const id="s_"+rid(),sv={kind:"serie",title:p.title,mode:p.mode,at:Date.now(),n:idx.length,pts:tot,dur:Math.round((Date.now()-p.t0)/1000)};
  S.series.set(id,sv);putDoc(id,sv).catch(()=>{});
  lastEnd={...p,idx};V.tab="bilan";render();scrollTo(0,0);
}
function vBilan(v){
  const p=lastEnd;if(!p){go("accueil");return}
  const n=p.idx.length,tot=p.idx.reduce((s,i)=>s+p.ans[i].s,0),note=tot/n*20;
  const nOk=p.idx.filter(i=>p.ans[i].s>=1).length,nKo=p.idx.filter(i=>p.ans[i].s===0).length;
  const groups=new Map();p.idx.forEach(i=>{const it=p.items[i],k=it.a+"|"+it.c;if(!groups.has(k))groups.set(k,{it,s:0,n:0});const g=groups.get(k);g.s+=p.ans[i].s;g.n++});
  const miss=p.idx.filter(i=>p.ans[i].s<1).map(i=>p.items[i]);
  v.innerHTML=`<div class="page" style="max-width:880px"><div class="tag">${esc(p.title)}${p.mode==="exam"?" · Examen":""} · ${mmss((Date.now()-p.t0)/1000)}</div>
   <div class="big">${f20(note)}<small> / 20</small></div>
   <div class="dist"><div><b style="color:var(--ok)">${nOk}</b><span>justes</span></div><div><b style="color:var(--mid)">${n-nOk-nKo}</b><span>partielles</span></div><div><b style="color:var(--ko)">${nKo}</b><span>à 0</span></div></div>
   <div class="row" style="display:flex;flex-wrap:wrap;gap:10px"><button class="btn red" type="button" id="redo" ${miss.length?"":"disabled"}>${miss.length>1?"Refaire les "+miss.length+" erreurs":miss.length?"Refaire l'erreur":"Aucune erreur"}</button><button class="btn" type="button" id="toCarnet">Carnet d'erreurs</button><button class="btn" type="button" id="back">Accueil</button></div>
   <section class="panel"><h3>Par dossier</h3><div class="tw"><table class="t"><tbody>${[...groups.values()].map(g=>{const A=S.annales.get(g.it.a);return`<tr><td>${esc(A?titleOf(A)+" · "+caseLabel(A,g.it.c):"")}</td><td class="n">${g.n} q.</td><td class="n"><b>${f20(g.s/g.n*20)}</b> / 20</td></tr>`}).join("")}</tbody></table></div></section>
   <section class="panel"><h3>Correction</h3><div style="display:grid;gap:8px" id="rev">${p.idx.map(i=>{const it=p.items[i],A=S.annales.get(it.a);return`<details class="rev" data-i="${i}"><summary><span class="dot ${cls(p.ans[i].s)}"></span><span>${i+1}. ${esc(A?titleOf(A):"")} · ${esc(A?caseLabel(A,it.c):"")} · Q${it.q+1}</span><b>${fr(p.ans[i].s,2)}</b></summary><div class="body"></div></details>`}).join("")}</div></section>
  </div>`;
  $("#redo").onclick=()=>startSeries(miss,"Erreurs · "+p.title,"train");$("#toCarnet").onclick=()=>go("carnet");$("#back").onclick=()=>go("accueil");
  v.querySelectorAll("details.rev").forEach(d=>d.addEventListener("toggle",async()=>{if(!d.open||d._done)return;d._done=true;
    const i=+d.dataset.i,it=p.items[i],A=S.annales.get(it.a);const Q=qOf(it.a,it.c,it.q);if(!Q)return;const ans=p.ans[i];
    const body=d.querySelector(".body"),box=document.createElement("div");box.className="crops done";body.appendChild(box);
    await cropsInto(box,A,Q.segs,makeOverlays(Q,new Set(ans.sel||[]),false));
    body.insertAdjacentHTML("beforeend",resultHTML(Q,{s:ans.s,d:ans.ovr?"Comptée juste par toi":scoreQ(Q,new Set(ans.sel||[]),ans.txt||"").d},Q.qroc?ans.txt||"":null,false));}));
}

/* ---------- Carnet d'erreurs ---------- */
function vCarnet(v){
  const all=annList(),ues=ueNames();
  const lim=V.errPer==="tout"?-1:today()-(+V.errPer);
  let list=resOf(all).filter(r=>r.err&&r.err[0]>0&&(V.errOnly?r.last<1:true)&&(!V.errUE||ueOf(S.annales.get(r.a))===V.errUE)&&(lim<0||r.err[1]>=lim));
  list.sort((x,y)=>y.err[1]-x.err[1]||y.at-x.at);
  const segB=(k,opts,val)=>`<div class="seg wrap" role="group">${opts.map(([x,t])=>`<button type="button" data-${k}="${esc(x)}" aria-pressed="${String(val)===String(x)}">${t}</button>`).join("")}</div>`;
  v.innerHTML=`<div class="page" style="max-width:960px"><div class="head"><div><h2>Carnet d'erreurs</h2><p>Chaque question ratée, avec la capture de l'annale, ta réponse et la correction officielle.</p></div>
   ${list.length?`<button class="btn red" type="button" id="redoAll">Refaire ces questions (${list.length})</button>`:""}</div>
   <section class="panel"><div class="row2"><span class="lbl">UE</span>${segB("eu",[["","Toutes"],...ues.map(u=>[u,u])],V.errUE)}</div>
    <div class="row2"><span class="lbl">Période</span>${segB("ep",[["7","7 jours"],["30","30 jours"],["tout","Tout"]],V.errPer)}</div>
    <div class="row2"><span class="lbl">Afficher</span>${segB("eo",[["1","À retravailler"],["0","Toutes, même réussies depuis"]],V.errOnly?"1":"0")}</div></section>
   <div style="display:grid;gap:14px" id="errs"></div></div>`;
  v.querySelectorAll("[data-eu]").forEach(b=>b.onclick=()=>{V.errUE=b.dataset.eu;V.errShown=12;render()});
  v.querySelectorAll("[data-ep]").forEach(b=>b.onclick=()=>{V.errPer=b.dataset.ep;V.errShown=12;render()});
  v.querySelectorAll("[data-eo]").forEach(b=>b.onclick=()=>{V.errOnly=b.dataset.eo==="1";V.errShown=12;render()});
  if($("#redoAll"))$("#redoAll").onclick=()=>startSeries(list.slice().sort((x,y)=>x.a.localeCompare(y.a)||x.c-y.c||x.q-y.q).map(r=>({a:r.a,c:r.c,q:r.q})),"Carnet d'erreurs","train");
  const box=$("#errs");
  if(!list.length){box.innerHTML=`<div class="empty"><h3>${resOf(all).length?"Rien à retravailler ici":"Ton carnet est vide"}</h3><p>${resOf(all).length?"Aucune erreur ne correspond à ces filtres.":"Il se remplit tout seul : chaque question où tu perds des points y est notée avec sa capture et sa correction."}</p></div>`;return}
  const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){io.unobserve(e.target);fillErr(e.target)}}),{rootMargin:"400px"});
  list.slice(0,V.errShown).forEach(r=>{const A=S.annales.get(r.a),Q=qOf(r.a,r.c,r.q);
    const el=document.createElement("article");el.className="err";el._r=r;
    el.innerHTML=`<div class="hd"><span class="chip red">${esc(ueOf(A))}</span><span class="chip">${esc(titleOf(A))}</span><span class="chip">${esc(caseLabel(A,r.c))} · Q${r.q+1}</span><span class="chip">${Q.type}</span><span class="chip" style="color:var(--${r.last>=1?"ok":"ko"})">Dernière note ${fr(r.last,2)}</span></div>
     <div class="mine">Ratée ${r.err[0]} fois, dernière fois le ${dShort.format(dayDate(r.err[1]))}${r.last>=1?" · réussie depuis":""}</div>
     ${A.data.cases[r.c].enonce.length?`<details class="mini"><summary>Voir l'énoncé du dossier</summary><div class="crops" data-en></div></details>`:""}
     <div class="crops done" data-q><div class="crop loading" style="--cw:500;aspect-ratio:3/1"></div></div><div data-res></div>
     <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn small" type="button" data-one>Refaire cette question</button></div>`;
    el.querySelector("[data-one]").onclick=()=>startSeries([{a:r.a,c:r.c,q:r.q}],"Carnet · "+titleOf(A),"train");
    const det=el.querySelector("details.mini");if(det)det.addEventListener("toggle",async()=>{if(!det.open||det._d)return;det._d=true;await cropsInto(det.querySelector("[data-en]"),A,A.data.cases[r.c].enonce,[])});
    box.appendChild(el);io.observe(el)});
  if(list.length>V.errShown){const b=document.createElement("button");b.className="btn more";b.type="button";b.textContent=`Afficher plus (${list.length-V.errShown} restantes)`;b.onclick=()=>{V.errShown+=12;render()};box.appendChild(b)}
}
async function fillErr(el){
  const r=el._r,A=S.annales.get(r.a),Q=qOf(r.a,r.c,r.q),sel=new Set(r.sel||[]);
  const qb=el.querySelector("[data-q]");qb.innerHTML="";
  await cropsInto(qb,A,Q.segs,makeOverlays(Q,sel,false));
  el.querySelector("[data-res]").innerHTML=resultHTML(Q,{s:r.last,d:scoreQ(Q,sel,r.txt||"").d},Q.qroc?(r.txt||""):null,false)+(hasOfficial(Q)?`<p class="offi">La correction officielle (justifications, commentaire) est affichée dans la capture.</p>`:"");
}

/* ---------- Statistiques ---------- */
function vStats(v){
  const all=annList(),rs=resOf(all),g=statsFor(all),a14=activity(14),a7=a14.slice(-7),n7=a7.reduce((s,x)=>s+x.n,0),p7=a7.reduce((s,x)=>s+x.p,0);
  const byType={};rs.forEach(r=>{const Q=qOf(r.a,r.c,r.q);const t=byType[Q.type]||(byType[Q.type]={n:0,s:0});t.n++;t.s+=r.last});
  const ser=[...S.series.values()].sort((a,b)=>b.at-a.at).slice(0,10);
  const weak=all.map(A=>({A,s:statsFor([A])})).filter(x=>x.s.done>=5).sort((a,b)=>a.s.avg-b.s.avg).slice(0,5);
  v.innerHTML=`<div class="page"><div class="head"><div><h2>Statistiques</h2><p>Notes calculées sur ta dernière réponse à chaque question, au barème réglé.</p></div></div>
   <div class="tiles"><div class="tile"><span>Moyenne générale</span><b>${f20(g.avg)}<small> /20</small></b></div><div class="tile"><span>Note · 7 jours</span><b>${n7?f20(p7/n7*20):"–"}<small> /20</small></b></div><div class="tile"><span>Questions faites</span><b>${g.done}<small> / ${g.n}</small></b></div><div class="tile"><span>Jours d'affilée</span><b>${streak()}</b></div></div>
   <section class="panel"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap"><h3>Questions par jour</h3><span style="color:var(--muted);font-size:.85rem">14 derniers jours</span></div>
    ${a14.some(x=>x.n)?`<div class="graph" id="graph"></div>`:'<p style="margin:0;color:var(--muted)">Le graphique apparaîtra après tes premières questions.</p>'}</section>
   <section class="panel"><h3>Par UE</h3><div class="tw"><table class="t"><thead><tr><th>UE</th><th class="n">Note</th><th class="n">Faites</th><th class="n">Couverture</th><th class="n">À retravailler</th></tr></thead><tbody>
    ${ueNames().map(u=>{const L=all.filter(A=>ueOf(A)===u),s=statsFor(L);return`<tr><td>${esc(u)}</td><td class="n"><b>${f20(s.avg)}</b></td><td class="n">${s.done} / ${s.n}</td><td class="n">${s.n?Math.round(s.done/s.n*100):0} %</td><td class="n">${s.errs}</td></tr>`}).join("")}</tbody></table></div></section>
   <div class="duo">
    <section class="panel"><h3>Par type de question</h3>${Object.keys(byType).length?`<div class="tw"><table class="t"><thead><tr><th>Type</th><th class="n">Questions</th><th class="n">Note</th></tr></thead><tbody>${Object.entries(byType).sort().map(([t,x])=>`<tr><td>${t}</td><td class="n">${x.n}</td><td class="n"><b>${f20(x.s/x.n*20)}</b></td></tr>`).join("")}</tbody></table></div>`:'<p style="margin:0;color:var(--muted)">Pas encore de réponses.</p>'}</section>
    <section class="panel"><h3>Annales à retravailler</h3>${weak.length?`<div class="tw"><table class="t"><tbody>${weak.map(({A,s})=>`<tr><td>${esc(ueOf(A))} <span style="color:var(--muted)">· ${esc(titleOf(A))}</span></td><td class="n"><b>${f20(s.avg)}</b></td><td class="n"><button class="btn small" type="button" data-err="${A.id}" ${s.errs?"":"disabled"}>Erreurs</button></td></tr>`).join("")}</tbody></table></div>`:'<p style="margin:0;color:var(--muted)">Fais au moins 5 questions d\'une annale pour la voir ici.</p>'}</section>
   </div>
   <section class="panel"><h3>Dernières séries</h3>${ser.length?`<div class="tw"><table class="t"><thead><tr><th>Date</th><th>Série</th><th class="n">Questions</th><th class="n">Note</th></tr></thead><tbody>${ser.map(x=>`<tr><td>${dWk.format(new Date(x.at))}</td><td>${esc(x.title)}${x.mode==="exam"?' <span class="chip">Examen</span>':""}</td><td class="n">${x.n}</td><td class="n"><b>${f20(x.n?x.pts/x.n*20:0)}</b></td></tr>`).join("")}</tbody></table></div>`:'<p style="margin:0;color:var(--muted)">Aucune série terminée.</p>'}</section>
  </div>`;
  wire(v);
  const gEl=$("#graph");if(gEl){
    const W=Math.max(300,gEl.clientWidth||640),H=200,m={t:12,r:6,b:28,l:30},iw=W-m.l-m.r,ih=H-m.t-m.b,mx=Math.max(...a14.map(x=>x.n)),top=[5,10,20,40,60,100,150,200,300,500].find(x=>x>=mx)||Math.ceil(mx/100)*100,band=iw/a14.length,bw=Math.min(26,band*.6);
    let s=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Questions faites par jour sur 14 jours">`;
    [0,top/2,top].forEach(t=>{const y=m.t+ih-t/top*ih;s+=`<line class="gl" x1="${m.l}" x2="${W-m.r}" y1="${y}" y2="${y}"/><text class="ax" x="${m.l-6}" y="${y+4}" text-anchor="end">${t}</text>`});
    a14.forEach((x,k)=>{const h=x.n/top*ih,X=m.l+k*band+(band-bw)/2;if(h>0)s+=`<rect class="br" x="${X}" y="${m.t+ih-h}" width="${bw}" height="${h}" rx="4"><title>${dWk.format(dayDate(x.d))} : ${pl(x.n,"question")}${x.n?" · "+f20(x.p/x.n*20)+"/20":""}</title></rect>`;
      if((a14.length-1-k)%2===0)s+=`<text class="ax" x="${X+bw/2}" y="${H-8}" text-anchor="middle">${x.d===today()?"auj.":dayDate(x.d).getDate()}</text>`});
    gEl.innerHTML=s+"</svg>";
  }
}

/* ---------- Réglages ---------- */
function vReglages(v){
  const st=S.settings,th=curTheme();
  const sel=(id,opts,val)=>`<select id="${id}">${opts.map(([k,t])=>`<option value="${k}" ${String(val)===String(k)?"selected":""}>${t}</option>`).join("")}</select>`;
  const store={local:"Tout est enregistré dans ce navigateur, sur cet appareil : tes PDF, tes réponses, tes séries et tes réglages. Rien n'est envoyé à un serveur, et ta progression ne suit pas sur un autre appareil : utilise la sauvegarde ci-dessous.",none:"Ce navigateur ne permet pas d'enregistrer (navigation privée ?) : ta progression sera perdue en quittant la page."}[S.mode];
  const pers=S.persist===true?"Le navigateur s'est engagé à ne pas effacer ces données.":S.persist===false?"Le navigateur peut effacer ces données s'il manque de place : sauvegarde ta progression de temps en temps.":"";
  const pend=[...S.pending.values()];
  v.innerHTML=`<div class="page" style="max-width:860px"><div class="head"><div><h2>Réglages</h2></div></div>
   ${installHTML(true)}
   <section class="panel"><h3>Apparence</h3><div class="seg" role="group" aria-label="Thème">${[["auto","Auto"],["light","Clair"],["dark","Sombre"]].map(([k,t])=>`<button type="button" data-th="${k}" aria-pressed="${th===k}">${t}</button>`).join("")}</div></section>
   <section class="panel"><h3>Barème</h3><p style="margin:0;color:var(--muted)">QRM : points selon le nombre de discordances (case cochée à tort ou oubliée). QRU : tout ou rien. QRP et QRPL : une proposition inacceptable cochée ou une indispensable oubliée donne 0, trop de cases cochées aussi. TCS : selon la part d'experts ayant choisi ta réponse.</p>
    <div class="set"><label class="field"><span>1 discordance</span>${sel("b1",[[.5,"0,5"],[.4,"0,4"],[.3,"0,3"],[.2,"0,2"],[0,"0"]],st.b1)}</label>
    <label class="field"><span>2 discordances</span>${sel("b2",[[.2,"0,2"],[.1,"0,1"],[0,"0"]],st.b2)}</label>
    <label class="field"><span>QRP et QRPL</span>${sel("qrpl",[["prorata","Au prorata des bonnes réponses"],["strict","Tout ou rien"]],st.qrpl)}</label></div></section>
   <section class="panel"><h3>Séries</h3><div class="set"><label class="field"><span>Dossiers par série au hasard</span>${sel("nDos",[[3,"3"],[5,"5"],[10,"10"],[0,"Tous"]],st.nDos)}</label>
    <label class="field"><span>Temps par question en examen</span>${sel("tQ",[[60,"1 min"],[90,"1 min 30"],[120,"2 min"],[180,"3 min"]],st.tQ)}</label></div></section>
   <section class="panel"><h3>Tes données</h3><p style="margin:0">${store}</p>${pers?`<p style="margin:0;color:var(--muted)">${pers}</p>`:""}
    <p style="margin:0;color:var(--muted)">La sauvegarde contient tes résultats, tes séries, tes réglages et la liste de tes annales (UE, épreuve, date), sans les PDF. Pour la restaurer sur un autre appareil, restaure le fichier puis réimporte les mêmes PDF.</p>
    ${pend.length?`<p style="margin:0" id="pendList"><b>${pl(pend.length,"annale attend","annales attendent")} son PDF :</b> ${pend.map(x=>esc((x.ue||UE_TODO)+" · "+([x.exam,sessionLabel(x.date)].filter(Boolean).join(" ")||x.name))).join(" ; ")}</p>`:""}
    <div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn" type="button" id="bkSave">Sauvegarder ma progression</button><label class="btn" for="bkFile" id="bkLoad">Restaurer ma progression</label><input type="file" id="bkFile" accept="application/json,.json" class="vh">
     <button class="btn" type="button" id="reset" style="color:var(--red)">Réinitialiser ma progression</button></div></section>
   ${typeof authPanelHTML==="function"?authPanelHTML():""}
   <section class="panel"><h3>Confidentialité</h3><p style="margin:0;color:var(--muted)">Swag est gratuit et ne contient aucune annale : tu importes tes propres corrigés, qui sont lus et gardés sur ton appareil. Le code du site est public. L'accès est réservé aux membres (adresse e-mail sur la liste), mais ce contrôle se fait dans ton navigateur : il sert à réserver le site, pas à protéger des données secrètes. Seule ton adresse e-mail sert à la connexion.</p></section>
  </div>`;
  v.querySelectorAll("[data-th]").forEach(b=>b.onclick=()=>{setTheme(b.dataset.th);render()});
  ["b1","b2","nDos","tQ"].forEach(k=>$("#"+k).onchange=e=>saveSettings({[k]:+e.target.value}));
  $("#qrpl").onchange=e=>saveSettings({qrpl:e.target.value});
  $("#bkSave").onclick=()=>saveBackup();
  $("#bkFile").onchange=async e=>{const f=e.target.files[0];e.target.value="";if(f)await restoreBackup(f)};
  if(typeof wireAuthPanel==="function")wireAuthPanel(v);
  let armed=false;$("#reset").onclick=async()=>{const b=$("#reset");if(!armed){armed=true;b.textContent="Confirmer : effacer notes, séries et carnet";b.classList.add("red");b.style.color="";return}
    b.disabled=true;b.textContent="Effacement…";try{for(const k of [...S.results.keys(),...S.series.keys()])await delDoc(k);S.results.clear();S.series.clear();toast("Progression effacée")}catch(e){toast("L'effacement n'a pas abouti.")}render()};
}

/* ---------- sauvegarde / restauration de la progression (sans les PDF) ---------- */
const annMeta=A=>({id:A.id,hash:A.hash||"",name:A.name||"",ue:A.ue||"",exam:A.exam||"",date:A.date||"",nq:A.nq||0});
function backupData(){
  return{app:"swag",format:1,at:new Date().toISOString(),theme:curTheme(),settings:{...S.settings,kind:undefined},
    annales:[...[...S.annales.values()].map(annMeta),...[...S.pending.values()].map(annMeta)],
    results:[...S.results.values()],series:[...S.series.entries()].map(([k,v])=>({...v,key:k}))};
}
async function saveBackup(){
  const d=new Date(),stamp=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
  await saveFile("Swag - sauvegarde "+stamp+".json",JSON.stringify(backupData()),"application/json");
}
async function restoreBackup(file){
  let B;try{B=JSON.parse(await file.text())}catch(e){toast("Ce fichier n'est pas une sauvegarde Swag.");return}
  if(!B||B.app!=="swag"||!Array.isArray(B.results)){toast("Ce fichier n'est pas une sauvegarde Swag.");return}
  const byHash=new Map([...S.annales.values()].filter(A=>A.hash).map(A=>[A.hash,A]));const map=new Map();let nPend=0,nRes=0,nSer=0;
  try{
    for(const m of B.annales||[]){if(!m||!m.id)continue;const A=m.hash&&byHash.get(m.hash);
      if(A){map.set(m.id,A.id);if(m.ue||m.exam||m.date){Object.assign(A,{ue:m.ue||A.ue,exam:m.exam||A.exam,date:m.date||A.date,session:sessionLabel(m.date||A.date)});await putDoc(A.id,A)}}
      else if(!S.annales.has(m.id)){const k="p_"+m.id,v={kind:"pending",...annMeta(m)};S.pending.set(k,v);await putDoc(k,v);nPend++}}
    for(const r of B.results){if(!r||r.kind!=="result")continue;const a=map.get(r.a)||r.a,k=qKey(a,r.c,r.q),o=S.results.get(k);
      if(o&&o.at>=r.at)continue;const v={...r,a};S.results.set(k,v);await putDoc(k,v);nRes++}
    for(const x of B.series||[]){if(!x||x.kind!=="serie")continue;const {key,...v}=x;const k=key||"s_"+rid();if(S.series.has(k))continue;S.series.set(k,v);await putDoc(k,v);nSer++}
    if(B.settings){const {kind,...st}=B.settings;await saveSettings({...DEF,...st})}
    if(B.theme)setTheme(B.theme);
  }catch(e){toast(quotaErr(e)?"Stockage plein : la restauration n'est pas complète.":"La restauration n'a pas abouti.");render();return}
  render();toast(`Restauré : ${pl(nRes,"résultat")}, ${pl(nSer,"série")}`+(nPend?` · ${pl(nPend,"annale")} à réimporter (mêmes PDF)`:""));
}

/* ---------- ajout / modification ---------- */
function modal(html,o){o=o||{};const m=document.createElement("div");m.className="modal";m.innerHTML=`<div class="sheet${o.wide?" wide":""}" role="dialog" aria-modal="true">${html}</div>`;
  m.addEventListener("click",e=>{if(e.target===m&&!(o.locked&&o.locked()))m.remove()});$("#layer").appendChild(m);return m}
const ueDatalist=()=>`<datalist id="uel">${UE_LIST.map(u=>`<option value="${esc(u)}">`).join("")}</datalist>`;
/* ---------- import en masse ---------- */
async function firstPageText(bytes){ // titre du document + lignes en gros caractères (ou « Référence ») du haut de la 1re page
  let task=null;try{task=PDFJS.getDocument({data:bytes.slice()});const doc=await task.promise;const out=[];
    try{const md=await doc.getMetadata();if(md&&md.info&&md.info.Title)out.push(md.info.Title)}catch(e){}
    const page=await doc.getPage(1),vp=page.getViewport({scale:1});const tc=await page.getTextContent();
    const its=tc.items.filter(it=>it.str&&it.str.trim()).map(it=>{const t=PDFJS.Util.transform(vp.transform,it.transform);return{s:it.str.trim(),y:t[5],h:it.height||Math.hypot(t[2],t[3])}}).filter(it=>it.y<vp.height*.5).sort((a,b)=>a.y-b.y);
    its.filter(it=>it.h>=12.5||/^Référence/i.test(it.s)).forEach(it=>out.push(it.s));
    return out.join(" ").slice(0,400)}
  catch(e){return""}finally{if(task)try{await task.destroy()}catch(e){}}
}
async function guessMeta(file,bytes){
  const folder=(file.webkitRelativePath||"").split("/").slice(0,-1).join(" "),n=cleanName(file.name);
  let ue=guessUE(n)||guessUE(folder),exam=guessExam(n,folder),date=guessDate(n,folder),src=ue?"nom":"";
  if(!ue||!exam||!date){const t=await firstPageText(bytes);if(t){if(!ue&&(ue=guessUE(t)))src="page";if(!exam)exam=guessExam(t,"");if(!date)date=guessDate(t,"")}}
  return{ue:ue||UE_TODO,exam,date,src:ue?src:""};
}
let pdfLock=Promise.resolve(); // une seule lecture de PDF à la fois (import, relecture)
function exclusive(fn){const r=pdfLock.then(fn,fn);pdfLock=r.catch(()=>{});return r}
async function checkClean(bytes){ // checkBytes inchangé ; on ferme ensuite les documents pdf.js qu'il a ouverts (mémoire de l'iPad)
  const tasks=[],wrap=Object.create(PDFJS,{getDocument:{value:(...a)=>{const t=PDFJS.getDocument(...a);tasks.push(t);return t}}});
  window.pdfjsLib=wrap;
  try{return await checkBytes(bytes,{vierge:true,autodrop:true})}
  finally{window.pdfjsLib=PDFJS;for(const t of tasks){try{await t.destroy()}catch(e){}}}
}
async function importOne(file,seen){
  // renvoie {st:"ok"|"dup"|"ko", why, A}
  let bytes;try{bytes=new Uint8Array(await file.arrayBuffer())}catch(e){return{st:"ko",why:"fichier illisible."}}
  if(!/\.pdf$/i.test(file.name)&&file.type!=="application/pdf")return{st:"ko",why:"ce n'est pas un PDF."};
  const hash=await sha1(bytes);
  const dup=hash&&([...S.annales.values()].find(A=>A.hash===hash)||seen.get(hash));
  if(dup)return{st:"dup",why:`déjà dans Swag : ${ueOf(dup)} · ${titleOf(dup)}.`};
  let rep;try{rep=await checkClean(bytes)}catch(e){return{st:"ko",why:e&&e.name==="PasswordException"?"PDF protégé par un mot de passe.":"ce fichier ne s'ouvre pas comme un PDF."}}
  const d=rep.A;
  if(!d||!d.nq)return{st:"ko",why:"aucune question corrigée trouvée (il faut un corrigé avec Valide / Faux ou la colonne « Réponse attendue »)."};
  if(rep.errs.length)return{st:"ko",why:`refusé pour ne rien dévoiler : ${pl(rep.errs.length,"élément")} du corrigé resterai${rep.errs.length>1?"en":""}t visible${rep.errs.length>1?"s":""} (format non reconnu).`};
  const pk=[...S.pending.keys()].find(k=>S.pending.get(k).hash===hash),pend=pk&&S.pending.get(pk);
  const g=pend?{ue:pend.ue||UE_TODO,exam:pend.exam,date:pend.date,src:"sauvegarde"}:await guessMeta(file,bytes);
  const A={id:pend?pend.id:rid(),kind:"annale",name:pend&&pend.name||cleanName(file.name),ue:g.ue,exam:g.exam,date:g.date,session:sessionLabel(g.date),createdAt:Date.now(),nq:d.nq,data:d,hash,src:g.src};
  await saveAnnale(A,bytes,false);
  if(pk){S.pending.delete(pk);delDoc(pk).catch(()=>{})}
  seen.set(hash,A);
  const nd=(rep.droppedQ||[]).length,nz=d.dropped.filter(x=>x.type!=="dossier"&&x.type!=="écartée").length;
  return{st:"ok",A,note:[pl(d.nq,"question"),nd?pl(nd,"question écartée","questions écartées")+" (lecture douteuse, masquée)":"",nz?pl(nz,"question non reprise","questions non reprises")+" (zone sur image ou annulée)":""].filter(Boolean).join(" · ")};
}
function openImport(){
  if(S.mode==="none"){toast("Ce navigateur ne permet pas d'enregistrer les PDF (navigation privée ?).");return}
  const dirOK="webkitdirectory" in document.createElement("input")&&!matchMedia("(pointer:coarse)").matches;
  const m=modal(`<h3>Importer des corrigés</h3>
   <p style="margin:0;color:var(--muted)">Choisis un ou plusieurs corrigés PDF (UNESS avec Valide / Faux, ou avec la colonne « Réponse attendue »). Chaque fichier est lu et contrôlé sur ton appareil : s'il reste la moindre réponse visible, il est refusé. Rien n'est envoyé.</p>
   <label class="drop" id="imDrop" for="imFile"><b>Choisir des PDF</b><span>ou les glisser ici</span></label><input type="file" id="imFile" class="vh" accept="application/pdf,.pdf" multiple>
   ${dirOK?`<div><label class="btn small ghost" for="imDir">Choisir un dossier entier</label><input type="file" id="imDir" class="vh" webkitdirectory multiple></div>`:""}
   <div id="imProg" hidden><div class="bar"><i style="width:0%"></i></div><p class="meta" id="imNow" style="margin:6px 0 0"></p></div>
   <div id="imSum" class="found" hidden></div><div id="imRec" class="imrec"></div>${ueDatalist()}
   <div class="row"><button class="btn" type="button" id="imStop" hidden>Arrêter après ce fichier</button><button class="btn red" type="button" id="imClose">Fermer</button></div>`,{wide:true,locked:()=>busy});
  let busy=false,stop=false;const rows=[];
  const recRow=(f,r)=>{const el=document.createElement("div");el.className="imrow "+r.st;
    if(r.st!=="ok"){el.innerHTML=`<div class="imn"><span class="ims">${r.st==="dup"?"=":"✗"}</span><b>${esc(f.name)}</b></div><div class="imw">${esc(r.why)}</div>`;return el}
    const A=r.A;
    el.innerHTML=`<div class="imn"><span class="ims">✓</span><b>${esc(f.name)}</b><small>${esc(r.note)}${A.src==="page"?" · UE devinée d'après la 1re page":A.src==="sauvegarde"?" · retrouvée dans ta sauvegarde":A.ue===UE_TODO?" · UE non reconnue : à classer":""}</small></div>
     <div class="imf"><label>UE<input type="text" list="uel" data-k="ue" value="${esc(A.ue)}" autocomplete="off"></label><label>Épreuve<input type="text" data-k="exam" value="${esc(A.exam||"")}" placeholder="MM1, MM2…" autocomplete="off"></label><label>Date<input type="month" data-k="date" value="${esc((A.date||"").replace(/-00$/,"-01"))}"></label></div>`;
    el.querySelectorAll("[data-k]").forEach(inp=>inp.onchange=async()=>{const k=inp.dataset.k;let v=inp.value.trim();if(k==="ue"&&!v)v=UE_TODO;A[k]=v;if(k==="date")A.session=sessionLabel(v);
      try{await putDoc(A.id,A);inp.classList.add("saved");setTimeout(()=>inp.classList.remove("saved"),900)}catch(e){toast("La modification n'a pas pu être enregistrée.")}});
    return el};
  const run=async list=>{
    const F=[...(list||[])].filter(f=>/\.pdf$/i.test(f.name)||f.type==="application/pdf");if(busy||!F.length){if(list&&list.length&&!F.length)toast("Aucun PDF dans cette sélection.");return}
    busy=true;stop=false;$("#imStop").hidden=false;$("#imClose").disabled=true;$("#imProg").hidden=false;const seen=new Map();let n=0;
    for(let i=0;i<F.length&&!stop;i++){const f=F[i];
      $("#imNow").textContent=`Lecture et contrôle ${i+1} / ${F.length} : ${f.name}`;$("#imProg i").style.width=(i/F.length*100)+"%";
      let r;try{r=await exclusive(()=>importOne(f,seen))}catch(e){r={st:"ko",why:quotaErr(e)?"stockage de l'appareil plein.":"lecture impossible."}}
      rows.push(r);n++;$("#imRec").appendChild(recRow(f,r));
      if(r.st==="ko"&&/stockage/.test(r.why)){stop=true}}
    busy=false;$("#imStop").hidden=true;$("#imClose").disabled=false;$("#imProg i").style.width="100%";
    const ok=rows.filter(r=>r.st==="ok").length,ko=rows.filter(r=>r.st==="ko").length,du=rows.filter(r=>r.st==="dup").length,todo=rows.filter(r=>r.st==="ok"&&r.A.ue===UE_TODO).length;
    $("#imNow").textContent=stop&&n<F.length?`Arrêté après ${n} fichier${n>1?"s":""} sur ${F.length}.`:"Terminé.";
    $("#imSum").hidden=false;$("#imSum").innerHTML=`<b>${pl(ok,"annale ajoutée","annales ajoutées")}</b>${ko?` · ${pl(ko,"fichier refusé","fichiers refusés")}`:""}${du?` · ${pl(du,"doublon ignoré","doublons ignorés")}`:""}${todo?`<br>${pl(todo,"annale")} dans « ${UE_TODO} » : indique l'UE ci-dessous.`:""}${ok?"<br>Vérifie l'UE, l'épreuve et la date de chaque annale : tu peux les corriger ici ou plus tard avec « Modifier ».":""}`;
    $("#imDrop").innerHTML=`<b>Importer d'autres PDF</b><span>ou les glisser ici</span>`;nav()};
  $("#imFile").onchange=e=>{const f=[...e.target.files];e.target.value="";run(f)};
  if($("#imDir"))$("#imDir").onchange=e=>{const f=[...e.target.files];e.target.value="";run(f)};
  const d=$("#imDrop");d.ondragover=e=>{e.preventDefault();d.classList.add("over")};d.ondragleave=()=>d.classList.remove("over");
  d.ondrop=e=>{e.preventDefault();d.classList.remove("over");run(e.dataTransfer.files)};
  $("#imStop").onclick=()=>{stop=true;$("#imStop").disabled=true;$("#imStop").textContent="Arrêt après ce fichier…"};
  $("#imClose").onclick=()=>{if(busy)return;m.remove();if(rows.some(r=>r.st==="ok")){V.annUE="";V.annQ="";V.tab="annales"}render()};
  return m;
}
function openEdit(A){
  const m=modal(`<h3>Modifier l'annale</h3>
   <p style="margin:0;color:var(--muted);overflow-wrap:anywhere">${esc(A.name||"")}</p>
   <label>UE<input type="text" id="fUE" list="uel" value="${esc(A.ue)}" autocomplete="off"></label>
   <label>Épreuve<input type="text" id="fExam" value="${esc(A.exam||"")}" autocomplete="off" placeholder="MM1, MM2, EDN blanc…"></label>
   <label>Date de l'épreuve<input type="month" id="fDate" value="${esc((dateOf(A)||"").replace(/-00$/,"-01"))}"></label>${ueDatalist()}
   <div class="row" style="justify-content:space-between"><button class="btn ghost" type="button" id="del" style="color:var(--red)">Supprimer</button>
   <span style="display:flex;gap:10px"><button class="btn" type="button" id="cancel">Annuler</button><button class="btn red" type="button" id="save">Enregistrer</button></span></div>`);
  $("#cancel").onclick=()=>m.remove();
  $("#save").onclick=async()=>{const date=$("#fDate").value||A.date||"";const patch={ue:$("#fUE").value.trim()||UE_TODO,exam:$("#fExam").value.trim(),date,session:sessionLabel(date)};
    try{Object.assign(A,patch);await putDoc(A.id,A);m.remove();render()}catch(e){toast("La modification n'a pas pu être enregistrée.")}};
  let armed=false;$("#del").onclick=async()=>{
    if(!armed){armed=true;$("#del").textContent="Confirmer : supprimer l'annale et ses résultats";return}
    try{await removeAnnale(A);m.remove();render();toast("Annale supprimée")}catch(e){toast("La suppression a échoué.")}};
}

/* ---------- sujet vierge (PDF) ---------- */
let pdfLibP=null;
function pdfLib(){return pdfLibP||(pdfLibP=new Promise((res,rej)=>{const s=document.createElement("script");s.src="https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js";s.onload=()=>window.PDFLib?res(window.PDFLib):rej(new Error("pdf-lib"));s.onerror=()=>{pdfLibP=null;rej(new Error("pdf-lib"))};document.head.appendChild(s)}))}
function blankMasks(A){
  const byP=new Map(),add=o=>{if(!byP.has(o.p))byP.set(o.p,[]);byP.get(o.p).push(o)};
  A.data.cases.forEach((cs,ci)=>cs.qs.forEach((q,qi)=>{const g=ci+"_"+qi;
    q.opts.forEach(o=>add({p:o.p,l:o.l,t:o.t,r:o.r,b:o.b,mk:"opt",L:o.L,nl:o.nl,round:single(q)}));
    (q.hide||[]).forEach(h=>add({p:h.p,l:h.l,t:h.t,r:h.r,b:h.b,mk:h.kind,g}))}));
  (A.data.dropped||[]).forEach(d=>{if(d.type==="dossier")return;d.segs.forEach((s,i)=>add({p:s.p,l:0,r:A.data.pages[s.p-1].w,t:s.y0,b:s.y1,mk:"drop",first:i===0,dt:d.type}))});
  return byP;
}
async function renderBlankPage(A,p,scale){
  const {cv}=await pageCanvas(A,p,scale);const ctx=cv.getContext("2d"),k=scale,ms=blankMasks(A).get(p)||[];
  ctx.fillStyle="#fff";for(const m of ms)ctx.fillRect(m.l*k,m.t*k,(m.r-m.l)*k,(m.b-m.t)*k);
  ctx.textBaseline="middle";
  for(const m of ms){
    if(m.mk==="drop"){if(!m.first||m.b-m.t<18)continue;ctx.fillStyle="#666";ctx.font=`italic ${10*k}px Helvetica, Arial, sans-serif`;ctx.fillText(m.dt==="ANNULÉE"?"Question annulée.":m.dt==="ZONE"?"Question non reprise (zone sur image) : voir le corrigé original.":"Question non reprise : voir le corrigé original.",40*k,(m.t+14)*k);continue}
    if(m.mk!=="opt")continue;
    const hh=Math.max(6,Math.min(10,(m.b-m.t)-2)),bx=m.l+3,by=m.t+((m.b-m.t)-hh)/2;
    ctx.strokeStyle="#333";ctx.lineWidth=1.1*k;
    if(m.round){ctx.beginPath();ctx.arc((bx+hh/2)*k,(by+hh/2)*k,hh/2*k,0,Math.PI*2);ctx.stroke()}else ctx.strokeRect(bx*k,by*k,hh*k,hh*k);
    if(!m.nl){ctx.fillStyle="#111";ctx.font=`bold ${10*k}px "Times New Roman", Times, serif`;ctx.fillText(m.L+".",(bx+hh+5)*k,(by+hh/2+.5)*k)}
  }
  const groups=new Map();ms.filter(m=>m.mk==="qroc").forEach(m=>{const u=groups.get(m.g);if(!u)groups.set(m.g,{...m});else{u.l=Math.min(u.l,m.l);u.t=Math.min(u.t,m.t);u.r=Math.max(u.r,m.r);u.b=Math.max(u.b,m.b)}});
  for(const u of groups.values()){ctx.strokeStyle="#999";ctx.lineWidth=1*k;const h=Math.max(22,u.b-u.t-4);ctx.strokeRect((u.l+4)*k,(u.t+2)*k,(u.r-u.l-8)*k,h*k);ctx.fillStyle="#888";ctx.font=`${9*k}px Helvetica, Arial, sans-serif`;ctx.textBaseline="top";ctx.fillText("Réponse :",(u.l+8)*k,(u.t+5)*k);ctx.textBaseline="middle"}
  return cv;
}
async function buildBlankPdf(A,onProgress){
  const L=await pdfLib();const out=await L.PDFDocument.create();
  out.setTitle("Sujet vierge – "+ueOf(A)+" "+titleOf(A));out.setCreator("Swag");
  for(let p=1;p<=A.data.pages.length;p++){onProgress&&onProgress(p,A.data.pages.length);
    const scale=Math.min(2.5,1650/A.data.pages[p-1].w);const cv=await renderBlankPage(A,p,scale);
    const blob=await new Promise(r=>cv.toBlob(r,"image/jpeg",.86));const img=await out.embedJpg(new Uint8Array(await blob.arrayBuffer()));
    const pg=A.data.pages[p-1];const page=out.addPage([pg.w,pg.h]);page.drawImage(img,{x:0,y:0,width:pg.w,height:pg.h})}
  return await out.save();
}
const fileBase=A=>(ueOf(A)+" "+titleOf(A)).replace(/[\\/:*?"<>|·]+/g," ").replace(/\s+/g," ").trim();
const coarse=()=>matchMedia("(pointer:coarse)").matches;
function downloadBlob(name,blob){
  const u=URL.createObjectURL(blob),a=document.createElement("a");a.href=u;a.download=name;a.rel="noopener";a.hidden=true;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(u),120000);toast("Fichier enregistré : "+name);return true;
}
function offerFile(name,blob,file){ // le partage demande un toucher récent : après une longue préparation, on le redemande
  return new Promise(res=>{const m=modal(`<h3>Ton fichier est prêt</h3><p style="margin:0;overflow-wrap:anywhere">${esc(name)}</p>
    <div class="row"><button class="btn" type="button" id="ofDl">Télécharger</button><button class="btn red" type="button" id="ofSh">Enregistrer ou partager…</button></div>`);
    m.querySelector("#ofDl").onclick=()=>{m.remove();res(downloadBlob(name,blob))};
    m.querySelector("#ofSh").onclick=async()=>{try{await navigator.share({files:[file],title:name});m.remove();res(true)}catch(e){if(e&&e.name==="AbortError")return;m.remove();res(downloadBlob(name,blob))}};
    m.addEventListener("click",e=>{if(e.target===m)res(false)})});
}
async function saveFile(name,data,type){
  type=type||"application/pdf";const blob=new Blob([data],{type});let file=null;
  try{file=new File([blob],name,{type})}catch(e){}
  if(file&&coarse()&&navigator.share&&navigator.canShare&&navigator.canShare({files:[file]})){
    try{await navigator.share({files:[file],title:name});return true}
    catch(e){if(e&&e.name==="AbortError"){toast("Enregistrement annulé.");return false}return offerFile(name,blob,file)}}
  return downloadBlob(name,blob);
}
async function downloadBlank(A,btn){
  const t=btn.textContent;btn.disabled=true;
  try{const bytes=await buildBlankPdf(A,(p,n)=>{btn.textContent=`Préparation ${p}/${n}…`});btn.textContent=t;btn.disabled=false;await saveFile("Sujet vierge - "+fileBase(A)+".pdf",bytes)}
  catch(e){toast("Le sujet vierge n'a pas pu être créé.")}
  btn.disabled=false;btn.textContent=t;
}
async function downloadOrig(A,btn){btn.disabled=true;try{const b=await pdfBytes(A);btn.disabled=false;await saveFile("Corrigé - "+fileBase(A)+".pdf",b)}catch(e){toast("Le corrigé est introuvable sur cet appareil.")}btn.disabled=false}

/* ---------- relecture des annales importées quand le lecteur change de version ---------- */
async function upgradeImported(){
  const old=[...S.annales.values()].filter(A=>!A.data||A.data.v!==PARSER_VERSION);
  let n=0;
  for(const A of old){
    try{const b=await pdfBytes(A);const rep=await exclusive(()=>checkClean(b));const d=rep.A;if(!d.nq||rep.errs.length){A.broken=1;continue}
      const shape=x=>x.cases.map(c=>c.qs.length).join(",");
      const same=A.data&&A.data.cases&&shape(A.data)===shape(d);
      if(!same)for(const k of [...S.results.keys()].filter(k=>k.startsWith("r_"+A.id+"_"))){await delDoc(k);S.results.delete(k)}
      A.data=d;A.nq=d.nq;if(!A.hash)A.hash=await sha1(b);if(!A.date)A.date=guessDate(A.session||A.name);if(!A.exam)A.exam=guessExam(A.name||"");
      await putDoc(A.id,A);n++;
    }catch(e){}
  }
  const nb=old.filter(A=>A.broken).length;
  if(n||nb){toast((n?`${pl(n,"annale importée relue","annales importées relues")} avec le nouveau lecteur. `:"")+(nb?`${pl(nb,"annale importée masquée","annales importées masquées")} : format non reconnu, des réponses resteraient visibles.`:""));if(V.tab!=="play")render()}
}

/* ---------- démarrage (appelé par auth.js une fois l'accès vérifié) ---------- */
let started=false;
async function startSwag(){if(started){render();return}started=true;
  $("#view").innerHTML=`<div class="page"><div class="head"><div><h2>Chargement…</h2></div></div></div>`;
  await initStore();render();upgradeImported();
}
