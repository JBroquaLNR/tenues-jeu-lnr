-- Tenues de jeu LNR · base de données · V0.1.0
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

-- 5. Reprise : le relevé du BAT domicile d'Aurillac fait pendant le prototype.
insert into public.tenues (id, data) values ('stade-aurillacois.dom', '{"club": "stade-aurillacois", "comp": "PRO D2", "couleurs": {"m1": "#c3202c", "m2": "#7a0f22", "motif": "manches", "nom": "rouge / grenat"}, "equip": {"maillot": "oui", "manches": "oui", "nom": "Kappa", "short": ""}, "journal": [{"le": "2026-10-06T09:36:00.000Z", "par": "Claude", "x": "Relevé repris du prototype : 6 partenaires et couleurs du maillot lus sur le BAT V1. À vérifier : le logo rond de 7 × 7 cm en haut à droite du devant n''a pas été identifié ; le BAT ne montre ni le short ni les chaussettes. Le fichier du BAT est à redéposer."}], "ordre": 0, "pubs": {"dev1": {"h": 14.9, "l": 30, "nom": "Intermarché", "pos": "", "secteur": "Distribution"}, "dev2": {"h": 7, "l": 8, "nom": "Crédit Agricole Centre France", "pos": "Poitrine droite", "secteur": "Banque"}, "dev3": {"h": 7, "l": 10, "nom": "Aura Sun", "pos": "Cœur", "secteur": ""}, "dos1": {"h": 10.5, "l": 25, "nom": "Cantal, mon département", "pos": "Au-dessus du numéro", "secteur": "Collectivité"}, "dos2": {"h": 5.8, "l": 25, "nom": "La Région Auvergne-Rhône-Alpes", "pos": "En-dessous du numéro", "secteur": "Collectivité"}, "manche": {"h": 9.5, "l": 12, "nom": "Groupama", "pos": "", "secteur": "Assurance"}}, "type": "Domicile"}'::jsonb) on conflict (id) do nothing;

-- 6. >>> À MODIFIER : remplacez l'adresse ci-dessous par celle du compte LNR créé dans Authentication > Users. <<<
insert into public.admins (email) values ('REMPLACER@exemple.fr') on conflict (email) do nothing;
