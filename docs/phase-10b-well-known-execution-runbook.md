# Phase 10B — Runbook d'exécution `.well-known` (boom.contact)

> **But** : procédure opérationnelle complète pour finaliser les liens natifs le jour où les
> **deux valeurs externes** sont disponibles :
> 1. **Apple Team ID** réel (compte Apple Developer de boom.contact)
> 2. **SHA-256 Play App Signing** de boom.contact (Google Play Console)
>
> **Tant que ces valeurs ne sont pas en place ET testées sur device → liens natifs NON validés → NO-GO public.**
>
> ⚠️ Ce document **ne remplace aucun placeholder**. Toutes les valeurs ci-dessous (`A1B2C3D4E5`,
> `AB:CD:EF:...`) sont **illustratives** — à substituer par les vraies valeurs boom.contact uniquement.
> Ne jamais inventer une valeur. Ne jamais réutiliser la valeur d'une autre application.

Pré-requis : être sur `main` à jour, `quality:prestore` = exit 0 sur le commit de départ, et avoir
rempli `docs/phase-10b-values-checklist.md` (lignes « Validé par »).

---

## A. Préparer les valeurs externes

| Élément | Attendu | Source | Règle |
|---|---|---|---|
| Apple Team ID | **10 caractères alphanumériques** (ex. `A1B2C3D4E5`) | Apple Developer → Membership, ou Xcode → Signing & Capabilities → Team | Ne jamais inventer |
| appID final (AASA) | **`TEAMID.contact.boom.app`** | composé : Team ID + `.contact.boom.app` | Suffixe = `appId` Capacitor |
| Android SHA-256 | **SHA-256 de la Play App Signing key** (format `AB:CD:EF:...`, 32 octets hex) | Play Console → **Setup → App integrity → App signing → App signing key certificate → SHA-256** | **Pas** la debug key, **pas** (seule) l'upload key |
| package Android | **`contact.boom.app`** | déjà figé (`applicationId` / `namespace`) | Ne pas modifier |
| Upload key SHA-256 (optionnel) | format `AB:CD:EF:...` | `./gradlew :app:signingReport` ou `keytool` sur l'upload keystore | Complément sideload uniquement |

> **Rappel critique** : le SHA-256 d'une autre app (ou d'un autre keystore) ne doit **jamais** être
> utilisé. La valeur principale est celle qui signe réellement l'app livrée par Play = la **Play App
> Signing key**. Voir `docs/well-known-finalization.md` §0.2.

**Timing** : le SHA-256 Play App Signing n'existe qu'après création de l'app boom.contact dans Play
Console + activation de Play App Signing (opt-in / 1er upload AAB). Ne pas démarrer la Phase 10B avant.

---

## B. Remplacer les valeurs (sources de vérité uniques)

### B.1 AASA — `client/public/.well-known/apple-app-site-association`
Remplacer **uniquement** la chaîne placeholder, garder le JSON et tous les autres champs intacts :

```
AVANT :  "TEAMID_TO_REPLACE.contact.boom.app"
APRÈS :  "A1B2C3D4E5.contact.boom.app"        # ← vrai Team ID boom.contact
```

Commande sûre (remplacer `A1B2C3D4E5` par le **vrai** Team ID) :
```bash
sed -i 's/TEAMID_TO_REPLACE/A1B2C3D4E5/' client/public/.well-known/apple-app-site-association
```

### B.2 assetlinks — `client/public/.well-known/assetlinks.json`
Remplacer **uniquement** la chaîne placeholder par le SHA-256 Play App Signing (garder `package_name`
`contact.boom.app` et la `relation` inchangés) :

```bash
sed -i 's/SHA256_CERT_FINGERPRINT_TO_REPLACE/AB:CD:EF:.../' client/public/.well-known/assetlinks.json
```

**Optionnel — ajouter l'upload key en complément** (sideload/dev). Le tableau accepte plusieurs
fingerprints ; éditer manuellement pour obtenir :
```json
"sha256_cert_fingerprints": [
  "AB:CD:EF:...",   // Play App Signing key (principale, obligatoire)
  "11:22:33:..."    // Upload key (optionnelle)
]
```

### B.3 Validité JSON (obligatoire avant build)
```bash
python3 -c "import json;json.load(open('client/public/.well-known/apple-app-site-association'));print('AASA JSON OK')"
python3 -c "import json;json.load(open('client/public/.well-known/assetlinks.json'));print('assetlinks JSON OK')"
grep -c TEAMID_TO_REPLACE client/public/.well-known/apple-app-site-association          # doit afficher 0
grep -c SHA256_CERT_FINGERPRINT_TO_REPLACE client/public/.well-known/assetlinks.json    # doit afficher 0
```

> Note serveur : la prod sert ces fichiers en `application/json` via routes dédiées
> (`server/src/index.ts`, `serveWellKnown`), en lisant `dist/client/.well-known/` puis
> `client/public/.well-known/`. La source de vérité éditée est donc bien `client/public/.well-known/`.

---

## C. Synchroniser Capacitor
```bash
npm run build              # copie client/public/.well-known → dist/client/.well-known
npx cap sync ios
npx cap sync android
```

---

## D. Vérifier les copies natives
`cap sync` recopie `webDir` (`dist/client`) dans les bundles natifs. Vérifier que les `.well-known`
y figurent **avec les vraies valeurs** :

```bash
# iOS
ls -l ios/App/App/public/.well-known/
cat   ios/App/App/public/.well-known/apple-app-site-association
grep -c TEAMID_TO_REPLACE ios/App/App/public/.well-known/apple-app-site-association   # doit = 0

# Android
ls -l android/app/src/main/assets/public/.well-known/
cat   android/app/src/main/assets/public/.well-known/assetlinks.json
grep -c SHA256_CERT_FINGERPRINT_TO_REPLACE android/app/src/main/assets/public/.well-known/assetlinks.json  # doit = 0
```

