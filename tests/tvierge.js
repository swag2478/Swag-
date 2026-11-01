// Sujet vierge : téléchargement réel par le bouton de la carte, puis contrôle du PDF obtenu.
//  - même nombre de pages et mêmes dimensions que le corrigé ;
//  - chaque zone masquée est blanche à l'intérieur (hors case et lettre redessinées, cadre « Réponse : ») ;
//  - aucun pixel vert ou rouge dans les cases ; le reste de la page garde bien le texte du sujet ;
//  - rendu des pages identique, pixel à pixel, à celui de la version artefact (même fonction de masquage).
const H=require('./harness');const fs=require('fs'),path=require('path');
(async()=>{
  const browser=await H.newBrowser();const app=await H.openApp({browser});const {page}=app;
  await H.importFiles(page,H.fixtures());await page.click('#imClose');
  const ids=await page.evaluate(()=>[...S.annales.values()].map(A=>[A.id,A.name]));
  const ref=await H.openRef({browser});const refIds=[];
  for(const f of H.fixtures()){await ref.page.click('[data-add]');await ref.page.setInputFiles('#file',f);
    const ok=await ref.page.waitForFunction(()=>!document.querySelector('#save').disabled||!document.querySelector('#warn').hidden,null,{timeout:60000}).then(()=>ref.page.evaluate(()=>!document.querySelector('#save').disabled));
    if(ok){await ref.page.click('#save');await ref.page.waitForFunction(()=>!document.querySelector('.modal'))}else await ref.page.click('#cancel')}
  const src=fs.readFileSync(path.join(H.ROOT,'src','app.js'),'utf8');await ref.page.addScriptTag({content:src.slice(src.indexOf('function sha1js'),src.indexOf('async function sha1('))});
  const refMap=await ref.page.evaluate(()=>Object.fromEntries([...S.annales.values()].map(A=>[A.name,A.id])));
  await page.click('[data-tab=annales]');
  for(const [id,name] of ids){
    const [dl]=await Promise.all([page.waitForEvent('download',{timeout:120000}),page.click(`[data-blank="${id}"]`)]);
    const file=await dl.path();const bytes=fs.readFileSync(file);
    H.check(/^Sujet vierge - .+\.pdf$/.test(dl.suggestedFilename()),`${name} : fichier « ${dl.suggestedFilename()} »`);
    const r=await page.evaluate(async([id,b64])=>{const A=S.annales.get(id);const by=Uint8Array.from(atob(b64),c=>c.charCodeAt(0));
      const doc=await PDFJS.getDocument({data:by}).promise;const out={pages:doc.numPages,want:A.data.pages.length,size:true,bad:[],colored:0,ink:[]};
      const ms=blankMasks(A);const K=2;
      for(let p=1;p<=doc.numPages;p++){const pg=await doc.getPage(p),vp=pg.getViewport({scale:K}),info=A.data.pages[p-1];
        if(Math.abs(vp.width/K-info.w)>.6||Math.abs(vp.height/K-info.h)>.6)out.size=false;
        const cv=document.createElement('canvas');cv.width=Math.ceil(vp.width);cv.height=Math.ceil(vp.height);const ctx=cv.getContext('2d',{willReadFrequently:true});
        ctx.fillStyle='#fff';ctx.fillRect(0,0,cv.width,cv.height);await pg.render({canvasContext:ctx,viewport:vp}).promise;
        const im=ctx.getImageData(0,0,cv.width,cv.height).data,W=cv.width;
        const px=(x,y)=>{const i=(Math.round(y*K)*W+Math.round(x*K))*4;return[im[i],im[i+1],im[i+2]]};
        const L=ms.get(p)||[],opts=L.filter(m=>m.mk==='opt');
        // zones où Swag redessine quelque chose : case + lettre des propositions, cadre et libellé des QROC, mention des questions écartées
        const drawn=[];for(const m of opts){const hh=Math.max(6,Math.min(10,(m.b-m.t)-2)),bx=m.l+3,by=m.t+((m.b-m.t)-hh)/2;drawn.push({l:bx-1.6,r:bx+hh+1.6,t:by-1.6,b:by+hh+1.6,box:{l:bx+1.4,r:bx+hh-1.4,t:by+1.4,b:by+hh-1.4,c:m.round?{x:bx+hh/2,y:by+hh/2,r:hh/2-1.4}:null}});if(!m.nl)drawn.push({l:bx+hh+3,r:bx+hh+5+16,t:m.t,b:m.b})}
        const g=new Map();L.filter(m=>m.mk==='qroc').forEach(m=>{const u=g.get(m.g);if(!u)g.set(m.g,{...m});else{u.l=Math.min(u.l,m.l);u.t=Math.min(u.t,m.t);u.r=Math.max(u.r,m.r);u.b=Math.max(u.b,m.b)}});
        for(const u of g.values()){const h=Math.max(22,u.b-u.t-4);const R={l:u.l+4,t:u.t+2,r:u.r-4,b:u.t+2+h};drawn.push({l:R.l-1.5,r:R.r+1.5,t:R.t-1.5,b:R.t+1.5},{l:R.l-1.5,r:R.r+1.5,t:R.b-1.5,b:R.b+1.5},{l:R.l-1.5,r:R.l+1.5,t:R.t,b:R.b},{l:R.r-1.5,r:R.r+1.5,t:R.t,b:R.b},{l:u.l+6,r:u.l+60,t:u.t+3,b:u.t+17})}
        L.filter(m=>m.mk==='drop'&&m.first&&m.b-m.t>=18).forEach(m=>drawn.push({l:38,r:info.w,t:m.t+5,b:m.t+23}));
        const inBox=(B,x,y)=>B.c?Math.hypot(x-B.c.x,y-B.c.y)<B.c.r:x>=B.l&&x<=B.r&&y>=B.t&&y<=B.b; // intérieur de la case (rond pour QRU/TCS) : doit rester blanc
        const inDrawn=(x,y)=>drawn.some(d=>x>=d.l&&x<=d.r&&y>=d.t&&y<=d.b&&!(d.box&&inBox(d.box,x,y)));
        const inMask=(x,y)=>L.some(m=>x>=m.l&&x<=m.r&&y>=m.t&&y<=m.b);
        for(const m of L){let n=0,ink=0;for(let y=m.t+1.2;y<=m.b-1.2;y+=.5)for(let x=m.l+1.2;x<=m.r-1.2;x+=.5){if(x<0||y<0||x>=info.w||y>=info.h)continue;if(inDrawn(x,y))continue;n++;const [R,G,B]=px(x,y);if(Math.min(R,G,B)<200)ink++}
          if(n&&ink/n>.002)out.bad.push(`p${p} ${m.mk} [${Math.round(m.l)},${Math.round(m.t)},${Math.round(m.r)},${Math.round(m.b)}] : ${ink} pixels encrés sur ${n}`)}
        for(const m of opts)for(let y=m.t;y<=m.b;y+=.5)for(let x=m.l;x<=m.r;x+=.5){const [R,G,B]=px(x,y);if(G>100&&G-R>35&&G-B>15||R>140&&R-G>60&&R-B>45)out.colored++}
        let tot=0,ink=0;for(let y=0;y<info.h;y+=1)for(let x=0;x<info.w;x+=1){if(inMask(x,y))continue;tot++;const [R,G,B]=px(x,y);if(Math.min(R,G,B)<160)ink++}out.ink.push(Math.round(ink/tot*1000)/10)}
      return out},[id,bytes.toString('base64')]);
    H.check(r.pages===r.want&&r.size,`${name} : ${r.pages} pages aux dimensions du corrigé`);
    H.check(!r.bad.length,`${name} : zones masquées blanches${r.bad.length?' — '+r.bad.join(' ; '):''}`);
    H.check(r.colored===0,`${name} : aucune couleur de correction dans les cases (${r.colored} pixel)`);
    H.check(r.ink.every(v=>v>0.3),`${name} : le texte du sujet est bien présent hors des caches (${r.ink.join(' % / ')} % d'encre)`);
    // rendu identique à la version artefact
    const rid=refMap[name];if(!H.check(!!rid,`${name} : présent dans la référence`))continue;
    const hash=(pg,i,np)=>pg.evaluate(async([i,np])=>{const A=S.annales.get(i);const out=[];for(let p=1;p<=np;p++){const scale=Math.min(2.5,1650/A.data.pages[p-1].w);const cv=await renderBlankPage(A,p,scale);
      out.push(sha1js(new Uint8Array(cv.getContext('2d').getImageData(0,0,cv.width,cv.height).data.buffer)))}return out},[i,np]);
    const hn=await hash(page,id,r.want),hr2=await hash(ref.page,rid,r.want);
    H.check(JSON.stringify(hn)===JSON.stringify(hr2),`${name} : pages du sujet vierge identiques à la version artefact`);
  }
  H.check(!app.errors.length&&!ref.errors.length,'aucune erreur JavaScript '+JSON.stringify([...app.errors,...ref.errors]));
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
