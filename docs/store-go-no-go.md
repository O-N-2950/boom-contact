# Go / No-Go Store — boom.contact

> Critères de décision pour franchir chaque palier de publication.
> Statut courant à la date de ce document : voir colonne **État** (🟢 fait / 🟡 partiel / 🔴 à faire).

---

## 1. GO TestFlight / Internal Testing

À remplir avant d'envoyer aux testeurs internes.

| Critère | État | Note |
|---------|------|------|
| Build iOS signé OK | 🔴 | Nécessite macOS + Xcode (hors environnement actuel) |
| Build Android signé OK | 🔴 | Nécessite Android Studio + clé de signature |
| App démarre sans crash (device réel) | 🔴 | À tester |
| Flow A/B OK | 🟡 | Code vérifié & déployé web ; reste test device |
| QR invité OK | 🟡 | Code OK ; reste test 2 appareils réels |
| PDF généré | 🟢 | Backend OK (testé en prod web) |
| Email reçu | 🟢 | Resend opérationnel |
| Paiement test OK | 🟡 | Stripe OK web ; reste **retour app** mobile |
| Sentry actif | 🟢 | Intégré client + serveur (release par build à créer) |
| URL privacy disponible | 🟢 | `/privacy` |

**→ GO TestFlight dès que** les 4 lignes 🔴 (builds signés + démarrage sans crash) sont 🟢.

## 2. GO publication publique (App Store / Google Play)

| Critère | État | Note |
|---------|------|------|
| Tests A/B/C/D/E réels OK | 🔴 | Matrice `qa-mobile-e2e-matrix.md` à exécuter |
| Juriste valide le Legal Pack | 🔴 | `legal/` = drafts ; validation suisse/européenne requise |
| App Privacy (Apple) complété | 🟡 | Brouillon prêt (`legal/APP_STORE_PRIVACY.md`), à saisir dans App Store Connect |
| Google Data Safety complété | 🟡 | Brouillon prêt (`legal/GOOGLE_DATA_SAFETY.md`), à saisir dans Play Console |
| **Aucun claim risqué visible** | 🟢 | Balayage code = 0 (cf. `legal/LEGAL_CLAIMS_REVIEW.md`, addendum 28/05) |
| Stripe retour app OK | 🔴 | À valider sur device (point de risque #1) |
| Universal/App Links live + vérifiés | 🔴 | Config code en place (entitlements, intent-filter, routes `.well-known`) ; **Apple Team ID + SHA-256 + capability Associated Domains** à compléter, puis tester DL-01..DL-09 |
| Emails A/B/C/D/E OK | 🟡 | Logique OK ; à valider multi-rôles sur device |
| Suppression compte OK | 🟡 | Implémentée ; à tester end-to-end |
| crash-free rate acceptable (internal testing) | 🔴 | Dépend de la phase de test |
| Screenshots stores prêts | 🔴 | À produire |
| Email support prêt | 🟢 | `contact@boom.contact` |

**→ GO public uniquement quand** toutes ces lignes sont 🟢, en particulier : juriste a validé, claims = 0 (déjà 🟢), Stripe retour app 🟢, suppression compte 🟢.

## 3. NO-GO (bloquants absolus)

Si **l'un** de ces points est vrai, **ne pas publier** :

- 🔴 Crash sur demande de permission (caméra / micro / localisation).
- 🔴 Le paiement ne revient pas dans l'app après Stripe.
- 🔴 PDF non généré.
- 🔴 Email non reçu.
- 🔴 QR C/D/E cassé (invités multi-véhicules).
- 🔴 Signature non sauvegardée.
- 🔴 Legal Pack non validé par un juriste.
- 🔴 Data Safety / App Privacy incomplet.
- 🔴 Claims risqués visibles dans l'UI ou le PDF. *(actuellement 🟢 = 0)*
- 🔴 Suppression de compte non fonctionnelle.

---

## Synthèse de l'état actuel (code)

**Acquis (🟢)** : claims risqués éliminés (UI + PDF + Stripe + 48 locales), backend multi-véhicules stable, Sprint 1 UX/legal déployé (intro, consentements, signature, micro-copies, photos blessures, sync vehicleCount), PDF/email opérationnels en prod web, Sentry/PostHog intégrés. **Sprint 2** : Capacitor CLI aligné 8.3.1, versions app 1.0.0/build 1, retour Stripe câblé en code (Associated Domains iOS + entitlements + `CODE_SIGN_ENTITLEMENTS`, App Links Android `autoVerify`, routes Express `.well-known` en `application/json`, listener `appUrlOpen` via `@capacitor/app`).

**Reste hors code (🔴/🟡)** : builds natifs signés iOS/Android, **Apple Team ID** dans l'AASA + **SHA-256** dans assetlinks + capability *Associated Domains* (profil), tests sur devices réels (permissions, Stripe retour app, deep links DL-01..09, QR multi-appareils, concurrence signatures), validation juridique du Legal Pack, saisie App Privacy / Data Safety dans les consoles, screenshots, crash-free rate en internal testing.

---
*Décision finale au cas par cas. Ce document reflète l'état "code" ; les paliers natifs/QA/juridique restent à franchir.*
