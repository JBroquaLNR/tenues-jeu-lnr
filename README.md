# Observatoire LNR

Outil web d'analyse des évolutions du TOP 14 et de la PRO D2. Deux espaces :

- **Effectifs** : l'utilisation des joueurs par saison (minutes, titularisations, entrées en jeu) selon l'âge, le poste et la nationalité ;
- **Compositions** : les feuilles de match depuis 2022/23 (temps de jeu toutes compétitions, titulaires habituels et impasses, changements, enchaînements, doublons et faux doublons).

- **Site** : Vite (HTML/JS), déployé sur Vercel
- **Données** : Supabase (table `player_seasons`, lecture publique)
- **Code** : GitHub. Chaque modification poussée sur `main` est publiée automatiquement par Vercel.

## Structure

```
index.html                 page et en-tête
src/main.js                calculs et graphiques
src/data.js                chargement des données (Supabase, ou fichier de secours)
src/styles.css             charte graphique
supabase/schema.sql        création de la table et des droits
scripts/import_excel.py    nettoyage des exports Opta, puis CSV et envoi vers Supabase
data/player_seasons_*.csv  données nettoyées, une par championnat
data/nationalites.csv      nationalité de chaque joueur (licences LNR, complétées par allrugby.com)
public/data/*.json         copie de secours utilisée quand Supabase n'est pas configuré
src/compos.js              espace Compositions
scripts/build_compos.py    calcule public/data/compos.json à partir des feuilles de match
data/compos/export_*.csv   feuilles de match brutes, une par saison
```

## Mise en place (une seule fois)

### 1. GitHub
1. Sur github.com, cliquez **New repository**, nommez-le `observatoire-lnr` et choisissez Private, sans README.
2. Envoyez le contenu de ce dossier : glissez-déposez les fichiers via **uploading an existing file**, ou utilisez `git push`.

### 2. Supabase
1. Sur supabase.com, cliquez **New project** et choisissez la région Europe (Paris ou Francfort).
2. Ouvrez **SQL Editor**, puis **New query**. Collez le contenu de `supabase/schema.sql` et cliquez **Run**.
3. Ouvrez **Table Editor**, puis `player_seasons`, puis **Insert → Import data from CSV**. Importez `data/player_seasons_top14.csv`, puis `data/player_seasons_prod2.csv`.
4. Dans **Project Settings → API**, notez la *Project URL* et la clé *anon public*.

### 3. Vercel
1. Sur vercel.com, cliquez **Add New → Project** et importez le dépôt `observatoire-lnr`. Le framework Vite est détecté tout seul.
2. Dans **Environment Variables**, ajoutez :
   - `VITE_SUPABASE_URL` = la Project URL
   - `VITE_SUPABASE_ANON_KEY` = la clé anon public
3. Cliquez **Deploy**.

La clé *anon* ne donne qu'un droit de lecture. La clé *service_role* ne doit jamais être mise dans Vercel ni sur GitHub.

## Mettre à jour les données

Pour un nouvel export Opta (nouvelle saison, colonne nationalité ajoutée…) :

```bash
pip install pandas openpyxl requests
python scripts/import_excel.py top14 TOP_14.xlsx            # régénère le CSV et le JSON de secours
python scripts/import_excel.py top14 TOP_14.xlsx --push     # et remplace les données TOP 14 dans Supabase
```

L'option `--push` demande les variables `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY`, à copier depuis `.env.example` vers `.env`.
Sans le script, vous pouvez aussi vider la table pour le championnat concerné puis réimporter le CSV depuis le Table Editor.

Colonnes optionnelles reconnues dans l'export : **Nationalité** et **JIFF** (oui/non).

## Développement local

```bash
npm install
npm run dev        # sans .env, le site lit public/data/player_seasons.json
```

## Méthode

- **Âge** : calculé au 1er janvier de chaque saison.
- **Nationalité** : pour un international, le pays de sa sélection (la plus récente s'il en a connu deux) ; sinon son pays d'origine. La base de départ est le fichier des licences LNR, complété par allrugby.com, puis corrigé à la main. `data/nationalites.csv` fait référence et s'applique à chaque import. Ce n'est pas le statut JIFF.
- **Vivier France** : par poste détaillé, part des minutes jouées par des Français, âge, relève (moins de 23 ans) et titulaires réguliers ; un poste est « sous tension » à partir de trois signaux (seuils dans l'onglet).
- **Équipe type** : profil type de chaque maillot (1 à 15 pondérés par les titularisations, 16 à 23 par les entrées en jeu) ; le banc suit la composition la plus courante.
- **Titularisations** : l'export sous-compte les titularisations sur certaines saisons (surtout 2018/19 et 2019/20). Elles sont recalculées comme matchs joués moins entrées en jeu.
- **Joueurs polyvalents** : un joueur est réparti à parts égales entre ses lignes de poste, car l'export ne donne pas les minutes par poste.
- **Joueurs transférés en cours de saison** : ils comptent pour chacun de leurs clubs, avec la totalité de leurs minutes.
- **Saison 2019/20 (Covid)** : arrêt après 17 journées en TOP 14 et 23 en PRO D2. Elle est hachurée sur les graphiques.
- **Profils** :
  - titulaire régulier : titularisé sur au moins la moitié des journées ;
  - finisseur : plus d'entrées en jeu que de titularisations ;
  - rotation : les autres joueurs ayant joué au moins 5 matchs ;
  - ponctuel : moins de 5 matchs joués.

## Espace Compositions

Les feuilles de match sont trop volumineuses pour être lues par le navigateur. Le script les résume dans `public/data/compos.json`, que le site lit directement (pas de Supabase pour cet espace).

```bash
pip install pandas
python scripts/build_compos.py     # après avoir ajouté ou remplacé un fichier dans data/compos/
```

- **Saison** : du 1er août au 31 juillet.
- **Titulaires habituels** : les 15 joueurs les plus souvent titularisés par leur club en championnat dans la saison.
- **International** : au moins un match avec une sélection nationale dans la saison (hors Barbarians, équipes A et moins de 20 ans).
- **Impasse** : 6 titulaires habituels ou moins au coup d'envoi.
- **Doublon** : journée jouée à deux jours ou moins d'un match du XV de France. **Faux doublon** : la France joue dans les dix jours et moins de 40 % de ses joueurs sont alignés en club. La J4 de 2023/24 est classée faux doublon à la main (`FORCE_FAUX` dans le script). La PRO D2 est classée sur les mêmes week-ends.
- **Série** : semaines consécutives avec au moins un match, club et sélection confondus.
- **Limite** : les fichiers ne contiennent aucun autre championnat national. La comparaison porte sur les coupes d'Europe et les matchs internationaux ; les clubs étrangers ne sont vus que sur leurs matchs européens.
