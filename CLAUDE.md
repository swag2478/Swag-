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
- **Anonymat** : le pseudo GitHub et l'e-mail du propriétaire ne doivent apparaître nulle part (site, adresse, dépôt, commits, e-mails envoyés). Hébergement à confirmer avec lui (dépôt privé + Cloudflare Pages / Netlify, ou organisation GitHub dédiée).
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
Étapes 1 à 4 et 6 faites et vérifiées (`npm test`, voir README) ; étape 5 préparée (`DEPLOIEMENT.md`, `netlify.toml`,
`src/_headers`) mais **la mise en ligne attend le choix d'hébergement du propriétaire** et la configuration Supabase
(`src/config.js` est vide tant qu'il n'a pas créé le projet). Les tests tournent sur des corrigés fictifs
(`tests/make-fixtures.py`) : refaire `npm test` avec de vrais corrigés déposés dans `tests/fixtures/`.
Anonymat : les deux premiers commits de l'historique portent le pseudo GitHub du propriétaire (voir DEPLOIEMENT.md § 3).

## Repères dans le code
- `src/parse3.js` (PARSER_VERSION=3) : lecteur des 3 formats de corrigés (Valide/Faux, « Réponse attendue »,
  cases colorées), QROC, TCS, questions annulées, commentaires/justifications.
- `src/check-core.js` : contrôle indépendant (texte révélateur couvert, couleur dans la colonne des réponses,
  `autodrop` des questions défectueuses, vérification du sujet vierge).
- `src/app.js` : interface (onglets Accueil, Annales, Séries, Série en cours, Carnet d'erreurs,
  Statistiques, Réglages), thème clair/sombre, détails rouges.
- `src/auth.js` : connexion Supabase (code / lien), table `members`, accès hors ligne, onglet Membres.
- `tests/harness.js` : banc Playwright (sert `dist/`, les bibliothèques CDN depuis `node_modules`, Supabase simulé avec RLS,
  version de référence artefact sur `ref.test`). `npm test` lance tout (`tests/run-all.js`).
