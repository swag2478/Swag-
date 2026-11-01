/* ================= Swag : accès réservé aux membres (Supabase) =================
   Connexion par code à 6 chiffres reçu par e-mail (ou par le lien du même e-mail), puis vérification
   de l'adhésion dans la table « members ». Le code du site est public : ce contrôle se fait dans le
   navigateur et sert à réserver le site aux membres, pas à protéger des données secrètes.
   Les PDF, réponses et statistiques ne passent jamais par Supabase : seule l'adresse e-mail y va. */
const CFG=window.SWAG_CONFIG||{};
const OFF_DAYS=Math.max(1,+CFG.offlineDays||30);
const ACC_KEY="swag-access",PEND_KEY="swag-otp";
let AUTH={email:"",role:"",offline:false};
let sb=null;
const lsGet=k=>{try{return JSON.parse(localStorage.getItem(k)||"null")}catch(e){return null}};
const lsSet=(k,v)=>{try{v==null?localStorage.removeItem(k):localStorage.setItem(k,JSON.stringify(v))}catch(e){}};
const ssGet=k=>{try{return JSON.parse(sessionStorage.getItem(k)||"null")}catch(e){return null}};
const ssSet=(k,v)=>{try{v==null?sessionStorage.removeItem(k):sessionStorage.setItem(k,JSON.stringify(v))}catch(e){}};
const accessOK=(c,email)=>!!(c&&c.email&&(!email||c.email===email)&&Date.now()-c.at<OFF_DAYS*864e5);
const isNetErr=e=>!!e&&(e.status===0||e.name==="AuthRetryableFetchError"||/fetch|network|load failed|internet/i.test(String(e.message||e)));
const normEmail=s=>String(s||"").trim().toLowerCase();
const EMAIL_RE=/^[^\s@,;<>()]+@[^\s@,;<>()]+\.[a-z]{2,}$/i;

function lockUI(){document.body.classList.add("locked");$("#nav").innerHTML="";document.querySelector(".act")?.remove();document.querySelectorAll(".modal").forEach(m=>m.remove());V.tab="accueil";play=null}
function authScreen(html){lockUI();$("#view").innerHTML=`<div class="auth">${html}</div>`;scrollTo(0,0);return $("#view .auth")}

