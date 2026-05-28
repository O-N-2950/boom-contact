# Checklist Google Data Safety (Play Console) — boom.contact

> **DRAFT opérationnel** dérivé de `legal/GOOGLE_DATA_SAFETY.md` + `legal/PRIVACY.md` + `legal/DPA_SUBPROCESSORS.md`.
> **Non validé juridiquement.** À confirmer par le juriste **et** à vérifier contre l'implémentation avant saisie dans Play Console → *Data safety*.
> Google distingue **Collected** (quitte l'appareil) et **Shared** (transmis à un tiers). « Processors » techniques ≠ « partage » au sens commercial, mais à déclarer selon les règles Google.

## Sous-traitants
Anthropic (OCR), OpenAI (transcription), Stripe (paiement), Resend (email), Railway (hébergement), PostHog (analytics), Sentry (crash/erreurs), OpenTimestamps, OSM/Nominatim. Cf. `legal/DPA_SUBPROCESSORS.md`.

---

## Tableau par type de donnée

| Type (Google) | Collected? | Shared? | Linked? | For tracking? | Purpose | Retention | Processors | Notes |
|---|---|---|---|---|---|---|---|---|
| **Email** (Personal info) | Oui | Oui (Resend) | Oui | Non | App functionality, Account mgmt | cf. `DATA_RETENTION.md` | Resend | Invités : optionnel |
| **Name** (si saisi conducteur) | Oui | Non | Oui | Non | App functionality | dossier | Railway | Nom conducteur sur constat |
| **Photos** (Photos and videos) | Oui | Oui (Anthropic OCR) | Oui | Non | App functionality | dossier | Anthropic, Railway | OCR transitoire |
| **Voice/Audio** (Audio) | Oui | Oui (OpenAI) | Oui (transitoire) | Non | App functionality | court terme | OpenAI | Transcription puis non conservé — **confirmer** |
| **Location** (precise/approx) | Oui | Oui (géocodage OSM) | Oui | Non | App functionality | dossier | OSM/Nominatim | Consentement OS |
| **User content** (constat, signatures) | Oui | Non | Oui | Non | App functionality | dossier / suppression | Railway | — |
| **App interactions** (Usage) | Oui | Oui (PostHog) | Selon config | Non | Analytics | — | PostHog | First-party |
| **Crash logs / Diagnostics** | Oui | Oui (Sentry) | Non | Non | Diagnostics | — | Sentry | — |
| **Purchase history** | Oui | Oui (Stripe) | Oui | Non | App functionality | comptable | Stripe | Crédits |
| **Payment info (carte)** | **Non** par l'app | Stripe gère | — | Non | — | Stripe (PCI-DSS) | App ne stocke pas la carte |
| **Device/other IDs** | Oui | Selon analytics | Oui | Non | Analytics, App functionality | — | PostHog | Pas d'ID pub |
| **Health/sensitive** (blessés) | **À trancher** | — | — | — | — | — | — | Question juriste |

---

## Réglages Data Safety
- [ ] **Data encrypted in transit** : Oui (HTTPS/TLS).
- [ ] **Data deletion** : l'utilisateur peut demander la suppression (compte + données) → renvoyer vers la procédure de suppression.
- [ ] **Tracking** : Non (aucun usage publicitaire / data broker).
- [ ] URL politique de confidentialité renseignée.
- [ ] Cohérence avec `docs/apple-app-privacy-console-checklist.md`.
- [ ] Chaque ligne vérifiée contre le code réel.
- [ ] Health/sensitive tranché avec le juriste.

> ⚠️ Ne pas soumettre tant que le juriste n'a pas validé et que la collecte réelle n'a pas été vérifiée.
