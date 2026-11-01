// Masquage strictement identique à la version artefact (commit ade14bc) :
//  1. checkBytes (référence) == checkBytes (site) == données enregistrées par l'import en masse, position par position ;
//  2. captures des questions (avant et après validation) identiques entre les deux versions (écart ≤ 2/255 par canal :
//     bruit d'anticrénelage ; une réponse dévoilée donnerait un écart de l'ordre de 200) et caches placés exactement pareil ;
//  3. à l'écran, chaque texte révélateur (Valide/Faux, cases, experts, justifications, réponses attendues…) d'une
//     question non validée est sous un cache (.opt/.mask) : contrôle par elementFromPoint, point par point.
const H=require('./harness');const fs=require('fs'),path=require('path');
const b64=f=>fs.readFileSync(f).toString('base64');
const RUN=async(page,file,fn)=>page.evaluate(async([b,fn])=>{try{const by=Uint8Array.from(atob(b),c=>c.charCodeAt(0));const r=await (fn==='clean'?checkClean(by):checkBytes(by,{vierge:true,autodrop:true}));return JSON.stringify(r)}catch(e){return'ERREUR '+(e&&e.name)}},[b64(file),fn]);
(async()=>{
  const files=H.fixtures();const browser=await H.newBrowser();const VP={width:1180,height:2600};
  console.log(`Masquage : ${files.length} PDF de tests/fixtures/`);
  const ref=await H.openRef({browser,vp:VP});const app=await H.openApp({browser,vp:VP});
  const refR={},accepted=[];
  for(const f of files){const n=path.basename(f);refR[n]=await RUN(ref.page,f,'raw');
    const mine=await RUN(app.page,f,'raw'),clean=await RUN(app.page,f,'clean');
    H.check(mine===refR[n]&&clean===refR[n],`${n} : lecture et contrôle identiques à la référence`);
    if(!refR[n].startsWith('ERREUR')){const r=JSON.parse(refR[n]);if(r.A.nq&&!r.errs.length)accepted.push(f)}}
  // import en masse dans le site : les données enregistrées sont celles de la référence
  const rec=await H.importFiles(app.page,files);await app.page.click('#imClose');
  const saved=await app.page.evaluate(()=>Object.fromEntries([...S.annales.values()].map(A=>[A.name,JSON.stringify(A.data)])));
  for(const f of accepted){const n=path.basename(f),nm=n.replace(/\.pdf$/i,'').replace(/[_]+/g,' ').replace(/\s+/g,' ').trim();
    if(!saved[nm]){H.check(rec.some(l=>l.startsWith('dup | '+n)),`${n} : doublon (contenu déjà importé)`);continue}
    H.check(saved[nm]===JSON.stringify(JSON.parse(refR[n]).A),`${n} : données enregistrées après import = référence`)}
  // référence : ajout un par un avec l'ancien écran
  for(const f of accepted){await ref.page.click('[data-add]');await ref.page.setInputFiles('#file',f);
    const ok=await ref.page.waitForFunction(()=>!document.querySelector('#save').disabled||!document.querySelector('#warn').hidden,null,{timeout:60000}).then(()=>ref.page.evaluate(()=>!document.querySelector('#save').disabled));
    if(ok){await ref.page.click('#save');await ref.page.waitForFunction(()=>!document.querySelector('.modal'))}else await ref.page.click('#cancel')}
  // coins arrondis du cadre : l'anticrénelage de Chromium varie de ±1 d'une capture à l'autre ; on les aplatit des deux côtés
  for(const pg of [ref.page,app.page])await pg.addStyleTag({content:'.crop{border-radius:0!important}'});
  const list=async page=>page.evaluate(()=>[...S.annales.values()].map(A=>({id:A.id,name:A.name,qs:A.data.cases.map(c=>c.qs.length)})));
  const dupNames=rec.filter(l=>l.startsWith('dup | ')).map(l=>l.split(' | ')[1].replace(/\.pdf$/i,'').replace(/[_]+/g,' ').replace(/\s+/g,' ').trim());
  const L1=await list(ref.page),L2=await list(app.page);let nShot=0,nDom=0,nGeo=0,bad=0,maxD=0;
  // écart maximal entre deux captures, canal par canal (décodage PNG dans le navigateur)
  const pixDiff=(a,b)=>app.page.evaluate(async([a,b])=>{const img=async s=>{const i=new Image();i.src='data:image/png;base64,'+s;await i.decode();const c=document.createElement('canvas');c.width=i.width;c.height=i.height;const x=c.getContext('2d');x.drawImage(i,0,0);return x.getImageData(0,0,c.width,c.height)};
    const A=await img(a),B=await img(b);if(A.width!==B.width||A.height!==B.height)return 999;let m=0;for(let i=0;i<A.data.length;i++){const d=Math.abs(A.data[i]-B.data[i]);if(d>m)m=d}return m},[a.toString('base64'),b.toString('base64')]);
  const shoot=async(page,a,c,q,tag,validate)=>{await page.evaluate(([a,c,q])=>startSeries([{a,c,q}],'cmp','train'),[a,c,q]);
    await page.waitForFunction(()=>{const it=play.items[play.i],Q=qOf(it.a,it.c,it.q);const n=document.querySelectorAll('#qc .crop canvas').length;return n===Q.segs.length&&!document.querySelector('.crop.loading')});
    const en=await page.$('#en');if(en)await page.waitForFunction(()=>!document.querySelector('#en .crop.loading'));await page.waitForTimeout(150);
    const geo=await page.evaluate(()=>[...document.querySelectorAll('#qc .opt,#qc .mask')].map(e=>{const r=e.getBoundingClientRect(),q=document.querySelector('#qc').getBoundingClientRect();return[e.className,e.textContent,Math.round((r.left-q.left)*100),Math.round((r.top-q.top)*100),Math.round(r.width*100),Math.round(r.height*100)].join(' ')}));
    const shots=[await (await page.$('#qc')).screenshot()];if(en)shots.push(await en.screenshot());shots.geo=geo;
    if(validate){await page.click('#go');await page.waitForSelector('#qc.done');await page.waitForTimeout(150);shots.push(await (await page.$('#qc')).screenshot())}
    return shots};
  const domCheck=page=>page.evaluate(async()=>{const it=play.items[play.i],A=S.annales.get(it.a),C=A.data.cases[it.c],Q=C.qs[it.q];
    const pages=await readPages(await pdfBytes(A));const rev=ckReveal(pages,A.data.fmt);const out=[];let pts=0;
    const zone=(box,segs)=>{const crops=[...box.querySelectorAll('.crop')];segs.forEach((seg,si)=>{const w=crops[si];w.scrollIntoView({block:'start'});const R=w.getBoundingClientRect(),pg=A.data.pages[seg.p-1],W=pg.w;
      const x0=pg.x0!=null?Math.min(pg.x0,W*.044):W*.044,x1=pg.x1!=null?Math.max(pg.x1,W-W*.044):W-W*.044,cw=x1-x0,ch=seg.y1-seg.y0;
      for(const t of rev){if(t.p!==seg.p||t.x>=W)continue; // hors de la page : jamais dessiné
const cy=(t.top+t.bot)/2;if(cy<seg.y0||cy>seg.y1||t.x+t.w<x0||t.x>x1)continue;
        const ya=Math.max(t.top+1,seg.y0),yb=Math.min(t.bot-1,seg.y1),xa=Math.max(t.x,x0),xb=Math.min(t.x+Math.max(t.w,1),x1);if(yb-ya<1.5)continue;
        for(let i=0;i<=8;i++)for(let j=0;j<=4;j++){const px=xa+(xb-xa)*i/8,py=ya+(yb-ya)*j/4;
          let sx=R.left+(px-x0)/cw*R.width,sy=R.top+(py-seg.y0)/ch*R.height;// cadre : 1 px de bordure, où rien de la page n'est dessiné
          sx=Math.min(Math.max(sx,R.left+1.8),R.right-1.8);sy=Math.min(Math.max(sy,R.top+1.8),R.bottom-1.8);
          const el=document.elementFromPoint(sx,sy);pts++;if(!el||!el.closest('.opt,.mask')){out.push(`p${t.p} « ${t.s.slice(0,40)} » (${t.why}) visible en (${Math.round(px)},${Math.round(py)})`);break}}}})};
    // les caches .mask ont pointer-events:none (ils laissent passer les clics) : on les rend « touchables » le temps du contrôle
    const stl=document.createElement('style');stl.textContent='.mask{pointer-events:auto!important}';document.head.appendChild(stl);
    // barres fixes (navigation, boutons du bas) : elles recouvrent la page à l'écran et fausseraient elementFromPoint
    const fixed=[...document.querySelectorAll('body *')].filter(e=>/fixed|sticky/.test(getComputedStyle(e).position));fixed.forEach(e=>{e.dataset.v=e.style.visibility;e.style.visibility='hidden'});
    try{if(document.querySelector('#en'))zone(document.querySelector('#en'),C.enonce);zone(document.querySelector('#qc'),Q.segs)}finally{stl.remove();fixed.forEach(e=>{e.style.visibility=e.dataset.v||''});scrollTo(0,0)}
    return{bad:[...new Set(out)],pts}});
  for(const A1 of L1){const A2=L2.find(x=>x.name===A1.name);if(!A2&&dupNames.includes(A1.name))continue;if(!H.check(!!A2&&JSON.stringify(A2.qs)===JSON.stringify(A1.qs),`${A1.name} : même découpage dans les deux versions`))continue;
    for(let c=0;c<A1.qs.length;c++)for(let q=0;q<A1.qs[c];q++){
      const s1=await shoot(ref.page,A1.id,c,q,'ref',true);
      const s2=await shoot(app.page,A2.id,c,q,'new',false);const dc=await domCheck(app.page);nDom+=dc.pts;
      if(dc.bad.length){bad++;H.check(false,`${A1.name} D${c+1}Q${q+1} : texte révélateur non couvert à l'écran : ${dc.bad.join(' ; ')}`)}
      await app.page.click('#go');await app.page.waitForSelector('#qc.done');await app.page.waitForTimeout(150);s2.push(await (await app.page.$('#qc')).screenshot());
      const sameGeo=JSON.stringify(s1.geo)===JSON.stringify(s2.geo);nGeo+=s1.geo.length;
      const px=await Promise.all(s1.map((b,i)=>s2[i]?pixDiff(b,s2[i]):999));const same=sameGeo&&s1.length===s2.length&&px.every(d=>d<=2);nShot+=s1.length;maxD=Math.max(maxD,...px);
      if(!sameGeo)H.check(false,`${A1.name} D${c+1}Q${q+1} : caches placés différemment de la référence`);
      if(!same){bad++;const d=path.join(H.FIX,'..','out');fs.mkdirSync(d,{recursive:true});s1.forEach((b,i)=>fs.writeFileSync(path.join(d,`diff-${A1.name}-${c}-${q}-${i}-ref.png`),b));s2.forEach((b,i)=>fs.writeFileSync(path.join(d,`diff-${A1.name}-${c}-${q}-${i}-new.png`),b));
        H.check(false,`${A1.name} D${c+1}Q${q+1} : captures différentes de la référence (voir tests/out/)`)}}}
  H.check(bad===0,`${nShot} captures identiques à la version artefact (écart maximal ${maxD}/255, bruit de rendu), ${nGeo} caches à la même position au 1/100 de pixel, ${nDom} points de texte révélateur vérifiés sous cache à l'écran`);
  H.check(ref.errors.length===0&&app.errors.length===0,'aucune erreur JavaScript '+JSON.stringify([...ref.errors,...app.errors]));
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
