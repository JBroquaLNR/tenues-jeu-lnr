-- Tenues de jeu LNR · base de données · V0.2.0
-- À coller dans Supabase : SQL Editor > New query > Run. Peut être relancé sans risque.
--
-- >>> À MODIFIER AVANT DE LANCER : l'adresse du compte LNR, tout en bas de ce fichier. <<<

-- 1. Les trois tables de la plateforme : un document par ligne.
create table if not exists public.tenues    (id text primary key, data jsonb not null, maj timestamptz not null default now());
create table if not exists public.clubs     (id text primary key, data jsonb not null, maj timestamptz not null default now());
create table if not exists public.decisions (id text primary key, data jsonb not null, maj timestamptz not null default now());

-- 2. Les comptes autorisés à administrer. Un compte absent de cette liste ne voit et ne modifie rien,
--    même s'il parvient à se créer un accès.
create table if not exists public.admins (email text primary key);

create or replace function public.est_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins a where lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', '')));
$$;

alter table public.tenues    enable row level security;
alter table public.clubs     enable row level security;
alter table public.decisions enable row level security;
alter table public.admins    enable row level security;

drop policy if exists "admin tenues" on public.tenues;
create policy "admin tenues" on public.tenues for all to authenticated using (public.est_admin()) with check (public.est_admin());
drop policy if exists "admin clubs" on public.clubs;
create policy "admin clubs" on public.clubs for all to authenticated using (public.est_admin()) with check (public.est_admin());
drop policy if exists "admin decisions" on public.decisions;
create policy "admin decisions" on public.decisions for all to authenticated using (public.est_admin()) with check (public.est_admin());
-- Aucune règle sur public.admins : la liste ne se modifie que depuis Supabase.
grant select, insert, update, delete on public.tenues, public.clubs, public.decisions to authenticated;
revoke all on public.tenues, public.clubs, public.decisions, public.admins from anon;

-- 3. Le stockage privé des images de BAT.
insert into storage.buckets (id, name, public) values ('bat', 'bat', false) on conflict (id) do nothing;
drop policy if exists "admin bat lecture" on storage.objects;
create policy "admin bat lecture" on storage.objects for select to authenticated using (bucket_id = 'bat' and public.est_admin());
drop policy if exists "admin bat depot" on storage.objects;
create policy "admin bat depot" on storage.objects for insert to authenticated with check (bucket_id = 'bat' and public.est_admin());
drop policy if exists "admin bat suppression" on storage.objects;
create policy "admin bat suppression" on storage.objects for delete to authenticated using (bucket_id = 'bat' and public.est_admin());

-- 4. Un appel sans effet, utilisé chaque semaine pour que le projet gratuit ne soit pas mis en pause.
create or replace function public.ping() returns timestamptz language sql stable as $$ select now() $$;
grant execute on function public.ping() to anon, authenticated;

-- 4 bis. Espace club (V0.2.0)

grant execute on function public.est_admin() to authenticated;

-- a. Les liens : un jeton secret par club. Seul l'admin les lit et les change.
create table if not exists public.liens (club_id text primary key, jeton uuid not null unique default gen_random_uuid(), maj timestamptz not null default now());
alter table public.liens enable row level security;
drop policy if exists "admin liens" on public.liens;
create policy "admin liens" on public.liens for all to authenticated using (public.est_admin()) with check (public.est_admin());
grant select, insert, update, delete on public.liens to authenticated;
revoke all on public.liens from anon;

create or replace function public.jeton_valide(p text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.liens l where l.jeton::text = p);
$$;
grant execute on function public.jeton_valide(text) to anon, authenticated;

