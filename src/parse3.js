/* ---------- lecture des corrigés v3 ----------
   Formats reconnus :
   1 « UNESS » : Question N : (Type: X) ; lignes ☑/☐/◎/◉ + mention (Valide, Faux, Indispensable, Inacceptable, (n Experts)) + lettre ;
     justifications en petit corps sous les propositions ; « Commentaire pédagogique de correction » ; QROC « Réponses valides ».
   2 « Réponse attendue » : Question N + type en toutes lettres à droite ; lettre, case ■/☑, texte ; QROC « Réponse attendue » ; TCS avec réponses des experts.
   Sortie par question : segs (zones à afficher), opts (cases cliquables), hide (zones masquées), qroc (réponses acceptées), type, k.
*/
const PARSER_VERSION=7;
const GLYPHS="☑☐◎◉■□✓✔●○";
const isGlyph=s=>s.length===1&&GLYPHS.includes(s);
const CHECKED=s=>s==="☑"||s==="◉"||s==="✓"||s==="✔"||s==="●";
const LABEL_RE=/^(Valide|Faux|Indispensable|Inacceptable|Acceptable|Neutre)$/i;
const COUNT_RE=/^\(?\d+$|^\(?\d+\s*Experts?\)?$|^Experts?\)$/i;
const LETTER_RE=/^([A-Z])\.?$/;
const SUPPORTED=new Set(["QRU","QRM","QRP","QRPL","QROC","TCS","ZONE"]);
function typeFromLabel(t){t=t.toLowerCase();if(/concordance/.test(t))return"TCS";if(/d[ée]roulant/.test(t))return"QRP";if(/zone/.test(t))return"ZONE";if(/ouverte|courte/.test(t))return"QROC";if(/longue|liste/.test(t))return"QRPL";if(/pr[ée]cis/.test(t))return"QRP";if(/unique/.test(t))return"QRU";if(/multiples|réponses/.test(t))return"QRM";return"?"}
function normType(t){t=(t||"").toUpperCase();if(t==="QTCS"||t==="TCS")return"TCS";if(t==="QZONE")return"ZONE";return t}

