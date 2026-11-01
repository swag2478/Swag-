# Mettre Swag en ligne

Swag est un site statique : `python3 build.py` produit le dossier `dist/`, qu'on publie tel quel.
Aucune annale n'est publiée : chaque étudiant importe ses propres PDF, qui restent sur son appareil.
Seule l'adresse e-mail passe par Supabase, pour la connexion et la liste des membres.

> **Honnêteté sur le contrôle d'accès.** Le code du site est public et la vérification d'adhésion se fait
> dans le navigateur. Elle réserve Swag aux membres, mais une personne motivée peut lire le code et le faire
> tourner chez elle. Ce n'est pas grave : le site ne contient aucune donnée secrète (ni annale, ni corrigé).
> La table `members`, elle, est réellement protégée par les règles RLS de Supabase.

## 1. Supabase (une seule fois)

1. Crée un projet sur supabase.com. Choisis un **nom neutre** (par exemple « swag »), sans ton pseudo.
2. **SQL Editor** → nouvelle requête → colle le contenu de `supabase/setup.sql` → *Run*.
3. Dans une **autre** requête, ajoute ta propre adresse comme administrateur (elle n'est écrite nulle part dans le dépôt) :
   ```sql
   insert into public.members(email, role) values ('ton.adresse@exemple.fr', 'admin');
   ```
4. **Authentication → Sign In / Providers → Email** : laisse « Email » activé.
   Vérifie que la longueur du code (*Email OTP Length*) est **6**. Une durée de validité d'une heure (3600 s) convient.
5. **Authentication → Emails → Templates** : modifie **les deux** modèles suivants pour y mettre le code `{{ .Token }}`.
   Supabase envoie « Confirm signup » à la toute première connexion d'une adresse, puis « Magic Link » les fois suivantes.

   Sujet : `Ton code Swag : {{ .Token }}`

   Corps (pour « Magic Link », et le même pour « Confirm signup ») :
   ```html
   <h2>Connexion à Swag</h2>
   <p>Ton code : <strong style="font-size:24px;letter-spacing:4px">{{ .Token }}</strong></p>
   <p>Saisis-le dans Swag. Il ne sert qu'une fois et expire dans une heure.</p>
   <p>Ou, si tu es dans le même navigateur : <a href="{{ .ConfirmationURL }}">ouvrir Swag</a>.</p>
   <p>Si tu n'as rien demandé, ignore cet e-mail.</p>
   ```
   Sur iPad, le lien s'ouvre dans Safari et pas dans Swag installé sur l'écran d'accueil : c'est pour ça que le code est là.
6. **E-mails : configure un SMTP** (*Authentication → Emails → SMTP Settings*). Le service d'e-mail intégré à Supabase
   n'envoie qu'aux adresses des membres de **ton équipe Supabase** et seulement quelques e-mails par heure : il ne suffit pas pour les étudiants.
   Un service gratuit comme Brevo ou Resend convient. **Anonymat** : prends une adresse d'expéditeur neutre
   (par exemple `swag.annales@…` ou `noreply@ton-domaine`), jamais ton adresse personnelle, et un nom d'expéditeur « Swag ».
   Ensuite, dans *Authentication → Rate Limits*, ajuste le nombre d'e-mails par heure.
7. **Authentication → URL Configuration** : *Site URL* = l'adresse du site (par exemple `https://swag-annales.pages.dev`) ;
   ajoute la même adresse dans *Redirect URLs*.
8. **Project Settings → API** : copie *Project URL* et la clé **anon public** dans `src/config.js` :
   ```js
   window.SWAG_CONFIG={ supabaseUrl:"https://xxxx.supabase.co", supabaseAnonKey:"eyJ…", offlineDays:30 };
   ```
   Ces deux valeurs sont publiques par nature : les droits viennent des règles RLS. **Ne mets jamais la clé `service_role`.**

Gérer les membres : onglet **Membres** du site (visible des administrateurs), ou *Table Editor → members* dans Supabase.
Ajouter une adresse n'envoie rien : préviens la personne. Un membre retiré garde l'accès hors ligne au plus `offlineDays` jours,
jusqu'à sa prochaine connexion à internet.

Facultatif : n'importe qui peut demander un compte Supabase avec la clé publique, mais sans ligne dans `members` il ne voit rien
et Swag lui refuse l'accès. Pour aller plus loin, Supabase propose un *Auth Hook « Before User Created »* qui peut refuser
les adresses absentes de `members`.

## 2. Hébergement

Commande de build : `python3 build.py` · dossier publié : `dist/`. Les en-têtes HTTP sont dans `dist/_headers`
(lu par Cloudflare Pages et Netlify). Le site doit être servi en **HTTPS** (fourni par les deux hébergeurs).

### Cloudflare Pages (recommandé)
- **Sans lien avec GitHub (le plus anonyme)** : `python3 build.py` puis `npx wrangler pages deploy dist --project-name swag-annales`.
- **Ou relié au dépôt** (dépôt privé de préférence) : *Workers & Pages → Create → Pages → Connect to Git*,
  build command `python3 build.py`, build output `dist`.
- Choisis un nom de projet neutre : l'adresse sera `https://<nom>.pages.dev`.

### Netlify
- `netlify.toml` est prêt (build `python3 build.py`, publication `dist`). Relie le dépôt,
  ou glisse le dossier `dist/` sur *app.netlify.com/drop*. Renomme le site avec un nom neutre.

## 3. Anonymat : à vérifier avant de diffuser l'adresse
- [ ] L'adresse du site ne contient pas ton pseudo (nom de projet Cloudflare / Netlify neutre).
- [ ] Le dépôt : `github.com/<pseudo>/…` montre ton pseudo, et **les premiers commits de l'historique sont signés de ton pseudo**.
      Si le dépôt doit rester public, crée une organisation GitHub dédiée et pousses-y un **historique neuf**, par exemple :
      `git checkout --orphan propre && git commit -m "Swag" && git push <nouvelle-adresse> propre:main`,
      avec un nom et un e-mail d'auteur neutres (`git config user.name "Swag"`, e-mail `…@users.noreply.github.com` de l'organisation).
      Sinon, passe le dépôt en **privé** et publie avec Cloudflare Pages ou Netlify.
- [ ] Expéditeur des e-mails : SMTP avec une adresse et un nom neutres (étape 1.6).
- [ ] Ton adresse n'est que dans la table `members` de Supabase, jamais dans le dépôt.

## 4. Vérifier
```bash
npm install          # pdf.js 3.11.174, pdf-lib 1.17.1, supabase-js 2.45.4 pour les tests
npm test             # build + tous les tests Playwright (Supabase simulé, PDF fictifs générés)
```
Tes vrais corrigés peuvent être déposés dans `tests/fixtures/` (ignoré par git) : les tests de masquage les prennent aussi.
`node tools/pipeline.js check fichier.pdf…` contrôle des PDF un par un, sans interface.
