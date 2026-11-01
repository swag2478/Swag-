// node tools/pipeline.js check fichier.pdf...   |   node tools/pipeline.js catalog entries.json out.json
const {chromium}=require('playwright');const fs=require('fs'),crypto=require('crypto'),path=require('path');
const NM='/tmp/claude-0/t/node_modules',ROOT=path.join(__dirname,'..');
async function boot(){const b=await chromium.launch();const p=await b.newPage();
  await p.setContent('<html><body></body></html>');
  await p.addScriptTag({content:fs.readFileSync(NM+'/pdfjs-dist/build/pdf.min.js','utf8')});
  await p.addScriptTag({content:fs.readFileSync(NM+'/pdfjs-dist/build/pdf.worker.min.js','utf8')});
  await p.addScriptTag({content:"const r1=v=>Math.round(v*10)/10;\n"+fs.readFileSync(ROOT+'/parse3.js','utf8')+"\n"+fs.readFileSync(ROOT+'/tools/check-core.js','utf8')+"\nwindow.__run=async(b64,o)=>{const s=atob(b64),a=new Uint8Array(s.length);for(let i=0;i<s.length;i++)a[i]=s.charCodeAt(i);const r=await checkBytes(a,o);return r};"});
  return{b,p}}
async function run(p,file,o){return p.evaluate(([b,o])=>window.__run(b,o),[fs.readFileSync(file).toString('base64'),o||{vierge:true,autodrop:true}])}
module.exports={boot,run};
if(require.main===module)(async()=>{const [cmd,...args]=process.argv.slice(2);const {b,p}=await boot();
  if(cmd==="check"){let bad=0;for(const f of args){let r;try{r=await run(p,f)}catch(e){console.log("\n== "+f+" ERREUR "+e.message);bad++;continue}const {A,errs,warns,nrev}=r;const t={};A.cases.forEach(c=>c.qs.forEach(q=>t[q.type]=(t[q.type]||0)+1));
    console.log(`\n== ${path.basename(f)} | format ${A.fmt} | ${A.cases.length} dossiers, ${A.nq} questions ${JSON.stringify(t)} | écartées : ${A.dropped.map(d=>d.type+(d.n?"#"+d.n:"")).join(", ")||"aucune"} | corr ${nrev}`);
    errs.slice(0,12).forEach(e=>console.log("  ERREUR "+e));if(errs.length>12)console.log(`  … ${errs.length-12} autres`);warns.slice(0,8).forEach(w=>console.log("  note "+w));console.log(errs.length?`  => ÉCHEC (${errs.length})`:"  => OK");if(errs.length)bad++}
    console.log(`\nBILAN : ${args.length-bad} OK, ${bad} en échec`)}
  if(cmd==="catalog"){const E=JSON.parse(fs.readFileSync(args[0],'utf8'));const out=[];let bad=0;
    const sigs=new Map();const rejected=[];
    for(const e of E){const f=ROOT+'/annales/'+e.file;let r;try{r=await run(p,f)}catch(err){rejected.push({...e,why:"lecture impossible"});bad++;continue}
      if(r.errs.length){rejected.push({...e,why:r.errs[0]});bad++;continue}
      const nd=(r.droppedQ||[]).length;if(nd>0.25*(r.A.nq+nd)){rejected.push({...e,why:nd+" questions illisibles sur "+(r.A.nq+nd)});bad++;continue}
      const sig=JSON.stringify(r.A.cases.map(c=>c.qs.map(q=>q.type+(q.qroc?q.qroc.ans.join("|"):q.opts.map(o=>o.v?1:0).join("")))));
      if(sigs.has(sig)){rejected.push({...e,why:"même contenu que "+sigs.get(sig)});continue}sigs.set(sig,e.id);
      const o={...e,hash:crypto.createHash('sha1').update(fs.readFileSync(f)).digest('hex'),data:r.A};
      if(e.noteMatch){r.A.cases.forEach((c,ci)=>c.qs.forEach((q,qi)=>{if(new RegExp(e.noteMatch).test(q.st||""))o.note={c:ci,q:qi,text:e.noteText}}));delete o.noteMatch;delete o.noteText}
      out.push(o)}
    // index léger pour la page + données par UE dans data/<ue>.json
    const slug=u=>u.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||"autres";
    const bundles={};const index=out.map(o=>{const bundle=slug(o.ue);(bundles[bundle]=bundles[bundle]||{})[o.id]=o.data;
      const {data,...rest}=o;return{...rest,bundle,nq:data.nq,sh:data.cases.map(c=>[c.qi?1:0,c.enonce.length?1:0,c.qs.map(q=>q.type)])}});
    fs.mkdirSync(ROOT+'/data',{recursive:true});for(const f of fs.readdirSync(ROOT+'/data'))fs.unlinkSync(ROOT+'/data/'+f);
    for(const [k,v] of Object.entries(bundles))fs.writeFileSync(ROOT+'/data/'+k+'.json',JSON.stringify(v));
    fs.writeFileSync(args[1],JSON.stringify(index));fs.writeFileSync(ROOT+'/drive/rejected.json',JSON.stringify(rejected,null,1));console.log(`catalogue : ${out.length} annales, ${out.reduce((s,o)=>s+o.data.nq,0)} questions, ${bad} refusées, ${Object.keys(bundles).length} paquets`)}
  await b.close()})();
