# Analytics Activation Runbook (Railway)

_But : activer réellement la mesure en production. Sans ces variables au build, l'analytics
reste silencieux (par sécurité). Mise à jour : 2026-05-29._

## 1. Variables (toutes build-time, inline par Vite à la compilation)

| Variable | Requise ? | Format / exemple | Si absente |
| --- | --- | --- | --- |
| `VITE_POSTHOG_KEY` | **Oui** (pour PostHog) | `phc_xxxxxxxxxxxxxxxxxxxxxxxx` (Project API Key) | PostHog **off** |
| `VITE_POSTHOG_HOST` | Optionnelle | `https://eu.i.posthog.com` (défaut) | défaut UE utilisé |
| `VITE_GA4_ID` | Optionnelle | `G-XXXXXXXXXX` | GA4 **off** |
| `VITE_SENTRY_DSN` | Optionnelle | `https://xxxx@oyyy.ingest.sentry.io/zzz` | Sentry **off** |
| `VITE_RELEASE` / `VITE_APP_VERSION` | Optionnelles | `boom-contact@0.1.0` | tag par défaut |

> ⚠️ **Aucune clé réelle ne doit être commitée dans Git.** Elles vivent uniquement dans les
> variables Railway. Le repo n'en contient aucune.

Rappel des conditions d'envoi (déjà codées) :
- **Production uniquement** : `hostname === www.boom.contact | boom.contact`.
- **PostHog + GA4** : uniquement si l'utilisateur a accepté **« tous les cookies »**.
- **Sentry** : erreurs seulement, sans session replay, sans PII (intérêt légitime).

## 2. Où ajouter les variables dans Railway
1. Railway → projet boom.contact → service web → onglet **Variables**.
2. **New Variable** pour chacune (nom exact ci-dessus, ex. `VITE_POSTHOG_KEY` = `phc_…`).
3. `VITE_POSTHOG_HOST` = `https://eu.i.posthog.com` (résidence UE).
4. Sauvegarder.

## 3. Rebuild obligatoire
Les variables `VITE_*` sont **inline au build** : une modif ne prend effet qu'après un **nouveau
build**. Railway redéploie automatiquement sur changement de variables ; sinon, pousser un
commit vide ou cliquer **Redeploy**.

## 4. Vérifier que le bundle a bien été reconstruit
1. Attendre le déploiement **SUCCESS**.
2. Ouvrir https://www.boom.contact, **accepter les cookies** (« Accepter ✓ »).
3. Console navigateur :
   ```js
   window.__boomAnalytics.status()
   // => { prod: true, consent: true, posthog: true, ga4: <bool>, sentry: <bool>, recent: [...] }
   ```
   - `posthog: true` ⇒ clé bien prise en compte au build.
   - `recent` se remplit des derniers events (ex. `landing_viewed`).
4. Dans PostHog → **Activity / Live events** : voir arriver `landing_viewed`, etc.

> Le helper `window.__boomAnalytics.status()` n'expose **aucune clé** — uniquement des booléens
> et les noms d'events récents. Aucun panneau visible pour l'utilisateur.

## 5. Désactiver l'analytics si nécessaire
- **Au build** : retirer `VITE_POSTHOG_KEY` (et `VITE_GA4_ID`) des variables Railway → rebuild.
  PostHog/GA4 ne s'initialisent plus du tout.
- **Côté utilisateur** : choisir « Essentiels uniquement » dans le bandeau, ou exécuter
  `localStorage.setItem('boom_cookie_consent','essential')` puis recharger.

## 6. Données envoyées (rappel)
Uniquement des propriétés non identifiantes filtrées par `sanitizeProps()` (langue, source,
loggedIn, step, method, count, credits_bucket, country). Détail : `analytics-privacy-review.md`.