async function readPages(bytes){
  const doc=await pdfjsLib.getDocument({data:bytes.slice()}).promise;const out=[];
  for(let p=1;p<=doc.numPages;p++){
    const page=await doc.getPage(p),vp=page.getViewport({scale:1});
    const items=(await page.getTextContent()).items.filter(it=>it.str&&it.str.trim()&&!/^[\uE000-\uF8FF\s]*$/.test(it.str)).map(it=>{
      const t=pdfjsLib.Util.transform(vp.transform,it.transform),h=it.height||Math.hypot(t[2],t[3]);
      return{s:it.str.trim(),x:t[4],y:t[5],w:it.width,h,top:t[5]-h*.95,bot:t[5]+h*.28,p};});
    {const im=await pageImages(page,vp);out.push({p,w:vp.width,h:vp.height,items:mergeChars(items),imgs:im,fills:im.fills,squares:im.squares,pics:im.pics})}
  }
  return out;
}
// images dessinées sur la page (photos, encadrés, extraits de référentiel en image) : rectangles en coordonnées d'affichage
async function pageImages(page,vp){
  const O=pdfjsLib.OPS,ol=await page.getOperatorList(),out=[];
  const mul=(m,n)=>[m[0]*n[0]+m[2]*n[1],m[1]*n[0]+m[3]*n[1],m[0]*n[2]+m[2]*n[3],m[1]*n[2]+m[3]*n[3],m[0]*n[4]+m[2]*n[5]+m[4],m[1]*n[4]+m[3]*n[5]+m[5]];
  let ctm=[1,0,0,1,0,0];const stack=[];
  // zones à pointer : aplats semi-transparents (la zone attendue, dessinée sur l'image) et petits carrés de légende
  let fill=null,ca=1,path=null;const fills=[],squares=[],pics=[];const gst=[];
  const tp=(m,x,y)=>{const t=mul(vp.transform,m);return[t[0]*x+t[2]*y+t[4],t[1]*x+t[3]*y+t[5]]};
  const flat=(ops,args,m)=>{const polys=[];let cur=null,k=0,lx=0,ly=0;const push=(x,y)=>{cur.push(tp(m,x,y));lx=x;ly=y};
    for(const op of ops){
      if(op===13){cur=[];polys.push(cur);push(args[k],args[k+1]);k+=2}
      else if(op===14){if(!cur){cur=[];polys.push(cur)}push(args[k],args[k+1]);k+=2}
      else if(op===15||op===16||op===17){const n=op===15?6:4,a=args.slice(k,k+n);k+=n;if(!cur){cur=[];polys.push(cur)}
        const p0=[lx,ly],c1=op===15?[a[0],a[1]]:op===16?[lx,ly]:[a[0],a[1]],c2=op===15?[a[2],a[3]]:[a[0],a[1]],p3=op===15?[a[4],a[5]]:[a[2],a[3]];
        for(let i=1;i<=8;i++){const u=i/8,v=1-u;push(v*v*v*p0[0]+3*v*v*u*c1[0]+3*v*u*u*c2[0]+u*u*u*p3[0],v*v*v*p0[1]+3*v*v*u*c1[1]+3*v*u*u*c2[1]+u*u*u*p3[1])}}
      else if(op===19){const [x,y,w,h]=args.slice(k,k+4);k+=4;cur=null;polys.push([tp(m,x,y),tp(m,x+w,y),tp(m,x+w,y+h),tp(m,x,y+h)])}
      else if(op===18){cur=null}}
    return polys.filter(p=>p.length>=3)};
  const bb=pts=>{const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]);return{l:Math.min(...xs),t:Math.min(...ys),r:Math.max(...xs),b:Math.max(...ys)}};
  const box=m=>{const t=mul(vp.transform,m),pts=[[0,0],[1,0],[0,1],[1,1]].map(([u,v])=>[t[0]*u+t[2]*v+t[4],t[1]*u+t[3]*v+t[5]]);
    const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]),l=Math.min(...xs),r=Math.max(...xs),tp=Math.min(...ys),b=Math.max(...ys);
    if((r-l)*(b-tp)>=60&&r-l>=3&&b-tp>=3){out.push({l,t:tp,r,b});return out[out.length-1]}};
  const IMG=new Set([O.paintImageXObject,O.paintInlineImageXObject,O.paintImageMaskXObject,O.paintJpegXObject,O.paintImageXObjectRepeat,O.paintSolidColorImageMask].filter(x=>x!=null));
  for(let i=0;i<ol.fnArray.length;i++){const fn=ol.fnArray[i],a=ol.argsArray[i];
    if(fn===O.save){stack.push(ctm);gst.push([fill,ca])}else if(fn===O.restore){if(stack.length)ctm=stack.pop();if(gst.length)[fill,ca]=gst.pop()}
    else if(fn===O.setFillRGBColor){const c=a&&(a.length!=null?a:[a[0],a[1],a[2]]);fill=typeof c==="string"?c:[c[0],c[1],c[2]].map(v=>Math.round(v))}
    else if(fn===O.setFillGray){fill=[1,1,1].map(()=>Math.round((a[0]||0)*255))}
    else if(fn===O.setGState){for(const [k2,v] of (a&&a[0])||[])if(k2==="ca")ca=v}
    else if(fn===O.constructPath){path={ops:a[0],args:a[1],m:ctm}}
    else if(fn===O.fill||fn===O.eoFill||fn===O.fillStroke||fn===O.eoFillStroke||fn===O.closeFillStroke||fn===O.closeEOFillStroke){
      if(path){const polys=flat(path.ops,path.args,path.m),col=Array.isArray(fill)?fill:null;
        for(const pts of polys){const r=bb(pts);
          if(ca<0.95&&ca>0.02&&(r.r-r.l)*(r.b-r.t)>=30)fills.push({pts,...r,col,ca});
          else if(ca>=0.95&&col&&r.r-r.l>=4&&r.r-r.l<=22&&r.b-r.t>=4&&r.b-r.t<=22)squares.push({...r,col})}}
      path=null}
    else if(fn===O.endPath)path=null
    else if(fn===O.transform)ctm=mul(ctm,a);
    else if(fn===O.paintFormXObjectBegin){stack.push(ctm);if(a&&a[0]&&a[0].length===6)ctm=mul(ctm,a[0])}
    else if(fn===O.paintFormXObjectEnd){if(stack.length)ctm=stack.pop()}
    else if(IMG.has(fn)){const r=box(ctm);if(r&&(fn===O.paintImageXObject||fn===O.paintJpegXObject)&&a&&typeof a[0]==="string")pics.push({...r,id:a[0],m:ctm.slice(),w:a[1],h:a[2]})}
    else if(fn===O.paintInlineImageXObjectGroup||fn===O.paintImageMaskXObjectGroup){const g=a&&a[0];(Array.isArray(g)?g:[]).forEach(im=>box(im&&im.transform?mul(ctm,im.transform):ctm))}}
  out.fills=fills;out.squares=squares;out.pics=pics;return out;
}
// une image qui touche une zone masquée, ou qui se trouve entre deux zones masquées sans rien de visible entre elles
// (suite d'un commentaire sur la page suivante, extrait de référentiel en image…), est masquée en entier
function coverImages(q,pages,items){
  const K=new Set(["comment","just","qroc","label","after"]);let carry=false;
  for(const sg of q.segs){const pg=pages[sg.p-1];
    const hs=q.hide.filter(h=>h.p===sg.p&&K.has(h.kind));
    const cov=[...hs,...q.opts.filter(o=>o.p===sg.p)];
    const inside=(x,y)=>cov.some(h=>x>=h.l-.5&&x<=h.r+.5&&y>=h.t-.5&&y<=h.b+.5);
    const visible=items.filter(it=>it.p===sg.p&&it.top>=sg.y0-2&&it.bot<=sg.y1+2&&!inside(it.x+it.w/2,(it.top+it.bot)/2));
    const srt=hs.filter(h=>h.kind!=="after").sort((a,b)=>a.t-b.t);const gaps=[];
    // entre deux zones masquées sans rien de visible entre elles
    for(let i=0;i<srt.length;i++){const a=srt[i];const nb=srt.slice(i+1).find(b=>b.t>a.b);if(!nb)continue;
      if(!visible.some(it=>it.bot>a.b+1&&it.top<nb.t-1))gaps.push({t:a.b,b:nb.t})}
    // après la dernière zone masquée, s'il n'y a plus rien de visible jusqu'au bas du segment
    const last=srt.filter(h=>h.kind!=="label").sort((a,b)=>b.b-a.b)[0];
    const tailHidden=!!last&&!visible.some(it=>it.top>last.b-1);
    if(tailHidden)gaps.push({t:last.b,b:sg.y1});
    // suite d'une zone masquée de la page précédente : du haut de la page jusqu'au premier élément visible
    if(carry){const fv=visible.slice().sort((a,b)=>a.top-b.top)[0];const fh=srt[0];
      const lim=Math.min(fv?fv.top:sg.y1,fh&&(!fv||fh.t<fv.top)?fh.b:Infinity);gaps.push({t:sg.y0,b:lim})}
    carry=tailHidden||(carry&&!visible.length);
    if(!pg.imgs||!pg.imgs.length||!hs.length&&!gaps.length)continue;
    for(const im of pg.imgs){const t=Math.max(im.t,sg.y0),b=Math.min(im.b,sg.y1);if(b-t<1)continue;
      // contact franc seulement : une image d'énoncé posée juste au-dessus d'un commentaire ne le chevauche que d'un ou deux points
      // (ou une image qui commence à l'intérieur de la zone masquée : corps d'un commentaire en image)
      // ou une image placée juste sous une zone masquée, sans rien de visible entre les deux (illustration d'une justification)
      const ov=h=>{const w=Math.min(im.r,h.r)-Math.max(im.l,h.l),hh=Math.min(im.b,h.b)-Math.max(im.t,h.t);if(w<=4)return false;
        if(hh>4&&w*hh>=0.12*(im.r-im.l)*(im.b-im.t))return true;if(im.t>=h.t-2&&im.t<h.b-1)return true;
        return h.kind!=="label"&&im.t>=h.b-1&&im.t-h.b<30&&!visible.some(it=>it.top>=h.b-1&&it.top<im.t-1)};
      const touch=hs.some(ov)||gaps.some(g=>Math.min(b,g.b)-Math.max(t,g.t)>4);
      if(!touch)continue;
      // fond de page ou d'encadré sur lequel du texte visible est écrit : on ne le masque pas (le texte révélateur posé dessus a déjà ses caches)
      if(visible.some(it=>{const cx=it.x+it.w/2,cy=(it.top+it.bot)/2;return cx>im.l&&cx<im.r&&cy>t&&cy<b}))continue;
      let full=true;for(let i=0;i<=10&&full;i++)for(let j=0;j<=10;j++){const x=im.l+(im.r-im.l)*i/10,y=t+(b-t)*j/10;if(!inside(x,y)){full=false;break}}
      if(!full){const m=R(sg.p,im.l-2,t-2,im.r+2,b+2,{kind:"img"});q.hide.push(m);cov.push(m)}}}
}
function makeRaster(bytes){ // rendu des pages pour lire la couleur des cases (navigateur)
  let docP=null;const cache=new Map();
  return p=>{if(!cache.has(p))cache.set(p,(async()=>{docP=docP||pdfjsLib.getDocument({data:bytes.slice()}).promise;const doc=await docP;const page=await doc.getPage(p);const scale=2;const vp=page.getViewport({scale});
    const cv=document.createElement("canvas");cv.width=Math.ceil(vp.width);cv.height=Math.ceil(vp.height);const ctx=cv.getContext("2d",{willReadFrequently:true});ctx.fillStyle="#fff";ctx.fillRect(0,0,cv.width,cv.height);
    await page.render({canvasContext:ctx,viewport:vp}).promise;const im=ctx.getImageData(0,0,cv.width,cv.height);return{data:im.data,width:cv.width,height:cv.height,scale}})());return cache.get(p)};
}
function mergeChars(items){ // PDF où chaque caractère est un élément (impressions iOS) : on reconstitue les mots et les lignes
  if(items.length<20)return items;const lens=items.map(i=>i.s.length).sort((a,b)=>a-b);if(lens[Math.floor(lens.length/2)]>1.5)return items;
  const sorted=items.slice().sort((a,b)=>Math.abs(a.y-b.y)<2?a.x-b.x:a.y-b.y);const out=[];let cur=null;
  for(const it of sorted){
    const g=isGlyph(it.s);
    if(cur&&!g&&!cur.g&&Math.abs(cur.y-it.y)<2&&Math.abs(cur.h-it.h)<2&&it.x-(cur.x+cur.w)<cur.h*.6&&it.x>=cur.x){
      const gap=it.x-(cur.x+cur.w);cur.s+=(gap>cur.h*.15?" ":"")+it.s;cur.w=it.x+it.w-cur.x;cur.top=Math.min(cur.top,it.top);cur.bot=Math.max(cur.bot,it.bot);continue}
    if(cur)out.push(cur);cur={...it,g};
  }
  if(cur)out.push(cur);out.forEach(o=>delete o.g);return out;
}
const R=(p,l,t,r,b,extra)=>({p,l:r1(l),t:r1(t),r:r1(r),b:r1(b),...(extra||{})});
function sameLine(a,b){return Math.abs(a.y-b.y)<4.5}
function mergeBlock(list,kind,W){ // un seul rectangle par page
  const by=new Map();for(const it of list){const m=by.get(it.p);if(!m)by.set(it.p,{p:it.p,l:it.x,t:it.top,r:it.x+it.w,b:it.bot});else{m.l=Math.min(m.l,it.x);m.t=Math.min(m.t,it.top);m.r=Math.max(m.r,it.x+it.w);m.b=Math.max(m.b,it.bot)}}
  return[...by.values()].map(m=>R(m.p,Math.min(m.l-3,W*.055),m.t-3,Math.max(m.r+3,W*.945),m.b+3,{kind}));
}
function mergeLines(list,kind){ // regroupe des éléments masqués par ligne
  const out=[];const byKey=new Map();
  for(const it of list){const k=it.p+":"+Math.round(it.y/4);let m=byKey.get(k);
    if(!m){m={p:it.p,l:it.x,t:it.top,r:it.x+it.w,b:it.bot};byKey.set(k,m);out.push(m)}
    else{m.l=Math.min(m.l,it.x);m.t=Math.min(m.t,it.top);m.r=Math.max(m.r,it.x+it.w);m.b=Math.max(m.b,it.bot)}}
  return out.map(m=>R(m.p,m.l-3,m.t-2,m.r+3,m.b+2,{kind}));
}

