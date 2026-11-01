# Swag

Entraînement aux annales de médecine : réponses masquées, questions une par une au barème EDN,
carnet d'erreurs, statistiques et sujet vierge en PDF. Gratuit. Swag ne contient aucune annale :
chaque étudiant importe ses propres corrigés PDF, qui restent sur son appareil.

- Site statique : `python3 build.py` → `dist/` (Python seul). Mise en ligne et Supabase : voir **DEPLOIEMENT.md**.
- Accès réservé aux membres (liste d'e-mails dans Supabase, connexion par code à 6 chiffres). Le code est public et
  ce contrôle se fait dans le navigateur : il réserve le site, il ne protège pas de données secrètes.
- Hors ligne : application installable (PWA). Sur iPad, l'installer sur l'écran d'accueil pour que Safari n'efface pas les données.

## Structure
| Fichier | Rôle |
|---|---|
| `src/parse3.js` | lecture des corrigés (3 formats), identique à la version artefact |
| `src/check-core.js` | contrôle indépendant du masquage et du sujet vierge, identique à la version artefact |
| `src/meta.js` | UE / épreuve / date devinées depuis le nom du fichier (aussi utilisé par `tools/meta.js`) |
| `src/app.js` | interface, stockage IndexedDB, import en masse, sauvegarde, sujet vierge |
| `src/auth.js` | connexion Supabase, vérification d'adhésion, onglet Membres |
| `src/config.js` | adresse du projet Supabase et clé publique `anon` |
| `src/sw.js`, `src/manifest.webmanifest`, `src/icons/` | application installable et hors ligne |
| `supabase/setup.sql` | table `members` et règles RLS |

## Tests
```bash
npm install
npm test
```
Playwright, Supabase simulé, corrigés **fictifs** générés par `tests/make-fixtures.py` dans `tests/fixtures/` (ignoré par git).
Le masquage est comparé à la version artefact (commit `ade14bc`) : données, captures, et couverture à l'écran de chaque texte révélateur.
