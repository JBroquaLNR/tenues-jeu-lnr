# Tenues de jeu LNR · V0.1.0

Site de dépôt, de validation et de compatibilité des tenues de jeu (TOP 14 et PRO D2).
Cette version contient **l'admin** : suivi, validation, paires à trancher, matrices, catalogue, visuels.
L'espace club (un lien par club) arrive dans la version suivante.

Site statique : aucune installation, aucune commande de construction.

## Ce que contient le dossier

Seul le dossier `public/` est mis en ligne. Le reste sert à l'installation et reste dans le dépôt.

| Fichier | Rôle |
|---|---|
| `public/index.html` | Page d'accueil, sans contenu sensible |
| `public/admin.html` | L'application LNR |
| `public/config.js` | Les deux réglages Supabase à renseigner |
| `public/data.json`, `public/img/` | Catalogue 2026-2027 : clubs, tenues, calendrier, verdicts du document |
| `public/gabarits/` | Gabarits recolorés pour les visuels |
| `public/lib/` | Bibliothèques (lecture PDF, client Supabase) |
| `public/_headers`, `public/robots.txt` | Demandent aux moteurs de recherche de ne pas indexer le site |
| `supabase/schema.sql` | Script de création de la base (non publié) |
| `.github/workflows/keepalive.yml` | Empêche la mise en pause du projet Supabase gratuit |

## Tester avant toute configuration

Tant que `public/config.js` est vide, `admin.html` s'ouvre en **mode démonstration** : pas de mot de passe,
les saisies restent dans le navigateur, les images de BAT ne sont pas conservées.
Pour l'ouvrir en local, lancez à la racine `python -m http.server 8000 --directory public` puis allez sur
`http://localhost:8000/admin.html` (un double-clic sur le fichier ne suffit pas).

## Mise en service

### 1. Supabase

1. Créez un projet, **région européenne** (Paris ou Francfort).
2. *Authentication > Users > Add user* : créez le compte LNR (adresse + mot de passe), en cochant la
   confirmation automatique. L'adresse sert d'identifiant de connexion.
3. *Authentication*, réglages du fournisseur Email : **désactivez les inscriptions** de nouveaux utilisateurs.
4. Ouvrez `supabase/schema.sql`, remplacez `REMPLACER@exemple.fr` (dernière ligne) par l'adresse du compte LNR,
   puis collez tout le fichier dans *SQL Editor* et lancez-le.
5. *Project Settings > API* : copiez l'URL du projet et la clé publique (« anon » ou « publishable »)
   dans `public/config.js`.

### 2. GitHub

Déposez le contenu du dossier dans un dépôt **privé**, puis ajoutez deux secrets
(*Settings > Secrets and variables > Actions*) : `SUPABASE_URL` et `SUPABASE_ANON_KEY`, avec les mêmes
valeurs que dans `public/config.js`. Ils servent uniquement à la tâche hebdomadaire.

### 3. Cloudflare Pages

*Workers & Pages > Create > Pages > Connect to Git*, choisissez le dépôt.
Aucun préréglage, **commande de construction vide**, dossier de sortie `public`.
Chaque envoi sur GitHub redéploie le site.

## Ce qui protège quoi

- La base n'accepte que le compte dont l'adresse figure dans la table `admins`. Un autre compte, même créé,
  ne lit et ne modifie rien.
- Les images de BAT sont dans un espace de stockage privé, lisible seulement par ce compte.
- Le catalogue 2026-2027 (`public/data.json`, `public/img/`) fait partie des fichiers du site : il est accessible à qui
  connaît l'adresse exacte d'un fichier. Ces tenues sont déjà portées cette saison. Celles de la saison
  suivante passeront par la base, pas par ces fichiers.

## Limites connues de cette version

- Un seul compte partagé : l'historique indique le prénom saisi en haut de page, sans le vérifier.
- Pas de mise à jour en direct : les données se rechargent à l'ouverture, au retour sur l'onglet, ou avec « Actualiser ».
- Un PDF de plusieurs pages : seule la première est enregistrée (une page par tenue).
- La connexion à Supabase n'a pas pu être essayée sur un vrai projet avant livraison : seul le script de base
  a été exécuté sur un PostgreSQL local, et l'application testée contre une base simulée.

## Mises à jour

Les versions suivantes seront livrées sans `public/config.js`, pour ne pas écraser vos réglages.
