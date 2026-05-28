# Matrice QA mobile E2E — boom.contact

> Plan de test terrain avant publication publique. À exécuter sur **devices réels** (iOS + Android).
> Légende statut : 🟢 OK · 🟡 partiel/à revoir · 🔴 KO · ⚪️ non testé.
> Remplir une ligne par exécution (device × scénario).

## Modèle de feuille de test

| ID | Scénario | Appareil | Préconditions | Étapes | Résultat attendu | Résultat réel | Statut | Logs | Capture | Responsable |
|----|----------|----------|---------------|--------|------------------|---------------|--------|------|---------|-------------|
| — | (à remplir) | | | | | | ⚪️ | | | |

---

## A. Scénarios accident (flow métier)

| ID | Scénario | Préconditions | Résultat attendu | Statut |
|----|----------|---------------|------------------|--------|
| ACC-01 | **A/B standard** (2 véhicules) | 2 téléphones | Session partagée, 2 signatures, PDF complet, emails A+B | ⚪️ |
| ACC-02 | **A/B/C** (3 véhicules) | 3 téléphones | QR C généré, token C individualisé, 3 signatures, statut `completed` | ⚪️ |
| ACC-03 | **A/B/C/D** | 4 téléphones | 4 rôles rejoints, 4 signatures | ⚪️ |
| ACC-04 | **A/B/C/D/E** (max) | 5 téléphones | 5 rôles, `vehicleCount=5`, PDF tous véhicules, signatures simultanées OK | ⚪️ |
| ACC-05 | **Accident solo** | 1 téléphone | Pas d'exigence 2e partie, flow unilatéral, PDF généré | ⚪️ |
| ACC-06 | **Piéton** | 1–2 téléphones | Branche piéton (téléphone ou non), formulaire piéton | ⚪️ |
| ACC-07 | **Objet / animal** | 1 téléphone | Type « objet », continue seul, PDF | ⚪️ |
| ACC-08 | **Fuite (délit de fuite)** | 1 téléphone | Déclaration unilatérale, suggestion police, wording prudent (pas « légalement valable ») | ⚪️ |
| ACC-09 | **Refus de signer** | 2 téléphones | PartyUnavailableModal, déclaration unilatérale, PDF sans 2e signature | ⚪️ |
| ACC-10 | **Blessé** | 1–2 téléphones | Catégorie photo blessure → confirmation légère ; bouton urgence visible | ⚪️ |
| ACC-11 | **Police** (hors V1) | — | Hors périmètre V1 ; vérifier qu'aucune notification auto police n'est déclenchée | ⚪️ |

## B. Scénarios appareil / réseau

| ID | Scénario | Résultat attendu | Statut |
|----|----------|------------------|--------|
| DEV-01 | iPhone récent (iOS à jour) | Flow complet fluide | ⚪️ |
| DEV-02 | iPhone ancien compatible | Pas de lag bloquant, canvas signature OK | ⚪️ |
| DEV-03 | Android récent | Flow complet | ⚪️ |
| DEV-04 | Android milieu de gamme | OCR/photos sans OOM, compression JPEG OK | ⚪️ |
| DEV-05 | Réseau faible (3G/throttle) | OCR/upload patients, pas de double soumission | ⚪️ |
| DEV-06 | Perte réseau en plein flow | Reprise localStorage + resynchro Socket.io | ⚪️ |
| DEV-07 | Reprise app (background→foreground) | État conservé, pas de retour à l'intro | ⚪️ |
| DEV-08 | Batterie faible / app tuée | Reprise à l'étape sauvegardée | ⚪️ |
| DEV-09 | Mode sombre (thème fixe) | Lisibilité, contrastes corrects | ⚪️ |

## C. Scénarios fonctionnalités

| ID | Fonction | Résultat attendu | Statut |
|----|----------|------------------|--------|
| FN-01 | **OCR** (permis, carte verte) | Champs pré-remplis, skip possible (saisie manuelle) | ⚪️ |
| FN-02 | **Photos** | Capture, compression JPEG, max 5, légendes conservées | ⚪️ |
| FN-03 | **Photo blessure** | Confirmation légère affichée 1×/session ; « Changer de catégorie » fonctionne | ⚪️ |
| FN-04 | **Localisation** | Position récupérée, refus → saisie manuelle | ⚪️ |
| FN-05 | **Micro** | Micro-copy affichée, transcription Whisper intégrée | ⚪️ |
| FN-06 | **Texte au lieu du micro** | Onglet texte, fallback fonctionne sans permission micro | ⚪️ |
| FN-07 | **QR** | Génération + scan + jointure B/C/D/E, tokens individualisés | ⚪️ |
| FN-08 | **Signature tactile** | Canvas réactif, case confirmation obligatoire, bouton désactivé si vide/non coché | ⚪️ |
| FN-09 | **Paiement Stripe** | Checkout test → succès | ⚪️ |
| FN-10 | **Email PDF** | Reçu par A et chaque invité (Resend) | ⚪️ |
| FN-11 | **Téléchargement PDF** | Ouverture/partage natif | ⚪️ |
| FN-12 | **Retour app après Stripe** | Retour sur `done` dans l'app (critère NO-GO) | ⚪️ |
| FN-13 | **Suppression compte** | Données supprimées champ par champ (cf. `legal/DATA_RETENTION.md`) | ⚪️ |
| FN-14 | **Delivery par rôle** | Chaque rôle reçoit son PDF / sa langue | ⚪️ |
| FN-15 | **Signatures simultanées** | A/B/C/D/E signent en parallèle → session atteint `completed` sans collision (test concurrence Postgres réel) | ⚪️ |

