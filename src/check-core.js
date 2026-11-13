// Contrôle indépendant (navigateur) : texte + image. Utilise readPages/parsePdf de parse3.js.
const CK_GL="☑☐◎◉■□✓✔●○";
function ckReveal(pages,fmt){
  const out=[];
  for(const pg of pages){
    const its=pg.items.slice().sort((a,b)=>Math.abs(a.top-b.top)<2.5?a.x-b.x:a.top-b.top);
    let mode=null;
    for(let ii=0;ii<its.length;ii++){const it=its[ii],nx=its[ii+1],s=it.s;let why=null;
      if((/^Question(\s*\d+)?$|^Question\s*\d+/.test(s)||/^(DP|QI)\s*\d+\s*[-–]|^Questions isolées|^Élément|^Annul/.test(s))&&it.x<pg.w*.3)mode=null;
      if([...s].some(ch=>CK_GL.includes(ch)))why="case";
      else if(/^(Valide|Faux|Indispensable|Inacceptable|Acceptable|Neutre)(\s+[A-Z(].*)?$/.test(s))why="mention";
      else if(/^\(?\d*\s*Experts?\)?$/i.test(s)||/^\(\d+$/.test(s)&&nx&&/^Experts?\)/i.test(nx.s))why="experts";
      else if(/Zone\s*\d+\s*:/i.test(s))why="zone";
      else if(/^\[\s*-?[\d\s.,]+;\s*-?[\d\s.,]+\]$/.test(s))why="valeur";
      else if(fmt===2&&/^\d+\s*\/\s*\d*$/.test(s)&&it.h<10&&it.top<pg.h*.94)why="experts";
      else if(fmt===1&&it.h<10&&!/^(Auteurs|Co-auteurs|Relecteurs|Date de création|Version|Page)/.test(s)&&!/^Référence/.test(s)&&!(s.length<=3&&its.some(o=>o!==it&&o.h>=10.5&&Math.abs(o.y-it.y)<9&&(Math.abs(o.x+o.w-it.x)<3.5||Math.abs(it.x+it.w-o.x)<3.5))))why="petit";
      if(fmt===1&&/^(Auteurs|Co-auteurs|Relecteurs|Date de création)/.test(s)){mode=null;continue}
      if(fmt===1&&(/^Réponses valides/.test(s)||s==="Réponses"&&nx&&/^valides/.test(nx.s)))mode="qroc";
      else if(fmt===2&&/^Réponses? attendues?$/.test(s)){mode="qroc2";continue}
      else if(/^Commentaire/.test(s)&&it.x<pg.w*.3)mode="comment";
      if(mode==="comment"&&fmt===2&&/^\d+\s*\/\s*\d+$/.test(s)&&it.top>pg.h*.94)continue;
      if(mode==="comment"&&fmt===2&&/^[A-Z]$/.test(s)&&it.x<pg.w*.12)mode=null;
      if(mode==="comment"&&fmt===2&&(/^(DP|QI)\s*\d/i.test(s)||it.h>=16)&&it.x<pg.w*.3)mode=null;
      if(mode==="qroc2"&&it.x>pg.w*.6)continue;
      if(fmt===1&&mode==="comment"&&[...s].some(ch=>CK_GL.includes(ch)))mode=null;
      if(!why&&mode)why=mode;
      if(fmt===1&&/^Auteurs/.test(s))mode=null;
      if(why)out.push({...it,why});
    }
    // valeur numérique attendue découpée en morceaux (« [ », « 25 », « ; 25 ] ») et valeur exacte « 25 » sur la même ligne
    const lines=[];for(const it of its){const l=lines.find(l=>Math.abs(l.top-it.top)<3);if(l)l.its.push(it);else lines.push({top:it.top,its:[it]})}
    for(const l of lines){const num=l.its.filter(x=>/^[\[\]\d\s.,;-]+$/.test(x.s)).sort((a,b)=>a.x-b.x);
      if(!/\[\s*-?[\d\s.,]+;\s*-?[\d\s.,]+\]/.test(num.map(x=>x.s).join(" ")))continue;
      for(const x of num)if(!out.some(o=>o.p===x.p&&o.x===x.x&&o.top===x.top&&o.s===x.s))out.push({...x,why:"valeur"});
      // sur la ligne d'une valeur numérique, le texte avec des lettres est l'énoncé écrit dans le tableau, pas une réponse
      for(let i=out.length-1;i>=0;i--){const o=out[i];if(o.why==="qroc2"&&o.p===pg.items[0].p&&l.its.includes(pg.items.find(y=>y.x===o.x&&y.top===o.top&&y.s===o.s))&&/\p{L}/u.test(o.s))out.splice(i,1)}}
  }
  return out;
}
function ckCovered(it,rects){const x0=it.x,x1=it.x+Math.max(it.w,1),y0=it.top+1,y1=it.bot-1;let tot=0,ok=0;
  for(let i=0;i<=8;i++)for(let j=0;j<=4;j++){const x=x0+(x1-x0)*i/8,y=y0+(y1-y0)*j/4;tot++;if(rects.some(r=>x>=r.l&&x<=r.r&&y>=r.t&&y<=r.b))ok++}return ok/tot}
async function ckRender(bytes){const doc=await pdfjsLib.getDocument({isEvalSupported:false,data:bytes.slice()}).promise;const cache=new Map();
  return async p=>{if(cache.has(p))return cache.get(p);const page=await doc.getPage(p),sc=1.5,vp=page.getViewport({scale:sc});const cv=document.createElement("canvas");cv.width=Math.ceil(vp.width);cv.height=Math.ceil(vp.height);
    const ctx=cv.getContext("2d",{willReadFrequently:true});ctx.fillStyle="#fff";ctx.fillRect(0,0,cv.width,cv.height);await page.render({canvasContext:ctx,viewport:vp}).promise;const r={cv,sc};cache.set(p,r);return r}}
function ckColored(ctx,sc,l,t,r,b,masks){ // pixels verts/rouges visibles dans [l,t,r,b] une fois les caches peints en blanc
  const x0=Math.max(0,Math.floor(l*sc)),y0=Math.max(0,Math.floor(t*sc)),w=Math.max(1,Math.ceil((r-l)*sc)),h=Math.max(1,Math.ceil((b-t)*sc));
  const im=ctx.getImageData(x0,y0,w,h).data;let gr=0,rd=0;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const px=(x0+x)/sc,py=(y0+y)/sc;if(masks.some(m=>px>=m.l&&px<=m.r&&py>=m.t&&py<=m.b))continue;const i=(y*w+x)*4,R=im[i],G=im[i+1],B=im[i+2];
    if(G>100&&G-R>35&&G-B>15)gr++;else if(R>140&&R-G>60&&R-B>45)rd++}
  return{gr,rd};
}
async function evalA(A,pages,rev,bytes,opt){
  const errs=[],warns=[...A.warn];if(!A.nq)errs.push({m:"aucune question lue"});
  const shown=[];
  A.cases.forEach((cs,ci)=>{cs.enonce.forEach(s=>shown.push({s,rects:[],tag:`D${ci+1} énoncé`}));
    cs.qs.forEach((q,qi)=>{const rects=[...q.opts,...q.hide];q.segs.forEach(s=>shown.push({s,rects:rects.filter(r=>r.p===s.p),tag:`D${ci+1} Q${qi+1} ${q.type}`,q,ci,qi}))})});
  const X0=p=>{const g=A.pages[p-1];return g.x0!=null?Math.min(g.x0,g.w*.044):g.w*.044},X1=p=>{const g=A.pages[p-1];return g.x1!=null?Math.max(g.x1,g.w*.956):g.w*.956};
  // TCS d'utilité : l'intitulé de ligne « Indispensable » est une proposition, pas une mention de correction
  const tcsLabel=it=>it.why==="mention"&&shown.some(z=>z.q&&z.q.type==="TCS"&&z.s.p===it.p&&(it.top+it.bot)/2>=z.s.y0&&(it.top+it.bot)/2<=z.s.y1&&
    z.q.opts.some(o=>o.p===it.p&&(it.top+it.bot)/2>=o.t-1&&(it.top+it.bot)/2<=o.b+1)&&z.q.hide.some(h=>h.kind==="just"&&h.p===it.p&&it.x+it.w<=h.l+2));
  for(const it of rev){const cy=(it.top+it.bot)/2;if(tcsLabel(it))continue;
    for(const z of shown){if(z.s.p!==it.p||cy<z.s.y0||cy>z.s.y1)continue;if(it.x+it.w<X0(it.p)||it.x>X1(it.p))continue;
      const rects=z.rects.map(r=>({l:r.l,r:r.r,t:Math.max(r.t,z.s.y0),b:Math.min(r.b,z.s.y1)}));const vis={...it,top:Math.max(it.top,z.s.y0-1),bot:Math.min(it.bot,z.s.y1+1)};const c=vis.bot-vis.top<2.5?1:ckCovered(vis,rects);
      if(c<1)errs.push({m:`${z.tag} p${it.p} visible (${it.why}, ${Math.round(c*100)}% caché) : « ${it.s.slice(0,50)} »`,q:z.q?[z.ci,z.qi]:null})}}
  if(A.fmt===2){const ren=await ckRender(bytes);
    for(const z of shown){if(!z.q)continue;const q=z.q;const W=A.pages[z.s.p-1].w;
      const lets=q.opts.filter(o=>o.p===z.s.p);const colL=q.col?q.col.l:lets.length?Math.min(...lets.map(o=>o.l)):W*.08,colR=q.col?q.col.r:lets.length?Math.max(...lets.map(o=>o.r)):W*.2;
      const {cv,sc}=await ren(z.s.p);const ctx=cv.getContext("2d");
      const rt=lets.length?Math.max(z.s.y0,Math.min(...lets.map(o=>o.t))-4):z.s.y0,rb=lets.length?Math.min(z.s.y1,Math.max(...lets.map(o=>o.b))+4):z.s.y1;
      const c=lets.length?ckColored(ctx,sc,colL-6,rt,colR+6,rb,z.rects):{gr:0,rd:0};if(c.gr+c.rd>6)errs.push({m:`${z.tag} p${z.s.p} couleur visible dans la colonne des réponses (${c.gr} vert, ${c.rd} rouge)`,q:[z.ci,z.qi]});
      const g=ckColored(ctx,sc,X0(z.s.p),z.s.y0,X1(z.s.p),z.s.y1,z.rects);if(g.gr>30)warns.push(`${z.tag} p${z.s.p} : ${g.gr} pixels verts visibles ailleurs (à vérifier à l'œil)`)}}
  A.cases.forEach((cs,ci)=>cs.qs.forEach((q,qi)=>{const tag=`D${ci+1} Q${qi+1} ${q.type}`,nv=q.opts.filter(o=>o.v).length,Q=[ci,qi];
    if(q.type==="QRU"&&nv!==1)errs.push({m:`${tag} : ${nv} bonnes réponses pour une QRU`,q:Q});
    if(q.type==="QRM"&&q.opts.length<2)errs.push({m:`${tag} : ${q.opts.length} proposition(s)`,q:Q});
    if((q.type==="QRM"||q.type==="QRP"||q.type==="QRPL")&&nv===0)errs.push({m:`${tag} : aucune bonne réponse au corrigé`,q:Q});
    if((q.type==="QRP"||q.type==="QRPL")&&q.k&&nv!==q.k)warns.push(`${tag} : ${nv} cochées au corrigé pour ${q.k} attendues`);
    if(q.type==="QVN"&&!(q.qroc&&q.qroc.num&&q.qroc.num.length===2))errs.push({m:`${tag} : valeur attendue non lue`,q:Q});
    if(q.type==="QROC"&&!(q.qroc&&q.qroc.ans.length))errs.push({m:`${tag} : QROC sans réponse lue`,q:Q});
    if(q.type==="TCS"&&!q.opts.some(o=>o.ex>0))errs.push({m:`${tag} : TCS sans réponse d'expert lue`,q:Q});
    const Ls=q.opts.map(o=>o.L).join(""),exp="ABCDEFGHIJKLMNOPQRSTUVWXYZ".slice(0,q.opts.length);if(Ls!==exp)errs.push({m:`${tag} : lettres ${Ls}`,q:Q})}));
  if(opt.vierge){const masks=[];A.cases.forEach(cs=>cs.qs.forEach(q=>[...q.opts,...q.hide].forEach(r=>masks.push(r))));
    A.dropped.forEach(d=>d.segs.forEach(s=>masks.push({p:s.p,l:0,r:A.pages[s.p-1].w,t:s.y0,b:s.y1})));
    for(const it of rev){if(tcsLabel(it))continue;const c=ckCovered(it,masks.filter(r=>r.p===it.p));if(c<1&&!shown.some(z=>z.s.p===it.p&&(it.top+it.bot)/2>=z.s.y0&&(it.top+it.bot)/2<=z.s.y1&&!z.q)){
      const z=shown.find(z=>z.q&&z.s.p===it.p&&(it.top+it.bot)/2>=z.s.y0-2&&(it.top+it.bot)/2<=z.s.y1+40);
      errs.push({m:`VIERGE p${it.p} visible (${it.why}) : « ${it.s.slice(0,50)} »`,q:null})}}}
  return{errs,warns};
}
async function checkBytes(bytes,opt){
  opt=opt||{};const pages=await readPages(bytes);const A=await parsePdf(bytes);
  const rev=ckReveal(pages,A.fmt);
  let {errs,warns}=await evalA(A,pages,rev,bytes,opt);const droppedQ=[];
  // questions défectueuses : écartées (zone masquée dans le sujet vierge), puis nouveau contrôle complet
  if(opt.autodrop&&errs.length&&errs.every(e=>e.q)){
    const bad=new Set(errs.map(e=>e.q.join(":")));
    A.cases.forEach((cs,ci)=>{cs.qs=cs.qs.filter((q,qi)=>{if(!bad.has(ci+":"+qi))return true;A.dropped.push({type:"écartée",n:qi+1,segs:[...q.segs.map(s=>({...s})),...q.hide.filter(h=>h.kind==="after").map(h=>({p:h.p,y0:h.t,y1:h.b}))]});droppedQ.push(`D${ci+1} Q${qi+1} ${q.type}`);return false})});
    A.cases=A.cases.filter(cs=>cs.qs.length);A.nq=A.cases.reduce((s,cs)=>s+cs.qs.length,0);
    ({errs,warns}=await evalA(A,pages,rev,bytes,opt));
  }
  return{A,errs:errs.map(e=>e.m),warns:[...warns,...droppedQ.map(d=>"question écartée : "+d)],nrev:rev.length,droppedQ};
}
