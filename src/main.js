import './styles.css';
import { loadData, loadCompos } from './data.js';
import { createCompos } from './compos.js';

function boot(DATA,COMPOS){
const TEAM_NAMES={"Aurillac":"Stade Aurillacois","Beziers":"AS Béziers Hérault","Bourg en Bresse":"US Bressane","Carcassonne":"US Carcassonnaise","Colomiers":"Colomiers Rugby","Dax":"US Dax","Massy":"RC Massy Essonne","Mont de Marsan":"Stade Montois","Narbonne":"RC Narbonnais","Nice":"Stade Niçois","Provence Rugby":"Provence Rugby","Rouen":"Rouen Normandie Rugby","Soyaux Angouleme":"Soyaux Angoulême XV","USO Nevers":"USON Nevers","Valence Romans":"Valence Romans Drôme Rugby","ASM Clermont Auvergne":"ASM Clermont","Agen":"SU Agen","Bayonne":"Aviron Bayonnais","Biarritz Olympique":"Biarritz Olympique","CA Brive":"CA Brive","Castres Olympique":"Castres Olympique","Grenoble":"FC Grenoble","Lyon":"LOU Rugby","Montpellier Herault Rugby":"Montpellier Hérault Rugby","Oyonnax":"Oyonnax Rugby","RC Toulon":"RC Toulon","Racing 92":"Racing 92","Section Paloise":"Section Paloise","Stade Francais Paris":"Stade Français Paris","Stade Rochelais":"Stade Rochelais","Stade Toulousain":"Stade Toulousain","US Montauban":"US Montauban","USAP":"USA Perpignan","Union Bordeaux-Begles":"Union Bordeaux-Bègles","Vannes":"RC Vannes"};
const tn=t=>TEAM_NAMES[t]||t;
// Position lines (id -> line)
const LINES=[
 {k:'pil',n:'Piliers',ids:[1,3],fw:1},{k:'tal',n:'Talonneurs',ids:[2],fw:1},{k:'l2',n:'2e ligne',ids:[4,5],fw:1},{k:'l3',n:'3e ligne',ids:[6,7,8],fw:1},
 {k:'dm',n:'Demis de mêlée',ids:[9],fw:0},{k:'do',n:"Demis d'ouverture",ids:[10],fw:0},{k:'ce',n:'Centres',ids:[12,13],fw:0},{k:'aa',n:'Ailiers & arrières',ids:[11,14,15],fw:0}];
const ID2L={};LINES.forEach((l,i)=>l.ids.forEach(id=>ID2L[id]=i));
const AGEB=[{n:'21 ans et –',max:22},{n:'22–24',max:25},{n:'25–27',max:28},{n:'28–30',max:31},{n:'31–33',max:34},{n:'34 ans et +',max:99}];
const ageBand=a=>AGEB.findIndex(b=>a<b.max);
const PROF=[{n:'Titulaire régulier',d:'titularisé sur au moins la moitié des journées'},{n:'Rotation',d:'5 matchs ou plus, majoritairement titulaire, moins d’une demi-saison de titularisations'},{n:'Finisseur',d:'5 matchs ou plus, plus d’entrées en jeu que de titularisations'},{n:'Ponctuel',d:'moins de 5 matchs joués'}];

const ZONES=[{n:'France',c:'--s1'},{n:'Europe hors France',c:'--s2'},{n:'Afrique du Sud, Nouvelle-Zélande, Australie',c:'--s3'},{n:'Îles du Pacifique',c:'--s4'},{n:'Autres pays',c:'--s5'}];
const Z_SUD=new Set(['Afrique du Sud','Nouvelle Zélande','Australie']);
const Z_PAC=new Set(['Fidji','Tonga','Samoa','Papouasie-Nouvelle-Guinée']);
const Z_EUR=new Set(['Angleterre','Grande-Bretagne','Irlande','Ecosse','Pays de Galles','Italie','Géorgie','Espagne','Roumanie','Portugal','Pays-Bas','Allemagne','Belgique','Russie','Moldavie','République Tchèque','Pologne','Hongrie','Suisse','Suède','Chypre','Norvège','Lituanie','Autriche']);
const zoneOf=n=>n==='France'?0:Z_EUR.has(n)?1:Z_SUD.has(n)?2:Z_PAC.has(n)?3:4;
// Postes détaillés pour la lecture « vivier équipe de France »
const POS=[{n:'Pilier gauche',ids:[1],slots:1},{n:'Talonneur',ids:[2],slots:1},{n:'Pilier droit',ids:[3],slots:1},{n:'2e ligne',ids:[4,5],slots:2},{n:'3e ligne aile',ids:[6,7],slots:2},{n:'N°8',ids:[8],slots:1},{n:'Demi de mêlée',ids:[9],slots:1},{n:"Demi d'ouverture",ids:[10],slots:1},{n:'Centre',ids:[12,13],slots:2},{n:'Ailier',ids:[11,14],slots:2},{n:'Arrière',ids:[15],slots:1}];
const ID2P={};POS.forEach((p,i)=>p.ids.forEach(id=>ID2P[id]=i));
function posWeights(mask){const m=new Map();let n=0;for(let id=1;id<=15;id++)if(mask&(1<<id)){m.set(ID2P[id],(m.get(ID2P[id])||0)+1);n++}return [...m.entries()].map(([i,c])=>[i,c/n])}
const VIVM=[['frShare','Minutes jouées par des Français','pct0','Part des minutes du poste jouées par des joueurs français.'],['frAge','Âge moyen des Français','d1','Âge moyen des joueurs français au poste, pondéré par les minutes.'],['fr30','Français de 30 ans et plus','pct0','Part des minutes des Français jouée par des joueurs de 30 ans et plus.'],['frU23','Relève : Français de moins de 23 ans','pct0','Minutes des Français de moins de 23 ans, en part des minutes du poste.'],['frReg','Français titulaires réguliers','d1','Nombre de joueurs français titularisés sur au moins la moitié des journées.']];
const state={champ:'top14',club:-1,tab:'synthese',posMetric:'players',vivMetric:'frShare',vivPos:2,eqSeason:-1,eqSel:2,eqColor:'fr',playerSeason:-1,playerLine:-1,playerQ:'',playerSort:{k:'min',dir:-1},clubSeason:-1,clubSort:{k:'ageW',dir:-1}};
state.space='effectifs';state.ctab='csynth';
try{const t=localStorage.getItem('obs-tab');if(t)state.tab=t;const sp=localStorage.getItem('obs-space');if(sp==='compos'&&COMPOS)state.space=sp;const ct=localStorage.getItem('obs-ctab');if(ct)state.ctab=ct}catch(e){}

const fmt={
 int:v=>v==null||isNaN(v)?'–':Math.round(v).toLocaleString('fr-FR'),
 d1:v=>v==null||isNaN(v)?'–':v.toLocaleString('fr-FR',{minimumFractionDigits:1,maximumFractionDigits:1}),
 pct:v=>v==null||isNaN(v)?'–':(v*100).toLocaleString('fr-FR',{minimumFractionDigits:1,maximumFractionDigits:1})+' %',
 pct0:v=>v==null||isNaN(v)?'–':Math.round(v*100)+' %',
 age:v=>v==null||isNaN(v)?'–':v.toLocaleString('fr-FR',{minimumFractionDigits:1,maximumFractionDigits:1})+' ans'
};
const shortS=s=>s.slice(2,4)+'/'+s.slice(7,9);
const isCovid=s=>s==='2019/2020';
const COVID_J={top14:17,prod2:23}; // journées disputées avant l'arrêt de 2019/20
const css=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();

// ---------- data engine ----------
function lineWeights(mask){const set=new Set();for(let id=1;id<=15;id++)if(mask&(1<<id))set.add(ID2L[id]);const a=[...set];return a.map(i=>[i,1/a.length])}
let DS,ROWS,SEASONS,L;
function prepare(){
  DS=DATA[state.champ];SEASONS=DS.seasons;
  ROWS=DS.rows.map(r=>({name:r[0],s:r[1],teams:r[2],min:r[3],mp:r[4],st:Math.max(r[5],r[4]-r[6]),sb:r[6],age:r[7],mask:r[8],lw:lineWeights(r[8]),pw:posWeights(r[8]),ids:Array.from({length:15},(_,i)=>i+1).filter(id=>r[8]&(1<<id)),nat:r[9]||null}));
  // season length = 99th percentile of matches played
  L=SEASONS.map((_,s)=>{const a=ROWS.filter(r=>r.s===s).map(r=>r.mp).sort((x,y)=>x-y);return Math.max(1,Math.round(a[Math.floor(a.length*.99)]||a[a.length-1]))});
  ROWS.forEach(r=>{const Ls=L[r.s];r.prof=r.mp<5?3:(r.st>=Ls*.5?0:(r.sb>r.st?2:1));r.fw=r.lw.reduce((s,[i,w])=>s+(LINES[i].fw?w:0),0)});
}
function rowsFor(s,club=state.club){return ROWS.filter(r=>r.s===s&&(club<0||r.teams.includes(club)))}
function clubsIn(s){const c=new Set();ROWS.forEach(r=>{if(r.s===s)r.teams.forEach(t=>c.add(t))});return [...c]}
function agg(rows,club,s){
  const nClubs=club>=0?1:clubsIn(s).length;
  let min=0,mp=0,st=0,sb=0,minA=0,ageMin=0,ageSum=0,nA=0,slots=0;const band=AGEB.map(()=>0),bandN=AGEB.map(()=>0),prof=PROF.map(()=>0),profMin=PROF.map(()=>0);
  for(const r of rows){min+=r.min;mp+=r.mp;st+=r.st;sb+=r.sb;slots+=club>=0?1:r.teams.length;prof[r.prof]++;profMin[r.prof]+=r.min;
    if(r.age!=null){minA+=r.min;ageMin+=r.min*r.age;ageSum+=r.age;nA++;const b=ageBand(r.age);band[b]+=r.min;bandN[b]++}}
  // core: players to reach 80% of club minutes, averaged across clubs
  const cl=club>=0?[club]:clubsIn(s);let core=0;
  cl.forEach(c=>{const m=ROWS.filter(r=>r.s===s&&r.teams.includes(c)).map(r=>r.min).sort((a,b)=>b-a);const tot=m.reduce((a,b)=>a+b,0);let acc=0,k=0;while(acc<tot*.8&&k<m.length){acc+=m[k++]}core+=k});
  return {n:rows.length,perClub:slots/nClubs,nClubs,min,mp,st,sb,ageW:minA?ageMin/minA:null,ageM:nA?ageSum/nA:null,
    band:band.map(v=>minA?v/minA:0),bandN,prof,profMin:profMin.map(v=>min?v/min:0),
    subShare:mp?sb/mp:null,minPer:rows.length?min/rows.length:null,core:core/cl.length,
    young:minA?rows.filter(r=>r.age!=null&&r.age<23).reduce((a,r)=>a+r.min,0)/minA:null,
    old:minA?rows.filter(r=>r.age!=null&&r.age>=30).reduce((a,r)=>a+r.min,0)/minA:null};
}
function series(){return SEASONS.map((_,s)=>agg(rowsFor(s),state.club,s))}
function lineAgg(s,key='lw',defs=LINES){
  const rows=rowsFor(s);const nClubs=state.club>=0?1:clubsIn(s).length;
  const out=defs.map(()=>({p:0,slots:0,min:0,mp:0,sb:0,ageMin:0,minA:0}));let tot=0;
  rows.forEach(r=>{tot+=r.min;const sl=state.club>=0?1:r.teams.length;r[key].forEach(([i,w])=>{const o=out[i];o.p+=w;o.slots+=w*sl;o.min+=r.min*w;o.mp+=r.mp*w;o.sb+=r.sb*w;if(r.age!=null){o.ageMin+=r.min*w*r.age;o.minA+=r.min*w}})});
  return out.map(o=>({players:o.slots/nClubs,share:tot?o.min/tot:0,ageW:o.minA?o.ageMin/o.minA:null,sub:o.mp?o.sb/o.mp:null,minPer:o.p?o.min/o.p:null}));
}

// ---------- charts ----------
let tipEl;
function tip(container){const t=document.createElement('div');t.className='tip';container.appendChild(t);return t}
function placeTip(t,container,x,y){const w=container.clientWidth;t.style.opacity=1;const tw=t.offsetWidth;let lx=x+14;if(lx+tw>w)lx=x-tw-14;if(lx<0)lx=0;t.style.left=lx+'px';t.style.top=Math.max(0,y-10)+'px'}
function niceTicks(lo,hi,n=4){const span=hi-lo||1;const step0=span/n;const mag=Math.pow(10,Math.floor(Math.log10(step0)));const step=[1,2,2.5,5,10].map(m=>m*mag).find(s=>span/s<=n)||mag*10;const a=Math.floor(lo/step)*step,b=Math.ceil(hi/step)*step;const t=[];for(let v=a;v<=b+1e-9;v+=step)t.push(+v.toFixed(10));return t}
const NS='http://www.w3.org/2000/svg';
function el(tag,attrs,parent){const e=document.createElementNS(NS,tag);for(const k in attrs)e.setAttribute(k,attrs[k]);if(parent)parent.appendChild(e);return e}

function lineChart(box,{labels,series,yfmt,tickfmt,zero=false,h=230,covidIdx=-1}){
  box.innerHTML='';const W=Math.max(220,box.clientWidth||600),H=h,m={l:46,r:14,t:12,b:26};
  const vals=series.flatMap(s=>s.values).filter(v=>v!=null);let lo=Math.min(...vals),hi=Math.max(...vals);if(zero)lo=Math.min(0,lo);const pad=(hi-lo)*.12||1;if(!zero)lo-=pad;hi+=pad;
  const ticks=niceTicks(lo,hi,4);lo=ticks[0];hi=ticks[ticks.length-1];
  const x=i=>m.l+(W-m.l-m.r)*(labels.length===1?.5:i/(labels.length-1)),y=v=>m.t+(H-m.t-m.b)*(1-(v-lo)/(hi-lo));
  const svg=el('svg',{viewBox:`0 0 ${W} ${H}`,role:'img'},box);
  if(covidIdx>=0){const bw=(W-m.l-m.r)/(labels.length-1);const r=el('rect',{x:x(covidIdx)-bw/2,y:m.t,width:bw,height:H-m.t-m.b,fill:'var(--line-2)'},svg);if(W>=300)el('text',{x:x(covidIdx),y:m.t+10,'text-anchor':'middle','font-size':10},svg).textContent='Covid'}
  ticks.forEach(t=>{el('line',{x1:m.l,x2:W-m.r,y1:y(t),y2:y(t),class:'gl'},svg);el('text',{x:m.l-8,y:y(t)+4,'text-anchor':'end'},svg).textContent=(tickfmt||yfmt)(t)});
  const every=labels.length<=6&&W>=300?1:W<300?Math.ceil(labels.length/3):W<480?3:(W<700?2:1);
  const few=new Set([0,Math.floor((labels.length-1)/2),labels.length-1]);
  labels.forEach((l,i)=>{if(W<300?few.has(i):(i%every===0||i===labels.length-1))el('text',{x:x(i),y:H-6,'text-anchor':'middle'},svg).textContent=l});
  series.forEach(s=>{let d='';s.values.forEach((v,i)=>{if(v==null)return;d+=(d?'L':'M')+x(i).toFixed(1)+','+y(v).toFixed(1)});
    el('path',{d,fill:'none',stroke:s.color,'stroke-width':2.2,'stroke-linejoin':'round','stroke-linecap':'round'},svg);
    const li=s.values.length-1;if(s.values[li]!=null)el('circle',{cx:x(li),cy:y(s.values[li]),r:4,fill:s.color,stroke:'var(--surface)','stroke-width':2},svg)});
  const cross=el('line',{y1:m.t,y2:H-m.b,stroke:'var(--ink-3)','stroke-width':1,'stroke-dasharray':'3 3',opacity:0},svg);
  const dots=series.map(s=>el('circle',{r:4.5,fill:s.color,stroke:'var(--surface)','stroke-width':2,opacity:0},svg));
  const t=tip(box);const hit=el('rect',{x:m.l,y:0,width:W-m.l-m.r,height:H,fill:'transparent'},svg);
  const move=ev=>{const rc=svg.getBoundingClientRect();const px=(ev.clientX-rc.left)*W/rc.width;const i=Math.max(0,Math.min(labels.length-1,Math.round((px-m.l)/((W-m.l-m.r)/(labels.length-1)))));
    cross.setAttribute('x1',x(i));cross.setAttribute('x2',x(i));cross.setAttribute('opacity',1);
    series.forEach((s,k)=>{const v=s.values[i];if(v==null){dots[k].setAttribute('opacity',0);return}dots[k].setAttribute('cx',x(i));dots[k].setAttribute('cy',y(v));dots[k].setAttribute('opacity',1)});
    t.innerHTML=`<b>${labels[i]}${i===covidIdx?' · saison interrompue':''}</b>`+series.map(s=>`<div class="row"><span><i style="background:${s.color}"></i>${s.name}</span><span>${yfmt(s.values[i])}</span></div>`).join('');
    placeTip(t,box,x(i)*rc.width/W,(ev.clientY-rc.top))};
  hit.addEventListener('pointermove',move);hit.addEventListener('pointerleave',()=>{t.style.opacity=0;cross.setAttribute('opacity',0);dots.forEach(d=>d.setAttribute('opacity',0))});
  if(series.length>1){const lg=document.createElement('div');lg.className='legend';lg.innerHTML=series.map(s=>`<span><i style="background:${s.color}"></i>${s.name}</span>`).join('');box.appendChild(lg)}
}
function stackChart(box,{labels,series,h=260,covidIdx=-1,tipExtra,legend=true}){
  box.innerHTML='';const W=Math.max(300,box.clientWidth||600),H=h,m={l:40,r:8,t:8,b:26};
  const svg=el('svg',{viewBox:`0 0 ${W} ${H}`,role:'img'},box);const n=labels.length;const bw=(W-m.l-m.r)/n;const gap=Math.min(8,bw*.25);
  const y=v=>m.t+(H-m.t-m.b)*(1-v);[0,.25,.5,.75,1].forEach(t=>{el('line',{x1:m.l,x2:W-m.r,y1:y(t),y2:y(t),class:'gl'},svg);el('text',{x:m.l-6,y:y(t)+4,'text-anchor':'end'},svg).textContent=Math.round(t*100)+' %'});
  const every=W<480?3:(W<700?2:1);const t=tip(box);
  labels.forEach((l,i)=>{const x0=m.l+i*bw+gap/2,w=bw-gap;let acc=0;const g=el('g',{},svg);
    series.forEach(s=>{const v=s.values[i]||0;if(v<=0)return;const y1=y(acc+v),y0=y(acc);el('rect',{x:x0,y:y1,width:w,height:Math.max(0,y0-y1-(acc+v<.999?2:0)),fill:s.color,rx:2},g);acc+=v});
    if(i===covidIdx)el('rect',{x:x0,y:m.t,width:w,height:H-m.t-m.b,fill:'url(#hatch)'},g);
    if(i%every===0||i===n-1)el('text',{x:x0+w/2,y:H-6,'text-anchor':'middle'},svg).textContent=l;
    const hit=el('rect',{x:m.l+i*bw,y:0,width:bw,height:H,fill:'transparent'},svg);
    hit.addEventListener('pointermove',ev=>{const rc=svg.getBoundingClientRect();g.style.opacity=1;t.innerHTML=`<b>${l}${i===covidIdx?' · saison interrompue':''}</b>`+series.slice().reverse().map(s=>`<div class="row"><span><i style="background:${s.color}"></i>${s.name}</span><span>${fmt.pct(s.values[i])}</span></div>`).join('')+(tipExtra?tipExtra(i):'');placeTip(t,box,ev.clientX-rc.left,ev.clientY-rc.top)});
    hit.addEventListener('pointerleave',()=>{t.style.opacity=0})});
  const defs=el('defs',{},svg);const p=el('pattern',{id:'hatch',width:6,height:6,patternUnits:'userSpaceOnUse',patternTransform:'rotate(45)'},defs);el('rect',{width:2,height:6,fill:'var(--surface)',opacity:.55},p);
  if(!legend)return;const lg=document.createElement('div');lg.className='legend';lg.innerHTML=series.map(s=>`<span><i style="background:${s.color}"></i>${s.name}</span>`).join('');box.appendChild(lg);
}
const HEATPAL={top14:{bg:['#F7EDD6','#E6C97F','#8C6418','#0B0B0B'],fg:['#1B2433','#1B2433','#FFFFFF','#D9AD53']},prod2:{bg:['#DFE8F6','#A9BFE6','#4E6FB0','#162945'],fg:['#1B2433','#1B2433','#FFFFFF','#FFFFFF']}};
const HEATALERT=['#F7B8C6','#1B2433'];
// scale : 'fr' (part de Français), 'foreign' (part d'étrangers), 'age' (âge moyen) ; sinon dégradé du plus faible au plus élevé sur la ligne
function heatLevel(scale,x){if(scale==='age')return x<27?0:x<28?1:x<29?2:3;const v=Math.round((scale==='foreign'?1-x:x)*100);return v<45?-1:v<55?0:v<65?1:v<75?2:3}
function heatLegend(scale){const P=HEATPAL[state.champ]||HEATPAL.top14;const sw=(bg,t)=>`<span><i style="background:${bg}"></i>${t}</span>`;
  if(scale==='age')return `<div class="legend heat-leg"><span>Âge moyen :</span>${['moins de 27 ans','27 à 28 ans','28 à 29 ans','29 ans et plus'].map((t,i)=>sw(P.bg[i],t)).join('')}</div>`;
  const L=scale==='foreign'?['plus de 55 % d\u2019étrangers','46 à 55 %','36 à 45 %','26 à 35 %','25 % et moins']:['moins de 45 % de Français','45 à 54 %','55 à 64 %','65 à 74 %','75 % et plus'];
  return `<div class="legend heat-leg">${sw(HEATALERT[0],L[0])}${L.slice(1).map((t,i)=>sw(P.bg[i],t)).join('')}</div>`}
function heatTable(box,{rows,cols,values,vfmt,covidIdx=-1,note,scale}){
  const P=HEATPAL[state.champ]||HEATPAL.top14;
  let h='<div class="tbl-wrap"><table class="heat"><thead><tr><th></th>'+cols.map(c=>`<th>${c}</th>`).join('')+'</tr></thead><tbody>';
  rows.forEach((r,ri)=>{const v=values[ri].filter(x=>x!=null);const lo=Math.min(...v),hi=Math.max(...v);
    h+=`<tr><td>${r}</td>`+values[ri].map((x,ci)=>{if(x==null)return '<td>–</td>';let bg,fg;
      if(scale){const l=heatLevel(scale,x);bg=l<0?HEATALERT[0]:P.bg[l];fg=l<0?HEATALERT[1]:P.fg[l]}
      else{const p=hi>lo?(x-lo)/(hi-lo):.5;const pc=Math.round(12+p*80);bg=`color-mix(in oklab,var(--heat-hi) ${pc}%,var(--heat-lo))`;fg=pc>55?'var(--on-heat)':'var(--ink)'}
      return `<td class="${ci===covidIdx?'covid-col':''}" style="background-color:${bg};color:${fg}" title="${r} · ${cols[ci]} : ${vfmt(x)}">${vfmt(x)}</td>`}).join('')+'</tr>'});
  box.innerHTML=h+'</tbody></table></div>'+(scale?heatLegend(scale):'')+(note?`<p class="note">${note}</p>`:'');
}

// ---------- shell ----------
const TABS=[['synthese','Synthèse'],['vivier','Vivier France'],['equipe','Équipe type'],['nationalite','Nationalité'],['age','Âge'],['postes','Postes'],['statut','Titulaires & remplaçants'],['clubs','Clubs'],['joueurs','Joueurs']];
const TABN=Object.fromEntries(TABS);
function renderShell(){
  const isC=state.space==='compos';
  const sp=document.getElementById('spaceSeg');
  sp.innerHTML=[['effectifs','Effectifs'],['compos','Compositions']].map(([k,n])=>`<button type="button" data-s="${k}" aria-pressed="${state.space===k}" ${k==='compos'&&!COMPOS?'disabled title="Données de compositions indisponibles"':''}>${n}</button>`).join('');
  sp.onclick=e=>{const b=e.target.closest('button');if(!b||b.disabled)return;state.space=b.dataset.s;try{localStorage.setItem('obs-space',state.space)}catch(err){}renderShell();render();window.scrollTo(0,0)};
  document.getElementById('spaceName').textContent=isC?'Compositions':'Effectifs';
  // identité du championnat : couleurs (CSS) et logo
  document.documentElement.dataset.champ=state.champ;
  const lg=document.getElementById('champLogo');if(lg){lg.src=`/logos/${state.champ}.png`;lg.alt=state.champ==='top14'?'TOP 14':'PRO D2'}
  const seg=document.getElementById('champSeg');
  seg.innerHTML=[['top14','TOP 14'],['prod2','PRO D2']].map(([k,n])=>`<button type="button" data-c="${k}" aria-pressed="${state.champ===k}" ${DATA[k]?'':'disabled title="Données PRO D2 à venir"'}>${n}${DATA[k]?'':' · à venir'}</button>`).join('');
  seg.onclick=e=>{const b=e.target.closest('button');if(!b||b.disabled)return;state.champ=b.dataset.c;state.club=-1;if(CP)CP.state.club=-1;prepare();renderShell();render()};
  const sel=document.getElementById('clubSel');
  if(isC){
    sel.innerHTML=`<option value="-1">Tous les clubs</option>`+CP.clubs().map(t=>`<option value="${t}" ${CP.state.club===t?'selected':''}>${CP.clubName(t)}</option>`).join('');
    sel.onchange=()=>{CP.state.club=+sel.value;render()};
  }else{
    const order=DS.teams.map((t,i)=>[tn(t),i]).sort((a,b)=>a[0].localeCompare(b[0],'fr'));
    sel.innerHTML=`<option value="-1">Tous les clubs</option>`+order.map(([n,i])=>{const ns=SEASONS.filter((_,s)=>clubsIn(s).includes(i)).length;return `<option value="${i}" ${state.club===i?'selected':''}>${n} (${ns} saison${ns>1?'s':''})</option>`}).join('');
    sel.onchange=()=>{state.club=+sel.value;render()};
  }
  const tabs=document.getElementById('tabs');const list=isC?CP.tabs:TABS;const cur=isC?state.ctab:state.tab;
  tabs.innerHTML=list.map(([k,n])=>`<button role="tab" type="button" data-t="${k}" aria-selected="${cur===k}">${n}</button>`).join('');
  tabs.onclick=e=>{const b=e.target.closest('button');if(!b)return;goTab(b.dataset.t,true)};
}
const main=document.getElementById('main');
const scopeName=()=>state.club>=0?tn(DS.teams[state.club]):DS.label;
const covidIdx=()=>SEASONS.findIndex(isCovid);
function delta(a,b,kind,goodUp){if(a==null||b==null)return '';const d=b-a;const flat=Math.abs(d)<(kind==='pct'?.0005:.05);const arrow=flat?'':(d>0?'▲ ':'▼ ');const txt=arrow+(kind==='pct'?(d>=0?'+':'–')+Math.abs(d*100).toLocaleString('fr-FR',{maximumFractionDigits:1})+' pt':(d>=0?'+':'–')+Math.abs(d).toLocaleString('fr-FR',{maximumFractionDigits:1}));const cls=flat?'d-flat':'d-'+(d>0?'up':'down');return `<span class="${cls}">${txt}</span>`}
function firstLast(arr,f){const idx=arr.map((a,i)=>[a,i]).filter(([a])=>a.n>0);return [idx[0],idx[idx.length-1]]}

function render(){
  if(state.space==='compos'&&CP){document.getElementById('scope').textContent=CP.scopeText();CP.render(state.ctab)}
  else{
    document.getElementById('scope').textContent=`${scopeName()} · ${shortS(SEASONS[0])} → ${shortS(SEASONS[SEASONS.length-1])} · utilisation des joueurs : minutes, titularisations, âge, postes, nationalité`;
    const fn={synthese:renderSynth,age:renderAge,postes:renderPostes,statut:renderStatut,clubs:renderClubs,nationalite:renderNat,vivier:renderVivier,equipe:renderEquipe,joueurs:renderPlayers}[state.tab]||renderSynth;
    fn();
  }
  main.querySelectorAll('[data-go]').forEach(b=>{b.onclick=()=>goTab(b.dataset.go)});
}
function card(title,sub,id,extra=''){return `<div class="card"><div class="card-head"><div><h3>${title}</h3>${sub?`<p class="sub">${sub}</p>`:''}</div>${extra}</div><div class="chart" id="${id}"></div></div>`}

// ---------- analyse : phrases calculées à partir des données ----------
const nf=(v,d=1)=>v==null||isNaN(v)?'–':v.toLocaleString('fr-FR',{minimumFractionDigits:0,maximumFractionDigits:d});
const ptsTxt=d=>{const v=Math.abs(d*100);return `${nf(v,v<10?1:0)} point${v>=2?'s':''}`};
const evoPct=(a,b)=>a==null||b==null?'':Math.abs(b-a)<.005?'stable':`${b>a?'en hausse':'en baisse'} de ${ptsTxt(b-a)}`;
const evoNum=(a,b,unit,d=1)=>a==null||b==null?'':Math.abs(b-a)<.05?'stable':`${b>a?'en hausse':'en baisse'} de ${nf(Math.abs(b-a),d)} ${unit}`;
const low=n=>n==='N°8'?n:n.charAt(0).toLowerCase()+n.slice(1);
const auPoste=n=>n==='2e ligne'||n==='3e ligne aile'?`en <b>${n}</b>`:/^[AaEeIiOoUu]/.test(n)?`au poste d'<b>${low(n)}</b>`:`au poste de <b>${low(n)}</b>`;
const ZTXT=['les joueurs français','l\u2019Europe hors France','le trio Afrique du Sud, Nouvelle-Zélande, Australie','les îles du Pacifique','les autres pays'];
function refSeasons(A){const ci=covidIdx();const ok=A.map((x,i)=>i).filter(i=>A[i].n>0&&i!==ci);const i0=ok[0],i1=ok[ok.length-1];return {i0,i1,sa:shortS(SEASONS[i0]),sb:shortS(SEASONS[i1])}}
function insights(){
  const A=series();const {i0,i1,sa,sb}=refSeasons(A);const a=A[i0],b=A[i1];const one=state.club>=0;
  const P0=lineAgg(i0,'pw',POS),P1=lineAgg(i1,'pw',POS);const out={sa,sb};
  const byAge=POS.map((p,i)=>[p.n,P1[i].ageW]).filter(x=>x[1]!=null).sort((x,y)=>y[1]-x[1]);
  const gap=b.ageW-b.ageM;
  out.age=[
   `L'âge moyen pondéré par les minutes est de <b>${fmt.age(b.ageW)}</b> en ${sb}, ${evoNum(a.ageW,b.ageW,'an')} depuis ${sa} (${fmt.age(a.ageW)}).`,
   `Les moins de 23 ans jouent <b>${fmt.pct(b.young)}</b> des minutes (${evoPct(a.young,b.young)}), les 30 ans et plus <b>${fmt.pct(b.old)}</b> (${evoPct(a.old,b.old)}).`,
   Math.abs(gap)>=.2?`L'âge pondéré dépasse l'âge moyen simple de <b>${nf(gap)} an</b> : les joueurs qui jouent le plus sont plus âgés que la moyenne de l'effectif.`:`L'âge pondéré et l'âge moyen simple sont proches : le temps de jeu ne dépend pas de l'âge.`,
   byAge.length?`Poste le plus âgé : <b>${low(byAge[0][0])}</b> (${fmt.age(byAge[0][1])}). Le plus jeune : <b>${low(byAge[byAge.length-1][0])}</b> (${fmt.age(byAge[byAge.length-1][1])}).`:''].filter(Boolean);
  const dPl=POS.map((p,i)=>[p.n,P1[i].players-P0[i].players,P1[i].players]).sort((x,y)=>y[1]-x[1]);
  const bySub=POS.map((p,i)=>[p.n,P1[i].sub,P0[i].sub]).filter(x=>x[1]!=null).sort((x,y)=>y[1]-x[1]);
  out.postes=[
   `${one?'Le club a utilisé':'Chaque club utilise en moyenne'} <b>${nf(b.perClub)} joueurs</b> en ${sb}, contre ${nf(a.perClub)} en ${sa}.`,
   dPl[0][1]>.05?`La hausse est la plus forte ${auPoste(dPl[0][0])} : ${nf(dPl[0][2])} joueurs utilisés${one?'':' par club'}, soit ${nf(dPl[0][1])} de plus qu'en ${sa}.`:'',
   bySub.length?`Les remplacements sont les plus fréquents ${auPoste(bySub[0][0])} : ${fmt.pct0(bySub[0][1])} des apparitions s'y font en sortie de banc (${fmt.pct0(bySub[0][2])} en ${sa}), contre ${fmt.pct0(bySub[bySub.length-1][1])} ${auPoste(bySub[bySub.length-1][0]).replace(/<\/?b>/g,'')}.`:'',
   `Il faut <b>${nf(b.core)} joueurs</b> pour couvrir 80 % des minutes ${one?'du club':'d’un club'}, contre ${nf(a.core)} en ${sa} : le temps de jeu ${b.core>a.core+.05?'se répartit sur un groupe plus large':b.core<a.core-.05?'se concentre sur un groupe plus resserré':'reste réparti de la même façon'}.`].filter(Boolean);
  const pr=(x,k)=>x.n?x.prof[k]/x.n:null;
  out.statut=[
   `<b>${fmt.pct0(pr(b,0))}</b> des joueurs utilisés sont des titulaires réguliers en ${sb} (${fmt.pct0(pr(a,0))} en ${sa}). Ils jouent <b>${fmt.pct0(b.profMin[0])}</b> des minutes, contre ${fmt.pct0(a.profMin[0])}.`,
   `Les joueurs en rotation et les finisseurs jouent ensemble <b>${fmt.pct0(b.profMin[1]+b.profMin[2])}</b> des minutes (${evoPct(a.profMin[1]+a.profMin[2],b.profMin[1]+b.profMin[2])}).`,
   `Les joueurs ponctuels (moins de 5 matchs) représentent <b>${fmt.pct0(pr(b,3))}</b> de l'effectif utilisé, mais seulement ${fmt.pct0(b.profMin[3])} des minutes.`,
   `<b>${fmt.pct(b.subShare)}</b> des apparitions se font comme remplaçant, ${evoPct(a.subShare,b.subShare)} depuis ${sa}.`];
  if(ROWS.some(r=>r.nat)){const n0=natAgg(i0),n1=natAgg(i1);const d=n1.fr-n1.frPlayers;
    const zs=ZONES.map((z,i)=>[ZTXT[i],n1.zones[i],n0.zones[i]]).slice(1).sort((x,y)=>y[1]-x[1]);
    const pa=posAgg(i1).map((x,i)=>[POS[i].n,x.frShare==null?null:1-x.frShare]).filter(x=>x[1]!=null).sort((x,y)=>y[1]-x[1]);
    out.nat=[
     `Les joueurs français jouent <b>${fmt.pct(n1.fr)}</b> des minutes en ${sb}, ${evoPct(n0.fr,n1.fr)} depuis ${sa} (${fmt.pct(n0.fr)}).`,
     `Ils représentent ${fmt.pct(n1.frPlayers)} des joueurs utilisés : leur part du temps de jeu est ${Math.abs(d)<.005?'égale à':d<0?`inférieure de ${ptsTxt(d)} à`:`supérieure de ${ptsTxt(d)} à`} leur poids dans l'effectif.`,
     `Première origine étrangère : <b>${zs[0][0]}</b> (${fmt.pct(zs[0][1])} des minutes, ${evoPct(zs[0][2],zs[0][1])}), devant ${zs[1][0]} (${fmt.pct(zs[1][1])}).`,
     pa.length?`Les étrangers pèsent le plus ${auPoste(pa[0][0])} (${fmt.pct0(pa[0][1])} des minutes) et le moins ${auPoste(pa[pa.length-1][0])} (${fmt.pct0(pa[pa.length-1][1])}).`:''].filter(Boolean)}
  return out;
}
const insList=items=>`<ul class="ins-list">${items.map(t=>`<li>${t}</li>`).join('')}</ul>`;
const insCard=(items,title='À retenir')=>`<div class="card ins"><h3>${title}</h3>${insList(items)}</div>`;
const themeCard=(key,items,n=3)=>`<div class="card theme"><div class="card-head"><h3>${TABN[key]}</h3><button type="button" class="chip" data-go="${key}">Voir l'onglet</button></div>${insList(items.slice(0,n))}</div>`;
function goTab(k,keepScroll){const isC=state.space==='compos';if(isC){state.ctab=k}else{state.tab=k}try{localStorage.setItem(isC?'obs-ctab':'obs-tab',k)}catch(e){}document.querySelectorAll('#tabs button').forEach(x=>x.setAttribute('aria-selected',x.dataset.t===k));render();if(!keepScroll)window.scrollTo(0,0)}
function smallMultiples(box,{labels,items,yfmt,tickfmt,covidIdx}){
  box.innerHTML=`<div class="sm-grid">${items.map((it,i)=>{const v=it.values.filter(x=>x!=null);return `<div class="sm"><div class="sm-head"><b>${it.name}</b><span>${v.length?yfmt(v[0])+' → '+yfmt(v[v.length-1]):''}</span></div><div class="chart" id="sm${i}"></div></div>`}).join('')}</div>`;
  items.forEach((it,i)=>lineChart(document.getElementById('sm'+i),{labels,covidIdx,h:140,yfmt,tickfmt,series:[{name:it.name,color:css('--s1'),values:it.values}]}));
}
function renderSynth(){
  const A=series();const labels=SEASONS.map(shortS);const [f,l]=firstLast(A);const a=f[0],b=l[0];const sa=shortS(SEASONS[f[1]]),sb=shortS(SEASONS[l[1]]);
  const k=(lab,val,cmp)=>`<div class="kpi"><span class="lab">${lab}</span><span class="val">${val}</span><span class="cmp">${cmp}</span></div>`;
  const INS=insights();
  let vivBlock='';const hasNat=ROWS.some(r=>r.nat);
  if(hasNat){const V=vivierSynth();const N0=natAgg(f[1]),N1=natAgg(l[1]);
    const ord=[...V.synth].sort((x,y)=>y.level-x.level||x.sh-y.sh);const alert=ord.filter(x=>x.level>0);
    const weakest=ord.filter(x=>x.level===0).sort((x,y)=>x.sh-y.sh)[0];const up=[...V.synth].sort((x,y)=>y.dsh-x.dsh)[0];
    const sg=d=>Math.abs(d)<.005?'stable':`${d>=0?'+':'–'}${Math.abs(d*100).toLocaleString('fr-FR',{maximumFractionDigits:0})} pt`;
    vivBlock=`<div class="card viv"><div class="card-head"><div><h3>Vivier France : les postes à risque</h3><p class="sub">Place des joueurs français par poste, moyennes ${V.span} comparées à ${V.span0}${state.club>=0?' · sur un seul club, les effectifs par poste sont trop petits pour conclure':''}</p></div><button type="button" class="chip" id="goViv" aria-pressed="true">Voir le détail par poste</button></div>
     <div class="viv-grid">
      <div class="viv-kpi"><span class="lab">Minutes jouées par des Français</span><span class="val">${fmt.pct(N1.fr)}</span><span class="cmp">${delta(N0.fr,N1.fr,'pct')} vs ${sa} (${fmt.pct(N0.fr)})</span>
       <span class="lab" style="margin-top:10px">Postes en alerte</span><span class="val">${alert.length} <small>sur ${POS.length}</small></span><span class="cmp">${V.synth.filter(x=>x.level===2).length} sous tension · ${V.synth.filter(x=>x.level===1).length} à surveiller</span></div>
      <div class="viv-list">
       ${alert.length?alert.map(x=>`<div class="viv-row"><div><b>${x.n}</b> <span class="pill" style="color:${V.LV[x.level][2]}">${V.LV[x.level][1]} ${V.LV[x.level][0]}</span><br><span class="note">${x.sig.join(' · ')}</span></div><div class="viv-num"><b>${fmt.pct0(x.sh)}</b><span class="note">des minutes · ${sg(x.dsh)}</span></div><div class="viv-num"><b>${fmt.d1(x.ag)} ans</b><span class="note">âge des Français</span></div></div>`).join(''):'<p class="note">Aucun poste en alerte sur ce périmètre.</p>'}
       <p class="note">${up?`Plus forte progression des Français : ${up.n.toLowerCase()} (${sg(up.dsh)}, ${fmt.pct0(up.sh)} des minutes).`:''}${weakest?` Poste solide où les Français pèsent le moins : ${weakest.n.toLowerCase()} (${fmt.pct0(weakest.sh)}).`:''}</p>
      </div>
      <div class="viv-chart"><p class="sub" style="margin:0 0 4px">Part des minutes jouées par des Français</p><div class="chart" id="c0"></div></div>
     </div></div>`}
  main.innerHTML=`<section class="panel">
  <p class="intro">Vue d'ensemble pour <b>${scopeName()}</b>, saison ${sb} comparée à ${sa}. La page résume d'abord l'enjeu central de l'étude, la place des joueurs français poste par poste, puis ce qu'il faut retenir de chaque thème, avec un renvoi vers l'onglet détaillé. Les chiffres clés et leurs courbes suivent. La saison 2019/20, arrêtée après ${COVID_J[state.champ]} journées, est signalée sur chaque graphique.</p>
  ${vivBlock}
  <div><h3 class="sec">À retenir par thème</h3></div>
  <div class="grid2">
   ${INS.nat?themeCard('nationalite',INS.nat):''}
   ${themeCard('age',INS.age)}
   ${themeCard('postes',INS.postes)}
   ${themeCard('statut',INS.statut)}
  </div>
  <div><h3 class="sec">Chiffres clés</h3></div>
  <div class="kpis">
   ${k(state.club>=0?'Joueurs utilisés':'Joueurs utilisés par club',fmt.d1(b.perClub),`${delta(a.perClub,b.perClub)} vs ${sa} (${fmt.d1(a.perClub)})`)}
   ${k('Âge moyen pondéré',fmt.age(b.ageW),`${delta(a.ageW,b.ageW)} an vs ${sa} (${fmt.age(a.ageW)})`)}
   ${k('Minutes des moins de 23 ans',fmt.pct(b.young),`${delta(a.young,b.young,'pct')} vs ${sa} (${fmt.pct(a.young)})`)}
   ${k('Apparitions en remplaçant',fmt.pct(b.subShare),`${delta(a.subShare,b.subShare,'pct')} vs ${sa} (${fmt.pct(a.subShare)})`)}
   ${k('Joueurs pour 80 % des minutes',fmt.d1(b.core),`${delta(a.core,b.core)} vs ${sa} (${fmt.d1(a.core)})`)}
  </div>
  <div class="grid2">
   ${card(state.club>=0?'Joueurs utilisés':'Joueurs utilisés par club','Nombre de joueurs ayant joué au moins une minute','c1')}
   ${card('Âge des joueurs','Âge au 1er janvier de la saison, moyenne simple et pondérée par les minutes','c2')}
   ${card('Jeunes et trentenaires','Part des minutes jouées par les moins de 23 ans et par les 30 ans et plus','c3')}
   ${card('Noyau dur','Nombre de joueurs qui cumulent 80 % des minutes d’un club (moyenne des clubs)','c4')}
  </div>
  ${methodNote()}
  </section>`;
  const ci=covidIdx();const c=(n)=>css(n);
  if(hasNat){const V=vivierSynth();const al=[...V.synth].sort((x,y)=>y.level-x.level||x.sh-y.sh).filter(x=>x.level>0).slice(0,2);
    const allFr=SEASONS.map((_,s)=>natAgg(s).fr);const cols=['--s2','--s3'];
    lineChart(document.getElementById('c0'),{labels,covidIdx:ci,h:210,yfmt:fmt.pct,tickfmt:fmt.pct0,series:[{name:'Tous postes',color:c('--s1'),values:allFr},...al.map((x,i)=>({name:x.n,color:c(cols[i]),values:V.PA.map(a=>a[x.i].frShare)}))]});
    document.getElementById('goViv').onclick=()=>{if(al[0])state.vivPos=al[0].i;goTab('vivier')};}
  lineChart(document.getElementById('c1'),{labels,series:[{name:'Joueurs',color:c('--s1'),values:A.map(x=>x.n?x.perClub:null)}],yfmt:fmt.d1,tickfmt:fmt.int,covidIdx:ci});
  lineChart(document.getElementById('c2'),{labels,series:[{name:'Pondéré par les minutes',color:c('--s1'),values:A.map(x=>x.ageW)},{name:'Moyenne simple',color:c('--s2'),values:A.map(x=>x.ageM)}],yfmt:fmt.age,tickfmt:fmt.d1,covidIdx:ci});
  lineChart(document.getElementById('c3'),{labels,series:[{name:'Moins de 23 ans',color:c('--s1'),values:A.map(x=>x.young)},{name:'30 ans et plus',color:c('--s2'),values:A.map(x=>x.old)}],yfmt:fmt.pct,tickfmt:fmt.pct0,zero:true,covidIdx:ci});
  lineChart(document.getElementById('c4'),{labels,series:[{name:'Joueurs',color:c('--s1'),values:A.map(x=>x.n?x.core:null)}],yfmt:fmt.d1,tickfmt:fmt.int,covidIdx:ci});
}
function ageColors(){return ['--a1','--a2','--a3','--a4','--a5','--a6'].map(css)}
function renderAge(){
  const A=series();const labels=SEASONS.map(shortS);const ci=covidIdx();const col=ageColors();
  main.innerHTML=`<section class="panel">
  <p class="intro">Répartition du temps de jeu par tranche d'âge. L'âge de chaque joueur est calculé au 1er janvier de la saison.</p>
  ${insCard(insights().age)}
  <div class="card how"><h3>Comment l'âge est pondéré</h3>
   <p>L'<b>âge moyen simple</b> additionne l'âge de tous les joueurs utilisés et divise par leur nombre : un joueur entré dix minutes compte autant qu'un titulaire.</p>
   <p>L'<b>âge moyen pondéré</b> multiplie l'âge de chaque joueur par ses minutes jouées, puis divise par le total des minutes. Chaque joueur compte donc en proportion de son temps de jeu : c'est l'âge moyen « sur le terrain ».</p>
   <p>Exemple : un joueur de 32 ans qui joue 1 500 minutes et un joueur de 20 ans qui en joue 100 ont une moyenne simple de 26 ans, mais une moyenne pondérée de 31,3 ans. ${(()=>{const x=refSeasons(A);const b=A[x.i1];return `En ${x.sb}, la moyenne simple est de ${fmt.age(b.ageM)} et la moyenne pondérée de ${fmt.age(b.ageW)}.`})()}</p></div>
  ${card('Minutes jouées par tranche d’âge','Part du total des minutes de la saison','a1')}
  <div class="grid2">
   ${card('Joueurs utilisés par tranche d’âge','Part des joueurs ayant joué au moins une minute','a2')}
   ${card('Âge moyen pondéré : avants et arrières','Moyenne pondérée par les minutes','a3')}
  </div>
  <div class="card"><h3>Âge moyen pondéré par poste</h3><p class="sub">En années, pondéré par les minutes jouées à ce poste. Couleurs à seuils fixes, identiques pour tous les postes.</p><div id="a4"></div></div>
  </section>`;
  stackChart(document.getElementById('a1'),{labels,covidIdx:ci,series:AGEB.map((b,k)=>({name:b.n,color:col[k],values:A.map(x=>x.band[k])}))});
  stackChart(document.getElementById('a2'),{labels,covidIdx:ci,series:AGEB.map((b,k)=>({name:b.n,color:col[k],values:A.map(x=>{const t=x.bandN.reduce((p,q)=>p+q,0);return t?x.bandN[k]/t:0})}))});
  const LA=SEASONS.map((_,s)=>lineAgg(s));
  const fb=SEASONS.map((_,s)=>{let fm=0,fa=0,bm=0,ba=0;rowsFor(s).forEach(r=>{if(r.age==null)return;fm+=r.min*r.fw;fa+=r.min*r.fw*r.age;const bw=r.lw.length?1-r.fw:0;bm+=r.min*bw;ba+=r.min*bw*r.age});return [fm?fa/fm:null,bm?ba/bm:null]});
  lineChart(document.getElementById('a3'),{labels,covidIdx:ci,yfmt:fmt.age,tickfmt:fmt.d1,series:[{name:'Avants',color:css('--s1'),values:fb.map(x=>x[0])},{name:'Arrières',color:css('--s2'),values:fb.map(x=>x[1])}]});
  const PLa=SEASONS.map((_,s)=>lineAgg(s,'pw',POS));
  heatTable(document.getElementById('a4'),{rows:POS.map(p=>p.n),cols:labels,values:POS.map((_,i)=>PLa.map(a=>a[i].ageW)),vfmt:fmt.d1,covidIdx:ci,scale:'age'});
}
const POSM=[['players','Joueurs utilisés par club',fmt.d1,'Nombre de joueurs utilisés à ce poste, par club. Un joueur polyvalent est réparti entre ses lignes de poste.'],['share','Part des minutes',fmt.pct,'Part des minutes totales jouées par la ligne de poste.'],['minPer','Minutes par joueur',fmt.int,'Minutes moyennes par joueur utilisé à ce poste.'],['sub','Apparitions en remplaçant',fmt.pct0,'Part des apparitions comme remplaçant entrant.'],['ageW','Âge moyen pondéré',fmt.d1,'Âge moyen pondéré par les minutes : l\u2019âge de chaque joueur est multiplié par ses minutes jouées au poste, puis le total est divisé par les minutes du poste. Un titulaire pèse donc plus qu\u2019un joueur peu utilisé.']];
function renderPostes(){
  const labels=SEASONS.map(shortS);const ci=covidIdx();const LA=SEASONS.map((_,s)=>lineAgg(s));const M=POSM.find(m=>m[0]===state.posMetric);
  main.innerHTML=`<section class="panel">
  <p class="intro">Évolution par poste. Choisissez l'indicateur : le tableau montre chaque ligne de poste sur toutes les saisons (la couleur se lit de gauche à droite sur une même ligne), puis une courbe détaille chacun des onze postes.</p>
  ${insCard(insights().postes)}
  <div class="chips" role="group" aria-label="Indicateur">${POSM.map(m=>`<button type="button" class="chip" data-m="${m[0]}" aria-pressed="${m[0]===state.posMetric}">${m[1]}</button>`).join('')}</div>
  <div class="card"><h3>${M[1]} par ligne de poste</h3><p class="sub">${M[3]}${state.club>=0&&M[0]==='players'?' Valeurs pour le club sélectionné.':''}</p><div id="p1"></div></div>
  <div class="card"><h3>${M[1]} : détail par poste</h3><p class="sub">Une courbe par poste, chacune à sa propre échelle. La valeur de la première et de la dernière saison est rappelée à droite du nom ; la bande grise marque la saison 2019/20, interrompue.${state.club>=0?'':M[0]==='players'?' Les postes doublés (2e ligne, 3e ligne aile, centre, ailier) comptent deux maillots.':''}</p><div id="p2"></div></div>
  ${methodNote()}
  </section>`;
  main.querySelector('.chips').onclick=e=>{const b=e.target.closest('button');if(!b)return;state.posMetric=b.dataset.m;renderPostes()};
  heatTable(document.getElementById('p1'),{rows:LINES.map(l=>l.n),cols:labels,values:LINES.map((_,i)=>LA.map(a=>a[i][M[0]])),vfmt:M[2],covidIdx:ci,note:`Saison 2019/20 hachurée : championnat arrêté après ${COVID_J[state.champ]} journées, les volumes (joueurs, minutes) ne sont pas comparables.`});
  const PLp=SEASONS.map((_,s)=>lineAgg(s,'pw',POS));
  const tf=M[0]==='share'||M[0]==='sub'?fmt.pct0:(M[0]==='minPer'?fmt.int:fmt.d1);
  smallMultiples(document.getElementById('p2'),{labels,covidIdx:ci,yfmt:M[2],tickfmt:tf,items:POS.map((p,i)=>({name:p.n,values:PLp.map(a=>a[i][M[0]])}))});
}
function renderStatut(){
  const A=series();const labels=SEASONS.map(shortS);const ci=covidIdx();const LA=SEASONS.map((_,s)=>lineAgg(s));const col=[css('--a5'),css('--a3'),css('--s2'),css('--a1')];
  main.innerHTML=`<section class="panel">
  <p class="intro">Comment les joueurs sont utilisés : titularisations, entrées en jeu, profil de saison. Chaque joueur reçoit un profil pour chaque saison, selon ses matchs :</p>
  <dl class="defs" style="border-top:0;margin-top:0;padding-top:0">${PROF.map(p=>`<div><dt>${p.n}</dt><dd>${p.d.charAt(0).toUpperCase()+p.d.slice(1)}.</dd></div>`).join('')}</dl>
  <p class="note" style="margin-top:-6px">La longueur de saison est déduite des données : ${L[L.length-1]} journées en ${shortS(SEASONS[SEASONS.length-1])}${ci>=0?`, ${L[ci]} en 2019/20`:''}.</p>
  <div class="grid2">
   ${card('Profils de joueurs','Part des joueurs utilisés dans chaque profil','s1')}
   ${card('Minutes par profil','Part des minutes jouées par chaque profil','s2')}
  </div>
  <div class="grid2">
   <div class="card how"><h3>Comment lire ces deux graphiques</h3>
    <p>Chaque barre représente une saison, découpée entre les quatre profils. Le graphique de gauche compte les <b>joueurs</b> : chaque joueur utilisé pèse pour un, quel que soit son temps de jeu. Celui de droite compte les <b>minutes</b> : il montre qui joue réellement.</p>
    <p>L'écart entre les deux est l'information principale. Un profil qui pèse beaucoup plus à droite qu'à gauche concentre le temps de jeu ; un profil qui pèse plus à gauche regroupe des joueurs nombreux mais peu utilisés.</p>
    <p>Dans le temps, une part de titulaires réguliers qui baisse signifie que le temps de jeu se partage davantage entre joueurs.</p></div>
   ${insCard(insights().statut,'Ce qu\u2019il en ressort')}
  </div>
  <div class="card"><h3>Apparitions en remplaçant par poste</h3><p class="sub">Part des apparitions comme remplaçant entrant dans le total des matchs joués. Plus le chiffre est élevé, plus le poste est partagé entre un titulaire et son remplaçant au cours d'un même match.</p><div id="s3"></div></div>

  </section>`;
  const extra=i=>`<div class="row" style="margin-top:4px;opacity:.8"><span>Joueurs utilisés</span><span>${fmt.int(A[i].n)}</span></div>`;
  stackChart(document.getElementById('s1'),{labels,covidIdx:ci,tipExtra:extra,series:PROF.map((p,k)=>({name:p.n,color:col[k],values:A.map(x=>x.n?x.prof[k]/x.n:0)}))});
  stackChart(document.getElementById('s2'),{labels,covidIdx:ci,series:PROF.map((p,k)=>({name:p.n,color:col[k],values:A.map(x=>x.profMin[k])}))});
  const PLs=SEASONS.map((_,s)=>lineAgg(s,'pw',POS));
  heatTable(document.getElementById('s3'),{rows:POS.map(p=>p.n),cols:labels,values:POS.map((_,i)=>PLs.map(a=>a[i].sub)),vfmt:fmt.pct0,covidIdx:ci});
}
function renderClubs(){
  if(state.clubSeason<0||state.clubSeason>=SEASONS.length)state.clubSeason=SEASONS.length-1;const s=state.clubSeason;
  const rows=clubsIn(s).map(c=>{const a=agg(rowsFor(s,c),c,s);return {c,name:tn(DS.teams[c]),n:a.n,ageW:a.ageW,young:a.young,old:a.old,sub:a.subShare,core:a.core,reg:a.prof[0],fr:(()=>{let kn=0,f=0;rowsFor(s,c).forEach(r=>{if(r.nat){kn+=r.min;if(r.nat==='France')f+=r.min}});return kn?f/kn:null})()}});
  const k=state.clubSort.k,d=state.clubSort.dir;rows.sort((x,y)=>k==='name'?d*x.name.localeCompare(y.name,'fr'):d*((x[k]??-1)-(y[k]??-1)));
  const cols=[['name','Club'],['n','Joueurs utilisés'],['reg','Titulaires réguliers'],['core','Joueurs pour 80 % des min.'],['ageW','Âge pondéré'],['young','Min. moins de 23 ans'],['old','Min. 30 ans et +'],['fr','Min. joueurs français'],['sub','Apparitions en remplaçant']];
  const mx={};['n','young','old'].forEach(c=>mx[c]=Math.max(...rows.map(r=>r[c]||0)));
  main.innerHTML=`<section class="panel">
  <p class="intro">Comparaison des clubs sur une saison. Cliquez sur un en-tête pour trier. Un joueur transféré en cours de saison compte pour chacun de ses clubs, avec la totalité de ses minutes.</p>
  <div class="toolbar"><label for="clubSeason" class="count">Saison</label><select id="clubSeason">${SEASONS.map((x,i)=>`<option value="${i}" ${i===s?'selected':''}>${x}</option>`).join('')}</select>${isCovid(SEASONS[s])?`<span class="pill">Saison interrompue après ${COVID_J[state.champ]} journées</span>`:''}</div>
  <div class="tbl-wrap"><table id="clubT"><thead><tr>${cols.map(([c,n])=>`<th tabindex="0" data-k="${c}" aria-sort="${c===k?(d>0?'ascending':'descending'):'none'}">${n}</th>`).join('')}</tr></thead><tbody>
  ${rows.map(r=>`<tr><td>${r.name}</td><td>${r.n}<span class="bar-in" style="width:${Math.round(40*r.n/mx.n)}px"></span></td><td>${r.reg}</td><td>${fmt.int(r.core)}</td><td>${fmt.d1(r.ageW)}</td><td>${fmt.pct(r.young)}</td><td>${fmt.pct(r.old)}</td><td>${fmt.pct(r.fr)}</td><td>${fmt.pct(r.sub)}</td></tr>`).join('')}
  </tbody></table></div></section>`;
  document.getElementById('clubSeason').onchange=e=>{state.clubSeason=+e.target.value;renderClubs()};
  const sortH=e=>{const th=e.target.closest('th');if(!th)return;const kk=th.dataset.k;state.clubSort={k:kk,dir:state.clubSort.k===kk?-state.clubSort.dir:(kk==='name'?1:-1)};renderClubs()};
  const t=document.getElementById('clubT');t.onclick=sortH;t.onkeydown=e=>{if(e.key==='Enter')sortH(e)};
}
function natAgg(s){
  const rows=rowsFor(s);const nC=state.club>=0?1:clubsIn(s).length;
  let tot=0,known=0,fr=0,nK=0,nFr=0,forSlots=0;const z=ZONES.map(()=>0);const byNat=new Map();
  const lines=LINES.map(()=>({k:0,f:0}));
  rows.forEach(r=>{tot+=r.min;if(!r.nat)return;known+=r.min;nK++;const isFr=r.nat==='France';if(isFr){fr+=r.min;nFr++}else{forSlots+=state.club>=0?1:r.teams.length}
    z[zoneOf(r.nat)]+=r.min;const e=byNat.get(r.nat)||{p:0,min:0};e.p++;e.min+=r.min;byNat.set(r.nat,e);
    r.lw.forEach(([i,w])=>{lines[i].k+=r.min*w;if(!isFr)lines[i].f+=r.min*w})});
  return {n:rows.length,cover:tot?known/tot:null,fr:known?fr/known:null,frPlayers:nK?nFr/nK:null,foreignPerClub:forSlots/nC,zones:z.map(v=>known?v/known:0),
    nats:byNat,nNat:byNat.size,known,lines:lines.map(l=>l.k?l.f/l.k:null)};
}
function posZones(s){const out=POS.map(()=>ZONES.map(()=>0));rowsFor(s).forEach(r=>{if(!r.nat)return;const z=zoneOf(r.nat);r.pw.forEach(([i,w])=>{out[i][z]+=r.min*w})});return out.map(a=>{const t=a.reduce((p,q)=>p+q,0);return t?a.map(v=>v/t):null})}
function frByAge(s){const out=AGEB.map(()=>[0,0]);rowsFor(s).forEach(r=>{if(!r.nat||r.age==null)return;const k=AGEB.findIndex(b=>r.age<b.max);if(k<0)return;out[k][0]+=r.min;if(r.nat==='France')out[k][1]+=r.min});return out.map(([t,f])=>t?f/t:null)}
function renderNat(){
  if(!ROWS.some(r=>r.nat)){main.innerHTML=`<section class="panel"><div class="empty"><span class="pill">Données attendues</span><h3>Nationalité</h3><p>Aucune nationalité n'est renseignée pour ${DS.label}. Ajoutez une colonne « Nationalité » à l'export ou complétez data/nationalites.csv.</p></div></section>`;return}
  const N=SEASONS.map((_,s)=>natAgg(s));const labels=SEASONS.map(shortS);const ci=covidIdx();
  const idx=N.map((a,i)=>[a,i]).filter(([a])=>a.n>0);const [a,ia]=idx[0],[b,ib]=idx[idx.length-1];const sa=shortS(SEASONS[ia]),sb=shortS(SEASONS[ib]);
  const k=(lab,val,cmp)=>`<div class="kpi"><span class="lab">${lab}</span><span class="val">${val}</span><span class="cmp">${cmp}</span></div>`;
  const top=[...b.nats.entries()].filter(([n])=>n!=='France').sort((x,y)=>y[1].min-x[1].min).slice(0,12);
  const minCover=Math.min(...idx.map(([x])=>x.cover));
  main.innerHTML=`<section class="panel">
  <p class="intro">Répartition du temps de jeu selon la nationalité pour <b>${scopeName()}</b>. Les parts sont calculées sur les minutes des joueurs dont la nationalité est connue (${fmt.pct(Math.floor(minCover*1000)/1000)} des minutes ou plus selon la saison). Pour un international, c'est le pays de sa sélection ; pour les autres, le pays d'origine.</p>
  <div class="kpis">
   ${k('Minutes des joueurs français',fmt.pct(b.fr),`${delta(a.fr,b.fr,'pct')} vs ${sa} (${fmt.pct(a.fr)})`)}
   ${k('Joueurs français dans l’effectif utilisé',fmt.pct(b.frPlayers),`${delta(a.frPlayers,b.frPlayers,'pct')} vs ${sa} (${fmt.pct(a.frPlayers)})`)}
   ${k(state.club>=0?'Joueurs étrangers utilisés':'Joueurs étrangers utilisés par club',fmt.d1(b.foreignPerClub),`${delta(a.foreignPerClub,b.foreignPerClub)} vs ${sa} (${fmt.d1(a.foreignPerClub)})`)}
   ${k('Nationalités représentées',fmt.int(b.nNat),`${delta(a.nNat,b.nNat)} vs ${sa} (${fmt.int(a.nNat)})`)}
  </div>
  ${insCard(insights().nat)}
  ${card('Minutes jouées par origine','Part des minutes de la saison, par grande zone','n1')}
  <div class="card"><h3>Minutes jouées par origine, poste par poste</h3><p class="sub">Même lecture pour chacun des onze postes : part des minutes du poste par grande zone, de ${sa} à ${sb}. Un joueur aligné à plusieurs postes est réparti à parts égales entre eux. Survolez une barre pour le détail.</p>
   <div class="legend" style="margin:0 0 12px">${ZONES.map(z=>`<span><i style="background:var(${z.c})"></i>${z.n}</span>`).join('')}</div>
   <div class="sm-grid">${POS.map((p,i)=>`<div class="sm"><div class="sm-head"><b>${p.n}</b><span id="nzh${i}"></span></div><div class="chart" id="nz${i}"></div></div>`).join('')}</div>
   <p class="sub" style="margin:16px 0 4px">Répartition en ${sb}, et part des Français en ${sa}</p>
   <div class="tbl-wrap" style="border:0"><table class="wraphead"><thead><tr>${['Poste',...ZONES.map(z=>z.n),'France en '+sa,'Évolution'].map((h,i)=>`<th style="cursor:default${i?'':';text-align:left'}">${h}</th>`).join('')}</tr></thead><tbody id="nzT"></tbody></table></div></div>
  <div class="grid2">
   ${card('Joueurs français : minutes et effectif','Part des minutes jouées et part des joueurs utilisés','n2')}
   ${card(state.club>=0?'Joueurs étrangers utilisés':'Joueurs étrangers utilisés par club','Nombre de joueurs non français ayant joué au moins une minute','n4')}
  </div>
  <div class="card"><h3>Principales nationalités étrangères</h3><p class="sub">Les 12 nationalités les plus utilisées en ${sb}, comparées à ${sa}</p>
   <div class="tbl-wrap" style="border:0"><table class="wraphead"><thead><tr>${['Nationalité','Joueurs '+sb,'Joueurs '+sa,'Minutes '+sb,'Minutes '+sa,'Évolution des minutes'].map(h=>`<th style="cursor:default">${h}</th>`).join('')}</tr></thead><tbody>
   ${top.map(([n,v])=>{const o=a.nats.get(n);const m1=v.min/b.known,m0=o?o.min/a.known:0;const d=m1-m0;return `<tr><td>${n}</td><td>${v.p}</td><td>${o?o.p:0}</td><td>${fmt.pct(m1)}<span class="bar-in" style="width:${Math.round(m1*600)}px"></span></td><td>${fmt.pct(m0)}</td><td>${Math.abs(d)<.0005?'=':(d>0?'+':'–')+nf(Math.abs(d*100))+' pt'}</td></tr>`}).join('')}
   </tbody></table></div></div>
  <div class="card"><h3>Minutes des joueurs étrangers par ligne de poste</h3><p class="sub">Part des minutes jouées par des joueurs non français. Couleurs à seuils fixes ; en rose, les lignes où les étrangers jouent plus de 55 % des minutes.</p><div id="n3"></div></div>
  <div class="card"><h3>Minutes des joueurs étrangers par poste détaillé</h3><p class="sub">Même lecture avec les onze postes : pilier gauche et pilier droit séparés, N°8, arrière… Un joueur aligné à plusieurs postes est réparti à parts égales entre eux.</p><div id="n5"></div></div>
  <details class="method"><summary>Sources et limites des nationalités</summary><ul>
   <li>Règle : pour un joueur international, la nationalité retenue est celle de sa sélection (la plus récente s'il en a connu deux) ; pour les autres, le pays d'origine.</li>
   <li>Sources : fichier des licences LNR (TOP 14 et PRO D2 depuis 2017) rapproché par nom, complété par allrugby.com, puis corrigé pour les sélections internationales. La licence indique parfois un passeport européen (Italie, Espagne, Grande-Bretagne) pour des joueurs argentins, néo-zélandais ou sud-africains : ces cas ont été repris un par un pour les joueurs les plus utilisés.</li>
   <li>Un Français de licence sélectionné par un autre pays (Italie, Espagne, Portugal…) est compté dans ce pays. Les joueurs peu utilisés n'ont pas tous été vérifiés.</li>
   <li>Ce n'est pas le statut JIFF : un joueur étranger formé en France peut être JIFF, et inversement.</li></ul></details>
  </section>`;
  stackChart(document.getElementById('n1'),{labels,covidIdx:ci,series:ZONES.map((z,i)=>({name:z.n,color:css(z.c),values:N.map(x=>x.zones[i])}))});
  const PZ=SEASONS.map((_,s)=>posZones(s));
  POS.forEach((p,i)=>{stackChart(document.getElementById('nz'+i),{labels,covidIdx:ci,h:150,legend:false,series:ZONES.map((z,k)=>({name:z.n,color:css(z.c),values:PZ.map(x=>x[i]?x[i][k]:0)}))});
    const f0=PZ[ia][i],f1=PZ[ib][i];document.getElementById('nzh'+i).textContent=f0&&f1?`FR ${fmt.pct0(f0[0])} → ${fmt.pct0(f1[0])}`:''});
  document.getElementById('nzT').innerHTML=POS.map((p,i)=>{const f0=PZ[ia][i],f1=PZ[ib][i];if(!f1)return '';const d=f0?f1[0]-f0[0]:null;return `<tr><td style="text-align:left"><b>${p.n}</b></td>${f1.map(v=>`<td>${fmt.pct0(v)}</td>`).join('')}<td>${f0?fmt.pct0(f0[0]):'–'}</td><td>${d==null?'':Math.abs(d)<.005?'=':(d>0?'+':'–')+nf(Math.abs(d*100),0)+' pt'}</td></tr>`}).join('');
  lineChart(document.getElementById('n2'),{labels,covidIdx:ci,yfmt:fmt.pct,tickfmt:fmt.pct0,series:[{name:'Part des minutes',color:css('--s1'),values:N.map(x=>x.fr)},{name:'Part des joueurs utilisés',color:css('--s2'),values:N.map(x=>x.frPlayers)}]});
  heatTable(document.getElementById('n3'),{rows:LINES.map(l=>l.n),cols:labels,values:LINES.map((_,i)=>N.map(x=>x.lines[i])),vfmt:fmt.pct0,covidIdx:ci,scale:'foreign'});
  const PAn=SEASONS.map((_,s)=>posAgg(s));
  heatTable(document.getElementById('n5'),{rows:POS.map(p=>p.n),cols:labels,values:POS.map((_,i)=>PAn.map(x=>x[i].frShare==null?null:1-x[i].frShare)),vfmt:fmt.pct0,covidIdx:ci,scale:'foreign'});
  lineChart(document.getElementById('n4'),{labels,covidIdx:ci,yfmt:fmt.d1,tickfmt:fmt.int,series:[{name:'Joueurs étrangers',color:css('--s2'),values:N.map(x=>x.n?x.foreignPerClub:null)}]});
}
function posAgg(s){
  const out=POS.map(()=>({min:0,fr:0,frA:0,frAge:0,frU23:0,fr30:0,frReg:0,foA:0,foAge:0}));
  rowsFor(s).forEach(r=>{if(!r.nat)return;const isFr=r.nat==='France';r.pw.forEach(([i,w])=>{const o=out[i];const m=r.min*w;o.min+=m;
    if(isFr){o.fr+=m;if(r.prof===0)o.frReg+=w;if(r.age!=null){o.frA+=m;o.frAge+=m*r.age;if(r.age<23)o.frU23+=m;if(r.age>=30)o.fr30+=m}}
    else if(r.age!=null){o.foA+=m;o.foAge+=m*r.age}})});
  return out.map(o=>({frShare:o.min?o.fr/o.min:null,frAge:o.frA?o.frAge/o.frA:null,fr30:o.frA?o.fr30/o.frA:null,frU23:o.min?o.frU23/o.min:null,frReg:o.frReg,foAge:o.foA?o.foAge/o.foA:null}));
}
function vivierSynth(){
  const labels=SEASONS.map(shortS);const ci=covidIdx();const PA=SEASONS.map((_,s)=>posAgg(s));const n=SEASONS.length;
  const valid=SEASONS.map((x,i)=>i).filter(i=>i!==ci);const first=valid.slice(0,3),last=valid.slice(-3);
  const avg=(p,k,idx)=>{const v=idx.map(i=>PA[i][p][k]).filter(x=>x!=null);return v.length?v.reduce((a,b)=>a+b,0)/v.length:null};
  const span=`${shortS(SEASONS[last[0]])} à ${shortS(SEASONS[last[last.length-1]])}`,span0=`${shortS(SEASONS[first[0]])} à ${shortS(SEASONS[first[first.length-1]])}`;
  const synth=POS.map((p,i)=>{const sh=avg(i,'frShare',last),sh0=avg(i,'frShare',first),ag=avg(i,'frAge',last),ag0=avg(i,'frAge',first),o30=avg(i,'fr30',last),u23=avg(i,'frU23',last),reg=avg(i,'frReg',last)/p.slots;
    const sig=[];if(sh<.5)sig.push('moins de la moitié des minutes pour les Français');if(sh-sh0<=-.04)sig.push('part des Français en recul');if(ag>=28.5||o30>=.35)sig.push('Français âgés');if(u23<.06)sig.push('peu de jeunes Français');if(reg<4)sig.push('peu de titulaires français');
    return {i,n:p.n,sh,dsh:sh-sh0,ag,dag:ag-ag0,o30,u23,reg:avg(i,'frReg',last),sig,level:sig.length>=3?2:sig.length>=1?1:0}});
  const LV=[['Solide','●','var(--up)'],['À surveiller','▲','var(--ink-2)'],['Sous tension','■','var(--down)']];
  return {labels,ci,PA,valid,first,last,span,span0,synth,LV};
}
function renderVivier(){
  if(!ROWS.some(r=>r.nat)){main.innerHTML=`<section class="panel"><div class="empty"><h3>Vivier France</h3><p>Cette lecture nécessite la nationalité des joueurs.</p></div></section>`;return}
  const {labels,ci,PA,valid,first,last,span,span0,synth,LV}=vivierSynth();
  const sgn=(d,pct)=>d==null?'':Math.abs(d)<(pct?.005:.05)?'=':`${d>=0?'+':'–'}${pct?Math.abs(d*100).toLocaleString('fr-FR',{maximumFractionDigits:0})+' pt':Math.abs(d).toLocaleString('fr-FR',{minimumFractionDigits:1,maximumFractionDigits:1})}`;
  const M=VIVM.find(m=>m[0]===state.vivMetric);const P=state.vivPos;const lastS=valid[valid.length-1];
  const atPos=fr=>rowsFor(lastS).filter(r=>r.nat&&(r.nat==='France')===fr&&r.pw.some(([i])=>i===P)).map(r=>({r,w:r.pw.find(([i])=>i===P)[1]})).map(x=>({...x,m:x.r.min*x.w})).sort((x,y)=>y.m-x.m);
  const grpTable=(list,fr)=>{const tot=list.reduce((o,{r,w,m})=>{o.n+=w;o.m+=m;o.st+=r.st*w;o.sb+=r.sb*w;if(r.age!=null){o.am+=m;o.a+=m*r.age}return o},{n:0,m:0,st:0,sb:0,am:0,a:0});
    return `<div class="card"><h3>${fr?'Joueurs français':'Joueurs étrangers'}</h3><p class="sub">${list.length} joueur${list.length>1?'s':''} utilisé${list.length>1?'s':''} à ce poste · les 12 plus utilisés ci-dessous</p>
    <div class="kpis" style="grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-bottom:10px">${[['Minutes',fmt.int(tot.m)],['Âge moyen',fmt.d1(tot.am?tot.a/tot.am:null)],['Titularisations',fmt.int(tot.st)],['Entrées en jeu',fmt.int(tot.sb)]].map(([l,v])=>`<div class="mini"><span class="lab">${l}</span><span class="val">${v}</span></div>`).join('')}</div>
    <div class="tbl-wrap" style="border:0"><table class="wraphead"><thead><tr>${['Joueur','Âge','Min. au poste','Titulaire','Remplaçant'].map(h=>`<th style="cursor:default">${h}</th>`).join('')}</tr></thead><tbody>
    ${list.slice(0,12).map(({r,m})=>`<tr><td style="white-space:normal">${r.name}<br><span class="note">${r.teams.map(t=>tn(DS.teams[t])).join(' / ')}${fr?'':' · '+r.nat}</span></td><td>${r.age==null?'–':Math.floor(r.age)}</td><td>${fmt.int(m)}</td><td>${r.st}</td><td>${r.sb}</td></tr>`).join('')||'<tr><td colspan="5">Aucun joueur à ce poste.</td></tr>'}
    </tbody></table></div></div>`};
  const allAge=SEASONS.map((_,s)=>{let m=0,a=0;rowsFor(s).forEach(r=>{if(r.age==null||!r.pw.length)return;m+=r.min;a+=r.min*r.age});return m?a/m:null});
  const allAvg=SEASONS.map((_,s)=>{let mn=0,fr=0;rowsFor(s).forEach(r=>{if(!r.nat||!r.pw.length)return;mn+=r.min;if(r.nat==='France')fr+=r.min});return mn?fr/mn:null});
  main.innerHTML=`<section class="panel">
  <p class="intro">Quels postes fragilisent le réservoir de joueurs français sélectionnables ? Pour chaque poste, la synthèse croise la place des Français dans le temps de jeu, leur âge, la relève et le nombre de titulaires. Moyennes ${span}, comparées à ${span0}${ci>=0?' (hors 2019/20)':''}.</p>
  <div class="card"><h3>Synthèse par poste</h3><p class="sub">${scopeName()} · un poste est « sous tension » à partir de trois signaux, « à surveiller » dès un signal</p>
   <div class="tbl-wrap" style="border:0"><table id="vt" class="wraphead"><thead><tr>${['Poste','Lecture','Min. des Français','Évol.','Âge des Français','Évol.','30 ans et +','Moins de 23 ans','Titulaires'].map((h,i)=>`<th style="cursor:default${i===1?';text-align:left':''}">${h}</th>`).join('')}</tr></thead><tbody>
   ${synth.map(x=>`<tr data-p="${x.i}" style="cursor:pointer"${x.i===P?' aria-selected="true"':''}><td><b>${x.n}</b></td><td style="text-align:left;white-space:normal;min-width:170px"><span class="pill" style="color:${LV[x.level][2]}">${LV[x.level][1]} ${LV[x.level][0]}</span>${x.sig.length?`<br><span class="note">${x.sig.join(' · ')}</span>`:''}</td><td>${fmt.pct0(x.sh)}</td><td>${sgn(x.dsh,1)}</td><td>${fmt.d1(x.ag)}</td><td>${sgn(x.dag)}</td><td>${fmt.pct0(x.o30)}</td><td>${fmt.pct0(x.u23)}</td><td>${fmt.d1(x.reg)}</td></tr>`).join('')}
   </tbody></table></div>
   <dl class="defs">
    <div><dt>Lecture</dt><dd>Niveau d'alerte du poste : « sous tension » à partir de trois signaux, « à surveiller » dès un signal, « solide » sinon. Les signaux déclenchés sont listés dessous.</dd></div>
    <div><dt>Min. des Français</dt><dd>Part des minutes du poste jouées par des joueurs français, en moyenne sur ${span}. Signal si elle est inférieure à 50 %.</dd></div>
    <div><dt>Évol. (minutes)</dt><dd>Écart en points avec la moyenne ${span0}. Signal si la part recule d'au moins 4 points.</dd></div>
    <div><dt>Âge des Français</dt><dd>Âge moyen des joueurs français au poste, pondéré par leurs minutes : un joueur qui joue beaucoup pèse plus. Signal à partir de 28,5 ans.</dd></div>
    <div><dt>Évol. (âge)</dt><dd>Écart en années avec la moyenne ${span0}. Un chiffre positif indique un vieillissement.</dd></div>
    <div><dt>30 ans et +</dt><dd>Part des minutes des Français jouée par des joueurs de 30 ans et plus. Signal à partir de 35 % : le poste repose sur des joueurs en fin de carrière.</dd></div>
    <div><dt>Moins de 23 ans</dt><dd>Minutes des Français de moins de 23 ans, en part de toutes les minutes du poste. Mesure la relève. Signal en dessous de 6 %.</dd></div>
    <div><dt>Titulaires</dt><dd>Nombre moyen de Français titularisés sur au moins la moitié des journées, sur l'ensemble des clubs. Signal en dessous de 4 par maillot (8 pour les postes doublés : 2e ligne, 3e ligne aile, centre, ailier).</dd></div>
   </dl>
   <p class="note">Cliquez sur un poste du tableau pour le détailler plus bas.</p></div>
  <div class="chips" role="group" aria-label="Indicateur">${VIVM.map(m=>`<button type="button" class="chip" data-m="${m[0]}" aria-pressed="${m[0]===state.vivMetric}">${m[1]}</button>`).join('')}</div>
  <div class="card"><h3>${M[1]}, par poste et par saison</h3><p class="sub">${M[3]} ${M[0]==='frShare'?'Couleurs à seuils fixes ; en rose, moins de 45 % de Français.':M[0]==='frAge'?'Couleurs à seuils fixes, identiques pour tous les postes.':'Couleur : du plus faible (clair) au plus élevé (foncé) sur la ligne.'}</p><div id="v1"></div></div>
  <div class="card"><h3>Minutes jouées par des Français, par tranche d'âge et par saison</h3><p class="sub">Part des minutes de chaque tranche d'âge jouées par des joueurs français, tous postes confondus. Couleurs à seuils fixes ; en rose, moins de 45 % de Français.</p><div id="v1b"></div></div>
  <div class="toolbar"><label for="vpos" class="count">Poste détaillé</label><select id="vpos">${POS.map((p,i)=>`<option value="${i}" ${i===P?'selected':''}>${p.n}</option>`).join('')}</select></div>
  <div class="grid2">
   ${card(POS[P].n+' : minutes jouées par des Français','Part des minutes du poste, comparée à l’ensemble des postes','v2')}
   ${card(POS[P].n+' : âge moyen','Âge pondéré par les minutes : Français et étrangers au poste, comparés à la moyenne tous postes','v3')}
  </div>
  <div><h3 class="sec">${POS[P].n} : Français et étrangers en ${shortS(SEASONS[lastS])}</h3><p class="sub" style="margin:2px 0 0">Minutes attribuées au poste (un joueur polyvalent est réparti entre ses postes). « Titulaire » et « Remplaçant » : nombre de matchs commencés et de matchs entamés sur le banc, tous postes confondus pour le joueur ; les totaux en tête de tableau sont ramenés au poste.</p></div>
  <div class="grid2">${grpTable(atPos(true),true)}${grpTable(atPos(false),false)}</div>
  <details class="method"><summary>Méthode et limites</summary><ul>
   <li>« Français » : joueur sélectionné par la France, ou non international de nationalité française. Un joueur sélectionné par un autre pays n'est pas compté comme français, même avec une licence française. Ce n'est pas le statut JIFF.</li>
   <li>L'export ne donne pas les minutes par poste : un joueur aligné à plusieurs postes est réparti à parts égales. Un pilier qui a joué à gauche et à droite compte pour moitié de chaque côté, ce qui lisse l'écart entre les deux postes.</li>
   <li>Les seuils des signaux sont des repères de lecture, à ajuster. Avec le filtre club, les effectifs deviennent trop petits pour conclure.</li></ul></details>
  </section>`;
  const f={pct0:fmt.pct0,d1:fmt.d1}[M[2]];
  heatTable(document.getElementById('v1b'),{rows:AGEB.map(b=>b.n),cols:labels,values:AGEB.map((_,k)=>SEASONS.map((_,s)=>frByAge(s)[k])),vfmt:fmt.pct0,covidIdx:ci,scale:'fr'});
  heatTable(document.getElementById('v1'),{rows:POS.map(p=>p.n),cols:labels,values:POS.map((_,i)=>PA.map(a=>a[i][M[0]])),vfmt:f,covidIdx:ci,scale:M[0]==='frShare'?'fr':M[0]==='frAge'?'age':undefined});
  lineChart(document.getElementById('v2'),{labels,covidIdx:ci,yfmt:fmt.pct,tickfmt:fmt.pct0,series:[{name:POS[P].n,color:css('--s1'),values:PA.map(a=>a[P].frShare)},{name:'Tous postes',color:css('--s2'),values:allAvg}]});
  lineChart(document.getElementById('v3'),{labels,covidIdx:ci,yfmt:fmt.age,tickfmt:fmt.d1,series:[{name:'Français au poste',color:css('--s1'),values:PA.map(a=>a[P].frAge)},{name:'Étrangers au poste',color:css('--s2'),values:PA.map(a=>a[P].foAge)},{name:'Tous postes, tous joueurs',color:css('--s3'),values:allAge}]});
  main.querySelector('.chips').onclick=e=>{const b=e.target.closest('button');if(!b)return;state.vivMetric=b.dataset.m;renderVivier()};
  document.getElementById('vpos').onchange=e=>{state.vivPos=+e.target.value;renderVivier()};
  document.getElementById('vt').onclick=e=>{const tr=e.target.closest('tr[data-p]');if(!tr)return;state.vivPos=+tr.dataset.p;renderVivier()};
}
// ---------- Équipe type : terrain, 15 titulaires et banc de 8 ----------
const JERSEY=[
 {n:1,name:'Pilier gauche',ids:[1],x:30,y:9},{n:2,name:'Talonneur',ids:[2],x:50,y:9},{n:3,name:'Pilier droit',ids:[3],x:70,y:9},
 {n:4,name:'2e ligne',ids:[4],x:40,y:23},{n:5,name:'2e ligne',ids:[5],x:60,y:23},
 {n:6,name:'3e ligne aile',ids:[6],x:20,y:37},{n:8,name:'N°8',ids:[8],x:50,y:38},{n:7,name:'3e ligne aile',ids:[7],x:80,y:37},
 {n:9,name:'Demi de mêlée',ids:[9],x:34,y:50},{n:10,name:"Demi d'ouverture",ids:[10],x:47,y:59},
 {n:12,name:'Premier centre',ids:[12],x:64,y:69.5},{n:13,name:'Second centre',ids:[13],x:82,y:80},
 {n:11,name:'Ailier gauche',ids:[11],x:14,y:79},{n:15,name:'Arrière',ids:[15],x:40,y:92},{n:14,name:'Ailier droit',ids:[14],x:86,y:93.5}];
const BENCH=[{n:16,name:'Talonneur',ids:[2]},{n:17,name:'Pilier gauche',ids:[1]},{n:18,name:'Pilier droit',ids:[3]},{n:19,name:'2e ligne',ids:[4,5]},{n:20,name:'3e ligne',ids:[6,7,8]},{n:21,name:'Demi de mêlée',ids:[9]},{n:22,name:'Ouvreur ou centre',ids:[10,12,13]},{n:23,name:'Ailier ou arrière',ids:[11,14,15]}];
function jerseyAgg(s,j,bench,flt){
  let W=0,WA=0,A=0,WN=0,FR=0,U23=0,O30=0,slots=0;const nats=new Map();const pl=[];let s11=0,s12=0,s22=0,y1=0,y2=0;const nC=state.club>=0?1:clubsIn(s).length;
  rowsFor(s).forEach(r=>{if(!r.ids.length)return;if(flt&&!flt(r))return;const k=r.ids.filter(id=>j.ids.includes(id)).length;if(!k)return;const sh=k/r.ids.length;s11+=sh*r.st*r.st;s12+=sh*r.st*r.sb;s22+=sh*r.sb*r.sb;y1+=sh*r.st*r.min;y2+=sh*r.sb*r.min;const w=(bench?r.sb:r.st)*sh;if(w<=0)return;slots+=sh*(state.club>=0?1:r.teams.length);
    W+=w;pl.push({r,w});if(r.age!=null){WA+=w;A+=w*r.age;if(r.age<23)U23+=w;if(r.age>=30)O30+=w}
    if(r.nat){WN+=w;if(r.nat==='France')FR+=w;else nats.set(r.nat,(nats.get(r.nat)||0)+w)}});
  pl.sort((x,y)=>y.w-x.w);
  const det=s11*s22-s12*s12;let mpm=null;if(det>1e-6){const a=(y1*s22-y2*s12)/det,b=(y2*s11-y1*s12)/det;mpm=Math.max(0,Math.min(80,bench?b:a))}
  return {W,mpm,used:slots/nC,age:WA?A/WA:null,fr:WN?FR/WN:null,u23:WA?U23/WA:null,o30:WA?O30/WA:null,nats:[...nats.entries()].sort((x,y)=>y[1]-x[1]).map(([n,w])=>[n,w/WN]),pl};
}
const C_MASC=new Set(['Portugal','Canada','Japon','Zimbabwe','Cameroun','Chili','Mali','Maroc','Sénégal','Pays de Galles','Burkina Faso']),C_PLUR=new Set(['Fidji','Tonga','Samoa','Pays-Bas','Etats-Unis']);
const deCountry=n=>C_PLUR.has(n)?'des '+n:C_MASC.has(n)?'du '+n:/^[AEÉIOUaeéiou]/.test(n)?'d\u2019'+n:'de '+n;
function renderEquipe(){
  const A=series();const withData=SEASONS.map((_,i)=>i).filter(i=>A[i].n>0);
  if(state.eqSeason<0||!withData.includes(state.eqSeason))state.eqSeason=withData[withData.length-1];
  const s=state.eqSeason,s0=withData[0];const all=[...JERSEY.map(j=>({...j,bench:false})),...BENCH.map(j=>({...j,bench:true}))];
  const D=all.map(j=>({j,d:jerseyAgg(s,j,j.bench),d0:jerseyAgg(s0,j,j.bench)}));
  const key=state.eqColor==='age'?'age':state.eqColor==='mpm'?'mpm':'fr';const kfmt=v=>key==='fr'?fmt.pct0(v):key==='age'?fmt.d1(v)+' ans':fmt.int(v)+' min';const klab={fr:'Part de Français',age:'Âge moyen',mpm:'Temps de jeu moyen'}[key];const vals=D.map(x=>x.d[key]).filter(v=>v!=null);const lo=Math.min(...vals),hi=Math.max(...vals);
  const HP=HEATPAL[state.champ]||HEATPAL.top14;const tone=v=>{if(v==null)return ['#FFFFFF','#1B2433'];const l=key==='fr'?heatLevel('fr',v):key==='age'?heatLevel('age',v):Math.min(3,Math.floor((hi>lo?(v-lo)/(hi-lo):.5)*4));return l<0?[HEATALERT[0],HEATALERT[1]]:[HP.bg[l],HP.fg[l]]};
  const node=(x,i)=>{const [bg,fg]=tone(x.d[key]);const sel=i===state.eqSel;
    return `<button type="button" class="pl${sel?' on':''}${x.j.bench?' bn':''}" data-i="${i}" ${x.j.bench?'':`style="left:${x.j.x}%;top:${x.j.y}%"`} aria-pressed="${sel}" title="${x.j.n} · ${x.j.name}">
     <span class="num" style="background:${bg};color:${fg}">${x.j.n}</span><span class="tag"><span class="pn">${x.j.name}</span><span class="pv"><b>${x.d.fr==null?'–':fmt.pct0(x.d.fr)} FR</b><span class="sep"> · </span><span>${x.d.age==null?'–':fmt.d1(x.d.age)+' ans'}</span><span class="tm">${x.d.mpm==null?'–':fmt.int(x.d.mpm)+' min'}</span></span></span></button>`};
  // face-à-face : équipe type française contre équipe type étrangère
  const isF=r=>r.nat==='France',isE=r=>r.nat&&r.nat!=='France';
  const DU=all.map(j=>{const f=jerseyAgg(s,j,j.bench,isF),e=jerseyAgg(s,j,j.bench,isE);const T=f.W+e.W;return {j,f,e,fs:T?f.W/T:null,es:T?e.W/T:null}});
  const XV=DU.filter(x=>!x.j.bench);const avg=(a,g)=>{const v=a.map(g).filter(x=>x!=null);return v.length?v.reduce((p,q)=>p+q,0)/v.length:null};
  const dnode=(x,side)=>{const d=x[side],sh=side==='f'?x.fs:x.es;const maj=sh!=null&&sh>=.5;const col=`var(${side==='f'?'--s1':'--s2'})`;return `<div class="pl du${maj?' maj':' min'}" style="left:${x.j.x}%;top:${x.j.y}%" title="${x.j.n} · ${x.j.name}"><span class="num" style="${maj?`background:${col};color:#fff`:`background:#fff;color:${col};border-color:${col}`}">${x.j.n}</span><span class="tag"><span class="pn">${x.j.name}</span><span class="pv"><b>${sh==null?'–':fmt.pct0(sh)}</b><span class="sep"> · </span><span>${d.age==null?'–':fmt.d1(d.age)+' ans'}</span><span class="tm">${d.mpm==null?'–':fmt.int(d.mpm)+' min'}</span></span></span></div>`};
  const majE=XV.filter(x=>x.es!=null&&x.es>=.5).map(x=>`${x.j.n} (${x.j.name.toLowerCase()}, ${fmt.pct0(x.es)})`);
  const gapAge=[...XV].filter(x=>x.f.age!=null&&x.e.age!=null).sort((a,b)=>(b.e.age-b.f.age)-(a.e.age-a.f.age))[0];
  const aF=avg(XV,x=>x.f.age),aE=avg(XV,x=>x.e.age),mF=avg(XV,x=>x.f.mpm),mE=avg(XV,x=>x.e.mpm),shF=avg(XV,x=>x.fs);
  const duel=`<div class="card"><h3>Face-à-face : le XV type français et le XV type étranger</h3><p class="sub">${shortS(SEASONS[s])} · pour chaque maillot, le profil des titulaires français et celui des titulaires étrangers. Sous chaque maillot : âge moyen, part des titularisations du poste, minutes par match débuté.</p>
   ${insList([`Le titulaire français type a <b>${fmt.d1(aF)} ans</b>, le titulaire étranger <b>${fmt.d1(aE)} ans</b> (moyenne des quinze maillots).`,
     `Un titulaire français joue en moyenne ${fmt.int(mF)} minutes par match débuté, un étranger ${fmt.int(mE)} minutes.`,
     majE.length?`Les étrangers sont majoritaires au coup d'envoi sur ${majE.length>1?'les maillots':'le maillot'} ${majE.join(', ')}.`:`Les Français sont majoritaires au coup d'envoi sur les quinze maillots (${fmt.pct0(shF)} des titularisations en moyenne).`,
     gapAge?`Plus grand écart d'âge : maillot ${gapAge.j.n} (${gapAge.j.name.toLowerCase()}), ${fmt.d1(gapAge.f.age)} ans côté français contre ${fmt.d1(gapAge.e.age)} ans côté étranger.`:''].filter(Boolean))}
   <div class="duel">
    <div><p class="duel-t"><i style="background:var(--s1)"></i>XV type français</p><div class="pitch"><i class="ln l1"></i><i class="ln l2"></i><i class="ln l3"></i>${XV.map(x=>dnode(x,'f')).join('')}</div></div>
    <div><p class="duel-t"><i style="background:var(--s2)"></i>XV type étranger</p><div class="pitch"><i class="ln l1"></i><i class="ln l2"></i><i class="ln l3"></i>${XV.map(x=>dnode(x,'e')).join('')}</div></div>
   </div>
   <p class="note" style="margin-top:8px">Rond plein : le groupe est majoritaire à ce poste. Rond blanc : il est minoritaire.</p>
   <div class="tbl-wrap" style="border:0;margin-top:12px"><table class="wraphead"><thead>
    <tr><th colspan="2" style="cursor:default"></th><th colspan="3" style="cursor:default;text-align:center;color:var(--s1)">Français</th><th colspan="4" style="cursor:default;text-align:center;color:var(--s2)">Étrangers</th></tr>
    <tr>${['Maillot','Poste','Part','Âge moyen','Minutes','Part','Âge moyen','Minutes','1re nationalité'].map((h,i)=>`<th style="cursor:default${[1,8].includes(i)?';text-align:left':''}">${h}</th>`).join('')}</tr></thead><tbody>
   ${DU.map(x=>{const top=d=>d.pl[0]?d.pl[0].r.name:'–';const c=d=>`<td>${d.age==null?'–':fmt.d1(d.age)}</td><td>${d.mpm==null?'–':fmt.int(d.mpm)+' min'}</td>`;return `<tr><td><b>${x.j.n}</b></td><td style="text-align:left">${x.j.name}${x.j.bench?' <span class="note">(banc)</span>':''}</td><td>${x.fs!=null&&x.fs>=.5?'<b>'+fmt.pct0(x.fs)+'</b>':fmt.pct0(x.fs)}</td>${c(x.f)}<td>${x.es!=null&&x.es>=.5?'<b>'+fmt.pct0(x.es)+'</b>':fmt.pct0(x.es)}</td>${c(x.e)}<td style="text-align:left">${x.e.pl.length?(()=>{const m=new Map();x.e.pl.forEach(({r,w})=>m.set(r.nat,(m.get(r.nat)||0)+w));return [...m.entries()].sort((a,b)=>b[1]-a[1])[0][0]})():'–'}</td></tr>`}).join('')}
   </tbody></table></div></div>`;
  const X=D[state.eqSel]||D[0];const d=X.d,d0=X.d0,j=X.j;const tit=j.bench?'remplaçant':'titulaire';
  const sur10=v=>Math.round(v*10);const nat1=d.nats[0];
  const twin=j.bench?D.find(x=>!x.j.bench&&x.j.ids.some(id=>j.ids.includes(id))):D.find(x=>x.j.bench&&x.j.ids.some(id=>j.ids.includes(id)));
  const dAge=d.age!=null&&d0.age!=null?d.age-d0.age:null,dFr=d.fr!=null&&d0.fr!=null?d.fr-d0.fr:null;
  const story=d.W?`Le ${tit} type au maillot ${j.n} a <b>${fmt.d1(d.age)} ans</b>. Il est français <b>${sur10(d.fr)} fois sur 10</b>${nat1?` ; quand il est étranger, il vient le plus souvent ${deCountry(nat1[0])} (${fmt.pct0(nat1[1])} des ${j.bench?'entrées en jeu':'titularisations'})`:''}. ${fmt.pct0(d.u23)} des ${j.bench?'entrées en jeu':'titularisations'} reviennent à des moins de 23 ans, ${fmt.pct0(d.o30)} à des 30 ans et plus.${d.mpm!=null?` Il joue en moyenne <b>${fmt.int(d.mpm)} minutes</b> ${j.bench?'quand il entre en jeu':'quand il débute le match'}.`:''}`:'Aucune donnée pour ce maillot sur ce périmètre.';
  const evo=s!==s0&&dAge!=null?`Depuis ${shortS(SEASONS[s0])} : âge ${Math.abs(dAge)<.05?'stable':(dAge>0?'+':'–')+nf(Math.abs(dAge))+' an'}, part de Français ${Math.abs(dFr)<.005?'stable':(dFr>0?'+':'–')+nf(Math.abs(dFr*100),0)+' pt'}.`:'';
  const cmp=twin&&twin.d.W?`${j.bench?'Le titulaire':'Son remplaçant'} type (maillot ${twin.j.n}) : ${fmt.d1(twin.d.age)} ans, français ${sur10(twin.d.fr)} fois sur 10${twin.d.mpm!=null?`, ${fmt.int(twin.d.mpm)} minutes ${j.bench?'par match débuté':'par entrée en jeu'}`:''}.`:'';
  main.innerHTML=`<section class="panel">
  <p class="intro">Le profil type de chaque maillot pour <b>${scopeName()}</b> : qui est titularisé à chaque poste, et qui s'assoit sur le banc. Chaque joueur compte en proportion de ses titularisations (maillots 1 à 15) ou de ses entrées en jeu (maillots 16 à 23). Sous chaque maillot : l'âge moyen, la part de Français et le temps de jeu moyen par match. Cliquez sur un maillot pour afficher sa fiche.</p>
  <div class="toolbar">
   <label for="eqS" class="count">Saison</label><select id="eqS">${withData.map(i=>`<option value="${i}" ${i===s?'selected':''}>${SEASONS[i]}</option>`).join('')}</select>
   <div class="chips" role="group" aria-label="Couleur des maillots"><button type="button" class="chip" data-c="fr" aria-pressed="${key==='fr'}">Couleur : part de Français</button><button type="button" class="chip" data-c="age" aria-pressed="${key==='age'}">Couleur : âge moyen</button><button type="button" class="chip" data-c="mpm" aria-pressed="${key==='mpm'}">Couleur : temps de jeu</button></div>
  </div>
  <div class="eq-wrap">
   <div class="card eq-left">
    <div class="pitch" id="pitch"><i class="ln l1"></i><i class="ln l2"></i><i class="ln l3"></i><span class="pt">Titulaires</span>${D.map((x,i)=>x.j.bench?'':node(x,i)).join('')}</div>
    <p class="sub" style="margin:12px 0 6px">Banc des remplaçants</p>
    <div class="bench">${D.map((x,i)=>x.j.bench?node(x,i):'').join('')}</div>
    ${key==='mpm'?`<div class="legend" style="margin-top:12px"><span>${klab} :</span><span><i style="background:${HP.bg[0]}"></i>${kfmt(lo)}</span><span><i style="background:${HP.bg[3]}"></i>${kfmt(hi)}</span></div>`:heatLegend(key)}
   </div>
   <div class="card eq-right">
    <span class="pill">Maillot ${j.n} · ${j.bench?'remplaçant':'titulaire'}</span>
    <h3 style="margin-top:6px">${j.name}</h3>
    <p class="eq-story">${story}</p>
    <div class="kpis" style="grid-template-columns:repeat(3,minmax(0,1fr));gap:8px">${[['Âge moyen',d.age==null?'–':fmt.d1(d.age)+' ans'],['Français',fmt.pct0(d.fr)],[j.bench?'Minutes par entrée':'Minutes par match débuté',d.mpm==null?'–':fmt.int(d.mpm)+' min'],['Moins de 23 ans',fmt.pct0(d.u23)],['30 ans et plus',fmt.pct0(d.o30)],[state.club>=0?'Joueurs utilisés':'Joueurs utilisés par club',nf(d.used)]].map(([l,v])=>`<div class="mini"><span class="lab">${l}</span><span class="val">${v}</span></div>`).join('')}</div>
    ${evo||cmp?`<p class="note" style="margin-top:10px">${[evo,cmp].filter(Boolean).join(' ')}</p>`:''}
    ${d.nats.length?`<p class="sub" style="margin:12px 0 4px">Principales nationalités étrangères</p><p class="eq-nats">${d.nats.slice(0,4).map(([n,v])=>`<span class="pill">${n} ${fmt.pct0(v)}</span>`).join(' ')}</p>`:''}
    <p class="sub" style="margin:12px 0 4px">Les plus ${j.bench?'souvent entrés en jeu':'souvent titularisés'} en ${shortS(SEASONS[s])}</p>
    <div class="tbl-wrap" style="border:0"><table class="wraphead"><thead><tr>${['Joueur','Âge',j.bench?'Entrées':'Titul.'].map(h=>`<th style="cursor:default">${h}</th>`).join('')}</tr></thead><tbody>
    ${d.pl.slice(0,8).map(({r,w})=>`<tr><td style="white-space:normal">${r.name}<br><span class="note">${r.teams.map(t=>tn(DS.teams[t])).join(' / ')}${r.nat&&r.nat!=='France'?' · '+r.nat:''}</span></td><td>${r.age==null?'–':Math.floor(r.age)}</td><td>${nf(w)}</td></tr>`).join('')}
    </tbody></table></div>
   </div>
  </div>
  ${duel}
  <div class="card"><h3>Les 23 maillots en un coup d'œil</h3><p class="sub">${shortS(SEASONS[s])}${s!==s0?`, avec l'écart depuis ${shortS(SEASONS[s0])}`:''}</p>
   <div class="tbl-wrap" style="border:0"><table class="wraphead" id="eqT"><thead><tr>${['Maillot','Poste','Temps de jeu moyen','Évol.','Âge moyen','Évol.','Français','Évol.','Moins de 23 ans','30 ans et +','1re nationalité étrangère'].map((h,i)=>`<th style="cursor:default${i===1||i===10?';text-align:left':''}">${h}</th>`).join('')}</tr></thead><tbody>
   ${D.map((x,i)=>{const a=x.d.age!=null&&x.d0.age!=null?x.d.age-x.d0.age:null,f=x.d.fr!=null&&x.d0.fr!=null?x.d.fr-x.d0.fr:null;return `<tr data-i="${i}" style="cursor:pointer"${i===state.eqSel?' aria-selected="true"':''}><td><b>${x.j.n}</b></td><td style="text-align:left">${x.j.name}${x.j.bench?' <span class="note">(banc)</span>':''}</td><td>${x.d.mpm==null?'–':fmt.int(x.d.mpm)+' min'}</td><td>${x.d.mpm==null||x.d0.mpm==null||s===s0?'':Math.abs(x.d.mpm-x.d0.mpm)<.5?'=':(x.d.mpm>x.d0.mpm?'+':'–')+fmt.int(Math.abs(x.d.mpm-x.d0.mpm))+' min'}</td><td>${fmt.d1(x.d.age)}</td><td>${a==null||s===s0?'':Math.abs(a)<.05?'=':(a>0?'+':'–')+nf(Math.abs(a))}</td><td>${fmt.pct0(x.d.fr)}</td><td>${f==null||s===s0?'':Math.abs(f)<.005?'=':(f>0?'+':'–')+nf(Math.abs(f*100),0)+' pt'}</td><td>${fmt.pct0(x.d.u23)}</td><td>${fmt.pct0(x.d.o30)}</td><td style="text-align:left">${x.d.nats[0]?x.d.nats[0][0]+' ('+fmt.pct0(x.d.nats[0][1])+')':'–'}</td></tr>`}).join('')}
   </tbody></table></div></div>
  <details class="method"><summary>Méthode et limites</summary><ul>
   <li>L'export donne, pour chaque joueur, ses titularisations, ses entrées en jeu et la liste des postes occupés, mais pas le détail match par match. Les titularisations d'un joueur aligné à plusieurs postes sont réparties à parts égales entre ces postes.</li>
   <li>Le temps de jeu moyen est une estimation : l'export donne le total de minutes de chaque joueur, pas ses minutes match par match. Pour chaque poste, on calcule combien de minutes vaut en moyenne une titularisation et combien vaut une entrée en jeu, à partir des minutes, titularisations et entrées en jeu de tous les joueurs du poste.</li>
   <li>Le banc suit la composition la plus courante : 16 talonneur, 17 et 18 piliers, 19 deuxième ligne, 20 troisième ligne, 21 demi de mêlée, 22 ouvreur ou centre, 23 ailier ou arrière. Les bancs à six avants ne sont pas distingués.</li>
   <li>« Français » : joueur sélectionné par la France, ou non international de nationalité française.</li>
   <li>Face-à-face : chaque profil est calculé sur les seuls joueurs du groupe (français ou étrangers). La « part » est celle du groupe dans les titularisations du maillot (entrées en jeu pour le banc).</li></ul></details>
  </section>`;
  const pick=e=>{const b=e.target.closest('[data-i]');if(!b)return;state.eqSel=+b.dataset.i;const y=window.scrollY;renderEquipe();window.scrollTo(0,y)};
  main.querySelector('.eq-left').onclick=pick;document.getElementById('eqT').onclick=pick;
  document.getElementById('eqS').onchange=e=>{state.eqSeason=+e.target.value;renderEquipe()};
  main.querySelector('.toolbar .chips').onclick=e=>{const b=e.target.closest('button');if(!b)return;state.eqColor=b.dataset.c;renderEquipe()};
}
function renderPlayers(){
  const q=state.playerQ.trim().toLowerCase();const norm=s=>s.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();const qn=norm(q);
  let rows=ROWS.filter(r=>(state.playerSeason<0||r.s===state.playerSeason)&&(state.club<0||r.teams.includes(state.club))&&(state.playerLine<0||r.lw.some(([i])=>i===state.playerLine))&&(!qn||norm(r.name).includes(qn)));
  const k=state.playerSort.k,d=state.playerSort.dir;
  const val=(r,k)=>k==='name'?r.name:k==='season'?r.s:k==='age'?(r.age??-1):k==='nat'?(r.nat||'~'):k==='club'?tn(DS.teams[r.teams[0]]):r[k];
  rows.sort((a,b)=>{const x=val(a,k),y=val(b,k);return typeof x==='string'?d*x.localeCompare(y,'fr'):d*(x-y)});
  const shown=rows.slice(0,300);
  const cols=[['name','Joueur'],['season','Saison'],['club','Club'],['pos','Postes'],['nat','Nationalité'],['age','Âge'],['mp','Matchs'],['st','Titulaire'],['sb','Remplaçant'],['min','Minutes'],['prof','Profil']];
  main.innerHTML=`<section class="panel">
  <div class="toolbar">
   <input type="search" id="pq" placeholder="Rechercher un joueur" value="${state.playerQ.replace(/"/g,'&quot;')}" aria-label="Rechercher un joueur">
   <select id="ps" aria-label="Saison"><option value="-1">Toutes les saisons</option>${SEASONS.map((x,i)=>`<option value="${i}" ${i===state.playerSeason?'selected':''}>${x}</option>`).join('')}</select>
   <select id="pl" aria-label="Poste"><option value="-1">Tous les postes</option>${LINES.map((l,i)=>`<option value="${i}" ${i===state.playerLine?'selected':''}>${l.n}</option>`).join('')}</select>
   <span class="count">${rows.length.toLocaleString('fr-FR')} lignes joueur-saison${rows.length>300?' · 300 premières affichées':''}</span>
  </div>
  <div class="tbl-wrap" style="max-height:70vh;overflow:auto"><table id="pt"><thead><tr>${cols.map(([c,n])=>`<th tabindex="0" data-k="${c}" aria-sort="${c===k?(d>0?'ascending':'descending'):'none'}">${n}</th>`).join('')}</tr></thead><tbody>
  ${shown.map(r=>`<tr><td>${r.name}</td><td>${shortS(SEASONS[r.s])}</td><td>${r.teams.map(t=>tn(DS.teams[t])).join(' / ')}</td><td style="text-align:left">${r.lw.map(([i])=>LINES[i].n).join(', ')||'–'}</td><td style="text-align:left">${r.nat||'–'}</td><td>${r.age==null?'–':Math.floor(r.age)}</td><td>${r.mp}</td><td>${r.st}</td><td>${r.sb}</td><td>${r.min.toLocaleString('fr-FR')}</td><td style="text-align:left"><span class="pill">${PROF[r.prof].n}</span></td></tr>`).join('')}
  </tbody></table></div></section>`;
  const pq=document.getElementById('pq');pq.oninput=()=>{state.playerQ=pq.value;const pos=pq.selectionStart;renderPlayers();const n=document.getElementById('pq');n.focus();n.setSelectionRange(pos,pos)};
  document.getElementById('ps').onchange=e=>{state.playerSeason=+e.target.value;renderPlayers()};
  document.getElementById('pl').onchange=e=>{state.playerLine=+e.target.value;renderPlayers()};
  const sortH=e=>{const th=e.target.closest('th');if(!th||th.dataset.k==='pos')return;const kk=th.dataset.k;state.playerSort={k:kk,dir:state.playerSort.k===kk?-state.playerSort.dir:(['name','club','nat'].includes(kk)?1:-1)};renderPlayers()};
  const t=document.getElementById('pt');t.onclick=sortH;t.onkeydown=e=>{if(e.key==='Enter')sortH(e)};
}
function methodNote(){return `<details class="method"><summary>Méthode et limites des données</summary><ul>
 <li>Source : export joueurs-saisons ${DS.label} (${DS.rows.length.toLocaleString('fr-FR')} lignes, ${SEASONS[0]} à ${SEASONS[SEASONS.length-1]}).</li>
 <li>Âge calculé au 1er janvier de chaque saison ; ${DS.rows.filter(r=>r[7]==null).length} lignes sans date de naissance exploitable sont exclues des indicateurs d'âge.</li>
 <li>L'export liste les postes occupés sans leur répartition : un joueur polyvalent est réparti à parts égales entre ses lignes de poste (ex. 2e ligne / 3e ligne = 50 % chacune). ${DS.rows.filter(r=>!r[8]).length} lignes sans poste sont exclues des indicateurs par poste.</li>
 <li>Joueurs transférés en cours de saison : les minutes ne sont pas ventilées par club ; en vue « Tous les clubs » ils comptent pour chacun de leurs clubs dans le nombre de joueurs utilisés par club.</li>
 <li>2019/20 : championnat arrêté après ${COVID_J[state.champ]} journées (Covid). Les ratios restent lisibles, les volumes ne sont pas comparables.</li></ul></details>`}

let rz;window.addEventListener('resize',()=>{clearTimeout(rz);rz=setTimeout(()=>{if(state.space==='compos'||['synthese','age','postes','statut','nationalite','vivier'].includes(state.tab))render()},150)});
const mq=window.matchMedia('(prefers-color-scheme: dark)');mq.addEventListener&&mq.addEventListener('change',render);
new MutationObserver(render).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
const CP=COMPOS?createCompos(COMPOS,{main,state,fmt,nf,css,tn,card,insCard,insList,lineChart,stackChart,heatTable}):null;
prepare();renderShell();render();
}

const mainEl=document.getElementById('main');
mainEl.innerHTML='<p class="intro">Chargement des données…</p>';
Promise.all([loadData(),loadCompos().catch(e=>{console.warn(e);return null})]).then(([d,c])=>boot(d,c)).catch(err=>{console.error(err);mainEl.innerHTML=`<div class="empty"><h3>Données indisponibles</h3><p>Le chargement a échoué : ${err.message||err}. Vérifiez la connexion à Supabase (variables VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY).</p></div>`});
