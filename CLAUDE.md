# Swag — site autonome (projet à terminer dans Claude Code)

Swag aide les étudiants en médecine à s'entraîner sur leurs annales corrigées (PDF UNESS) :
il masque les réponses, fait passer les questions une par une au barème EDN, tient un carnet
d'erreurs et des statistiques, et génère un **sujet vierge** en PDF. Tout se passe dans le
navigateur : les PDF sont lus et gardés sur l'appareil de l'étudiant, rien n'est envoyé à un serveur.

Le code de `src/` vient de la version « artefact claude.ai » (fonctionnelle, testée sur 263 annales).
Il faut maintenant en faire un site autonome. **Langue de l'interface et des échanges : français.**

## Décisions déjà prises par le propriétaire (ne pas les remettre en question)
- **Gratuit.** Aucun paiement.
- **Outil seul : aucune annale, aucun corrigé, aucune donnée extraite d'annale dans le dépôt** (dépôt public).
  Chaque étudiant importe ses propres PDF. `.gitignore` exclut déjà `*.pdf`.
- **Pas d'artefact Claude** : retirer toute dépendance à `window.claude` (db, assets, user, sample, downloads).
- **Pas d'IA** : supprimer les explications Claude du carnet d'erreurs (et le réglage associé).
  Le carnet garde la capture, la réponse donnée et la correction officielle.
- **Anonymat** : le pseudo GitHub personnel et l'e-mail personnel du propriétaire ne doivent apparaître nulle part (site, adresse, dépôt, commits, e-mails envoyés). Le dépôt est sur un compte GitHub dédié et anonyme : c'est voulu.
- **Hébergement choisi : GitHub Pages** (workflow `.github/workflows/pages.yml`). Le site doit marcher aussi bien sur **ordinateur** que sur iPad et téléphone.
- **Adhésions gratuites gérées par liste d'e-mails** via **Supabase** (compte du propriétaire) :
  connexion par code à 6 chiffres reçu par e-mail (le lien magique ouvre Safari et pas l'app installée
  sur iPad, donc prévoir la saisie du code ; gérer aussi le lien). L'e-mail de l'admin n'est jamais écrit dans le dépôt : le propriétaire l'insère lui-même dans Supabase.
  L'admin gère les membres depuis un onglet du site (ajouter/retirer des e-mails) et/ou le tableau Supabase.
  Être honnête dans l'interface et la doc : le code du site est public, le contrôle d'accès se fait côté client.

## Travail à faire
1. **Site autonome** (`build.py` → `dist/`) :
   - `initStore` : mode local IndexedDB uniquement (déjà présent). `CATALOG=[]` : retirer le code des
     annales intégrées (`builtin`, `ensureData`, `probeBuiltin`, `openLocalImport` lié au catalogue,
     bandeaux « fichiers intégrés », section Réglages « Annales intégrées », `diagAccess`, `getFile`).
   - Téléchargements : remplacer `S.downloads` par `navigator.share({files})` quand disponible (iPad :
     « Enregistrer dans Fichiers »), sinon lien `<a download>` sur un blob.
   - `navigator.storage.persist()` ; bouton **Sauvegarder / Restaurer ma progression** (JSON des résultats,
     séries, réglages — sans les PDF). Prévenir que sur iPad il faut **installer Swag sur l'écran d'accueil**
     (sinon Safari peut effacer les données après 7 jours sans visite).
2. **Import en masse** : choisir plusieurs PDF d'un coup ; chaque fichier passe `checkBytes(bytes,{vierge:true,autodrop:true})` ;
   refuser si `rep.errs.length` (des réponses resteraient visibles) ou `nq==0` ; doublon par sha1 ;
   UE / épreuve / date devinées avec `tools/meta.js` (à porter côté navigateur) à partir du nom de fichier,
   puis du texte de la 1re page si besoin ; sinon UE « À classer ». Récap à la fin, chaque ligne modifiable.
   Classement : par UE puis par année (déjà en place).
