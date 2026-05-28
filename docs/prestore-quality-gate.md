# Prestore Quality Gate — boom.contact

> Checklist OBLIGATOIRE à exécuter **avant chaque soumission App Store / Google Play**.
> Aucune étape n'est facultative. Aucune submission tant qu'un item n'est pas ✅.
> Date : automatique au moment du run · Owner : Olivier (release manager).

---

## Pourquoi cette barrière

Sprint 8 a révélé qu'un changement « invisible » (meta SEO, JSON-LD, locales i18n) peut introduire des claims juridiquement risqués sans que personne le détecte. Cette checklist transforme cette découverte en garde-fou automatisé : **0 submission sans exit code 0**.

---

## 1. Commande principale

```bash
npm run quality:prestore
```

Cette commande enchaîne :

```
npm run typecheck      →   tsc --noEmit
npm run build          →   vite build + esbuild server
npm run test           →   vitest run
npm run check:claims   →   scan anti-claims permanent
```

**Succès** ⇔ les 4 commandes exit 0 sans warning bloquant.

---

## 2. Vérifications automatiques

| # | Item | Commande | Critère succès |
|---|---|---|---|
| 1 | TypeScript types | `npm run typecheck` | 0 erreur |
| 2 | Build client + serveur | `npm run build` | Sortie « ✓ built », « ✅ Server compiled » |
| 3 | Tests unitaires | `npm run test` | ≥ 45 passed, 0 failed |
| 4 | Claims (script permanent) | `npm run check:claims` | **A_BLOCKING = 0** |
| 5 | Screenshots stores | `npm run capture:screenshots` | 46/46 OK |

> Si l'item 5 nécessite un environnement Chromium (CI hors devbox), il peut être lancé séparément, mais doit avoir tourné au moins une fois sur le commit en cours.

---

## 3. Vérifications manuelles bloquantes

| # | Item | Validation | Owner |
|---|---|---|---|
| 6 | AASA sans placeholder | `grep TEAMID_TO_REPLACE client/public/.well-known/apple-app-site-association` → vide | Olivier |
| 7 | assetlinks sans placeholder | `grep SHA256_CERT_FINGERPRINT_TO_REPLACE client/public/.well-known/assetlinks.json` → vide | Olivier |
| 8 | App Privacy (Apple) saisie | Console App Store Connect → labels remplis et publiés | Olivier |
| 9 | Data Safety (Google) saisie | Console Google Play → questionnaire validé | Olivier |
| 10 | Juriste consulté | `docs/legal-handoff-final.md` validé, 11 questions tranchées | Juriste + Olivier |
| 11 | Device QA réelle passée | `docs/device-qa-protocol.md` — 43 tests ⚪️→✅ sur iOS + Android physique | Olivier + équipe |
| 12 | Compte reviewer provisionné | `docs/reviewer-account-setup.md` — `reviewer@boom.contact` accessible avec 10 crédits | Olivier |
| 13 | Monitoring prêt | `docs/release-monitoring-and-rollback.md` — Sentry + PostHog + Stripe + Resend branchés | Olivier |
| 14 | Rollback plan armé | Commit hash de fallback notré, procédure testée à blanc | Olivier |

---

## 4. Vérifications endpoints prod (post-deploy, pré-submission)

```bash
for u in / /health /privacy /cgu /visual-qa /design-preview /pitch.html \
         /.well-known/apple-app-site-association \
         /.well-known/assetlinks.json; do
  echo "$u → $(curl -s -m 10 -o /dev/null -w '%{http_code}' https://www.boom.contact$u)"
done
```

Tous doivent répondre **200**. `robots.txt` doit contenir `Disallow: /visual-qa`, `/design-preview`, `/pitch.html`.

---

## 5. Procédure standard

```bash
# 1. Pull main à jour
git pull origin main

# 2. Quality gate
npm install
npm run quality:prestore       # ← bloque si exit code != 0

# 3. Si succès : tagger la release candidate
git tag -a v1.0.0-rc.1 -m "Release candidate prestore"
git push origin v1.0.0-rc.1

# 4. Run capture si pas déjà fait
npm run capture:screenshots

# 5. Lancer items manuels (6-14) un par un
# 6. Si tout vert : submission via Xcode (App Store) + Play Console (Android)
```

---

## 6. Surface couverte par `check:claims`

Le script scanne par défaut :

```
client/index.html
client/public/**
client/src/**
client/src/i18n/locales/*.json    (50 locales)
server/src/**
shared/**
docs/**                            (avec exceptions AUDIT_FILES)
legal/**                           (avec exceptions AUDIT_FILES)
```

42 patterns sont vérifiés (français + anglais + allemand + espagnol + italien) sur 9 catégories :
`geographic` · `certification` · `legal` · `acceptance` · `substitution` · `fake-reviews` · `inflated` · `cea`.

Classification :
- **A_BLOCKING** = vrai risque (échoue le quality gate)
- **B_DOC_ACCEPTABLE** = match dans un fichier d'audit explicite (listes interdites, drafts CGU)
- **C_FACTUAL_WHITELIST** = expression factuelle reconnue (PCI-DSS Stripe, négation sémantique)

Les fichiers d'audit sont listés explicitement dans `AUDIT_FILES` du script : `legal/LEGAL_CLAIMS_REVIEW.md`, drafts CGU/Privacy, copy stores, plans store screenshots, etc.

---

## 7. Échec qualifié

Si **`A_BLOCKING > 0`** :
1. **Ne pas submitter**.
2. Lire le rapport (`npm run check:claims`) — chaque ligne donne fichier:ligne:col, pattern, contexte.
3. Corriger en remplaçant par un wording prudent (cf. `docs/store-listing-copy-fr-en.md` pour les références).
4. Re-run jusqu'à exit code 0.

---

## 8. Cas particuliers

- **Ajout d'un nouveau doc d'audit** (ex: nouvelle liste interdite, FAQ juriste) : ajouter le path dans `AUDIT_FILES` du script `scripts/check-claims.ts`. Sinon le doc se met à échouer.
- **Faux positif non whitelisté** : si une expression factuelle légitime est mal classée A, ouvrir une PR pour ajouter le pattern à `LINE_WHITELIST` (avec justification écrite). Ne JAMAIS désactiver le check globalement.
- **Suppression d'un pattern** : interdit sans validation juridique écrite (chaque pattern correspond à un risque identifié).

---

## 9. Métadonnées

- Script source : `scripts/check-claims.ts`
- Test fumigène (régression) : injecter un fichier avec « 150 pays » en `client/src/__test_claim.tsx`, vérifier que `npm run check:claims` renvoie exit code 1.
- Dépendances : aucune externe (Node fs + regex).
- Run time : ~1 seconde sur l'ensemble du repo.
