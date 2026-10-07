// Chargement des données joueurs-saisons.
// Source principale : Supabase (table public.player_seasons, lecture publique).
// Si les variables Supabase ne sont pas définies (développement local), on lit
// le fichier statique public/data/player_seasons.json généré par scripts/import_excel.py.
import { createClient } from '@supabase/supabase-js';

const LABELS = { top14: 'TOP 14', prod2: 'PRO D2' };
const COLUMNS = 'championnat,saison,joueur,clubs,minutes,matchs,titularisations,entrees,date_naissance,postes,nationalite,jiff';
const PAGE = 1000;

async function fromSupabase(url, key) {
  const sb = createClient(url, key);
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await sb
      .from('player_seasons')
      .select(COLUMNS)
      .order('id')
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    rows.push(...data);
    if (data.length < PAGE) break;
  }
  return rows;
}

async function fromStatic() {
  const res = await fetch('/data/player_seasons.json');
  if (!res.ok) throw new Error(`fichier de données introuvable (${res.status})`);
  return res.json();
}

function ageAt(dob, season) {
  if (!dob) return null;
  const end = parseInt(season.slice(-4), 10);
  const ref = Date.UTC(end, 0, 1);
  const fr = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(dob); // tolère JJ/MM/AAAA (fichier rouvert dans Excel)
  const d = Date.parse((fr ? `${fr[3]}-${fr[2]}-${fr[1]}` : dob) + 'T00:00:00Z');
  if (Number.isNaN(d)) return null;
  return Math.round(((ref - d) / 86400000 / 365.25) * 100) / 100;
}

// Met les lignes au format compact attendu par main.js :
// DATA[champ] = { label, seasons, teams, rows: [[nom, iSaison, [iClubs], min, matchs, tit, rempl, âge, masquePostes, nationalité, jiff]] }
function shape(records) {
  const out = {};
  for (const champ of Object.keys(LABELS)) {
    const recs = records.filter((r) => r.championnat === champ);
    if (!recs.length) continue;
    const seasons = [...new Set(recs.map((r) => r.saison))].sort();
    recs.forEach((r) => {
      r.clubs = Array.isArray(r.clubs) ? r.clubs : String(r.clubs || '').split('|').map((c) => c.trim()).filter(Boolean);
      r.postes = Array.isArray(r.postes) ? r.postes : String(r.postes || '').split(',').map((p) => parseInt(p, 10)).filter((p) => p >= 1 && p <= 15);
    });
    const teams = [...new Set(recs.flatMap((r) => r.clubs))].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    const sIdx = new Map(seasons.map((s, i) => [s, i]));
    const tIdx = new Map(teams.map((t, i) => [t, i]));
    const rows = recs.map((r) => {
      let mask = 0;
      (r.postes || []).forEach((p) => { mask |= 1 << p; });
      return [
        r.joueur, sIdx.get(r.saison), r.clubs.map((c) => tIdx.get(c)),
        r.minutes, r.matchs, r.titularisations, r.entrees,
        ageAt(r.date_naissance, r.saison), mask, r.nationalite || null,
        r.jiff == null || r.jiff === '' ? null : ['oui', 'true', true].includes(r.jiff),
      ];
    });
    out[champ] = { label: LABELS[champ], seasons, teams, rows };
  }
  return out;
}

export async function loadData() {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const records = url && key ? await fromSupabase(url, key) : await fromStatic();
  return shape(records);
}

// Indicateurs de l'espace « Compositions », calculés à l'avance par scripts/build_compos.py.
export async function loadCompos() {
  const res = await fetch('/data/compos.json');
  if (!res.ok) throw new Error(`fichier compos.json introuvable (${res.status})`);
  return res.json();
}