-- b. Ce qu'un club voit avec son lien : ses propres tenues, sans l'historique interne ni les images.
create or replace function public.club_espace(p_jeton uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_club text;
begin
  select club_id into v_club from public.liens where jeton = p_jeton;
  if v_club is null then return null; end if;
  return jsonb_build_object(
    'club', v_club,
    'fiche', (select jsonb_build_object('nom', c.data->'nom', 'court', c.data->'court', 'comp', c.data->'comp') from public.clubs c where c.id = v_club),
    'tenues', coalesce((
      select jsonb_object_agg(t.id, jsonb_build_object(
        'type', t.data->'type', 'ordre', t.data->'ordre',
        'couleurs', t.data->'couleurs', 'equip', t.data->'equip', 'pubs', t.data->'pubs',
        'design', (t.data->'design') - 'par', 'part', (t.data->'part') - 'par',
        'versions', (select coalesce(jsonb_agg(jsonb_build_object('n', v->'n', 'le', v->'le', 'nom', v->'nom')), '[]'::jsonb)
                     from jsonb_array_elements(coalesce(t.data->'versions', '[]'::jsonb)) v)))
      from public.tenues t where t.data->>'club' = v_club), '{}'::jsonb));
end $$;
grant execute on function public.club_espace(uuid) to anon, authenticated;

-- c. Le dépôt d'un club. Tout ce qu'il envoie est revérifié ici : couleurs, motif, emplacements, tailles.
create or replace function public.club_deposer(p_jeton uuid, p_tenue text, p_couleurs jsonb, p_equip jsonb, p_pubs jsonb, p_chemin text, p_nom text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_club text; v_id text; v_doc jsonb; v_n int; v_ordre int; v_comp text;
  v_now text := to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
  v_co jsonb := '{}'::jsonb; v_eq jsonb; v_pubs jsonb := '{}'::jsonb; k text; p jsonb; v_np int := 0;
  hexa constant text := '^#[0-9a-fA-F]{6}$';
begin
  select club_id into v_club from public.liens where jeton = p_jeton;
  if v_club is null then raise exception 'lien inconnu'; end if;
  if p_tenue !~ '^(dom|ext|third|t[4-9])$' then raise exception 'tenue invalide'; end if;
  if p_chemin is null or p_chemin !~ ('^clubs/' || p_jeton::text || '/[A-Za-z0-9._-]{1,80}$') then raise exception 'fichier invalide'; end if;
  if pg_column_size(p_couleurs) + pg_column_size(p_equip) + pg_column_size(p_pubs) > 20000 then raise exception 'saisie trop volumineuse'; end if;

  foreach k in array array['m1','m2','s1','c1','c2'] loop
    if (p_couleurs->>k) ~ hexa then v_co := v_co || jsonb_build_object(k, lower(p_couleurs->>k)); end if;
  end loop;
  if not (v_co ? 'm1') then raise exception 'couleur principale manquante'; end if;
  v_co := v_co || jsonb_build_object(
    'motif', case when p_couleurs->>'motif' in ('uni','cercle','vertical','hautbas','miparti','quartiers','manches') then p_couleurs->>'motif' else 'uni' end,
    'nom', left(coalesce(p_couleurs->>'nom', ''), 60));
  v_eq := jsonb_build_object(
    'nom', left(coalesce(p_equip->>'nom', ''), 60),
    'manches', case when p_equip->>'manches' in ('oui','non') then p_equip->>'manches' else '' end,
    'short',   case when p_equip->>'short'   in ('oui','non') then p_equip->>'short'   else '' end,
    'maillot', case when p_equip->>'maillot' in ('oui','non') then p_equip->>'maillot' else '' end);
  foreach k in array array['dev1','dev2','dev3','dev4','manche','dos1','dos2','dos3','shad','shag','shdp','shrd','shrg'] loop
    p := p_pubs->k;
    if p is not null and jsonb_typeof(p) = 'object' and (coalesce(p->>'nom','') <> '' or coalesce(p->>'l','') <> '' or coalesce(p->>'h','') <> '') then
      v_pubs := v_pubs || jsonb_build_object(k, jsonb_build_object(
        'nom', left(coalesce(p->>'nom',''), 80), 'secteur', left(coalesce(p->>'secteur',''), 60), 'pos', left(coalesce(p->>'pos',''), 40),
        'l', case when (p->>'l') ~ '^[0-9]{1,3}(\.[0-9]{1,2})?$' then (p->>'l')::numeric else null end,
        'h', case when (p->>'h') ~ '^[0-9]{1,3}(\.[0-9]{1,2})?$' then (p->>'h')::numeric else null end));
      v_np := v_np + 1;
    end if;
  end loop;

  v_id := v_club || '.' || p_tenue;
  v_ordre := case p_tenue when 'dom' then 0 when 'ext' then 1 when 'third' then 2 else substr(p_tenue, 2)::int - 1 end;
  select data into v_doc from public.tenues where id = v_id for update;
  if v_doc is null then
    select coalesce(c.data->>'comp', '') into v_comp from public.clubs c where c.id = v_club;
    v_doc := jsonb_build_object('club', v_club, 'ordre', v_ordre,
      'type', case v_ordre when 0 then 'Domicile' when 1 then 'Extérieur' else 'Tenue ' || (v_ordre + 1) end);
  end if;
  if jsonb_array_length(coalesce(v_doc->'versions', '[]'::jsonb)) >= 30 then raise exception 'trop de versions'; end if;
  v_n := coalesce((select max((v->>'n')::int) from jsonb_array_elements(coalesce(v_doc->'versions', '[]'::jsonb)) v), 0) + 1;

  v_doc := (v_doc - 'design' - 'part') || jsonb_build_object('couleurs', v_co, 'equip', v_eq, 'pubs', v_pubs);
  v_doc := jsonb_set(v_doc, '{versions}', coalesce(v_doc->'versions', '[]'::jsonb) || jsonb_build_object(
    'n', v_n, 'asset', p_chemin, 'nom', left(coalesce(p_nom, ''), 120), 'type', 'image/jpeg', 'le', v_now, 'par', 'Club'));
  v_doc := jsonb_set(v_doc, '{journal}', coalesce(v_doc->'journal', '[]'::jsonb) || jsonb_build_object(
    'le', v_now, 'par', 'Club', 'x', 'Dépôt du club : BAT V' || v_n || ', ' || v_np || ' partenaire' || case when v_np > 1 then 's' else '' end || ' déclaré' || case when v_np > 1 then 's' else '' end));
  insert into public.tenues (id, data, maj) values (v_id, v_doc, now())
    on conflict (id) do update set data = excluded.data, maj = now();
  return jsonb_build_object('tenue', v_id, 'version', v_n);
end $$;
grant execute on function public.club_deposer(uuid, text, jsonb, jsonb, jsonb, text, text) to anon, authenticated;

-- d. Le stockage : un club peut déposer une image dans son propre dossier, sans pouvoir rien relire.
update storage.buckets set file_size_limit = 3145728, allowed_mime_types = array['image/jpeg'] where id = 'bat';
drop policy if exists "club bat depot" on storage.objects;
create policy "club bat depot" on storage.objects for insert to anon
  with check (bucket_id = 'bat' and (storage.foldername(name))[1] = 'clubs' and public.jeton_valide((storage.foldername(name))[2]));

-- 5. Reprise : le relevé du BAT domicile d'Aurillac fait pendant le prototype.
insert into public.tenues (id, data) values ('stade-aurillacois.dom', '{"club": "stade-aurillacois", "comp": "PRO D2", "couleurs": {"m1": "#c3202c", "m2": "#7a0f22", "motif": "manches", "nom": "rouge / grenat"}, "equip": {"maillot": "oui", "manches": "oui", "nom": "Kappa", "short": ""}, "journal": [{"le": "2026-10-06T09:36:00.000Z", "par": "Claude", "x": "Relevé repris du prototype : 6 partenaires et couleurs du maillot lus sur le BAT V1. À vérifier : le logo rond de 7 × 7 cm en haut à droite du devant n''a pas été identifié ; le BAT ne montre ni le short ni les chaussettes. Le fichier du BAT est à redéposer."}], "ordre": 0, "pubs": {"dev1": {"h": 14.9, "l": 30, "nom": "Intermarché", "pos": "", "secteur": "Distribution"}, "dev2": {"h": 7, "l": 8, "nom": "Crédit Agricole Centre France", "pos": "Poitrine droite", "secteur": "Banque"}, "dev3": {"h": 7, "l": 10, "nom": "Aura Sun", "pos": "Cœur", "secteur": ""}, "dos1": {"h": 10.5, "l": 25, "nom": "Cantal, mon département", "pos": "Au-dessus du numéro", "secteur": "Collectivité"}, "dos2": {"h": 5.8, "l": 25, "nom": "La Région Auvergne-Rhône-Alpes", "pos": "En-dessous du numéro", "secteur": "Collectivité"}, "manche": {"h": 9.5, "l": 12, "nom": "Groupama", "pos": "", "secteur": "Assurance"}}, "type": "Domicile"}'::jsonb) on conflict (id) do nothing;

-- 6. >>> À MODIFIER : remplacez l'adresse ci-dessous par celle du compte LNR créé dans Authentication > Users. <<<
insert into public.admins (email) values ('REMPLACER@exemple.fr') on conflict (email) do nothing;