3. **Adhésions Supabase** : supabase-js depuis `cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4`.
   Écran de connexion avant l'app ; vérifier l'adhésion (table `members`) après connexion ;
   message clair pour un non-membre ; garder l'accès hors ligne si l'adhésion a été vérifiée récemment.
   SQL de départ (à faire coller par le propriétaire dans l'éditeur SQL Supabase) :
   ```sql
   create table public.members(
     email text primary key check (email = lower(email)),
     role text not null default 'member' check (role in ('member','admin')),
     note text, added_at timestamptz not null default now());
   alter table public.members enable row level security;
   create or replace function public.is_admin() returns boolean language sql stable security definer
     set search_path = public as $$ select exists(select 1 from members
       where email = lower(auth.jwt()->>'email') and role = 'admin') $$;
   create or replace function public.can_join(e text) returns boolean language sql stable security definer
     set search_path = public as $$ select exists(select 1 from members where email = lower(trim(e))) $$;
   grant execute on function public.can_join(text) to anon, authenticated;
   create policy "lecture" on public.members for select to authenticated
     using (email = lower(auth.jwt()->>'email') or public.is_admin());
   create policy "ajout admin" on public.members for insert to authenticated with check (public.is_admin());
   create policy "modif admin" on public.members for update to authenticated using (public.is_admin()) with check (public.is_admin());
   create policy "retrait admin" on public.members for delete to authenticated using (public.is_admin());
   -- puis, à part, le propriétaire ajoute sa propre adresse :
   -- insert into public.members(email, role) values ('<ton e-mail>', 'admin');
   ```
   Modèle d'e-mail Supabase « Magic Link » à faire modifier pour inclure `{{ .Token }}` (le code).
   Configuration (URL du projet + clé `anon`, publiques) dans un fichier `src/config.js`.
4. **PWA** : `manifest.webmanifest`, icônes, service worker (hors ligne, cache de pdf.js 3.11.174,
   pdf-lib 1.17.1, supabase-js). Affichage adapté iPad (déjà conçu pour).
5. **Mise en ligne** selon l'hébergement choisi (commande de build : `python3 build.py`, dossier publié : `dist/`).
6. **Vérifier de bout en bout** (Playwright, voir `tests/`) : import en masse, masquage strictement
   identique à la version artefact (`tests/tcmp.js` compare position par position), sujet vierge,
   largeur iPad / téléphone sans défilement horizontal, connexion, refus d'un non-membre (Supabase simulé).
   Les PDF de test ne sont pas dans le dépôt : les mettre dans `tests/fixtures/` (ignoré par git).
   Le propriétaire ne tolère **aucune erreur de masquage** : revérifier systématiquement.

## État (novembre 2026)
Étapes 1 à 6 faites. Lecteur v4 : images de correction masquées (vérifié sur 263 vraies annales, contrôle indépendant). Masquage comparé écran par écran sur 13 vrais corrigés. Mise en page vérifiée sur ordinateur (1920, 1440, 1280 px), iPad et téléphone.
Zones à pointer (format « Réponse attendue ») : 119/149 jouables sur les 263 annales, zone absente de l'image avant validation vérifiée sur 242 zones ; les corrigés de format ancien ne dessinent pas la zone (mises de côté). À la relecture d'une annale, les résultats suivent leur question (`upgradeImported`). Les 119 zones testées une par une (point au centre = juste, point hors zone = faux). TCS : 53 TCS « Réponse attendue » ajoutés (effectifs et barres vérifiés masqués, contrôle indépendant) ; 3 restent de côté (réponses des experts absentes du PDF).
Site en ligne sur GitHub Pages ; `src/config.js` contient l'URL et la clé publique (anon) du projet Supabase.
`npm test` tourne sur des corrigés fictifs (`tests/make-fixtures.py`) ; de vrais corrigés peuvent être déposés dans `tests/fixtures/` (ignoré par git).

## Repères dans le code
- `src/parse3.js` (PARSER_VERSION=7 : TCS « Réponse attendue » aux intitulés libres lus par les effectifs du panel (`parseTCS2`, contrôles : 5 lignes, même dénominateur, somme = panel) ; masque aussi les images situées dans la correction ; une page d'image sans texte (radio, scanner) entre deux pages d'une question est affichée dans cette question (`extendSegs`) ; zones à pointer : `parseZone`, la zone est effacée à l'affichage en repeignant l'image d'origine, `paintClean` dans app.js) : lecteur des 3 formats de corrigés (Valide/Faux, « Réponse attendue »,
  cases colorées), QROC, TCS, questions annulées, commentaires/justifications.
- `src/check-core.js` : contrôle indépendant (texte révélateur couvert, couleur dans la colonne des réponses,
  `autodrop` des questions défectueuses, vérification du sujet vierge).
- `src/app.js` : interface (onglets Accueil, Annales, Séries, Série en cours, Carnet d'erreurs,
  Statistiques, Réglages), thème clair/sombre, détails rouges.
- `src/auth.js` : connexion Supabase (code / lien), table `members`, accès hors ligne, onglet Membres.
- `tests/harness.js` : banc Playwright (sert `dist/`, les bibliothèques CDN depuis `node_modules`, Supabase simulé avec RLS,
  version de référence artefact sur `ref.test`). `npm test` lance tout (`tests/run-all.js`).
