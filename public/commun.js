/* Tenues de jeu LNR · code partagé entre l'admin et l'espace club.
   Les règles du cahier des charges (emplacements, plafonds) sont ici : c'est le seul endroit à modifier si elles changent. */
(function(){
"use strict";
const num=v=>{const n=parseFloat(String(v==null?"":v).replace(",",".")); return isFinite(n)?n:0;};
const fmt=n=>(Math.round(n*10)/10).toLocaleString("fr-FR");
const POS_DEV=["Cœur","Poitrine droite","Médaillon","Au-dessus principal","En-dessous principal"], POS_DOS=["Au-dessus du numéro","En-dessous du numéro"];
const EMPL=[
 {id:"dev1",lab:"Devant maillot principal",zone:"avant",max:580},
 {id:"dev2",lab:"Devant maillot 2e emplacement",zone:"avant",max:185,pos:POS_DEV},
 {id:"dev3",lab:"Devant maillot 3e emplacement",zone:"avant",max:185,pos:POS_DEV},
 {id:"dev4",lab:"Devant maillot 4e emplacement",zone:"avant",max:185,pos:POS_DEV},
 {id:"manche",lab:"Manche gauche",zone:"manche",max:185},
 {id:"dos1",lab:"Dos maillot 1er emplacement",zone:"dos",max:350,pos:POS_DOS},
 {id:"dos2",lab:"Dos maillot 2e emplacement",zone:"dos",max:350,pos:POS_DOS},
 {id:"dos3",lab:"Dos maillot 3e emplacement",zone:"dos",max:350,pos:POS_DOS},
 {id:"shad",lab:"Avant short droit",zone:"short",max:160},
 {id:"shag",lab:"Avant short gauche",zone:"short",max:160},
 {id:"shdp",lab:"Dos short principal",zone:"short",max:250},
 {id:"shrd",lab:"Arrière short droit",zone:"short",max:160},
 {id:"shrg",lab:"Arrière short gauche",zone:"short",max:160}];
const ZONES={avant:"Devant du maillot · 1 000 cm² au total",manche:"Manche",dos:"Dos du maillot · 850 cm² au total",short:"Short"};
const CDC={pubs:10,avant:1000,dos:850};
function controle(pubs){
  const lignes={}, anomalies=[]; let n=0; const tot={avant:0,dos:0,manche:0,short:0};
  for(const s of EMPL){const p=pubs&&pubs[s.id]; if(!p||!(p.nom||num(p.l)||num(p.h))) continue; n++;
    const a=num(p.l)*num(p.h); lignes[s.id]={a,ok:a>0&&a<=s.max}; tot[s.zone]+=a;
    if(!a) anomalies.push(`${s.lab} : dimensions manquantes`); else if(a>s.max) anomalies.push(`${s.lab} : ${fmt(a)} cm² pour ${s.max} cm² autorisés`);
    if(s.pos&&!p.pos) anomalies.push(`${s.lab} : position à préciser`);
    if(!p.nom) anomalies.push(`${s.lab} : nom du partenaire manquant`);
  }
  if(n>CDC.pubs) anomalies.push(`${n} publicités pour ${CDC.pubs} autorisées`);
  if(tot.avant>CDC.avant) anomalies.push(`Devant du maillot : ${fmt(tot.avant)} cm² au total pour ${CDC.avant} autorisés`);
  if(tot.dos>CDC.dos) anomalies.push(`Dos du maillot : ${fmt(tot.dos)} cm² au total pour ${CDC.dos} autorisés`);
  return {lignes,anomalies,n,tot};
}
const DEFAUT={m1:"#ffffff",m2:"#ffffff",motif:"uni",s1:"#ffffff",c1:"#ffffff",c2:"#ffffff"};
const MOTIF_LIB=[["uni","Uni"],["cercle","Cerclé (bandes horizontales)"],["vertical","Rayé vertical"],["hautbas","Bicolore haut / bas"],["miparti","Mi-parti gauche / droite"],["quartiers","Quartiers"],["manches","Manches contrastées"]];
const GAB={};
const image=src=>new Promise((ok,ko)=>{const i=new Image(); i.onload=()=>ok(i); i.onerror=ko; i.src=src;});
let gabP=null;
function chargerGabarits(){
  if(!gabP) gabP=(async()=>{ for(const p of ["maillot","short","chaussettes"]) GAB[p]={ombre:await image(`gabarits/${p}_ombre.png`),detail:await image(`gabarits/${p}_detail.png`)}; GAB.pret=true; })();
  return gabP;
}
const MOTIFS={
  uni:(c,w,h,a)=>{c.fillStyle=a;c.fillRect(0,0,w,h);},
  cercle:(c,w,h,a,b)=>{const n=9,t=h/n;for(let i=0;i<n;i++){c.fillStyle=i%2?b:a;c.fillRect(0,i*t,w,t+1);}},
  vertical:(c,w,h,a,b)=>{const n=13,t=w/n;for(let i=0;i<n;i++){c.fillStyle=i%2?b:a;c.fillRect(i*t,0,t+1,h);}},
  hautbas:(c,w,h,a,b)=>{c.fillStyle=b;c.fillRect(0,0,w,h);c.fillStyle=a;c.fillRect(0,0,w,h*.42);},
  miparti:(c,w,h,a,b)=>{c.fillStyle=a;c.fillRect(0,0,w/2,h);c.fillStyle=b;c.fillRect(w/2,0,w/2,h);},
  quartiers:(c,w,h,a,b)=>{c.fillStyle=a;c.fillRect(0,0,w,h);c.fillStyle=b;c.fillRect(w/2,0,w/2,h*.52);c.fillRect(0,h*.52,w/2,h*.48);},
  manches:(c,w,h,a,b)=>{c.fillStyle=a;c.fillRect(0,0,w,h);c.fillStyle=b;c.beginPath();c.moveTo(0,0);c.lineTo(w*.2,0);c.lineTo(w*.26,h*.52);c.lineTo(0,h*.52);c.fill();c.beginPath();c.moveTo(w,0);c.lineTo(w*.8,0);c.lineTo(w*.74,h*.52);c.lineTo(w,h*.52);c.fill();}
};
function peindre(cv,part,co){
  const g=GAB[part], w=g.ombre.naturalWidth,h=g.ombre.naturalHeight; cv.width=w; cv.height=h; const c=cv.getContext("2d");
  c.clearRect(0,0,w,h);
  if(part==="maillot") (MOTIFS[co.motif]||MOTIFS.uni)(c,w,h,co.m1,co.m2||co.m1);
  else if(part==="short") MOTIFS.uni(c,w,h,co.s1||co.m1);
  else {c.fillStyle=co.c1||co.m1;c.fillRect(0,0,w,h);c.fillStyle=co.c2||co.c1||co.m1;c.fillRect(0,0,w,h*.2);}
  c.globalCompositeOperation="multiply"; c.drawImage(g.ombre,0,0);
  c.globalCompositeOperation="destination-in"; c.drawImage(g.ombre,0,0);
  c.globalCompositeOperation="source-over"; c.drawImage(g.detail,0,0);
}
function detecter(cv){
  const t=document.createElement("canvas"), sc=150/Math.max(cv.width,cv.height); t.width=Math.max(1,Math.round(cv.width*sc)); t.height=Math.max(1,Math.round(cv.height*sc));
  const c=t.getContext("2d"); c.drawImage(cv,0,0,t.width,t.height); const d=c.getImageData(0,0,t.width,t.height).data, bins={};
  for(let i=0;i<d.length;i+=4){ const r=d[i],g=d[i+1],b=d[i+2], mx=Math.max(r,g,b), mn=Math.min(r,g,b); if(mn>232) continue; if(mx-mn<14&&mx>150) continue;
    const k=(r>>4)<<8|(g>>4)<<4|(b>>4), o=bins[k]||(bins[k]=[0,0,0,0]); o[0]+=r;o[1]+=g;o[2]+=b;o[3]++; }
  const out=[];
  for(const x of Object.values(bins).map(o=>({r:o[0]/o[3],g:o[1]/o[3],b:o[2]/o[3],n:o[3]})).sort((a,b)=>b.n-a.n)){ const m=out.find(y=>Math.hypot(y.r-x.r,y.g-x.g,y.b-x.b)<42); if(m) m.n+=x.n; else if(out.length<12) out.push(x); }
  const tot=out.reduce((s,x)=>s+x.n,0)||1;
  return out.sort((a,b)=>b.n-a.n).filter(x=>x.n/tot>.02).slice(0,8).map(x=>"#"+[x.r,x.g,x.b].map(v=>Math.round(v).toString(16).padStart(2,"0")).join("")).concat(["#ffffff"]);
}
function alleger(cv){ const sc=Math.min(1,1800/Math.max(cv.width,cv.height)), t=document.createElement("canvas"); t.width=Math.round(cv.width*sc); t.height=Math.round(cv.height*sc); const c=t.getContext("2d"); c.fillStyle="#fff"; c.fillRect(0,0,t.width,t.height); c.drawImage(cv,0,0,t.width,t.height);
  return new Promise((ok,ko)=>t.toBlob(b=>b?ok(b):ko(new Error("image")),"image/jpeg",.82)); }
let pdfP=null;
function chargerPdf(){ if(!pdfP) pdfP=new Promise((ok,ko)=>{const s=document.createElement("script"); s.src="lib/pdf.min.js"; s.onload=()=>{try{window.pdfjsLib.GlobalWorkerOptions.workerSrc="lib/pdf.worker.min.js"; ok(window.pdfjsLib);}catch(e){ko(e);}}; s.onerror=ko; document.head.appendChild(s);}); return pdfP; }
async function rasteriser(blob,type){
  const cv=document.createElement("canvas"); let texte="", pages=1;
  if(type==="application/pdf"){
    const lib=await chargerPdf(), doc=await lib.getDocument({data:await blob.arrayBuffer()}).promise, page=await doc.getPage(1); pages=doc.numPages;
    const v0=page.getViewport({scale:1}), sc=Math.min(3,2400/Math.max(v0.width,v0.height)), vp=page.getViewport({scale:sc});
    cv.width=Math.round(vp.width); cv.height=Math.round(vp.height); const c=cv.getContext("2d"); c.fillStyle="#fff"; c.fillRect(0,0,cv.width,cv.height);
    await page.render({canvasContext:c,viewport:vp}).promise;
    try{ texte=(await page.getTextContent()).items.map(i=>i.str).join(" ").replace(/\s+/g," ").slice(0,3000); }catch(e){}
  }else{
    const url=URL.createObjectURL(blob); try{ const im=await image(url), sc=Math.min(1,2400/Math.max(im.naturalWidth,im.naturalHeight)); cv.width=Math.round(im.naturalWidth*sc); cv.height=Math.round(im.naturalHeight*sc); const c=cv.getContext("2d"); c.fillStyle="#fff"; c.fillRect(0,0,cv.width,cv.height); c.drawImage(im,0,0,cv.width,cv.height);} finally{URL.revokeObjectURL(url);}
  }
  return {canvas:cv,texte,pages};
}
function nettoyerPubs(p){ const o={}; for(const s of EMPL){const x=p[s.id]; if(!x||!(x.nom||num(x.l)||num(x.h))) continue; o[s.id]={nom:(x.nom||"").slice(0,80),secteur:(x.secteur||"").slice(0,60),pos:x.pos||"",l:num(x.l)||"",h:num(x.h)||""};} return o; }
window.LNR={num,fmt,POS_DEV,POS_DOS,EMPL,ZONES,CDC,controle,DEFAUT,MOTIF_LIB,MOTIFS,GAB,image,chargerGabarits,peindre,detecter,alleger,rasteriser,nettoyerPubs};
})();