## D. Conformité / légal (transverse)

| ID | Vérif | Résultat attendu | Statut |
|----|-------|------------------|--------|
| LEG-01 | Écran intro sécurité/légal | Affiché au 1er lancement, bouton urgence présent | ⚪️ |
| LEG-02 | Acceptation CGU invité | Case obligatoire avant « Rejoindre » | ⚪️ |
| LEG-03 | Aucun claim risqué | Aucun « certifié / 150 pays / valable mondialement » visible dans l'UI ni le PDF | ⚪️ |
| LEG-04 | Wording PDF | « Dossier numérique horodaté », pas « certifié » | ⚪️ |

## E. Deep Links / Universal Links (iOS) / App Links (Android) + Retour Stripe

> Pré-requis : `.well-known/apple-app-site-association` et `.well-known/assetlinks.json` live en HTTPS (200, application/json, sans redirection) avec **vrai Apple Team ID** et **vrai SHA-256** de la clé de signature ; capability *Associated Domains* activée dans le profil de provisioning Apple ; vérification App Links Android (`adb shell pm verify-app-links`).

| ID | Vérif | Résultat attendu | Statut |
|----|-------|------------------|--------|
| DL-01 | AASA accessible | `GET https://www.boom.contact/.well-known/apple-app-site-association` → 200, `application/json`, JSON valide, **pas** de redirection | ⚪️ |
| DL-02 | assetlinks accessible | `GET https://www.boom.contact/.well-known/assetlinks.json` → 200, `application/json`, JSON valide | ⚪️ |
| DL-03 | Universal Link iOS | Ouvrir `https://www.boom.contact/?session=X&paid=1` depuis Notes/Safari → ouvre **l'app** (pas Safari), arrive sur l'étape `done` | ⚪️ |
| DL-04 | App Link Android | Idem depuis un lien Android → ouvre l'app, `appUrlOpen` rejoue les params | ⚪️ |
| DL-05 | **Stripe success → app** | Payer (one-shot) → redirection `?payment=success&constat=X` → retour dans l'app → PDF prêt (`done`) | ⚪️ |
| DL-06 | **Stripe cancel → app** | Annuler le paiement → `?payment=cancelled` → retour propre dans l'app (pas d'écran cassé) | ⚪️ |
| DL-07 | App froide via lien | App fermée (tuée) → ouverture via lien → `appUrlOpen` capté au démarrage, params appliqués | ⚪️ |
| DL-08 | App chaude via lien | App déjà ouverte en arrière-plan → lien → reprise + params appliqués | ⚪️ |
| DL-09 | Fallback navigateur | Si l'app n'est pas installée → le lien ouvre le site web (PWA) normalement | ⚪️ |
| DL-10 | tokenA absent | Retour paiement sans `tokenA` en localStorage → message d'erreur clair (pas de crash) ; *(P1 : bouton « retrouver mon dossier »)* | ⚪️ |

## F. Permissions WebView natives (à tester sur appareil)

| ID | Vérif | Résultat attendu | Statut |
|----|-------|------------------|--------|
| PERM-01 | Caméra (photos/OCR) | `<input type=file capture>` → picker/caméra natif (Android `onShowFileChooser`, iOS WKWebView) | ⚪️ |
| PERM-02 | Micro (voix) | `getUserMedia({audio})` → prompt micro accordé (Android `onPermissionRequest` + `RECORD_AUDIO`, iOS `NSMicrophone`) | ⚪️ |
| PERM-03 | Géolocalisation | `navigator.geolocation` → prompt position (Android `onGeolocationPermissionsShowPrompt` + `ACCESS_FINE_LOCATION`, iOS `NSLocationWhenInUse`) | ⚪️ |
| PERM-04 | Refus permission | Refus micro/géo → fallback texte / saisie manuelle, pas de blocage | ⚪️ |

---
*Exécution sur devices réels = hors périmètre de l'environnement actuel. FN-15 (concurrence) doit être testé sur une vraie base Postgres.*