async function parsePdf(bytes,o){
  o=o||{};const pages=await readPages(bytes);
  const raster=o.raster||(typeof document!=='undefined'?makeRaster(bytes):null);
  const fmt=pages.some(pg=>pg.items.some(it=>/^\(Type:/.test(it.s)||/^Élément\s*d'épreuve/.test(it.s)||it.s==="Élément"))?1:2;
  const stream=[];const pageInfo=pages.map(pg=>({w:r1(pg.w),h:r1(pg.h)}));
  for(const pg of pages){
    let items=pg.items.slice().sort((a,b)=>Math.abs(a.top-b.top)<2.5?a.x-b.x:a.top-b.top);
    pg.ctop=0;pg.bottom=pg.h-8;
    if(fmt===1){
      const bad=new Set();
      items.forEach(it=>{if(/^Référence\s*:/.test(it.s)){items.forEach(o=>{if(sameLine(o,it))bad.add(o)});pg.ctop=Math.max(pg.ctop,it.bot+3)}});
      items.forEach((it,ix)=>{if(/^Élément\s*d'épreuve/.test(it.s)||it.s==="Élément"&&items.some(o=>o!==it&&sameLine(o,it)&&/^d'épreuve/.test(o.s))){items.forEach(o=>{if(o!==it&&sameLine(o,it))bad.add(o)});it.caseMark=1;pg.ctop=Math.max(pg.ctop,it.bot+3)}});
      const foot=items.find(it=>/^Auteurs\s*:/.test(it.s));
      if(foot)pg.bottom=foot.top-4;
      items=items.filter(it=>!bad.has(it)&&!(foot&&it.top>=foot.top-1));
    }else{
      const num=items.find(it=>/^\d+\s*\/\s*\d+$/.test(it.s)&&it.top>pg.h*.94);
      if(num)pg.bottom=num.top-4;
      items=items.filter(it=>it!==num);
    }
    items.forEach(it=>stream.push(it));
  }
  const W=p=>pages[p-1].w;
  const isQHead=(it,i)=>it.x<W(it.p)*.2&&(fmt===1?(/^Question\s*\d+\s*:?/.test(it.s)||it.s==="Question"&&stream[i+1]&&stream[i+1].p===it.p&&sameLine(stream[i+1],it)&&/^\d+\s*:?$/.test(stream[i+1].s)):/^Question\s*\d+$/.test(it.s));
  const isCaseMark=it=>fmt===1?!!it.caseMark:it.x<W(it.p)*.3&&(/^DP\s*\d+\s*[-–]/i.test(it.s)||/^QI\s*\d+\s*[-–]/i.test(it.s)||/^Questions isolées/i.test(it.s));
  const cases=[];let c=null,q=null;
  const newCase=(mark)=>{c={pre:[],qs:[],qi:!!(mark&&/^QI|isolées/i.test(mark.s))};cases.push(c);q=null};
  for(let i=0;i<stream.length;i++){
    const it=stream[i];
    if(isCaseMark(it)){newCase(it);if(fmt===2&&!/isolées/i.test(it.s))c.pre.push(it);continue}
    if(isQHead(it,i)){
      if(!c)newCase(null);
      const n=+((it.s.match(/\d+/)||(stream[i+1].s.match(/\d+/)))||[0])[0];
      let type;
      if(fmt===1){const look=stream.slice(i,i+6).filter(x=>x.p===it.p&&sameLine(x,it)).map(x=>x.s).join(" ");type=normType((look.match(/Type:\s*([A-Z]+)/)||[])[1]||"QRM")}
      else type=typeFromLabel(stream.filter(x=>x.p===it.p&&x.x>W(it.p)*.6&&x.top>it.top-6&&x.top<it.top+18).map(x=>x.s).join(" "));
      const annul=stream.slice(Math.max(0,i-3),i+3).some(x=>x.p===it.p&&sameLine(x,it)&&/^Annul/i.test(x.s));
      q={n,type:annul?"ANNULÉE":type,head:it,items:[]};c.qs.push(q);continue;
    }
    if(q)q.items.push(it);else{if(!c)newCase(null);c.pre.push(it)}
  }
  const bands=list=>{const by=new Map();for(const it of list){const b=by.get(it.p)||{p:it.p,y0:it.top,y1:it.bot};b.y0=Math.min(b.y0,it.top);b.y1=Math.max(b.y1,it.bot);by.set(it.p,b)}
    return[...by.values()].map(b=>({p:b.p,y0:r1(Math.max(pages[b.p-1].ctop,b.y0-5)),y1:r1(Math.min(pages[b.p-1].bottom,b.y1+6))}))};
  const outCases=[],dropped=[],warn=[];
  for(const cs of cases){
    const oc={enonce:cs.pre.length?bands(cs.pre):[],qs:[],qi:cs.qi||!cs.pre.length};
    for(const Q of cs.qs){
      const segs=bands([Q.head,...Q.items]);
      const res=fmt===1?parseQ1(Q,pages,warn):await parseQ2(Q,pages,warn,raster);
      if(!SUPPORTED.has(res.type)||(!res.opts.length&&!res.qroc&&!res.zone)){dropped.push({type:res.type||Q.type,n:Q.n,segs});continue}
      oc.qs.push({type:res.type,k:res.k,st:res.st,segs,opts:res.opts,hide:res.hide,qroc:res.qroc,...(res.col?{col:res.col}:{}),...(res.zone?{zone:res.zone}:{}),_end:res.endAt,_items:[Q.head,...Q.items]});
    }
    if(oc.qs.length)outCases.push(oc);else if(oc.enonce.length)dropped.push({type:"dossier",segs:oc.enonce});
  }
  extendSegs(outCases,dropped,pages);
  // une question s'arrête à la fin de ses propositions : ce qui suit (images de correction, encadrés) n'est jamais affiché
  outCases.forEach(cs=>cs.qs.forEach(q=>{const e=q._end;delete q._end;if(!e)return;
    const cut=[];for(const sg of q.segs){const W=pages[sg.p-1].w;if(sg.p>e.p)cut.push(R(sg.p,0,sg.y0,W,sg.y1,{kind:"after"}));else if(sg.p===e.p&&sg.y1>e.y+5)cut.push(R(sg.p,0,e.y+5,W,sg.y1,{kind:"after"}))}
    q.segs=q.segs.filter(sg=>sg.p<=e.p);const last=q.segs.find(sg=>sg.p===e.p);if(last)last.y1=r1(Math.min(last.y1,e.y+5));
    cut.forEach(m=>q.hide.push(m))}));
  outCases.forEach(cs=>cs.qs.forEach(q=>{coverImages(q,pages,q._items);delete q._items}));
  pages.forEach((pg,i)=>{const its=pg.items;if(!its.length)return;pageInfo[i].x0=r1(Math.max(0,Math.min(...its.map(x=>x.x))-10));pageInfo[i].x1=r1(Math.min(pg.w,Math.max(...its.map(x=>x.x+x.w))+10))});
  return{v:PARSER_VERSION,fmt,pages:pageInfo,cases:outCases,nq:outCases.reduce((s,cs)=>s+cs.qs.length,0),dropped:dropped.map(d=>({type:d.type,n:d.n,segs:d.segs})),warn};
}

function extendSegs(cases,dropped,pages){
  // toutes les bandes, dans l'ordre, par page : chaque bande s'étend vers le bas jusqu'à la bande suivante de la même page (ou le bas du contenu)
  // une page sans texte (image pleine page : radio, scanner…) située entre deux pages de contenu n'a aucune bande :
  // elle appartient à la dernière bande de la page précédente (la question ou l'énoncé qui s'y poursuit)
  const owners=[];
  cases.forEach(cs=>{owners.push(cs.enonce);cs.qs.forEach(q=>owners.push(q.segs))});dropped.forEach(d=>owners.push(d.segs));
  const has=new Set();owners.forEach(a=>a.forEach(s=>has.add(s.p)));
  const pmin=Math.min(...has),pmax=Math.max(...has);
  for(let p=pmin+1;p<pmax;p++){if(has.has(p))continue;const pg=pages[p-1];if(!(pg.pics&&pg.pics.length)&&!(pg.imgs&&pg.imgs.length))continue;
    let q=p-1;while(q>=pmin&&!has.has(q))q--;
    let own=null,best=-1;owners.forEach(a=>a.forEach((s,i)=>{if(s.p===q&&s.y1>best){best=s.y1;own=[a,i]}}));if(!own)continue;
    const [a,i]=own;let j=i+1;while(j<a.length&&a[j].p<p)j++;a.splice(j,0,{p,y0:r1(pg.ctop),y1:r1(pg.bottom)})}
  const all=[];
  owners.forEach(a=>a.forEach(s=>all.push(s)));
  const byP=new Map();all.forEach(s=>{if(!byP.has(s.p))byP.set(s.p,[]);byP.get(s.p).push(s)});
  for(const [p,list] of byP){list.sort((a,b)=>a.y0-b.y0);const pg=pages[p-1];
    if(list.length&&list[0].y0>pg.ctop)list[0].y0=r1(pg.ctop);
    for(let i=0;i<list.length;i++){const nx=list[i+1];const lim=nx?nx.y0:pg.bottom;if(lim>list[i].y1)list[i].y1=r1(lim)}}
}

function parseQ1(Q,pages,warn){
  const W=pages[Q.head.p-1].w;
  const items=Q.items;const hide=[],opts=[];let qroc=null;
  const st=items.filter(it=>it.h>=10).slice(0,40).map(x=>x.s).join(" ").slice(0,200);
  const k=(st.match(/(\d+)\s*r[ée]ponses?\s*attendues/i)||[])[1];
  const type=Q.type;
  // repères
  const glyphIdx=items.map((it,i)=>isGlyph(it.s)&&it.x<W*.2?i:-1).filter(i=>i>=0);
  const qrocIdx=items.findIndex(it=>/^Réponses valides/.test(it.s)||(it.s==="Réponses"&&items[items.indexOf(it)+1]&&/^valides/.test(items[items.indexOf(it)+1].s)));
  const comIdx=items.findIndex(it=>/^Commentaire/.test(it.s)&&it.x<W*.2);
  // commentaire pédagogique : du mot « Commentaire » jusqu'à la 1re case ou au bloc de réponses
  if(comIdx>=0){
    const end=Math.min(...[glyphIdx.find(i=>i>comIdx),qrocIdx>comIdx?qrocIdx:undefined,items.length].filter(x=>x!=null));
    mergeBlock(items.slice(comIdx,end),"comment",W).forEach(m=>hide.push(m));
  }
  if(qrocIdx>=0){
    const block=items.slice(qrocIdx);
    const ansStart=block[0].s==="Réponses"?2:1;
    const ans=[];for(let j=ansStart;j<block.length;j++){if(/^Propositions/.test(block[j].s))break;ans.push(block[j].s)}
    qroc={ans:ans.join(" ").split(/;/).map(s=>s.trim()).filter(s=>/[\p{L}\p{N}]/u.test(s))};
    const qb=mergeBlock(block,"qroc",W);qb.forEach(m=>hide.push(m));const lb=qb[qb.length-1];
    return{type:"QROC",k:null,st,opts:[],hide,qroc,endAt:lb?{p:lb.p,y:lb.b}:null};
  }
  // propositions
  for(let gi=0;gi<glyphIdx.length;gi++){
    const g=items[glyphIdx[gi]],nextG=gi+1<glyphIdx.length?glyphIdx[gi+1]:items.length;
    const rowItems=items.slice(glyphIdx[gi]+1,nextG);
    const line=rowItems.filter(x=>x.p===g.p&&sameLine(x,g)).sort((a,b)=>a.x-b.x);
    const col=[g];let letter=null,label=[],textX=null,ex=null;
    const exp=String.fromCharCode(65+opts.length);
    for(const x of line){
      if(textX!=null)break;
      if(!letter&&(x.s===exp+"."||x.s===exp&&!label.length&&x.x<g.x+W*.3)){letter=exp;col.push(x);continue}
      const mm=x.s.match(/^(.*\S)\s+([A-Z])\.$/);
      if(!letter&&mm&&mm[2]===exp&&(LABEL_RE.test(mm[1])||COUNT_RE.test(mm[1]))){letter=mm[2];label.push(mm[1]);col.push(x);continue}
      if(LABEL_RE.test(x.s)||COUNT_RE.test(x.s)||x.h<10.5&&!letter){label.push(x.s);col.push(x);continue}
      textX=x.x;
    }
    // lettre renvoyée à la ligne (« Valide » puis « B. » dessous)
    const rest=rowItems.filter(x=>!col.includes(x)&&!line.includes(x));
    if(!letter){const lw=rest.find(x=>(x.s===exp+"."||x.s===exp)&&x.x<(textX||W*.4)&&x.p===g.p&&x.y>g.y&&x.y-g.y<16);if(lw){letter=exp;col.push(lw)}}
    if(textX==null){const t=rowItems.find(x=>!col.includes(x)&&x.h>=10.5);textX=t?t.x:W*.3}
    const labTxt=label.join(" ");
    const v=CHECKED(g.s)||/^(Valide|Indispensable|Acceptable)/i.test(labTxt)?1:0;
    const exM=labTxt.match(/(\d+)\s*Experts?/i);
    const cMin=Math.min(...col.map(x=>x.top)),cMax=Math.max(...col.filter(x=>sameLine(x,g)).map(x=>x.bot));
    const o=R(g.p,g.x-3,cMin-2,Math.max(...col.map(x=>x.x+x.w))+3,cMax+2,{L:letter||String.fromCharCode(65+opts.length),v});
    if(/Indispensable/i.test(labTxt))o.ind=1;if(/Inacceptable/i.test(labTxt))o.inac=1;
    if(exM)o.ex=+exM[1];else if(type==="TCS")o.ex=0;
    if(o.r>textX-1)o.r=r1(Math.max(o.l+10,textX-1));
    opts.push(o);
    // lettre ou mention sur une autre ligne : masques non révélés
    col.filter(x=>!sameLine(x,g)||x.p!==g.p).forEach(x=>hide.push(R(x.p,x.x-3,x.top-2,x.x+x.w+3,x.bot+2,{kind:"label"})));
    // justifications : tout ce qui n'est pas la suite du texte de la proposition
    const colR=Math.max(...col.map(x=>x.x+x.w));
    const just=rest.filter(x=>!col.includes(x)&&x.h<10.5);
    const lab=rest.filter(x=>!col.includes(x)&&x.h>=10.5&&x.x+x.w<=colR+2&&x.x<textX-4);
    mergeLines(just,"just").forEach(m=>hide.push(m));
    lab.forEach(x=>hide.push(R(x.p,x.x-3,x.top-2,x.x+x.w+3,x.bot+2,{kind:"label"})));
  }
  if(opts.length){const lo=opts[opts.length-1];const lg=glyphIdx[glyphIdx.length-1];const tail=items.slice(lg).filter(x=>x.p===lo.p&&x.h>=10.5);var endAt={p:lo.p,y:Math.max(lo.b,...tail.map(x=>x.bot))}}
  // éléments en petit corps avant les propositions (hors commentaire) : prudence, on masque
  const firstG=glyphIdx.length?glyphIdx[0]:items.length;
  const small=items.slice(0,firstG).filter((x,i)=>x.h<10&&!(comIdx>=0&&i>=comIdx));
  if(small.length){mergeLines(small,"just").forEach(m=>hide.push(m));warn.push("petit texte avant propositions Q"+Q.n)}
  return{type,k:k?+k:null,st,opts,hide,qroc,endAt:typeof endAt!=="undefined"?endAt:null};
}

// TCS « Réponse attendue » aux intitulés libres (« Peu contributif », « Plus probable »…) :
// les lignes sont données par les effectifs du panel (« 21 / 24 », « 0 / ») dans la colonne des experts.
// Contrôles stricts (5 lignes, même dénominateur, somme = panel) ; sinon la question est mise de côté.
function parseTCS2(Q,body,hdr,W,opts,hide,qroc,st,warn){
  const fail=m=>{warn.push("TCS Q"+Q.n+" : "+m);return{type:"?",opts,hide,qroc}};
  const key=x=>x.p*1e5+x.top;
  const after=body.filter(x=>key(x)>key(hdr)+hdr.bot-hdr.top-1);
  const counts=after.filter(x=>x.x>=hdr.x-8&&x.x<W*.96&&/^\d+\s*\/\s*\d*$/.test(x.s)&&x.h<10).sort((a,b)=>key(a)-key(b));
  if(!counts.length)return fail("réponses des experts absentes du corrigé");
  if(counts.length!==5)return fail(counts.length+" lignes d'experts au lieu de 5");
  const den=counts.map(x=>x.s.match(/\/\s*(\d+)/)).filter(Boolean).map(m=>+m[1]);
  const num=counts.map(x=>+x.s.match(/\d+/)[0]);
  if(!den.length||den.some(v=>v!==den[0]))return fail("dénominateurs différents");
  if(num.reduce((a,b)=>a+b,0)!==den[0])return fail("somme des experts ≠ panel");
  // intitulés : colonne de gauche, rattachés à la dernière ligne d'experts commencée au-dessus
  const left=after.filter(x=>x.x<hdr.x-6&&x.x>W*.03&&x.h>=10);
  const rows=counts.map(c=>({c,items:[]}));
  for(const x of left){let r=null;for(const R0 of rows)if(key(R0.c)<=key(x)+8)r=R0;if(r&&x.p===r.c.p&&x.top-r.c.top<60)r.items.push(x)}
  if(rows.some(r=>!r.items.length))return fail("intitulé de ligne introuvable");
  const lastBot=Math.max(...rows.map(r=>Math.max(r.c.bot,...r.items.map(x=>x.bot))));
  const pages=[...new Set(counts.map(c=>c.p))];
  for(const pp of pages){const rr=rows.filter(r=>r.c.p===pp);const top=pp===hdr.p?hdr.bot+2:Math.min(...rr.map(r=>r.c.top))-6;
    const bot=Math.max(...rr.map(r=>Math.max(r.c.bot,...r.items.map(x=>x.bot))))+8;
    hide.push(R(pp,hdr.x-8,top,W*.955,bot,{kind:"just"}))}
  rows.forEach((r,i)=>{const t=Math.min(r.c.top,...r.items.map(x=>x.top)),b=Math.max(...r.items.map(x=>x.bot));
    opts.push(R(r.c.p,W*.044,t-3,Math.min(hdr.x-8,Math.max(...r.items.map(x=>x.x+x.w))+3),b+3,{L:String.fromCharCode(65+i),v:num[i]>0?1:0,ex:num[i],nl:1}))});
  const hh=hide[hide.length-1];
  return{type:"TCS",k:null,st,opts,hide,qroc,endAt:{p:hh.p,y:Math.max(hh.b,lastBot)}};
}

// zone à pointer (corrigés « Réponse attendue ») : la zone attendue est un aplat semi-transparent dessiné sur l'image.
// À l'affichage, l'image d'origine est repeinte par-dessus (zone effacée) ; la zone sert à corriger le point placé.
function parseZone(Q,pages,body,hide,warn){
  const fail=m=>{warn.push("zone à pointer Q"+Q.n+" : "+m);return{type:"ZONE",opts:[],hide,qroc:null}};
  const leg=body.find(x=>/^Éléments à placer/i.test(x.s));
  if(!leg)return fail("légende introuvable");
  const p0=Q.head.p,t0=Q.head.bot;
  const inQ=(p,t,b)=>(p>p0||t>=t0-1)&&(p<leg.p||p===leg.p&&b<=leg.top+2);
  const fills=[],pics=[];for(let p=p0;p<=leg.p;p++){const pg=pages[p-1];(pg.fills||[]).forEach(f=>{if(inQ(p,f.t,f.b))fills.push({...f,p})});(pg.pics||[]).forEach(im=>{if(inQ(p,im.t,im.b))pics.push({...im,p})})}
  if(!fills.length)return fail("aucune zone dessinée");
  // légende : « nom de l'élément » puis « Nombre de points positionnés: 0 », pour chaque élément (elle peut continuer page suivante)
  const isCnt=x=>/^Nombre de points positionn/i.test(x.s),isNum=x=>/^\d+$/.test(x.s.trim());
  const sq=[];for(let p=leg.p;p<=Math.min(leg.p+1,pages.length);p++)(pages[p-1].squares||[]).forEach(q=>{if(p>leg.p||q.t>leg.bot-2)sq.push({...q,p})});
  const rest=body.filter(x=>x.p>leg.p||x.p===leg.p&&x.top>leg.bot-1).filter(x=>x.p<=leg.p+1);
  const lines=[],cnts=[];for(const x of rest){if(isCnt(x)){cnts.push(x);continue}if(isNum(x)&&cnts.length&&sameLine(x,cnts[cnts.length-1]))continue;
    if(/^(Question|Commentaire|Réponse|Référence)/i.test(x.s)||/^\d+\/\d+$/.test(x.s.trim()))break;if(!/[\p{L}\p{N}]/u.test(x.s))continue;
    if(lines.length>cnts.length){const L=lines[lines.length-1]; // nom sur deux lignes : on le recolle
      if(x.p===L.it.p&&x.top-L.bot<16&&x.x>=L.it.x-4){L.name+=" "+x.s.trim();L.bot=x.bot;continue}break}
    // un nouvel élément a toujours son carré de couleur : une ligne sans carré après le premier élément n'en fait plus partie
    if(lines.length&&!sq.some(q=>q.p===x.p&&q.r<=x.x+2&&Math.abs((q.t+q.b)/2-(x.top+x.bot)/2)<8))break;
    lines.push({it:x,name:x.s.trim(),bot:x.bot})}
  const near=(a,b)=>a&&b&&Math.abs(a[0]-b[0])+Math.abs(a[1]-b[1])+Math.abs(a[2]-b[2])<30;
  const els=lines.map(({it:x,name})=>{const s2=sq.filter(q=>q.p===x.p&&q.r<=x.x+2&&Math.abs((q.t+q.b)/2-(x.top+x.bot)/2)<8).sort((a,b)=>b.r-a.r)[0];return{name,col:s2?s2.col:null}});
  if(!els.length)return fail("aucun élément à placer");
  if(els.length>1&&els.some(e=>!e.col))return fail("couleur d'un élément illisible");
  const polys=fills.map(f=>({p:f.p,pts:f.pts.map(([x,y])=>[+x.toFixed(2),+y.toFixed(2)]),col:f.col}));
  // chaque zone appartient à l'élément de même couleur ; une zone sans élément correspondant rend la question inutilisable
  for(const e of els)e.polys=polys.filter(f=>e.col?near(f.col,e.col):els.length===1).map(({p,pts})=>({p,pts}));
  if(els.some(e=>!e.polys.length))return fail("zone sans élément correspondant");
  if(polys.some(f=>!els.some(e=>e.col?near(f.col,e.col):true)))return fail("zone d'une couleur absente de la légende");
  // images à repeindre : celles qui contiennent une zone (la partie repeinte = l'emprise des zones, avec une marge)
  const clean=[];for(const f of fills){const im=pics.filter(m=>m.p===f.p&&f.l>=m.l-2&&f.r<=m.r+2&&f.t>=m.t-2&&f.b<=m.b+2).pop();
    if(!im)return fail("zone hors image");
    clean.push({p:f.p,id:im.id,m:im.m,w:im.w,h:im.h,l:Math.max(im.l,f.l-4),t:Math.max(im.t,f.t-4),r:Math.min(im.r,f.r+4),b:Math.min(im.b,f.b+4)})}
  cnts.forEach(c=>hide.push(R(c.p,c.x-2,c.top-2,Math.max(c.x+c.w+30,pages[c.p-1].w*.5),c.bot+2,{kind:"label"})));
  const lastB=[...cnts,...lines.map(l=>({p:l.it.p,bot:l.bot}))].sort((a,b)=>a.p-b.p||a.bot-b.bot).pop()||leg;
  return{type:"ZONE",k:null,st:"",opts:[],hide,qroc:null,zone:{els,clean},endAt:{p:lastB.p,y:lastB.bot}};
}
async function parseQ2(Q,pages,warn,raster){
  const W=pages[Q.head.p-1].w;
  const items=Q.items.filter(x=>!(x.x>W*.6&&x.p===Q.head.p&&x.top>Q.head.top-6&&x.top<Q.head.top+18));
  const st=items.filter(it=>it.h>=10&&it.x<W*.6).slice(0,40).map(x=>x.s).join(" ").slice(0,200);
  const k=(st.match(/(\d+)\s*r[ée]ponses?\s*attendues/i)||[])[1];
  const hide=[],opts=[];let qroc=null,type=Q.type;
  // commentaire de correction : jusqu'à la fin de la question
  // commentaires de correction (de la question, ou d'une proposition) : du titre jusqu'à la ligne de proposition suivante
  const isLet=x=>x.x<W*.12&&/^[A-Z]$/.test(x.s);
  const inCom=new Set();
  for(let i=0;i<items.length;i++){if(!(/^Commentaire/i.test(items[i].s)&&items[i].x<W*.3))continue;
    let j=i;const blk=[];while(j<items.length&&(j===i||!(isLet(items[j])||/^Commentaire/i.test(items[j].s)&&items[j].x<W*.3))){blk.push(items[j]);inCom.add(items[j]);j++}
    mergeBlock(blk,"comment",W).forEach(m=>hide.push(m));i=j-1}
  const body=items.filter(x=>!inCom.has(x));
  if(type==="ZONE")return parseZone(Q,pages,body,hide,warn);
  const qh=body.findIndex(x=>/^Réponses? attendues?$/.test(x.s));
  const glyphRows=body.filter(x=>isGlyph(x.s)&&x.x<W*.3);
  if(type==="?"||type==="QRM"&&qh>=0&&!glyphRows.length&&!body.some(x=>LETTER_RE.test(x.s)&&x.x<W*.12)){
    if(qh>=0&&!body.some(x=>x.s==="A"&&x.x<W*.12))type="QROC";else if(type==="?")type="QRM";
  }
  if(type==="QROC"){
    if(qh<0)return{type,opts,hide,qroc:null};
    const block=body.slice(qh+1).filter(x=>x.x<W*.6);
    qroc={ans:block.flatMap(x=>x.s.split(/[;\/]/)).map(s=>s.trim()).filter(s=>/[\p{L}\p{N}]/u.test(s))};
    const qb=mergeBlock(block,"qroc",W);qb.forEach(m=>hide.push(m));const lb=qb[qb.length-1];
    return{type,k:null,st,opts,hide,qroc,endAt:lb?{p:lb.p,y:lb.b}:null};
  }
  if(type==="TCS"){
    const hdr=body.find(x=>/^Réponses des experts/.test(x.s));
    const labels=body.filter(x=>x.x<W*.3&&/^(Totalement négatif|Négatif|Ni plus ni moins|Positif|Très|Totalement positif|Très négatif|Très positif)$/.test(x.s));
    if(hdr&&labels.length<3)return parseTCS2(Q,body,hdr,W,opts,hide,qroc,st,warn);
    if(!hdr||labels.length<3)return{type:"?",opts,hide,qroc};
    const counts=body.filter(x=>x.x>=hdr.x-8&&x.top>hdr.bot&&/^\d+\s*\/?\s*\d*$/.test(x.s)&&x.h<10);
    const rows=labels.map((lb,i)=>({lb,i,n:0}));
    for(const cnt of counts.filter(x=>/\//.test(x.s))){let best=null,bd=1e9;for(const r of rows){const d=Math.abs(r.lb.y-cnt.y)+(cnt.y>r.lb.y+4?50:0);if(d<bd){bd=d;best=r}}if(best)best.n=+cnt.s.match(/\d+/)[0]}
    const lastBot=Math.max(...[...labels,...counts].map(x=>x.bot));
    hide.push(R(hdr.p,hdr.x-8,hdr.bot+2,W*.955,lastBot+8,{kind:"just"}));
    rows.forEach((r,i)=>{const nx=rows[i+1];const allL=body.filter(x=>x.x<W*.3&&x.p===r.lb.p&&x.top>=r.lb.top-1&&(!nx||x.top<nx.lb.top-1));const bot=Math.max(r.lb.bot,...allL.map(x=>x.bot));
      opts.push(R(r.lb.p,W*.044,r.lb.top-3,r.lb.x-1.5,(nx?Math.min(nx.lb.top-2,bot+6):bot+4),{L:String.fromCharCode(65+i),v:r.n>0?1:0,ex:r.n,nl:1}))});
    const hh=hide[hide.length-1];return{type,k:null,st,opts,hide,qroc,endAt:{p:hh.p,y:Math.max(hh.b,opts[opts.length-1].b)}};
  }
  // lignes de propositions : lettre en début de ligne ; case en texte (■ ☑) ou dessinée en couleur (anciens corrigés)
  const letters=[];for(const x of body){const exp=String.fromCharCode(65+letters.length);if(x.x<W*.12&&x.s===exp&&(!letters.length||x.top>letters[letters.length-1].top-2||x.p!==letters[letters.length-1].p))letters.push(x)}
  if(!letters.length)return{type,opts,hide,qroc};
  const col={l:Infinity,r:-Infinity};
  for(let li=0;li<letters.length;li++){
    const L=letters[li],nx=letters[li+1];
    const band=body.filter(x=>x.p===L.p&&x.top>=L.top-6&&(!nx||nx.p!==L.p||x.top<nx.top-3));
    const line=band.filter(x=>sameLine(x,L)&&x.x>L.x+L.w+4).sort((a,b)=>a.x-b.x);
    const t0=line.find(x=>!isGlyph(x.s)&&!/^(INDISPENSABLE|INACCEPTABLE|Indispensable|Inacceptable)$/.test(x.s)&&x.x>L.x+25);
    const tx=t0?t0.x:W*.18;
    const cell=band.filter(x=>x.x>L.x+L.w+2&&x.x+x.w<=tx-1);
    const g=cell.find(x=>isGlyph(x.s));
    const lab=cell.map(x=>x.s).join(" ");
    const bot=Math.max(L.bot,...cell.map(x=>x.bot));
    const o=R(L.p,L.x+L.w+6,L.top-4,tx-5,bot+4,{L:L.s,nl:1});
    if(/INDISPENSABLE/i.test(lab))o.ind=1;if(/INACCEPTABLE/i.test(lab))o.inac=1;
    if(g)o.v=CHECKED(g.s)?1:0;
    else{
      if(!raster){warn.push("cases dessinées : lecture d'image nécessaire Q"+Q.n);return{type:"?",opts:[],hide,qroc}}
      const ras=await raster(L.p);const sc=ras.scale,d=ras.data,wid=ras.width;let gr=0,rd=0;
      for(let y=Math.floor(o.t*sc);y<Math.ceil(o.b*sc);y++)for(let x=Math.floor(o.l*sc);x<Math.ceil(o.r*sc);x++){const i=(y*wid+x)*4,r=d[i],gg=d[i+1],bb=d[i+2];
        if(gg>100&&gg-r>35&&gg-bb>15)gr++;else if(r>140&&r-gg>60&&r-bb>45)rd++}
      if(gr<4&&rd<4){warn.push("case illisible Q"+Q.n+" "+L.s);return{type:"?",opts:[],hide,qroc}}
      o.v=gr>rd?1:0;
    }
    opts.push(o);col.l=Math.min(col.l,o.l);col.r=Math.max(col.r,o.r);
  }
  const lo=opts[opts.length-1],LL=letters[letters.length-1];const tail=body.filter(x=>x.p===LL.p&&x.top>=LL.top-2);
  return{type,k:k?+k:null,st,opts,hide,qroc,col,endAt:{p:lo.p,y:Math.max(lo.b,...tail.map(x=>x.bot))}};
}
