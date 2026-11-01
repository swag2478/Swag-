const {open}=require('./harness');const fs=require('fs');
(async()=>{const {browser,page}=await open();
 const all=JSON.parse(fs.readFileSync('/home/claude/swag/alldata.json'));
 for(const [f,b,id] of [['22656a47-Corrige__Cardio_MM1_Nov_25.pdf','cardiologie','bcard25'],['3c6bee2e-MM1-Cardiologie-Nov-2024.pdf','cardiologie',null],['7816cc57-MM2-Psy-Juin-2025.pdf',null,'bpsy25']]){
  const b64=fs.readFileSync('/tmp/claude-0/orig/'+f).toString('base64');
  const d=await page.evaluate(async b64=>{const by=Uint8Array.from(atob(b64),c=>c.charCodeAt(0));const r=await checkBytes(by,{vierge:true,autodrop:true});return r.A},b64);
  const cid=id||(await page.evaluate(()=>[...S.annales.values()].find(a=>a.file==='cardio-mm1-nov2024.pdf').id));
  let ref=null;for(const k in all)if(all[k][cid])ref=all[k][cid];
  const strip=x=>JSON.stringify(x.cases.map(c=>c.qs.map(q=>({t:q.type,o:q.opts.map(o=>[o.p,Math.round(o.l),Math.round(o.t),Math.round(o.r),Math.round(o.b),o.ok]),h:(q.hide||[]).map(h=>[h.p,Math.round(h.l),Math.round(h.t),Math.round(h.r),Math.round(h.b)])}))));
  console.log(f,cid,'identique:',strip(d)===strip(ref),d.nq,ref.nq);
 }
 await browser.close()})();
