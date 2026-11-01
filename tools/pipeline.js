// node tools/pipeline.js check fichier.pdf...  : passe chaque corrigé au contrôle de Swag (lecture + masquage + sujet vierge),
// hors interface, avec le même code que le site (src/parse3.js, src/check-core.js) et pdf.js 3.11.174 (npm install).
const {chromium}=require('playwright');const fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..'),NM=path.join(ROOT,'node_modules');
async function boot(src){src=src||{};const b=await chromium.launch();const p=await b.newPage();
  await p.setContent('<html><body></body></html>');
  await p.addScriptTag({content:fs.readFileSync(NM+'/pdfjs-dist/build/pdf.min.js','utf8')});
  await p.addScriptTag({content:fs.readFileSync(NM+'/pdfjs-dist/build/pdf.worker.min.js','utf8')});
  const rd=f=>src[f]!=null?src[f]:fs.readFileSync(path.join(ROOT,'src',f),'utf8');
  await p.addScriptTag({content:"const r1=v=>Math.round(v*10)/10;\n"+rd('parse3.js')+"\n"+rd('check-core.js')+"\nwindow.__run=async(b64,o)=>{const s=atob(b64),a=new Uint8Array(s.length);for(let i=0;i<s.length;i++)a[i]=s.charCodeAt(i);const r=await checkBytes(a,o);return r};"});
  return{b,p}}
async function run(p,file,o){return p.evaluate(([b,o])=>window.__run(b,o),[fs.readFileSync(file).toString('base64'),o||{vierge:true,autodrop:true}])}
module.exports={boot,run};
if(require.main===module)(async()=>{const [cmd,...args]=process.argv.slice(2);if(cmd!=="check"){console.log("usage : node tools/pipeline.js check fichier.pdf...");return}
  const {b,p}=await boot();let bad=0;
  for(const f of args){let r;try{r=await run(p,f)}catch(e){console.log("\n== "+f+" ERREUR "+e.message);bad++;continue}const {A,errs,warns,nrev}=r;const t={};A.cases.forEach(c=>c.qs.forEach(q=>t[q.type]=(t[q.type]||0)+1));
    console.log(`\n== ${path.basename(f)} | format ${A.fmt} | ${A.cases.length} dossiers, ${A.nq} questions ${JSON.stringify(t)} | écartées : ${A.dropped.map(d=>d.type+(d.n?"#"+d.n:"")).join(", ")||"aucune"} | corr ${nrev}`);
    errs.slice(0,12).forEach(e=>console.log("  ERREUR "+e));if(errs.length>12)console.log(`  … ${errs.length-12} autres`);warns.slice(0,8).forEach(w=>console.log("  note "+w));console.log(errs.length||!A.nq?`  => ÉCHEC (${errs.length})`:"  => OK");if(errs.length||!A.nq)bad++}
  console.log(`\nBILAN : ${args.length-bad} OK, ${bad} en échec`);await b.close()})();
