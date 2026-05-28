# Checklist App Store Privacy (App Store Connect) — boom.contact

> **DRAFT opérationnel** dérivé de `legal/APP_STORE_PRIVACY.md` + `legal/PRIVACY.md` + `legal/DPA_SUBPROCESSORS.md`.
> **Non validé juridiquement.** À confirmer par le juriste **et** à vérifier ligne par ligne contre l'implémentation réelle avant saisie dans App Store Connect → *App Privacy*.
> Rappel "Tracking" (Apple) = lier des données à des données tierces à des fins publicitaires / data broker. boom.contact **ne fait pas** de tracking au sens ATT (pas de pub, pas de revente).

## Sous-traitants (processors) référencés
Anthropic (OCR), OpenAI (transcription vocale), Stripe (paiement), Resend (email), Railway (hébergement), PostHog (analytics produit), Sentry (erreurs/crash), OpenTimestamps (horodatage), OSM/Nominatim (cartes). Cf. `legal/DPA_SUBPROCESSORS.md`.

---

## Tableau par catégorie

| Catégorie Apple | Collected? | Linked to user? | Tracking? | Purpose | Retention | Processors | Notes |
|---|---|---|---|---|---|---|---|
| **Contact Info** (email) | Oui | Oui | Non | App functionality (envoi PDF), Account | Selon `DATA_RETENTION.md` | Resend | Email conducteur + invités (optionnel pour invités) |
| **User Content** (constat, circonstances, signatures, croquis) | Oui | Oui | Non | App functionality | Durée du dossier / suppression compte | Railway | Cœur du produit |
| **Photos/Videos** (photos dégâts, documents) | Oui | Oui | Non | App functionality | Idem dossier | Railway, Anthropic (OCR transitoire) | OCR via Claude Vision |
| **Audio Data** (description vocale) | Oui | Oui (transitoire) | Non | App functionality (transcription) | Court terme (cf. `DATA_RETENTION.md`) | OpenAI (Whisper) | Audio transcrit puis non conservé durablement — **à confirmer** |
| **Location** (lieu accident, précise) | Oui | Oui | Non | App functionality | Idem dossier | OSM/Nominatim (géocodage) | Avec consentement OS |
| **Identifiers** (session id, user id) | Oui | Oui | Non | App functionality, Analytics | — | PostHog | Pas d'IDFA |
| **Purchases** (historique d'achat de crédits) | Oui | Oui | Non | App functionality | Comptable | Stripe | Packages 1/3/10 |
| **Payment Info** (carte) | **Non** (par l'app) | — | Non | — | — | Stripe (PCI-DSS) | L'app **ne stocke pas** la carte ; tout via Stripe |
| **Diagnostics** (perf) | Oui | Non (de préférence) | Non | App functionality, Diagnostics | — | Sentry, PostHog | — |
| **Crash Data** | Oui | Non | Non | Diagnostics | — | Sentry | — |
| **Usage Data** (interactions produit) | Oui | Selon config | Non | Analytics | — | PostHog | First-party, pas de pub |
| **Sensitive Info** | **À trancher** | — | — | — | — | — | Un constat peut contenir des données sensibles (santé si blessés) → **question juriste** |

---

## Cases à cocher avant publication
- [ ] Chaque catégorie ci-dessus confirmée contre le code réel.
- [ ] « Used for tracking » = **Non** pour toutes (confirmer absence de SDK pub / ATT).
- [ ] Sensitive Info (santé/blessés) tranché avec le juriste.
- [ ] Purposes alignés avec les libellés Apple exacts.
- [ ] URL politique de confidentialité renseignée (publier `legal/PRIVACY.md` en page web).
- [ ] Cohérence avec `docs/google-data-safety-console-checklist.md`.

> ⚠️ Ne pas soumettre tant que le juriste n'a pas validé et que la collecte réelle n'a pas été vérifiée.