> Rappel : la **vérification** Universal Links/App Links se fait contre les fichiers servis par le
> **domaine** (web), pas contre la copie native. La copie native est ici un contrôle de cohérence
> que `cap sync` a bien tourné sur le bon build.

---

## E. Quality gate
```bash
npm run quality:prestore
```
Exiger **exit 0** : typecheck 0 · build OK · 45/45 · `check:claims` A_BLOCKING = 0.
(Les `.well-known` ne sont pas des surfaces de claim ; le remplacement de valeurs ne doit pas faire
varier A_BLOCKING.)

---

## F. Déploiement
```bash
git add -A
git commit -m "Phase 10B — AASA Apple Team ID + assetlinks SHA-256 Play App Signing (boom.contact)"
git push origin main
```
Attendre **Railway SUCCESS** (poll GraphQL, ou dashboard). Healthcheck `/health` doit rester 200.

---

## G. Vérifications live (commandes exactes)
```bash
curl -I https://www.boom.contact/.well-known/apple-app-site-association
curl    https://www.boom.contact/.well-known/apple-app-site-association
curl -I https://www.boom.contact/.well-known/assetlinks.json
curl    https://www.boom.contact/.well-known/assetlinks.json
```
Critères (tous obligatoires) :
- [ ] HTTP **200**
- [ ] **pas** de redirection (aucun header `Location`)
- [ ] `content-type: application/json` (ou type accepté)
- [ ] AASA : **plus aucun** `TEAMID_TO_REPLACE`
- [ ] assetlinks : **plus aucun** `SHA256_CERT_FINGERPRINT_TO_REPLACE`
- [ ] AASA : appID = **`TEAMID.contact.boom.app`** (vrai Team ID)
- [ ] assetlinks : `package_name` = **`contact.boom.app`**
- [ ] assetlinks : SHA-256 = valeur Play App Signing **exacte** (comparer caractère par caractère à la checklist)

Contrôle anti-placeholder rapide :
```bash
curl -s https://www.boom.contact/.well-known/apple-app-site-association | grep -c TEAMID_TO_REPLACE          # 0
curl -s https://www.boom.contact/.well-known/assetlinks.json            | grep -c SHA256_CERT_FINGERPRINT_TO_REPLACE  # 0
```

---

## H. Validation externe
1. **Apple AASA** : valider le format/accessibilité via l'outil de diagnostic Apple
   (`https://app-site-association.cdn-apple.com/a/v1/www.boom.contact` côté CDN Apple ; ou
   Xcode/Console lors d'un build TestFlight). Le CDN Apple peut mettre du temps à rafraîchir — patienter
   ou réinstaller l'app pour reforcer la revérification des Associated Domains.
2. **Google Digital Asset Links — Statement List Tester** :
   `https://developers.google.com/digital-asset-links/tools/generator` (ou l'API
   `https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://www.boom.contact&relation=delegate_permission/common.handle_all_urls`).
   Doit retourner l'entrée `contact.boom.app` avec le bon SHA-256.
3. **adb (device Android réel)** après installation Internal Testing :
```bash
adb shell pm get-app-links contact.boom.app
adb shell pm verify-app-links --re-verify contact.boom.app
adb shell pm get-app-links contact.boom.app   # doit indiquer "verified" pour www.boom.contact et boom.contact
```
4. **Test appareil** : installer via **Play Internal Testing** (Android) et **TestFlight** (iOS),
   ouvrir un lien `https://www.boom.contact/...` depuis Notes/Messages → doit ouvrir l'app native
   (pas le navigateur). Tester aussi le retour Stripe `?payment=success`.

---

## I. Rollback / dépannage
| Symptôme | Cause probable | Action |
|---|---|---|
| Mauvais Team ID dans AASA | substitution erronée | corriger la chaîne, refaire B→G ; ou `git revert <commit>` puis redéployer |
| Mauvais SHA-256 | upload key au lieu de Play App Signing, ou faute de frappe | remettre le SHA Play App Signing exact (checklist), refaire B→G |
| JSON invalide (curl renvoie HTML/erreur) | virgule/guillemet cassé par sed | restaurer depuis git (`git checkout -- client/public/.well-known/...`), rééditer proprement, revalider §B.3 |
| App Links Android ne valident pas | SHA ≠ clé signant l'app livrée, ou propagation | confirmer Play App Signing actif, attendre propagation, `adb ... --re-verify`, revérifier Statement List Tester |
| Universal Links iOS ne s'ouvrent pas | cache CDN Apple, entitlement manquant, build non signé du bon Team | vérifier `App.entitlements` (`applinks:www.boom.contact` + `applinks:boom.contact`), réinstaller l'app, attendre le CDN |
| Besoin d'annuler tout | régression | `git revert <commit Phase 10B>` → push → Railway SUCCESS → les placeholders reviennent (état pré-10B), liens natifs redeviennent non validés (attendu) |

**Rollback rapide d'urgence** (revenir à l'état avec placeholders) :
```bash
git revert --no-edit <commit_phase_10b>
git push origin main
# attendre Railway SUCCESS, revérifier /health 200
```

---

### Résumé des invariants Phase 10B
- On **ne touche pas** : backend métier, Stripe, logique session/participants/PDF, `check-claims.ts`.
- On **ne remplace que** : la chaîne Team ID dans AASA, la chaîne SHA-256 dans assetlinks.
- **Aucune valeur inventée ou empruntée.** `quality:prestore` = exit 0 obligatoire avant push.
- **Pas de public-ready** avant device QA réussie + handoff juriste.