/* ---------- démarrage ---------- */
async function bootAuth(){
  if(!CFG.supabaseUrl||!CFG.supabaseAnonKey){authScreen(`<h2>Swag n'est pas encore configuré</h2><section class="panel"><p>Il manque l'adresse du projet Supabase et sa clé publique dans <code>config.js</code>. La marche à suivre est dans le fichier <code>DEPLOIEMENT.md</code> du projet.</p></section>`);return}
  const cache=lsGet(ACC_KEY);
  if(!window.supabase||!window.supabase.createClient){ // bibliothèque de connexion absente : hors ligne sans copie locale
    if(accessOK(cache))return grant(cache.email,cache.role,true);
    return screenOffline()}
  sb=window.supabase.createClient(CFG.supabaseUrl,CFG.supabaseAnonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:"implicit",storageKey:"swag-auth"}});
  const urlErr=readUrlError();
  let session=null,err=null;
  try{const r=await sb.auth.getSession();session=r.data&&r.data.session;err=r.error}catch(e){err=e}
  if(session&&session.user&&session.user.email)return afterLogin(session.user.email);
  if(err&&isNetErr(err)&&accessOK(cache))return grant(cache.email,cache.role,true);
  if(!navigator.onLine&&accessOK(cache))return grant(cache.email,cache.role,true);
  screenLogin(urlErr?{msg:urlErr}:{});
}
function readUrlError(){ // lien de l'e-mail expiré ou déjà utilisé
  const h=new URLSearchParams(location.hash.replace(/^#/,"")),q=new URLSearchParams(location.search);
  const e=h.get("error_description")||q.get("error_description")||h.get("error")||q.get("error");
  if(!e)return"";
  try{history.replaceState(null,"",location.pathname)}catch(x){}
  return"Le lien de connexion n'est plus valable (il expire vite et ne sert qu'une fois). Demande un nouveau code ci-dessous.";
}
async function checkMember(email){ // {ok, role} ; lève une erreur si la vérification n'a pas pu se faire
  const {data,error,status}=await sb.from("members").select("email,role").eq("email",email).maybeSingle();
  if(error){const e=new Error(error.message||"vérification impossible");e.status=status;throw e}
  return data?{ok:true,role:data.role||"member"}:{ok:false};
}
async function afterLogin(email){
  email=normEmail(email);let r;
  try{r=await checkMember(email)}
  catch(e){const c=lsGet(ACC_KEY);
    if(isNetErr(e)&&accessOK(c,email))return grant(email,c.role,true);
    if(isNetErr(e))return screenOffline();
    return screenLogin({msg:"La vérification de ton adhésion n'a pas abouti. Réessaie dans un instant."})}
  if(!r.ok){lsSet(ACC_KEY,null);try{await sb.auth.signOut({scope:"local"})}catch(e){}return screenLogin({refused:email})}
  lsSet(ACC_KEY,{email,role:r.role,at:Date.now()});ssSet(PEND_KEY,null);
  grant(email,r.role,false);
}
function grant(email,role,offline){
  const was=AUTH.email;AUTH={email,role,offline};document.body.classList.remove("locked");
  const b=$("#offBadge");if(b)b.hidden=!offline;
  if(was&&was!==email){location.replace(location.pathname);return}
  startSwag();
}
function screenOffline(){
  authScreen(`<h2>Connexion nécessaire</h2><section class="panel"><p>Swag n'arrive pas à joindre le service de connexion. Il faut être en ligne pour se connecter la première fois, puis au moins une fois tous les ${OFF_DAYS} jours.</p><div><button class="btn red" type="button" id="retry">Réessayer</button></div></section>`);
  $("#retry").onclick=()=>location.reload();
}

/* ---------- écran de connexion ---------- */
function screenLogin(o){
  o=o||{};const pend=ssGet(PEND_KEY);
  if(pend&&pend.email&&!o.refused&&!o.email)return screenCode(pend.email,o.msg);
  const box=authScreen(`<div><h2>Swag</h2><p class="muted">Entraînement aux annales corrigées. Accès réservé aux membres.</p></div>
   <section class="panel">
    ${o.refused?`<p class="msg" role="alert"><b>Cette adresse n'est pas sur la liste des membres</b> (${esc(o.refused)}). Swag est réservé aux membres : demande à la personne qui gère Swag de t'ajouter, puis réessaie.</p>`:""}
    ${o.msg?`<p class="msg" role="alert">${esc(o.msg)}</p>`:""}
    <form id="fEmail" novalidate><label>Ton adresse e-mail<input type="email" id="aEmail" autocomplete="email" inputmode="email" autocapitalize="off" spellcheck="false" required value="${esc(o.email||"")}"></label>
     <button class="btn red" type="submit" id="aSend">Recevoir un code par e-mail</button></form>
    <p class="muted small">Tu reçois un e-mail avec un code à 6 chiffres à saisir ici. Pas de mot de passe.</p>
   </section>
   <p class="muted small">Tes PDF et ta progression restent sur ton appareil. Le code du site est public et le contrôle d'accès se fait dans ton navigateur : il réserve Swag aux membres, il ne protège pas de données secrètes. Seule ton adresse e-mail sert à la connexion.</p>`);
  const f=box.querySelector("#fEmail"),inp=box.querySelector("#aEmail");
  if(matchMedia("(hover:hover)").matches)inp.focus();
  f.onsubmit=async e=>{e.preventDefault();const email=normEmail(inp.value);
    if(!EMAIL_RE.test(email)){showMsg(box,"Cette adresse e-mail ne semble pas valide.");return}
    const bt=box.querySelector("#aSend");bt.disabled=true;bt.textContent="Vérification…";
    const r=await sendCode(email);bt.disabled=false;bt.textContent="Recevoir un code par e-mail";
    if(r.refused)return screenLogin({refused:email});
    if(r.msg)return showMsg(box,r.msg);
    screenCode(email)};
}
function showMsg(box,msg,ok){let p=box.querySelector(".msg.live");if(!p){p=document.createElement("p");p.setAttribute("role","alert");box.querySelector(".panel").prepend(p)}p.className="msg live"+(ok?" ok":"");p.textContent=msg}
async function sendCode(email){ // {ok} | {refused} | {msg}
  try{const {data,error}=await sb.rpc("can_join",{e:email});
    if(error)return{msg:isNetErr(error)?"Pas de connexion internet : il faut être en ligne pour se connecter.":"La vérification de l'adresse n'a pas abouti. Réessaie dans un instant."};
    if(data!==true)return{refused:true}}
  catch(e){return{msg:"Pas de connexion internet : il faut être en ligne pour se connecter."}}
  try{const {error}=await sb.auth.signInWithOtp({email,options:{shouldCreateUser:true,emailRedirectTo:location.origin+location.pathname}});
    if(error){const m=String(error.message||""),w=(m.match(/(\d+)\s*seconds?/)||[])[1];
      if(error.status===429||w)return{msg:w?`Un code vient déjà d'être envoyé. Attends ${w} secondes avant d'en redemander un.`:"Trop de demandes de code : attends quelques minutes avant de réessayer."};
      return{msg:isNetErr(error)?"Pas de connexion internet : il faut être en ligne pour se connecter.":"L'e-mail n'a pas pu être envoyé. Réessaie dans un instant."}}}
  catch(e){return{msg:"L'e-mail n'a pas pu être envoyé. Réessaie dans un instant."}}
  ssSet(PEND_KEY,{email,at:Date.now()});return{ok:true};
}
function screenCode(email,msg){
  const box=authScreen(`<div><h2>Vérifie tes e-mails</h2><p class="muted">Un code à 6 chiffres a été envoyé à <b>${esc(email)}</b>. Il peut mettre une minute à arriver ; regarde aussi dans les indésirables.</p></div>
   <section class="panel">${msg?`<p class="msg" role="alert">${esc(msg)}</p>`:""}
    <form id="fCode" novalidate><label>Code reçu par e-mail<input type="text" id="aCode" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]*" maxlength="10" required></label>
     <button class="btn red" type="submit" id="aOk">Se connecter</button></form>
    <p class="muted small">${isStandalone()?"Le lien de l'e-mail s'ouvre dans Safari et pas dans Swag installé : saisis plutôt le code ici.":"Tu peux aussi toucher le lien de l'e-mail s'il s'ouvre dans ce navigateur."}</p>
    <div style="display:flex;gap:14px;flex-wrap:wrap"><button class="linkbtn" type="button" id="aResend">Renvoyer un code</button><button class="linkbtn" type="button" id="aBack">Changer d'adresse</button></div>
   </section>`);
  const f=box.querySelector("#fCode"),inp=box.querySelector("#aCode");inp.focus();
  inp.oninput=()=>{const v=inp.value.replace(/\D/g,"");if(v!==inp.value)inp.value=v};
  f.onsubmit=async e=>{e.preventDefault();const token=inp.value.replace(/\D/g,"");
    if(token.length<6){showMsg(box,"Le code fait 6 chiffres.");return}
    const bt=box.querySelector("#aOk");bt.disabled=true;bt.textContent="Connexion…";
    let res;try{res=await sb.auth.verifyOtp({email,token,type:"email"})}catch(x){res={error:x}}
    bt.disabled=false;bt.textContent="Se connecter";
    if(res.error||!res.data||!res.data.session){showMsg(box,res.error&&isNetErr(res.error)?"Pas de connexion internet : réessaie une fois en ligne.":"Code incorrect ou expiré. Vérifie le dernier e-mail reçu, ou demande un nouveau code.");inp.select();return}
    afterLogin(res.data.session.user.email||email)};
  box.querySelector("#aResend").onclick=async()=>{const r=await sendCode(email);if(r.refused)return screenLogin({refused:email});showMsg(box,r.msg||"Nouveau code envoyé.",!r.msg)};
  box.querySelector("#aBack").onclick=()=>{ssSet(PEND_KEY,null);screenLogin({email})};
}

/* ---------- vérifications suivantes ---------- */
async function recheck(){ // de retour en ligne ou au retour sur l'app : l'adhésion est-elle toujours valable ?
  if(!sb||!AUTH.email)return;const c=lsGet(ACC_KEY);if(!AUTH.offline&&c&&Date.now()-c.at<6*3600e3)return;
  let r;try{const s=await sb.auth.getSession();if(!(s.data&&s.data.session)){if(s.error&&isNetErr(s.error))return;lsSet(ACC_KEY,null);return screenLogin({msg:"Ta session a expiré : reconnecte-toi."})}r=await checkMember(AUTH.email)}catch(e){return}
  if(!r.ok){lsSet(ACC_KEY,null);try{await sb.auth.signOut({scope:"local"})}catch(e){}return screenLogin({refused:AUTH.email})}
  lsSet(ACC_KEY,{email:AUTH.email,role:r.role,at:Date.now()});const was=AUTH.role;AUTH.offline=false;AUTH.role=r.role;const b=$("#offBadge");if(b)b.hidden=true;if(was!==r.role&&!document.body.classList.contains("locked"))render();
}
addEventListener("online",()=>recheck());
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")recheck()});

/* ---------- Réglages : compte ---------- */
function authPanelHTML(){
  if(!AUTH.email)return"";const c=lsGet(ACC_KEY);
  return`<section class="panel"><h3>Compte</h3><p style="margin:0">Adresse de connexion : <b>${esc(AUTH.email)}</b>${AUTH.role==="admin"?" · administration des membres":""}${AUTH.offline?' <span class="offline">hors ligne</span>':""}</p>
   <p style="margin:0;color:var(--muted)">Adhésion vérifiée ${c&&c.at?"le "+new Date(c.at).toLocaleDateString("fr-FR"):"récemment"}. Hors ligne, Swag reste accessible ${OFF_DAYS} jours après la dernière vérification. Se déconnecter n'efface ni tes PDF ni ta progression sur cet appareil.</p>
   <div><button class="btn" type="button" id="signOut">Se déconnecter</button></div></section>`;
}
function wireAuthPanel(v){const b=v.querySelector("#signOut");if(!b)return;b.onclick=async()=>{b.disabled=true;lsSet(ACC_KEY,null);ssSet(PEND_KEY,null);try{if(sb)await sb.auth.signOut({scope:"local"})}catch(e){}location.replace(location.pathname)}}

/* ---------- onglet Membres (administration) ---------- */
const MV={list:null,q:"",err:""};
async function loadMembers(){const {data,error}=await sb.from("members").select("email,role,note,added_at").order("email");if(error)throw error;MV.list=data||[]}
function vMembres(v){
  if(!sb){v.innerHTML=`<div class="page"><div class="empty"><h3>Hors ligne</h3><p>La liste des membres n'est disponible qu'en ligne.</p></div></div>`;return}
  if(!MV.list){v.innerHTML=`<div class="page"><div class="head"><div><h2>Membres</h2><p>Chargement de la liste…</p></div></div></div>`;
    loadMembers().then(()=>{MV.err="";if(V.tab==="membres")render()}).catch(e=>{MV.list=[];MV.err=isNetErr(e)?"Pas de connexion : la liste des membres n'est disponible qu'en ligne.":"La liste n'a pas pu être lue (droits d'administration ?)."; if(V.tab==="membres")render();MV.list=null});return}
  const q=normEmail(MV.q),L=MV.list.filter(m=>!q||m.email.includes(q)||(m.note||"").toLowerCase().includes(q)),na=MV.list.filter(m=>m.role==="admin").length;
  v.innerHTML=`<div class="page" style="max-width:860px"><div class="head"><div><h2>Membres</h2><p>${pl(MV.list.length,"adresse")} sur la liste · ${pl(na,"administrateur")}</p></div></div>
   ${MV.err?`<p class="warn">${esc(MV.err)}</p>`:""}
   <section class="panel"><h3>Ajouter des membres</h3>
    <label class="field"><span>Adresses e-mail (une par ligne, ou séparées par des virgules)</span><textarea class="memails" id="mAdd" autocapitalize="off" spellcheck="false" placeholder="prenom.nom@exemple.fr"></textarea></label>
    <label class="field"><span>Note (facultatif, visible des administrateurs seulement)</span><input type="text" id="mNote" class="filt-in" autocomplete="off" style="min-height:44px;border:1px solid var(--line);border-radius:12px;background:var(--raise);padding:0 12px"></label>
    <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center"><button class="btn red" type="button" id="mGo">Ajouter</button><span class="muted" id="mRes" role="status"></span></div>
    <p class="muted small" style="margin:0">Ajouter une adresse n'envoie rien : préviens la personne qu'elle peut se connecter. La liste est aussi modifiable dans le tableau <code>members</code> de Supabase. Un membre retiré garde l'accès hors ligne au plus ${OFF_DAYS} jours, jusqu'à sa prochaine connexion à internet.</p></section>
   <section class="panel"><div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:center"><h3>Liste</h3><input type="search" id="mQ" placeholder="Chercher" value="${esc(MV.q)}" aria-label="Chercher un membre" style="min-height:40px;border:1px solid var(--line);border-radius:12px;background:var(--surface);padding:0 12px;flex:0 1 260px;min-width:0"></div>
    ${L.length?`<div class="mlist">${L.map(m=>{const me=m.email===AUTH.email;return`<div class="mrow"><span class="me">${esc(m.email)}${m.role==="admin"?' <span class="chip red">admin</span>':""}${me?' <span class="chip">toi</span>':""}</span>
      <span class="ma">${me?"":`<button class="btn small ghost" type="button" data-role="${esc(m.email)}">${m.role==="admin"?"Retirer l'admin":"Rendre admin"}</button><button class="btn small" type="button" data-del="${esc(m.email)}" style="color:var(--red)">Retirer</button>`}</span>
      <small>${m.note?esc(m.note)+" · ":""}ajouté le ${m.added_at?new Date(m.added_at).toLocaleDateString("fr-FR"):"?"}</small></div>`}).join("")}</div>`:`<p class="muted" style="margin:0">${MV.list.length?"Aucune adresse ne correspond.":"Personne sur la liste."}</p>`}
   </section></div>`;
  const qi=$("#mQ");qi.oninput=()=>{MV.q=qi.value;clearTimeout(qi._t);qi._t=setTimeout(()=>{render();const n=$("#mQ");n.focus();n.setSelectionRange(n.value.length,n.value.length)},250)};
  $("#mGo").onclick=async()=>{const raw=$("#mAdd").value,note=$("#mNote").value.trim()||null;
    const ems=[...new Set(raw.split(/[\s,;]+/).map(normEmail).filter(Boolean))],bad=ems.filter(e=>!EMAIL_RE.test(e)),ok=ems.filter(e=>EMAIL_RE.test(e));
    const have=new Set(MV.list.map(m=>m.email)),neu=ok.filter(e=>!have.has(e));
    if(!ems.length){$("#mRes").textContent="Saisis au moins une adresse.";return}
    if(bad.length){$("#mRes").textContent="Adresse non valide : "+bad.join(", ");return}
    if(!neu.length){$("#mRes").textContent="Déjà sur la liste.";return}
    $("#mGo").disabled=true;const {error}=await sb.from("members").insert(neu.map(email=>({email,note})));$("#mGo").disabled=false;
    if(error){$("#mRes").textContent=isNetErr(error)?"Pas de connexion.":"L'ajout a échoué : "+(error.message||"erreur");return}
    try{await loadMembers()}catch(e){}render();toast(pl(neu.length,"membre ajouté","membres ajoutés")+(ok.length>neu.length?` · ${ok.length-neu.length} déjà sur la liste`:""))};
  v.querySelectorAll("[data-del]").forEach(b=>{let armed=false;b.onclick=async()=>{if(!armed){armed=true;b.textContent="Confirmer le retrait";b.classList.add("red");b.style.color="";return}
    b.disabled=true;const {error}=await sb.from("members").delete().eq("email",b.dataset.del);if(error){toast("Le retrait a échoué.");b.disabled=false;return}
    try{await loadMembers()}catch(e){}render();toast("Membre retiré")}});
  v.querySelectorAll("[data-role]").forEach(b=>b.onclick=async()=>{const m=MV.list.find(x=>x.email===b.dataset.role);if(!m)return;b.disabled=true;
    const {error}=await sb.from("members").update({role:m.role==="admin"?"member":"admin"}).eq("email",m.email);if(error){toast("La modification a échoué.");b.disabled=false;return}
    try{await loadMembers()}catch(e){}render()});
}

bootAuth();
