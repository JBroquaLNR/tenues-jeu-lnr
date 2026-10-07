// Espace « Compositions » : indicateurs tirés des feuilles de match (public/data/compos.json,
// produit par scripts/build_compos.py). H regroupe les outils d'affichage définis dans main.js.
export function createCompos(D, H) {
  const { main, state, fmt, nf, css, tn, card, insCard, insList, lineChart, stackChart, heatTable } = H;
  const SE = D.seasons, NS = SE.length;
  const shortS = (s) => s.slice(2);
  const TM = D.tm.map((r) => ({ c: r[0], s: r[1], date: r[2], t: r[3], opp: r[4], home: r[5], res: r[6], lg: r[7], j: r[8], regs: r[9], intl: r[10], chg: r[11],
    subs: r[12], subMin: r[13], first: r[14], m1: r[15], m2: r[16], m3: r[17], m4: r[18], m5: r[19], age: r[20], u23: r[21], fr: r[22], cat: r[23], abs: r[24], nIntl: r[25], sc: r[26], sco: r[27] }));
  const PL = D.pl.map((r) => ({ name: r[0], t: r[1], lg: r[2], s: r[3], mL: r[4], mE: r[5], mI: r[6], tot: r[4] + r[5] + r[6], matches: r[7], starts: r[8], streak: r[9], short: r[10],
    age: r[11], nat: r[12], intl: r[13], reg: r[14], natTeam: r[15], nI: r[16] }));
  const cs = { season: -1, club: -1, read: 'regs', sortClub: {} };
  const TABS = [['csynth', 'Synthèse'], ['cdoublons', 'Doublons'], ['ctemps', 'Temps de jeu'], ['ccompos', 'Compositions & impasses'], ['cchg', 'Changements'], ['cench', 'Enchaînements']];
  const TABN = Object.fromEntries(TABS);
  const LG = () => (state.champ === 'top14' ? 'T14' : 'PD2');
  const LGN = () => (state.champ === 'top14' ? 'TOP 14' : 'PRO D2');
  const CATN = ['Journée normale', 'Doublon', 'Faux doublon'];
  const CN = { T14: 'TOP 14', PD2: 'PRO D2', CC: 'Champions Cup', CH: 'Challenge Cup', '6N': 'Six Nations', INT: 'Tests internationaux', RWC: 'Coupe du monde 2023' };

  // ---------- outils ----------
  const mean = (a, f) => { let s = 0, n = 0; a.forEach((r) => { const v = f(r); if (v != null && !Number.isNaN(v)) { s += v; n++; } }); return n ? s / n : null; };
  const rate = (a, f) => (a.length ? a.filter(f).length / a.length : null);
  const inS = (r) => cs.season < 0 || r.s === cs.season;
  const inC = (r) => cs.club < 0 || r.t === cs.club;
  const league = (all) => TM.filter((r) => r.c === LG() && r.lg === LG() && (all || inS(r)) && inC(r));
  const clubAll = (all) => TM.filter((r) => r.lg === LG() && ['T14', 'PD2', 'CC', 'CH'].includes(r.c) && (all || inS(r)) && inC(r));
  const players = (all) => PL.filter((r) => r.lg === LG() && (all || inS(r)) && inC(r));
  const clubs = () => [...new Set(TM.filter((r) => r.lg === LG() && r.c === LG()).map((r) => r.t))].sort((a, b) => tn(D.teams[a]).localeCompare(tn(D.teams[b]), 'fr'));
  const scope = () => `${cs.club >= 0 ? tn(D.teams[cs.club]) : LGN()}${cs.season >= 0 ? ', ' + SE[cs.season] : ', ' + SE[0] + ' à ' + SE[NS - 1]}`;
  const bySeason = (rows, f) => SE.map((_, s) => f(rows.filter((r) => r.s === s)));
  const pts = (d) => (d == null ? '' : Math.abs(d) < 0.0005 ? '=' : `${d > 0 ? '+' : '–'}${nf(Math.abs(d * 100))} pt`);
  const sgn = (d, dec = 1) => (d == null ? '' : Math.abs(d) < 0.05 ? '=' : `${d > 0 ? '+' : '–'}${nf(Math.abs(d), dec)}`);
  const lieu = (r) => (r.home ? 'Domicile' : 'Extérieur');
  const dfr = (d) => `${d.slice(8)}/${d.slice(5, 7)}/${d.slice(2, 4)}`;
  const toolbar = () => `<div class="toolbar"><label for="cSeason" class="count">Saison</label><select id="cSeason"><option value="-1">Les quatre saisons</option>${SE.map((s, i) => `<option value="${i}" ${i === cs.season ? 'selected' : ''}>${s}</option>`).join('')}</select><span class="count">${scope()}</span></div>`;
  const bind = (fn) => { const el = document.getElementById('cSeason'); if (el) el.onchange = () => { cs.season = +el.value; fn(); }; };
  const kpi = (lab, val, cmp) => `<div class="kpi"><span class="lab">${lab}</span><span class="val">${val}</span><span class="cmp">${cmp || ''}</span></div>`;
  const bars = (items, f = fmt.d1, max) => { const mx = max || Math.max(...items.map((i) => i.v || 0)); return `<div class="bars">${items.map((i) => `<div class="bar-row${i.hl ? ' hl' : ''}"><span class="bl">${i.n}</span><span class="bt"><i style="width:${i.v == null ? 0 : Math.max(2, Math.round((i.v / mx) * 100))}%"></i></span><span class="bv">${i.v == null ? '–' : f(i.v)}</span></div>`).join('')}</div>`; };
  const table = (id, cols, rows, sortKey) => {
    const st = cs.sortClub[id] || { k: sortKey, dir: -1 };
    const sorted = [...rows].sort((a, b) => { const x = a[st.k], y = b[st.k]; return typeof x === 'string' ? st.dir * x.localeCompare(y, 'fr') : st.dir * ((x ?? -1e9) - (y ?? -1e9)); });
    return `<div class="tbl-wrap" style="border:0"><table class="wraphead" id="${id}"><thead><tr>${cols.map((c) => `<th tabindex="0" data-k="${c.k}" aria-sort="${c.k === st.k ? (st.dir > 0 ? 'ascending' : 'descending') : 'none'}"${c.left ? ' style="text-align:left"' : ''}>${c.n}</th>`).join('')}</tr></thead><tbody>${sorted.map((r) => `<tr>${cols.map((c) => `<td${c.left ? ' style="text-align:left;white-space:normal"' : ''}>${c.f ? c.f(r[c.k], r) : r[c.k] ?? '–'}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  };
  const bindTable = (id, sortKey, fn) => { const t = document.getElementById(id); if (!t) return; const h = (e) => { const th = e.target.closest('th'); if (!th) return; const k = th.dataset.k; const st = cs.sortClub[id] || { k: sortKey, dir: -1 }; cs.sortClub[id] = { k, dir: st.k === k ? -st.dir : (k === 'name' ? 1 : -1) }; fn(); }; t.querySelector('thead').onclick = h; t.querySelector('thead').onkeydown = (e) => { if (e.key === 'Enter') h(e); }; };
  const lc = (id, series, yfmt, tickfmt, zero) => lineChart(document.getElementById(id), { labels: SE.map(shortS), series, yfmt, tickfmt: tickfmt || yfmt, zero, h: 220 });

  // ---------- comparaison entre compétitions ----------
  function compTable() {
    const fam = (label, f) => { const a = TM.filter((r) => inS(r) && f(r)); return { n: label, hl: label === LGN(), m: a.length, subs: mean(a, (r) => r.subs), subMin: mean(a, (r) => r.subMin), first: mean(a, (r) => r.first), m1: mean(a, (r) => r.m1), chg: mean(a, (r) => r.chg) }; };
    const fr = (r) => r.lg === 'T14' || r.lg === 'PD2';
    return [fam('TOP 14', (r) => r.c === 'T14'), fam('PRO D2', (r) => r.c === 'PD2'),
      fam('Champions Cup · clubs français', (r) => r.c === 'CC' && fr(r)), fam('Champions Cup · clubs étrangers', (r) => r.c === 'CC' && !fr(r)),
      fam('Challenge Cup · clubs français', (r) => r.c === 'CH' && fr(r)), fam('Challenge Cup · clubs étrangers', (r) => r.c === 'CH' && !fr(r)),
      fam('Six Nations', (r) => r.c === '6N'), fam('Tests et Coupe du monde', (r) => r.c === 'INT' || r.c === 'RWC')];
  }
  const compTableHtml = () => { const rows = compTable(); return `<div class="tbl-wrap" style="border:0"><table class="wraphead"><thead><tr>${['Compétition', 'Équipes-matchs', 'Remplaçants utilisés', 'Minutes jouées par un remplaçant', 'Minute du premier changement', 'Minutes d’un première ligne titulaire', 'Changements dans le XV d’un match à l’autre'].map((h, i) => `<th style="cursor:default${i ? '' : ';text-align:left'}">${h}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr${r.hl ? ' aria-selected="true"' : ''}><td style="text-align:left"><b>${r.n}</b></td><td>${fmt.int(r.m)}</td><td>${nf(r.subs, 2)}</td><td>${nf(r.subMin)}</td><td>${r.first == null ? '–' : fmt.int(r.first) + 'e'}</td><td>${nf(r.m1)}</td><td>${nf(r.chg)}</td></tr>`).join('')}</tbody></table></div>`; };

  // ---------- constats calculés ----------
  function insights() {
    const out = {}; const L = league(), P = players();
    // doublons
    const byCat = [0, 1, 2].map((k) => L.filter((r) => r.cat === k));
    if (byCat[1].length + byCat[2].length) {
      const u = byCat.map((a) => mean(a, (r) => r.u23)), f = byCat.map((a) => mean(a, (r) => r.fr)), g = byCat.map((a) => mean(a, (r) => r.regs));
      const cl = clubDoublons().filter((c) => c.abs != null).sort((a, b) => b.abs - a.abs);
      out.cdoublons = [
        `Sur un doublon, les moins de 23 ans jouent <b>${fmt.pct(u[1])}</b> des minutes, contre ${fmt.pct(u[0])} sur une journée normale (${pts(u[1] - u[0])}).`,
        `La part des joueurs français passe de ${fmt.pct(f[0])} à <b>${fmt.pct(f[2])}</b> sur un faux doublon (${pts(f[2] - f[0])}) et à ${fmt.pct(f[1])} sur un doublon.`,
        `Un club aligne en moyenne <b>${nf(g[1])}</b> de ses 15 titulaires habituels sur un doublon, contre ${nf(g[0])} en temps normal.`,
        cs.club < 0 && cl.length ? `Club le plus touché : <b>${cl[0].name}</b>, avec ${nf(cl[0].abs)} internationaux absents par journée concernée ; il donne alors ${pts(cl[0].du23)} de temps de jeu aux moins de 23 ans.` : ''].filter(Boolean);
    }
    // temps de jeu
    if (P.length) {
      const n30 = P.filter((p) => p.matches >= 30).length, n2000 = P.filter((p) => p.tot >= 2000).length;
      const F = P.filter((p) => p.intl && p.natTeam === 'France'); const I = F.length >= 5 ? F : P.filter((p) => p.intl), O = P.filter((p) => !p.intl && p.reg); const IN = F.length >= 5 ? 'international français' : 'international'; const top = [...P].sort((a, b) => b.tot - a.tot)[0];
      const hors = I.reduce((s, p) => s + p.mE + p.mI, 0) / Math.max(1, I.reduce((s, p) => s + p.tot, 0));
      out.ctemps = [
        cs.season < 0 ? `Sur les ${NS} saisons, la barre des 30 matchs dans une saison a été atteinte à <b>${n30} reprise${n30 > 1 ? 's' : ''}</b>, et celle des 2 000 minutes à <b>${n2000} reprise${n2000 > 1 ? 's' : ''}</b>, toutes compétitions confondues.` : `<b>${n30}</b> joueur${n30 > 1 ? 's ont' : ' a'} disputé 30 matchs ou plus, et <b>${n2000}</b> ${n2000 > 1 ? 'ont' : 'a'} dépassé 2 000 minutes, toutes compétitions confondues.`,
        I.length && O.length ? `Un ${IN} joue en moyenne <b>${fmt.int(mean(I, (p) => p.tot))} minutes</b> en ${nf(mean(I, (p) => p.matches))} matchs par saison, contre ${fmt.int(mean(O, (p) => p.tot))} minutes en ${nf(mean(O, (p) => p.matches))} matchs pour un titulaire habituel non international. ${fmt.pct0(hors)} de ses minutes sont jouées hors championnat.` : '',
        top ? `Joueur le plus utilisé : <b>${top.name}</b> (${tn(D.teams[top.t])}, ${SE[top.s]}) avec ${fmt.int(top.tot)} minutes en ${top.matches} matchs${top.mI ? `, dont ${fmt.int(top.mI)} en sélection` : ''}.` : ''].filter(Boolean);
    }
    // compositions
    const withR = L.filter((r) => r.regs != null);
    if (withR.length) {
      const dom = mean(withR.filter((r) => r.home), (r) => r.regs), ext = mean(withR.filter((r) => !r.home), (r) => r.regs);
      const imp = withR.filter((r) => r.regs <= 6); const eu = (c) => mean(TM.filter((r) => r.lg === LG() && r.c === c && inS(r) && inC(r)), (r) => r.regs);
      out.ccompos = [
        `Un club aligne en moyenne <b>${nf(dom)}</b> de ses 15 titulaires habituels à domicile et <b>${nf(ext)}</b> à l'extérieur.`,
        `<b>${fmt.pct0(imp.length / withR.length)}</b> des matchs sont joués avec 6 titulaires habituels ou moins. ${fmt.pct0(rate(imp, (r) => !r.home))} de ces matchs ont lieu à l'extérieur, et ${fmt.pct0(rate(imp, (r) => r.res === 'V'))} sont gagnés (${fmt.pct0(rate(withR.filter((r) => r.regs > 6), (r) => r.res === 'V'))} pour les autres).`,
        eu('CH') != null ? `En Challenge Cup, les clubs alignent <b>${nf(eu('CH'))}</b> titulaires habituels${eu('CC') != null ? `, contre ${nf(eu('CC'))} en Champions Cup` : ''} et ${nf(mean(withR, (r) => r.regs))} en championnat.` : (eu('CC') != null ? `En Champions Cup, les clubs alignent ${nf(eu('CC'))} titulaires habituels, contre ${nf(mean(withR, (r) => r.regs))} en championnat.` : '')].filter(Boolean);
    }
    // changements
    if (L.length) {
      const ct = compTable(); const me = ct.find((r) => r.n === LGN()), cc = ct.find((r) => r.n === 'Champions Cup · clubs étrangers'), six = ct.find((r) => r.n === 'Six Nations');
      const ch = bySeason(league(true), (a) => mean(a, (r) => r.chg)).filter((v) => v != null);
      out.cchg = [
        `En ${LGN()}, un remplaçant joue en moyenne <b>${nf(me.subMin)} minutes</b>, contre ${nf(cc.subMin)} pour un club étranger en Champions Cup et ${nf(six.subMin)} dans le Six Nations.`,
        `Un première ligne titulaire joue <b>${nf(me.m1)} minutes</b> en ${LGN()}, contre ${nf(six.m1)} dans le Six Nations.`,
        ch.length > 1 ? `D'un match à l'autre, un club change en moyenne <b>${nf(ch[ch.length - 1])}</b> joueurs de son XV de départ en ${SE[NS - 1]}, contre ${nf(ch[0])} en ${SE[0]}.` : ''].filter(Boolean);
    }
    // enchaînements
    if (P.length) {
      const n8 = P.filter((p) => p.streak >= 8).length; const rec = [...P].sort((a, b) => b.streak - a.streak)[0]; const F = P.filter((p) => p.intl && p.natTeam === 'France'); const I = F.length >= 5 ? F : P.filter((p) => p.intl), R = P.filter((p) => !p.intl && p.reg); const IN = F.length >= 5 ? 'international français' : 'international';
      out.cench = [
        cs.season < 0 ? `Sur les ${NS} saisons, un joueur a enchaîné 8 semaines de match consécutives ou plus à <b>${n8} reprise${n8 > 1 ? 's' : ''}</b>.` : `<b>${n8}</b> joueur${n8 > 1 ? 's ont' : ' a'} enchaîné 8 semaines de match consécutives ou plus.`,
        rec ? `Plus longue série : <b>${rec.streak} semaines</b> pour ${rec.name} (${tn(D.teams[rec.t])}, ${SE[rec.s]}).` : '',
        I.length && R.length ? `Un ${IN} dispute en moyenne <b>${nf(mean(I, (p) => p.matches))} matchs</b> par saison, contre ${nf(mean(R, (p) => p.matches))} pour un titulaire habituel non international. Sa plus longue série est de ${nf(mean(I, (p) => p.streak))} semaines en moyenne, contre ${nf(mean(R, (p) => p.streak))}.` : ''].filter(Boolean);
    }
    return out;
  }
  const theme = (key, items) => (items && items.length ? `<div class="card theme"><div class="card-head"><h3>${TABN[key]}</h3><button type="button" class="chip" data-go="${key}">Voir l'onglet</button></div>${insList(items.slice(0, 3))}</div>` : '');

  // ---------- Synthèse ----------
  function rSynth() {
    const I = insights();
    main.innerHTML = `<section class="panel">
    <p class="intro">Ce que disent les feuilles de match : qui joue, combien de temps, à quel rythme, et comment les clubs composent leurs équipes. La page situe d'abord nos championnats face aux coupes d'Europe et au niveau international, puis résume chaque thème avec un renvoi vers l'onglet détaillé.</p>
    ${toolbar()}
    <div class="card viv"><h3>${LGN()} face aux autres compétitions</h3><p class="sub">Gestion des remplacements et rotation des équipes${cs.season >= 0 ? ', saison ' + SE[cs.season] : ', moyenne des quatre saisons'}. Les fichiers ne contiennent aucun autre championnat national : la comparaison porte sur les coupes d'Europe et les matchs internationaux.</p>${compTableHtml()}</div>
    <div><h3 class="sec">À retenir par thème</h3></div>
    <div class="grid2">${theme('cdoublons', I.cdoublons)}${theme('ctemps', I.ctemps)}${theme('ccompos', I.ccompos)}${theme('cchg', I.cchg)}${theme('cench', I.cench)}</div>
    ${method()}
    </section>`;
    bind(rSynth);
  }

  // ---------- Doublons ----------
  function clubDoublons() {
    const L = TM.filter((r) => r.c === LG() && r.lg === LG() && inS(r));
    return clubs().map((t) => { const a = L.filter((r) => r.t === t); const n = a.filter((r) => r.cat === 0), d = a.filter((r) => r.cat > 0); if (!d.length || !n.length) return null;
      const dd = (f) => mean(d, f) - mean(n, f);
      return { t, name: tn(D.teams[t]), nd: d.length, abs: mean(d, (r) => r.abs), du23: dd((r) => r.u23), dfr: dd((r) => r.fr), dage: dd((r) => r.age), dregs: dd((r) => r.regs), vn: rate(n, (r) => r.res === 'V'), vd: rate(d, (r) => r.res === 'V') }; }).filter(Boolean);
  }
  function rDoublons() {
    const L = league(); const byCat = [0, 1, 2].map((k) => L.filter((r) => r.cat === k)); const I = insights();
    const row = (lab, f, ff) => `<tr><td style="text-align:left"><b>${lab}</b></td>${byCat.map((a) => `<td>${ff(mean(a, f))}</td>`).join('')}<td>${byCat[1].length ? (ff === fmt.pct ? pts(mean(byCat[1], f) - mean(byCat[0], f)) : sgn(mean(byCat[1], f) - mean(byCat[0], f))) : ''}</td><td>${byCat[2].length ? (ff === fmt.pct ? pts(mean(byCat[2], f) - mean(byCat[0], f)) : sgn(mean(byCat[2], f) - mean(byCat[0], f))) : ''}</td></tr>`;
    const cl = clubDoublons(); const rounds = D.rounds.filter((r) => r[3] && (cs.season < 0 || r[0] === cs.season));
    main.innerHTML = `<section class="panel">
    <p class="intro">Que deviennent les effectifs quand les internationaux sont absents ? Un <b>doublon</b> est une journée de championnat jouée le même week-end qu'un match du XV de France. Un <b>faux doublon</b> est une journée où la France ne joue pas, mais où ses internationaux restent indisponibles (rassemblement, semaine de pause du Tournoi, repos).</p>
    ${toolbar()}
    ${I.cdoublons ? insCard(I.cdoublons) : ''}
    <div class="card"><h3>Profil des équipes alignées selon le type de journée</h3><p class="sub">${scope()} · moyennes par équipe et par match, pondérées par les minutes jouées</p>
     <div class="tbl-wrap" style="border:0"><table class="wraphead"><thead><tr>${['Indicateur', ...CATN.map((n, k) => `${n} (${byCat[k].length} matchs)`), 'Écart doublon', 'Écart faux doublon'].map((h, i) => `<th style="cursor:default${i ? '' : ';text-align:left'}">${h}</th>`).join('')}</tr></thead><tbody>
     ${row('Âge moyen sur le terrain', (r) => r.age, fmt.d1)}${row('Minutes des moins de 23 ans', (r) => r.u23, fmt.pct)}${row('Minutes des joueurs français', (r) => r.fr, fmt.pct)}${row('Titulaires habituels alignés (sur 15)', (r) => r.regs, fmt.d1)}${row('Internationaux du club absents', (r) => r.abs, fmt.d1)}${row('Victoires', (r) => (r.res === 'V' ? 1 : 0), fmt.pct)}
     </tbody></table></div></div>
    <div class="grid2">
     ${card('Temps de jeu des moins de 23 ans', 'Part des minutes, par saison et par type de journée', 'd1')}
     ${card('Temps de jeu des joueurs français', 'Part des minutes, par saison et par type de journée', 'd2')}
    </div>
    ${cs.club < 0 ? `<div class="card"><h3>Stratégie des clubs sur les doublons et faux doublons</h3><p class="sub">Écarts entre les journées concernées et les journées normales du club. « Internationaux absents » : joueurs du club sélectionnés par n'importe quelle nation dans les quatre semaines autour de la journée, et non alignés en club. Cliquez sur un en-tête pour trier.</p>
     ${table('tDbl', [{ k: 'name', n: 'Club', left: 1 }, { k: 'nd', n: 'Matchs concernés' }, { k: 'abs', n: 'Internationaux absents', f: (v) => nf(v) }, { k: 'du23', n: 'Minutes des moins de 23 ans', f: pts }, { k: 'dfr', n: 'Minutes des Français', f: pts }, { k: 'dage', n: 'Âge moyen', f: (v) => sgn(v) + (v != null && Math.abs(v) >= 0.05 ? ' an' : '') }, { k: 'dregs', n: 'Titulaires habituels', f: (v) => sgn(v) }, { k: 'vn', n: 'Victoires, journées normales', f: fmt.pct0 }, { k: 'vd', n: 'Victoires, journées concernées', f: fmt.pct0 }], cl, 'abs')}
     <p class="note">Les taux de victoire reposent sur peu de matchs par club : à lire comme une tendance.</p></div>` : ''}
    <div class="card"><h3>Journées classées en doublon ou faux doublon</h3><p class="sub">Journées de TOP 14${LG() === 'PD2' ? ' ; le PRO D2 est classé sur les mêmes week-ends' : ''}. « Internationaux français alignés » : joueurs sélectionnés par la France dans les quatre semaines autour de la journée, et alignés en club ce week-end.</p>
     <div class="tbl-wrap" style="border:0"><table class="wraphead"><thead><tr>${['Saison', 'Journée', 'Date', 'Type', 'Internationaux français alignés en club'].map((h, i) => `<th style="cursor:default${i < 1 || i === 3 ? ';text-align:left' : ''}">${h}</th>`).join('')}</tr></thead><tbody>
     ${rounds.map((r) => `<tr><td style="text-align:left">${SE[r[0]]}</td><td>J${r[1]}</td><td>${dfr(r[2])}</td><td style="text-align:left"><span class="pill">${CATN[r[3]]}</span></td><td>${r[5]} sur ${r[4]}</td></tr>`).join('')}
     </tbody></table></div></div>
    ${method()}
    </section>`;
    bind(rDoublons); bindTable('tDbl', 'abs', rDoublons);
    const A = league(true); const ser = (f) => [0, 1, 2].map((k) => ({ name: CATN[k], color: css(['--s1', '--s2', '--s3'][k]), values: bySeason(A.filter((r) => r.cat === k), (a) => mean(a, f)) }));
    lc('d1', ser((r) => r.u23), fmt.pct, fmt.pct0); lc('d2', ser((r) => r.fr), fmt.pct, fmt.pct0);
  }

  // ---------- Temps de jeu ----------
  const BANDS = [[0, 400, 'Moins de 400 min'], [400, 800, '400 à 800'], [800, 1200, '800 à 1 200'], [1200, 1600, '1 200 à 1 600'], [1600, 2000, '1 600 à 2 000'], [2000, 1e9, '2 000 min et plus']];
  const NATFR = { Georgia: 'Géorgie', Argentina: 'Argentine', Fiji: 'Fidji', Italy: 'Italie', Spain: 'Espagne', Scotland: 'Écosse', Romania: 'Roumanie', 'South Africa': 'Afrique du Sud', USA: 'États-Unis', Wales: 'Pays de Galles', Australia: 'Australie', Namibia: 'Namibie', England: 'Angleterre', Chile: 'Chili', Japan: 'Japon', Belgium: 'Belgique', 'New Zealand': 'Nouvelle-Zélande', Ireland: 'Irlande', Germany: 'Allemagne', Netherlands: 'Pays-Bas' };
  const natFr = (n) => NATFR[n] || n;
  const groupOf = (p) => (p.intl ? (p.natTeam === 'France' ? 0 : 1) : p.reg ? 2 : 3); const GN = ['Internationaux français', 'Internationaux d’autres nations', 'Titulaires habituels non internationaux', 'Autres joueurs']; const GI = [0, 1, 2, 3];
  function rTemps() {
    const P = players(), PA = players(true), I = insights();
    const top = [...P].sort((a, b) => b.tot - a.tot).slice(0, 25);
    const grp = GI.map((g) => { const a = P.filter((p) => groupOf(p) === g); const t = a.reduce((s, p) => s + p.tot, 0) || 1; return { n: GN[g], k: a.length, tot: mean(a, (p) => p.tot), matches: mean(a, (p) => p.matches), l: a.reduce((s, p) => s + p.mL, 0) / t, e: a.reduce((s, p) => s + p.mE, 0) / t, i: a.reduce((s, p) => s + p.mI, 0) / t }; }).filter((g) => g.k);
    const cl = clubs().map((t) => { const a = PL.filter((p) => p.lg === LG() && p.t === t && inS(p)); if (!a.length) return null; const ns = new Set(a.map((p) => p.s)).size; return { name: tn(D.teams[t]), used: a.length / ns, n1500: a.filter((p) => p.tot >= 1500).length / ns, n30: a.filter((p) => p.matches >= 30).length / ns, intl: a.filter((p) => p.intl).length / ns, max: Math.max(...a.map((p) => p.tot)) }; }).filter(Boolean);
    main.innerHTML = `<section class="panel">
    <p class="intro">La charge de chaque joueur de ${LGN()}, toutes compétitions confondues : championnat, coupes d'Europe et sélection nationale. Un joueur est rattaché au club avec lequel il a joué le plus de matchs de championnat dans la saison.</p>
    ${toolbar()}
    ${I.ctemps ? insCard(I.ctemps) : ''}
    <div class="grid2">
     ${card('Joueurs les plus sollicités', 'Nombre de joueurs à 30 matchs ou plus, et à 2 000 minutes ou plus, par saison', 't1')}
     ${card('Répartition des joueurs selon leur temps de jeu', 'Part des joueurs utilisés dans chaque tranche de minutes', 't2')}
    </div>
    <div class="card"><h3>Internationaux, titulaires habituels et autres joueurs</h3><p class="sub">${scope()} · « international » : au moins un match avec une sélection nationale dans la saison ; « titulaire habituel » : l'un des 15 joueurs les plus souvent titularisés par son club en championnat</p>
     <div class="tbl-wrap" style="border:0"><table class="wraphead"><thead><tr>${['Groupe', 'Joueurs', 'Minutes par saison', 'Matchs par saison', 'Part en championnat', 'Part en coupe d’Europe', 'Part en sélection'].map((h, i) => `<th style="cursor:default${i ? '' : ';text-align:left'}">${h}</th>`).join('')}</tr></thead><tbody>
     ${grp.map((g) => `<tr><td style="text-align:left"><b>${g.n}</b></td><td>${g.k}</td><td>${fmt.int(g.tot)}</td><td>${nf(g.matches)}</td><td>${fmt.pct0(g.l)}</td><td>${fmt.pct0(g.e)}</td><td>${fmt.pct0(g.i)}</td></tr>`).join('')}
     </tbody></table></div></div>
    <div class="card"><h3>Les 25 joueurs les plus utilisés</h3><p class="sub">${scope()} · minutes toutes compétitions confondues</p>
     <div class="tbl-wrap" style="border:0"><table class="wraphead"><thead><tr>${['Joueur', 'Minutes', 'Championnat', 'Coupe d’Europe', 'Sélection', 'Matchs', 'Titularisations', 'Âge'].map((h, i) => `<th style="cursor:default${i ? '' : ';text-align:left'}">${h}</th>`).join('')}</tr></thead><tbody>
     ${top.map((p) => `<tr><td style="text-align:left;white-space:normal">${p.name}${p.intl ? ` <span class="pill">${natFr(p.natTeam) || 'International'}</span>` : ''}<br><span class="note">${tn(D.teams[p.t])} · ${SE[p.s]}</span></td><td><b>${fmt.int(p.tot)}</b></td><td>${fmt.int(p.mL)}</td><td>${fmt.int(p.mE)}</td><td>${fmt.int(p.mI)}</td><td>${p.matches}</td><td>${p.starts}</td><td>${Math.floor(p.age)}</td></tr>`).join('')}
     </tbody></table></div></div>
    ${cs.club < 0 ? `<div class="card"><h3>Par club</h3><p class="sub">Moyennes par saison${cs.season >= 0 ? '' : ' sur la période'}. Cliquez sur un en-tête pour trier.</p>
     ${table('tTps', [{ k: 'name', n: 'Club', left: 1 }, { k: 'used', n: 'Joueurs utilisés', f: (v) => nf(v) }, { k: 'intl', n: 'Internationaux', f: (v) => nf(v) }, { k: 'n1500', n: 'Joueurs à 1 500 min ou plus', f: (v) => nf(v) }, { k: 'n30', n: 'Joueurs à 30 matchs ou plus', f: (v) => nf(v) }, { k: 'max', n: 'Charge la plus élevée (min)', f: fmt.int }], cl, 'n1500')}</div>` : ''}
    ${method()}
    </section>`;
    bind(rTemps); bindTable('tTps', 'n1500', rTemps);
    lc('t1', [{ name: '30 matchs ou plus', color: css('--s1'), values: bySeason(PA, (a) => a.filter((p) => p.matches >= 30).length) }, { name: '2 000 minutes ou plus', color: css('--s2'), values: bySeason(PA, (a) => a.filter((p) => p.tot >= 2000).length) }], fmt.int, fmt.int, true);
    const col = ['--a1', '--a2', '--a3', '--a4', '--a5', '--a6'].map(css);
    stackChart(document.getElementById('t2'), { labels: SE.map(shortS), series: BANDS.map((b, k) => ({ name: b[2], color: col[k], values: bySeason(PA, (a) => (a.length ? a.filter((p) => p.tot >= b[0] && p.tot < b[1]).length / a.length : 0)) })) });
  }

  // ---------- Compositions & impasses ----------
  function rCompos() {
    const I = insights(); const intlRead = cs.read === 'intl';
    // lecture « internationaux » : uniquement les journées normales, sur les clubs qui en comptent au moins 3
    const val = (r) => (intlRead ? (r.nIntl >= 3 && r.cat === 0 ? r.intl / r.nIntl : null) : r.regs);
    const isImp = (r) => { const v = val(r); return v != null && (intlRead ? v <= 1 / 3 : v <= 6); };
    const vf = intlRead ? fmt.pct0 : (v) => nf(v);
    const unit = intlRead ? 'des internationaux du club alignés' : 'titulaires habituels alignés sur 15';
    const L = league().filter((r) => val(r) != null); const A = clubAll().filter((r) => (intlRead ? r.nIntl >= 3 && (r.cat === 0 || r.c === 'CC' || r.c === 'CH') : r.regs != null));
    const v2 = (r) => (intlRead ? r.intl / r.nIntl : r.regs);
    const dom = L.filter((r) => r.home), ext = L.filter((r) => !r.home), imp = L.filter(isImp);
    const comp = ['T14', 'PD2', 'CC', 'CH'].filter((c) => c === LG() || c === 'CC' || c === 'CH').map((c) => ({ n: CN[c], hl: c === LG(), v: mean(A.filter((r) => r.c === c), v2) })).filter((x) => x.v != null);
    const bands = intlRead ? [[0, 1 / 3, 'Un tiers ou moins'], [1 / 3, 0.5, 'Un tiers à la moitié'], [0.5, 0.75, 'La moitié aux trois quarts'], [0.75, 1.01, 'Plus des trois quarts']] : [[-1, 6.5, '6 ou moins'], [6.5, 8.5, '7 ou 8'], [8.5, 10.5, '9 ou 10'], [10.5, 12.5, '11 ou 12'], [12.5, 16, '13 à 15']];
    const cl = clubs().map((t) => { const a = L.filter((r) => r.t === t); if (!a.length) return null; const im = a.filter(isImp); return { name: tn(D.teams[t]), dom: mean(a.filter((r) => r.home), val), ext: mean(a.filter((r) => !r.home), val), ecart: mean(a.filter((r) => r.home), val) - mean(a.filter((r) => !r.home), val), nimp: im.length, pimp: im.length / a.length, vimp: rate(im, (r) => r.res === 'V') }; }).filter(Boolean);
    const list = [...A.filter((r) => v2(r) != null)].sort((a, b) => v2(a) - v2(b) || a.date.localeCompare(b.date)).slice(0, 25);
    main.innerHTML = `<section class="panel">
    <p class="intro">Les clubs alignent-ils leur meilleure équipe ? Deux lectures sont possibles : les <b>titulaires habituels</b> (les 15 joueurs le plus souvent titularisés par le club en championnat sur la saison) ou les <b>internationaux</b> du club. Une « impasse » est un match joué avec une équipe largement remaniée.</p>
    ${toolbar()}
    <div class="chips" role="group" aria-label="Lecture"><button type="button" class="chip" data-r="regs" aria-pressed="${!intlRead}">Lecture : titulaires habituels</button><button type="button" class="chip" data-r="intl" aria-pressed="${intlRead}">Lecture : internationaux</button></div>
    ${!intlRead && I.ccompos ? insCard(I.ccompos) : ''}
    <div class="kpis">
     ${kpi('À domicile', vf(mean(dom, val)), unit)}${kpi('À l’extérieur', vf(mean(ext, val)), unit)}
     ${kpi('Matchs en impasse', fmt.pct0(L.length ? imp.length / L.length : null), intlRead ? 'un tiers des internationaux ou moins' : '6 titulaires habituels ou moins')}
     ${kpi('Victoires en impasse', fmt.pct0(rate(imp, (r) => r.res === 'V')), `contre ${fmt.pct0(rate(L.filter((r) => !isImp(r)), (r) => r.res === 'V'))} pour les autres matchs`)}
    </div>
    ${intlRead ? '<p class="note">Lecture « internationaux » : seuls les clubs comptant au moins trois internationaux dans la saison sont pris en compte, et les doublons et faux doublons sont exclus en championnat, puisque les internationaux n’y sont pas disponibles.</p>' : ''}
    <div class="grid2">
     <div class="card"><h3>Selon la compétition</h3><p class="sub">${intlRead ? 'Part des internationaux du club alignés au coup d’envoi' : 'Titulaires habituels alignés au coup d’envoi, sur 15'}</p>${bars(comp, vf, intlRead ? 1 : 15)}<p class="note">Les matchs de coupe d'Europe sont ceux des clubs de ${LGN()} uniquement.</p></div>
     ${card('Domicile et extérieur, par saison', intlRead ? 'Part des internationaux alignés' : 'Titulaires habituels alignés sur 15', 'k1')}
    </div>
    <div class="card"><h3>Équipe alignée et résultat</h3><p class="sub">Matchs de ${LGN()} regroupés selon ${intlRead ? 'la part des internationaux alignés' : 'le nombre de titulaires habituels alignés'}</p>
     <div class="tbl-wrap" style="border:0"><table class="wraphead"><thead><tr>${[intlRead ? 'Internationaux alignés' : 'Titulaires habituels alignés', 'Matchs', 'Part des matchs', 'Joués à domicile', 'Victoires'].map((h, i) => `<th style="cursor:default${i ? '' : ';text-align:left'}">${h}</th>`).join('')}</tr></thead><tbody>
     ${bands.map((b) => { const a = L.filter((r) => (intlRead ? (b[0] === 0 ? val(r) <= b[1] : val(r) > b[0] && val(r) <= b[1]) : val(r) > b[0] && val(r) <= b[1])); return `<tr><td style="text-align:left"><b>${b[2]}</b></td><td>${a.length}</td><td>${fmt.pct0(L.length ? a.length / L.length : null)}</td><td>${fmt.pct0(rate(a, (r) => r.home))}</td><td>${fmt.pct0(rate(a, (r) => r.res === 'V'))}</td></tr>`; }).join('')}
     </tbody></table></div></div>
    ${cs.club < 0 ? `<div class="card"><h3>Par club</h3><p class="sub">Matchs de ${LGN()}. Cliquez sur un en-tête pour trier.</p>
     ${table('tCmp', [{ k: 'name', n: 'Club', left: 1 }, { k: 'dom', n: 'À domicile', f: vf }, { k: 'ext', n: 'À l’extérieur', f: vf }, { k: 'ecart', n: 'Écart domicile-extérieur', f: (v) => (intlRead ? pts(v) : sgn(v)) }, { k: 'nimp', n: 'Matchs en impasse' }, { k: 'pimp', n: 'Part des matchs', f: fmt.pct0 }, { k: 'vimp', n: 'Victoires en impasse', f: fmt.pct0 }], cl, 'nimp')}</div>` : ''}
    <div class="card"><h3>Les 25 équipes les plus remaniées</h3><p class="sub">${scope()} · championnat et coupes d'Europe</p>
     <div class="tbl-wrap" style="border:0"><table class="wraphead"><thead><tr>${['Match', 'Compétition', 'Lieu', 'Titulaires habituels', 'Internationaux alignés', 'Type de journée', 'Score'].map((h, i) => `<th style="cursor:default${i < 3 || i === 5 ? ';text-align:left' : ''}">${h}</th>`).join('')}</tr></thead><tbody>
     ${list.map((r) => `<tr><td style="text-align:left;white-space:normal">${tn(D.teams[r.t])} – ${tn(r.opp)}<br><span class="note">${dfr(r.date)}</span></td><td style="text-align:left">${CN[r.c] || r.c}</td><td style="text-align:left">${lieu(r)}</td><td>${r.regs ?? '–'} sur 15</td><td>${r.nIntl ? `${r.intl} sur ${r.nIntl}` : '–'}</td><td style="text-align:left">${r.cat ? CATN[r.cat] : ''}</td><td>${r.sc}-${r.sco} <span class="pill">${{ V: 'Victoire', D: 'Défaite', N: 'Nul' }[r.res] || ''}</span></td></tr>`).join('')}
     </tbody></table></div></div>
    ${method()}
    </section>`;
    bind(rCompos); bindTable('tCmp', 'nimp', rCompos);
    main.querySelector('.chips').onclick = (e) => { const b = e.target.closest('button'); if (!b) return; cs.read = b.dataset.r; rCompos(); };
    const LA = league(true).filter((r) => (intlRead ? r.nIntl >= 3 && r.cat === 0 : r.regs != null));
    lc('k1', [{ name: 'Domicile', color: css('--s1'), values: bySeason(LA.filter((r) => r.home), (a) => mean(a, v2)) }, { name: 'Extérieur', color: css('--s2'), values: bySeason(LA.filter((r) => !r.home), (a) => mean(a, v2)) }], vf, vf);
  }

  // ---------- Changements ----------
  function rChg() {
    const I = insights(); const LA = league(true);
    const fams = [['TOP 14', (r) => r.c === 'T14'], ['PRO D2', (r) => r.c === 'PD2'], ['Champions Cup', (r) => r.c === 'CC'], ['Challenge Cup', (r) => r.c === 'CH'], ['Six Nations', (r) => r.c === '6N'], ['Tests et Coupe du monde', (r) => r.c === 'INT' || r.c === 'RWC']];
    const lines = [['Première ligne (1 à 3)', 'm1'], ['Deuxième ligne (4 et 5)', 'm2'], ['Troisième ligne (6 à 8)', 'm3'], ['Charnière (9 et 10)', 'm4'], ['Trois-quarts et arrière (11 à 15)', 'm5']];
    const cl = clubs().map((t) => { const a = league().filter((r) => r.t === t); const all = clubAll().filter((r) => r.t === t); if (!a.length) return null; return { name: tn(D.teams[t]), subs: mean(a, (r) => r.subs), subMin: mean(a, (r) => r.subMin), m1: mean(a, (r) => r.m1), chg: mean(a, (r) => r.chg), chgDom: mean(a.filter((r) => r.home), (r) => r.chg), chgExt: mean(a.filter((r) => !r.home), (r) => r.chg), chgEu: mean(all.filter((r) => r.c === 'CC' || r.c === 'CH'), (r) => r.chg) }; }).filter(Boolean);
    main.innerHTML = `<section class="panel">
    <p class="intro">Deux sortes de changements : ceux qui ont lieu <b>pendant le match</b> (remplaçants utilisés, moment où ils entrent) et ceux qui ont lieu <b>d'un match à l'autre</b> (rotation du XV de départ).</p>
    ${toolbar()}
    ${I.cchg ? insCard(I.cchg) : ''}
    <div><h3 class="sec">Pendant le match</h3></div>
    <div class="card"><h3>${LGN()} face aux autres compétitions</h3><p class="sub">Moyennes par équipe et par match${cs.season >= 0 ? ', saison ' + SE[cs.season] : ''}. La minute du premier changement est estimée à partir du temps de jeu du remplaçant le plus utilisé.</p>${compTableHtml()}</div>
    <div class="card"><h3>Minutes jouées par un titulaire, selon le poste</h3><p class="sub">Temps de jeu moyen d'un joueur qui débute le match. Couleur : du plus faible (clair) au plus élevé (foncé) sur la ligne.</p><div id="g1"></div></div>
    <div class="grid2">
     ${card('Minutes jouées par un remplaçant', LGN() + ', par saison', 'g2')}
     ${card('Minutes jouées par un première ligne titulaire', LGN() + ', par saison', 'g3')}
    </div>
    <div><h3 class="sec">D'un match à l'autre</h3></div>
    <div class="grid2">
     ${card('Changements dans le XV de départ', 'Nombre de titulaires qui ne débutaient pas le match précédent du club, toutes compétitions confondues', 'g4')}
     <div class="card"><h3>Selon la compétition jouée</h3><p class="sub">Changements dans le XV par rapport au match précédent, clubs de ${LGN()}</p>${bars(['T14', 'PD2', 'CC', 'CH'].filter((c) => c === LG() || c === 'CC' || c === 'CH').map((c) => ({ n: CN[c], hl: c === LG(), v: mean(clubAll().filter((r) => r.c === c), (r) => r.chg) })).filter((x) => x.v != null), (v) => nf(v), 15)}</div>
    </div>
    ${cs.club < 0 ? `<div class="card"><h3>Par club</h3><p class="sub">Matchs de ${LGN()}, sauf la dernière colonne. Cliquez sur un en-tête pour trier.</p>
     ${table('tChg', [{ k: 'name', n: 'Club', left: 1 }, { k: 'subs', n: 'Remplaçants utilisés', f: (v) => nf(v, 2) }, { k: 'subMin', n: 'Minutes d’un remplaçant', f: (v) => nf(v) }, { k: 'm1', n: 'Minutes d’un première ligne titulaire', f: (v) => nf(v) }, { k: 'chg', n: 'Changements dans le XV', f: (v) => nf(v) }, { k: 'chgDom', n: 'Avant un match à domicile', f: (v) => nf(v) }, { k: 'chgExt', n: 'Avant un match à l’extérieur', f: (v) => nf(v) }, { k: 'chgEu', n: 'Avant un match européen', f: (v) => nf(v) }], cl, 'chg')}</div>` : ''}
    ${method()}
    </section>`;
    bind(rChg); bindTable('tChg', 'chg', rChg);
    heatTable(document.getElementById('g1'), { rows: lines.map((l) => l[0]), cols: fams.map((f) => f[0]), values: lines.map((l) => fams.map((f) => mean(TM.filter((r) => inS(r) && f[1](r)), (r) => r[l[1]]))), vfmt: (v) => nf(v) });
    lc('g2', [{ name: LGN(), color: css('--s1'), values: bySeason(LA, (a) => mean(a, (r) => r.subMin)) }], (v) => nf(v) + ' min', (v) => nf(v));
    lc('g3', [{ name: LGN(), color: css('--s1'), values: bySeason(LA, (a) => mean(a, (r) => r.m1)) }], (v) => nf(v) + ' min', (v) => nf(v));
    lc('g4', [{ name: 'Avant un match à domicile', color: css('--s1'), values: bySeason(LA.filter((r) => r.home), (a) => mean(a, (r) => r.chg)) }, { name: 'Avant un match à l’extérieur', color: css('--s2'), values: bySeason(LA.filter((r) => !r.home), (a) => mean(a, (r) => r.chg)) }], (v) => nf(v), (v) => nf(v));
  }

  // ---------- Enchaînements ----------
  const SB = [[1, 3, '1 à 3 semaines'], [4, 5, '4 ou 5'], [6, 7, '6 ou 7'], [8, 9, '8 ou 9'], [10, 99, '10 semaines et plus']];
  function rEnch() {
    const P = players(), PA = players(true).filter((p) => p.matches >= 10), I = insights();
    const top = [...P].sort((a, b) => b.streak - a.streak || b.matches - a.matches).slice(0, 25);
    const grp = GI.map((g) => { const a = P.filter((p) => groupOf(p) === g); return { n: GN[g], k: a.length, matches: mean(a, (p) => p.matches), streak: mean(a, (p) => p.streak), max: a.length ? Math.max(...a.map((p) => p.streak)) : null, n8: a.filter((p) => p.streak >= 8).length, short: a.reduce((s, p) => s + p.short, 0) }; }).filter((g) => g.k);
    const cl = clubs().map((t) => { const a = PL.filter((p) => p.lg === LG() && p.t === t && inS(p)); if (!a.length) return null; const ns = new Set(a.map((p) => p.s)).size; return { name: tn(D.teams[t]), n8: a.filter((p) => p.streak >= 8).length / ns, max: Math.max(...a.map((p) => p.streak)), mmax: Math.max(...a.map((p) => p.matches)), reg: mean(a.filter((p) => p.reg), (p) => p.streak) }; }).filter(Boolean);
    main.innerHTML = `<section class="panel">
    <p class="intro">À quel rythme les joueurs de ${LGN()} enchaînent-ils les matchs ? Une <b>série</b> est une suite de semaines consécutives au cours desquelles le joueur a disputé au moins un match, toutes compétitions confondues (club et sélection).</p>
    ${toolbar()}
    ${I.cench ? insCard(I.cench) : ''}
    <div class="grid2">
     ${card('Joueurs à 8 semaines consécutives ou plus', 'Nombre de joueurs par saison', 'e1')}
     ${card('Plus longue série de chaque joueur', 'Part des joueurs ayant disputé au moins 10 matchs dans la saison', 'e2')}
    </div>
    <div class="card"><h3>Internationaux, titulaires habituels et autres joueurs</h3><p class="sub">${scope()}</p>
     <div class="tbl-wrap" style="border:0"><table class="wraphead"><thead><tr>${['Groupe', 'Joueurs', 'Matchs par saison', 'Plus longue série (moyenne)', 'Plus longue série (record)', 'Joueurs à 8 semaines ou plus', 'Matchs joués à 5 jours d’intervalle ou moins'].map((h, i) => `<th style="cursor:default${i ? '' : ';text-align:left'}">${h}</th>`).join('')}</tr></thead><tbody>
     ${grp.map((g) => `<tr><td style="text-align:left"><b>${g.n}</b></td><td>${g.k}</td><td>${nf(g.matches)}</td><td>${nf(g.streak)}</td><td>${g.max ?? '–'}</td><td>${g.n8}</td><td>${g.short}</td></tr>`).join('')}
     </tbody></table></div></div>
    <div class="card"><h3>Les 25 plus longues séries</h3><p class="sub">${scope()}</p>
     <div class="tbl-wrap" style="border:0"><table class="wraphead"><thead><tr>${['Joueur', 'Semaines consécutives', 'Matchs dans la saison', 'Dont en sélection', 'Minutes', 'Âge'].map((h, i) => `<th style="cursor:default${i ? '' : ';text-align:left'}">${h}</th>`).join('')}</tr></thead><tbody>
     ${top.map((p) => `<tr><td style="text-align:left;white-space:normal">${p.name}${p.intl ? ` <span class="pill">${natFr(p.natTeam) || 'International'}</span>` : ''}<br><span class="note">${tn(D.teams[p.t])} · ${SE[p.s]}</span></td><td><b>${p.streak}</b></td><td>${p.matches}</td><td>${p.nI}</td><td>${fmt.int(p.tot)}</td><td>${Math.floor(p.age)}</td></tr>`).join('')}
     </tbody></table></div></div>
    ${cs.club < 0 ? `<div class="card"><h3>Par club</h3><p class="sub">Cliquez sur un en-tête pour trier.</p>
     ${table('tEnc', [{ k: 'name', n: 'Club', left: 1 }, { k: 'n8', n: 'Joueurs à 8 semaines ou plus, par saison', f: (v) => nf(v) }, { k: 'reg', n: 'Plus longue série moyenne des titulaires habituels', f: (v) => nf(v) }, { k: 'max', n: 'Série record' }, { k: 'mmax', n: 'Plus grand nombre de matchs d’un joueur' }], cl, 'n8')}</div>` : ''}
    ${method()}
    </section>`;
    bind(rEnch); bindTable('tEnc', 'n8', rEnch);
    lc('e1', [{ name: 'Joueurs', color: css('--s1'), values: bySeason(players(true), (a) => a.filter((p) => p.streak >= 8).length) }], fmt.int, fmt.int, true);
    const col = ['--a1', '--a2', '--a3', '--a5', '--a6'].map(css);
    stackChart(document.getElementById('e2'), { labels: SE.map(shortS), series: SB.map((b, k) => ({ name: b[2], color: col[k], values: bySeason(PA, (a) => (a.length ? a.filter((p) => p.streak >= b[0] && p.streak <= b[1]).length / a.length : 0)) })) });
  }

  function method() {
    return `<details class="method"><summary>Méthode et limites des données</summary><ul>
     <li>Source : feuilles de match des compétitions suivies (${fmt.int(TM.length)} équipes-matchs, saisons ${SE[0]} à ${SE[NS - 1]}) : TOP 14, PRO D2, Champions Cup, Challenge Cup, Six Nations, Coupe du monde 2023 et tests internationaux. Seuls les joueurs entrés en jeu y figurent.</li>
     <li>Aucun autre championnat national n'est suivi (Premiership, URC, Super Rugby). La charge totale n'est donc complète que pour les joueurs des clubs de TOP 14 et de PRO D2 ; les clubs étrangers ne sont comparables que sur leurs matchs de coupe d'Europe.</li>
     <li>La saison va du 1er août au 31 juillet : une tournée de juillet compte dans la saison qui s'achève.</li>
     <li>Titulaires habituels : les 15 joueurs le plus souvent titularisés par le club en championnat sur la saison. Ils sont connus après coup : un joueur blessé une partie de l'année peut ne pas y figurer.</li>
     <li>Nationalité : celle de l'espace Effectifs (sélection internationale ou pays d'origine).</li></ul></details>`;
  }

  const R = { csynth: rSynth, cdoublons: rDoublons, ctemps: rTemps, ccompos: rCompos, cchg: rChg, cench: rEnch };
  return {
    tabs: TABS, clubs, state: cs,
    scopeText: () => `${cs.club >= 0 ? tn(D.teams[cs.club]) : LGN()} · ${SE[0]} → ${SE[NS - 1]} · feuilles de match : temps de jeu, compositions, changements, enchaînements`,
    clubName: (t) => tn(D.teams[t]),
    render: (tab) => { if (cs.club >= 0 && !clubs().includes(cs.club)) cs.club = -1; (R[tab] || rSynth)(); },
  };
}
