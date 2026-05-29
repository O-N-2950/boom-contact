# Analytics — Privacy Review (RGPD / nLPD)

_Mise à jour : 2026-05-29. Non juridique — à faire valider par un juriste avant publication._

## 1. Outils et rôle
| Outil | Rôle | Cookies | Consentement |
| --- | --- | --- | --- |
| Sentry | Monitoring d'erreurs (stabilité/sécurité) | non (pas de cookie pub) | intérêt légitime — actif sans opt-in, **sans session replay** (`replaysOnErrorSampleRate: 0`), sans PII |
| PostHog (EU) | Événements UX / funnels | localStorage (pas de cookie pub) | **requiert consentement « all »** |
| GA4 | Trafic agrégé | cookies GA | **requiert consentement « all »** (IP anonymisée) |

PostHog et GA4 ne s'initialisent **que** si `boom_cookie_consent === 'all'` ET en production.
Le `CookieBanner` propose « Essentiels uniquement » vs « Accepter ✓ ». Accepter active
l'analytics immédiatement (`enableAnalyticsAfterConsent`), sans rechargement. Refuser =
aucun event envoyé (`track()` no-op).

## 2. Données trackées (autorisées)
Uniquement des propriétés **non identifiantes** : `language`, `source` (garage|scan|manual),
`loggedIn` (bool), `step`, `method`, `count`, `credits_bucket`, `country` (code).
PostHog `autocapture: false`, `disable_session_recording: true`, persistence localStorage.

## 3. Données INTERDITES (filtrées par `sanitizeProps`)
Email, nom/prénom, téléphone, plaque/immatriculation, VIN, adresse, GPS/coordonnées exactes,
transcript audio/voix, contenu PDF, description d'accident, IBAN/carte, mot de passe/token,
date de naissance. Le filtre supprime ces clés **et** toute valeur ressemblant à un email ou
tout texte libre (> 64 caractères). Couvert par `server/src/__tests__/analytics.test.ts`.

## 4. Base légale
- Sentry (erreurs, sans PII) : intérêt légitime (art. 6.1.f RGPD) — sécurité/stabilité.
- PostHog / GA4 (mesure d'audience) : **consentement** (art. 6.1.a) via le bandeau cookies.
- Aucune donnée spéciale, aucun profilage publicitaire, aucune revente.

## 5. Incohérence corrigée ce sprint
Avant : `main.tsx` initialisait PostHog + GA4 **sans condition de consentement**, alors que le
bandeau affirmait « aucun cookie de tracking ». **Corrigé** : init conditionné au consentement
« all ». Le bandeau est désormais factuellement exact pour les utilisateurs « essentiels ».

**Reste à faire (doc, non bloquant)** : aligner le wording du bandeau pour mentionner
explicitement PostHog/GA4 dans la catégorie « mesure d'audience (optionnelle, sur consentement) »
plutôt que « aucun tracking », afin d'être transparent une fois les clés analytics activées.

## 6. Recommandations stores
- **Apple App Privacy** : déclarer « Usage Data / Product Interaction » lié à l'app, **non lié à
  l'identité**, finalité Analytics, **consenti**. Pas de tracking cross-app (pas d'IDFA).
- **Google Data Safety** : « App activity / Product interaction », collecte optionnelle,
  chiffrée en transit, l'utilisateur peut refuser (bandeau).
- Mentionner Sentry (diagnostics/crash) séparément.

## 7. Droits & rétention
- Suppression de compte déjà disponible (auth.deleteAccount) → PostHog `reset()` à câbler au logout/suppression (TODO mineur).
- Conserver une politique de rétention PostHog raisonnable (ex. 12 mois) côté projet PostHog.
