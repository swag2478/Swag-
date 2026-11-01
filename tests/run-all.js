// npm test : build, contrôles statiques, puis tous les tests Playwright. Prépare les PDF fictifs si besoin.
const {execSync,spawnSync}=require('child_process');const fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..'),FIX=path.join(__dirname,'fixtures');let bad=0;
const ok=(c,m)=>{console.log((c?'  ok   ':'  ÉCHEC ')+m);if(!c)bad++};
if(!fs.existsSync(FIX)||!fs.readdirSync(FIX).some(f=>f.startsWith('fx-')))execSync('python3 -I tests/make-fixtures.py',{cwd:ROOT,stdio:'inherit'});
execSync('python3 build.py',{cwd:ROOT,stdio:'inherit'});
console.log('\n# Contrôles statiques');
const same=f=>{try{execSync(`git diff --quiet ade14bc -- src/${f}`,{cwd:ROOT});return true}catch(e){return false}};
ok(same('check-core.js'),'contrôle (check-core.js) identique octet pour octet à la version artefact');
const p3=fs.readFileSync(path.join(ROOT,'src/parse3.js'),'utf8');ok(/PARSER_VERSION=4;/.test(p3)&&/function coverImages/.test(p3),'lecteur v4 : masquage des images de la correction présent');
const html=fs.readFileSync(path.join(ROOT,'dist/index.html'),'utf8');
ok(!/window\.claude|claude\.use|S\.sample|_blob|CATALOG|ensureData/.test(html),'plus aucune dépendance à la version artefact (window.claude, catalogue, _blob)');
ok(!/Claude|explication|Expliquer/i.test(html.replace(/<style[\s\S]*?<\/style>/,'')),'aucune explication par IA dans l\'interface');
const tracked=execSync('git ls-files',{cwd:ROOT,encoding:'utf8'}).split('\n').filter(Boolean);
ok(!tracked.some(f=>/\.pdf$/i.test(f)||/^(annales|data|drive)\//.test(f)),'aucun PDF ni donnée d\'annale suivi par git');
const cfg=fs.readFileSync(path.join(ROOT,'src/config.js'),'utf8').replace(/(^|\s)\/\/.*$/gm,'');
ok(!/@[a-z0-9-]+\.[a-z]/i.test(cfg)&&!/service_role/.test(cfg),'config.js sans adresse e-mail ni clé service_role');
for(const t of ['tauth','tcmp','tvierge','tflux','tlayout','tpwa']){console.log('\n# '+t);const r=spawnSync('node',[path.join(__dirname,t+'.js')],{cwd:ROOT,stdio:'inherit',timeout:900000});if(r.status!==0){bad++;console.log('  ÉCHEC '+t+' (code '+r.status+')')}}
console.log(bad?`\n${bad} échec(s)`:'\nTout est vert.');process.exit(bad?1:0);
