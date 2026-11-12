// Devine UE, épreuve et date d'une annale à partir de son nom de fichier (et, si on l'a, de son dossier).
// Même code dans le navigateur (src/meta.js, chargé par la page) et sous Node (tools/meta.js le réexporte).
const META=(()=>{
const nrm=s=>String(s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[_\-.]/g," ").replace(/\s+/g," ");
const UE=[["chir maxillo","Chirurgie maxillo-faciale"],["maxillo","Chirurgie maxillo-faciale"],["cmf","Chirurgie maxillo-faciale"],["stomato","Chirurgie maxillo-faciale"],
["cardio","Cardiologie"],["pneumo","Pneumologie"],["nephro","Néphrologie"],["urolog","Urologie"],["uro ","Urologie"],["hge","Hépato-gastro-entérologie"],["gastro","Hépato-gastro-entérologie"],["hepato","Hépato-gastro-entérologie"],
["neurochir","Neurochirurgie"],["neuro","Neurologie"],["pedia","Pédiatrie"],["pediatr","Pédiatrie"],["pedopsy","Psychiatrie"],["gyn","Gynécologie-obstétrique"],["obst","Gynécologie-obstétrique"],
["mal inf","Maladies infectieuses"],["maladies inf","Maladies infectieuses"],["infectieu","Maladies infectieuses"],["malinf","Maladies infectieuses"],["pinf","Maladies infectieuses"],["infectio","Maladies infectieuses"],["hemato","Hématologie"],["cancero","Oncologie"],["onco","Oncologie"],
["endoc","Endocrinologie"],["diabeto","Endocrinologie"],["rhumato","Rhumatologie"],["orthop","Orthopédie-traumatologie"],["ortho","Orthopédie-traumatologie"],["otrho","Orthopédie-traumatologie"],["orhto","Orthopédie-traumatologie"],["trauma","Orthopédie-traumatologie"],
["psy","Psychiatrie"],["addicto","Addictologie"],["dermato","Dermatologie"],["orl","ORL"],["ophtalmo","Ophtalmologie"],["ophta","Ophtalmologie"],["urt","Urgences-réanimation-toxicologie"],["urgence","Urgences-réanimation-toxicologie"],["rea ","Urgences-réanimation-toxicologie"],["reanimation","Urgences-réanimation-toxicologie"],
["geria","Gériatrie"],["med leg","Médecine légale"],["medle","Médecine légale"],["medecine legale","Médecine légale"],["sante pub","Santé publique"],["medecine interne","Médecine interne-immunologie"],["med interne","Médecine interne-immunologie"],["immuno","Médecine interne-immunologie"],
["vasc","Médecine vasculaire"],["mpr","Médecine physique et réadaptation"],["douleur","Douleur-soins palliatifs"],["soins pal","Douleur-soins palliatifs"],["palliat","Douleur-soins palliatifs"],["lca","LCA"],["lecture critique","LCA"],["medecine physique","Médecine physique et réadaptation"],["nutri","Endocrinologie"],["genet","Génétique"],
["pharmaco","Pharmacologie"],["medicament","Pharmacologie"],["mm1 medic","Pharmacologie"],["mm2 medic","Pharmacologie"],["mm3 medic","Pharmacologie"],["therapeutique","Pharmacologie"],["rhumatho","Rhumatologie"],["handicap","Médecine physique et réadaptation"],["reeduc","Médecine physique et réadaptation"],["respi","Pneumologie"],
["ebir","EBIR"],["edn blanc","EDN blanc (plusieurs UE)"],["edn","EDN blanc (plusieurs UE)"],["ecni","ECNi (plusieurs UE)"],["ecn","ECNi (plusieurs UE)"]];
// l'UE citée le plus tôt l'emporte (titre de l'épreuve en tête de page, avant le texte des questions) ; à égalité, l'ordre de la liste
function guessUE(s){const n=" "+nrm(s)+" ";let best="",bi=Infinity;for(const [k,v] of UE){const m=n.match(new RegExp("(?:^|[^a-z])"+k.trim()));if(m&&m.index<bi){bi=m.index;best=v}}return best}
const MON=[["janv",1],["fevr",2],["fev",2],["mars",3],["avr",4],["mai",5],["juin",6],["juil",7],["aout",8],["sept",9],["oct",10],["nov",11],["dec",12]];
function guessDate(name,folder){
  const n=nrm(name);let m;
  for(const [k,v] of MON){const re=new RegExp("(?:^|[^a-z])"+k+"[a-z]*\\s*'?(20)?([12]\\d)(?:\\D|$)");if(m=n.match(re))return"20"+m[2]+"-"+String(v).padStart(2,"0")}
  for(const [k,v] of MON){const re=new RegExp("(20[12]\\d)\\s*"+k);if(m=n.match(re))return m[1]+"-"+String(v).padStart(2,"0")}
  if(m=n.match(/(?:^|\D)(20[12]\d)(0[1-9]|1[0-2])([0-3]\d)(?:\D|$)/))return m[1]+"-"+m[2];
  if(m=n.match(/(?:^|\D)([0-3]\d)\s?(0[1-9]|1[0-2])\s?(20[12]\d)(?:\D|$)/))return m[3]+"-"+m[2];
  if(m=n.match(/(?:^|\D)(20[12]\d)\s(0[1-9]|1[0-2])(?:\D|$)/))return m[1]+"-"+m[2];
  const f=nrm(folder);
  for(const [k,v] of MON){const re=new RegExp("(?:^|[^a-z])"+k+"[a-z]*\\s*(20)?([12]\\d)(?:\\D|$)");if(m=f.match(re))return"20"+m[2]+"-"+String(v).padStart(2,"0")}
  if(m=f.match(/(?:^|\D)([0-3]?\d)\s(0?[1-9]|1[0-2])\s(20[12]\d)(?:\D|$)/))return m[3]+"-"+String(+m[2]).padStart(2,"0");
  const ay=f.match(/(20[12]\d)\s(20[12]\d)/);
  if(ay){const rat=/rattrap|session 2/.test(f);if(rat)return ay[2]+"-07";if(/\bt1\b/.test(f))return ay[1]+"-12";if(/\bt2\b/.test(f))return ay[2]+"-03";if(/\bt3\b/.test(f))return ay[2]+"-06";return ay[2]+"-00"}
  if(m=n.match(/(?:^|\D)(20[12]\d)(?:\D|$)/))return m[1]+"-00";
  if(m=f.match(/(?:^|\D)(20[12]\d)(?:\D|$)/))return m[1]+"-00";
  return"";
}
function guessExam(name,folder){const s=(nrm(name)+" "+nrm(folder));let e="";
  if(/ecni/.test(s))e="ECNi blanc";else if(/annales d3/.test(s))e="D3";else if(/ebir/.test(s))e="EBIR";else{const m=s.match(/\bmm\s?([123])\b/);if(m)e="MM"+m[1];else if(/\bmma\b/.test(s))e="MM1"}
  if(/rattrap|session 2|aout|juil/.test(s)&&/^MM/.test(e))e+=" rattrapage";return e}
const UE_NAMES=[...new Set(UE.map(u=>u[1]))].sort((a,b)=>a.localeCompare(b,"fr"));
return{guessUE,guessDate,guessExam,nrm,UE_NAMES};
})();
if(typeof module!=="undefined"&&module.exports)module.exports=META;
