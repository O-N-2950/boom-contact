# boom.contact — Audit Final Soumission Stores (Apple + Google)

> Audit code + prod réel (2026-06-01, HEAD eeff722). Vérifié, non déclaratif. ⚠️ Ne déclare PAS public-ready : QA device + juriste restent requis.

## 1. Conformité stores — bloquants de rejet classiques

| Exigence | État | Preuve |
|---|---|---|
| **Suppression de compte** (Apple 5.1.1(v) + Google) | ✅ **Implémentée** | `auth.deleteAccount` (route + UI AccountPage) : transaction qui SUPPRIME PII (constats/photos/signatures/vocal, véhicules, magic tokens, user) et ANONYMISE les écritures financières (rétention légale). Compte admin protégé. RGPD/nLPD-conforme. |
| **Consentement analytics** | ✅ **Gaté** | `hasAnalyticsConsent()` = `boom_cookie_consent==='all'`. `initPostHog()`/`initGA4()` return si pas de consentement → clients jamais initialisés → `track()` no-op. GA4 IP anonymisée. `sanitizeProps()` filtre toute PII. `CookieBanner.tsx` présent. |
| **Aucun claim interdit** | ✅ | `check:claims` A_BLOCKING=0 dans le quality gate. |
| **Politique de confidentialité / CGU accessibles** | ✅ | Vues `?privacy=true` + `cgu` (à confirmer lien depuis onboarding). |
| **Permissions justifiées + fallback** | ✅ | Caméra/micro/photos/localisation : strings claires + fallback manuel (cf. `mobile-permissions-review.md`). |
| **Pas de secret en dépôt** | ✅ | Scan Git : seul `.env.example` (placeholders). Aucun keystore/clé. |

**→ Les 2 bloquants P0 que l'on craignait (suppression compte, consentement) sont RÉSOLUS dans le code.**

## 2. Android

| Élément | Valeur | Verdict |
|---|---|---|
| Internal Testing | **ACTIF** v1.0.0 / versionCode 1 | ✅ live |
| applicationId | contact.boom.app | ✅ |
| minSdk / target / compile | 23 / 35 / 35 | 🟡 minSdk 23 < min Capacitor 8 (24) — cf. legacy audit |
| Signing | via env (keystore Codemagic) | ✅ AAB signé produit |
| App Links autoVerify | www.boom.contact + boom.contact | ✅ déclaré |
| **assetlinks.json** | **1 seule empreinte SHA-256** | 🔴 **P1** : Play App Signing re-signe l'app → il faut AUSSI le SHA-256 Play App Signing, sinon les liens n'ouvrent pas l'app installée depuis Play |
| Legacy devices | score 62/100 | 🟡 non testé sur appareil ancien réel |

## 3. iOS

| Élément | Valeur | Verdict |
|---|---|---|
| Pipeline Codemagic `ios-testflight` | prêt | ✅ |
| Build / TestFlight | **AUCUN build produit** | 🔴 **P0 pour démarrer** : clé App Store Connect API à configurer dans Codemagic |
| Bundle / Team ID | contact.boom.app / 7YWB99G6Q8 | ✅ |
| MARKETING_VERSION / build | 1.0.0 / 1 | ✅ |
| Associated Domains | applinks:www.boom.contact + boom.contact | ✅ |
| AASA | 7YWB99G6Q8.contact.boom.app | ✅ servi en prod (200) |
| UsageDescription (caméra/micro/photos/localisation) | présents, bien rédigés | ✅ |

## 4. Backend / prod / qualité

| Élément | État |
|---|---|
| Prod (/, /health, /account, /b2b) | ✅ 200 |
| Webhook Stripe | ✅ intact (non modifié depuis 6 j) |
| quality:prestore | ✅ exit 0 — 180 tests + 7 skipped, A_BLOCKING=0, i18n FR/EN/DE/IT complet |
| Pipeline Codemagic | ✅ résolu : Node 22 → JDK 21 → doublons Kotlin (stdlib 1.8.22) → AAB |

## 5. Findings (hors bloquants stores)

- **P2 — Suppression compte vs organisations** : `deleteAccount` ne nettoie pas `organization_members`/`organizations`. Si un **owner d'organisation** se supprime, membership/org peuvent rester orphelins (et une org peut perdre son seul owner). À traiter (anonymiser/transférer/retirer le membership dans la transaction de suppression). Pas un bloquant store, mais intégrité de données.
- **P2 — Sentry** : initialisé sur `IS_PROD` (pas sur consentement). Crash-reporting souvent accepté en intérêt légitime, mais à mentionner dans la privacy (déjà fait) ; envisager un gating si exigence stricte.
- **P2 — Chunk `ConstatFlow`** 262 KB : surveiller le temps de parse sur Android ancien.

## 6. Scores honnêtes (préparation, hors exécution restante)
- **Google Play Readiness : 84/100** — Internal Testing live, conformité OK ; reste P1 (assetlinks Play SHA-256, QA device, screenshots/feature graphic/listing DE-IT).
- **App Store Readiness : 78/100** — tout prêt SAUF aucun build iOS encore produit (clé ASC).
- **Premium Store Launch Readiness : 81/100** — socle solide, Android en test interne, bloquants compliance résolus ; mais QA device non prouvée, build iOS absent, assetlinks Play SHA à compléter, assets incomplets, validation juriste en attente.

## 7. Bloquants par priorité
**P0 (avant de pouvoir soumettre)**
- iOS : configurer la clé App Store Connect API dans Codemagic → produire le 1er build TestFlight.

**P1 (avant lancement public)**
- assetlinks.json : ajouter le **SHA-256 Play App Signing** (Play Console → Intégrité de l'app → certificat de signature d'app).
- QA device réelle (récent + milieu de gamme + **Android 8/9 ancien**) — parcours P0/P1.
- Screenshots définitifs FR/EN/DE/IT + feature graphic Google + listing DE/IT.
- Validation juriste (CGU/Privacy couvrant audio/localisation/flotte/processors + disclaimers).

**P2 (polish / post-launch)**
- deleteAccount → nettoyage organisations ; gating Sentry ; perf chunk ConstatFlow ; décision minSdk 24.
