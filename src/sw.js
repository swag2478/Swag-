/* Swag : service worker (fonctionnement hors ligne). Version remplacée à chaque build. */
const VERSION="__BUILD__";
const CACHE="swag-"+VERSION,RUNTIME="swag-runtime";
const CORE=["./","index.html","config.js","manifest.webmanifest","icons/icon-192.png","icons/icon-512.png","icons/icon-maskable-512.png","icons/apple-touch-icon.png"];
// bibliothèques à version figée (même version que dans index.html)
const LIBS=["https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js",
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js"];
const LIB_HOSTS=["cdnjs.cloudflare.com","cdn.jsdelivr.net"],FONT_HOSTS=["fonts.googleapis.com","fonts.gstatic.com"];
const corsReq=u=>new Request(u,{mode:"cors",credentials:"omit"});
self.addEventListener("install",e=>{e.waitUntil((async()=>{const c=await caches.open(CACHE);
  await c.addAll(CORE.map(u=>new Request(u,{cache:"reload"})));
  await Promise.all(LIBS.map(async u=>{try{const old=await caches.match(u);if(old){await c.put(u,old);return}const r=await fetch(corsReq(u));if(r.ok)await c.put(u,r)}catch(x){}}));
  await self.skipWaiting()})())});
self.addEventListener("activate",e=>{e.waitUntil((async()=>{for(const k of await caches.keys())if(k.startsWith("swag-")&&k!==CACHE&&k!==RUNTIME)await caches.delete(k);await self.clients.claim()})())});
async function networkFirst(req,key,ms){const c=await caches.open(CACHE);
  try{const r=await Promise.race([fetch(req),new Promise((_,rej)=>setTimeout(()=>rej(new Error("délai")),ms))]);if(r&&r.ok){c.put(key||req,r.clone());return r}if(r&&r.status<500)return r;throw new Error(String(r&&r.status))}
  catch(x){const m=await c.match(key||req,{ignoreSearch:true});if(m)return m;throw x}}
async function cacheFirst(req,cacheName,asCors){const m=await caches.match(req.url);if(m)return m;
  const r=await fetch(asCors?corsReq(req.url):req);if(r.ok||r.type==="opaque"){const c=await caches.open(cacheName);c.put(req.url,r.clone())}return r}
self.addEventListener("fetch",e=>{
  const req=e.request;if(req.method!=="GET")return;const u=new URL(req.url);
  if(u.origin===location.origin){
    if(req.mode==="navigate")return e.respondWith(networkFirst(req,"index.html",4000));
    if(/\/(config\.js|manifest\.webmanifest)$/.test(u.pathname))return e.respondWith(networkFirst(req,null,4000));
    if(/\/sw\.js$/.test(u.pathname))return;
    return e.respondWith(caches.match(req,{ignoreSearch:true}).then(m=>m||fetch(req)));
  }
  if(LIB_HOSTS.includes(u.hostname))return e.respondWith(cacheFirst(req,CACHE,true));
  if(FONT_HOSTS.includes(u.hostname))return e.respondWith(cacheFirst(req,RUNTIME,true));
  // tout le reste (Supabase…) passe directement par le réseau, sans cache
});
