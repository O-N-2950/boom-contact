# Google Data Safety — mapping boom.contact

> **DRAFT v1.0 — 20 mai 2026**
> **À VALIDER PAR UN JURISTE SUISSE/EUROPÉEN AVANT PUBLICATION.**
> Document de référence pour remplir le formulaire **Data Safety** de la
> console Google Play. Doit être cohérent avec PRIVACY.md,
> APP_STORE_PRIVACY.md et DPA_SUBPROCESSORS.md.

---

## 1. Principes

- **Cohérence** entre la déclaration Google Play, la déclaration Apple
  App Privacy et la politique de confidentialité.
- **Lister exhaustivement** ce qui est collecté ou partagé.
- Pour chaque donnée :
  - *Collected ?*
  - *Shared ?*
  - *Required or optional ?*
  - *Purposes ?*
- Indiquer les pratiques de sécurité (chiffrement en transit, etc.) et
  le caractère **éphémère** de certains traitements (audio brut, image
  OCR temporaire).

## 2. Données collectées

### 2.1 Personal info
- **Name** — collecté, lié à l'utilisateur, *required* pour le service,
  finalités : App functionality.
- **Email address** — collecté, lié, *required*, App functionality +
  Communications avec l'utilisateur.
- **Phone number** — collecté, lié, *optional*, App functionality.
- **Address** — collecté (le cas échéant : adresse postale du conducteur),
  lié, *optional*, App functionality.
- **Other personal info** — collecté (information sur les blessures
  saisies par l'utilisateur), lié, *optional*, App functionality.

### 2.2 Financial info
- **Payment info** — collecté, lié, *required* pour les achats, App
  functionality. Traité par Stripe ; boom.contact n'accède pas aux
  numéros de carte.
- **Purchase history** — collecté, lié, *required*, App functionality.

### 2.3 Location
- **Approximate location** — non.
- **Precise location** — collecté (avec permission), lié, *optional*,
  App functionality.

### 2.4 Personal identifiers
- **User IDs** — collecté, lié, *required*, App functionality.
- **Device or other IDs** — non (pas d'identifiant publicitaire, pas de
  fingerprint).

### 2.5 Health and fitness
- **Health info** — collecté (uniquement si l'utilisateur renseigne des
  blessures), lié, *optional*, App functionality.

### 2.6 Photos and videos
- **Photos** — collecté (photos du lieu, des dommages, des documents),
  lié, *optional*, App functionality.

### 2.7 Audio files
- **Voice or sound recordings** — collecté (avec permission), lié,
  *optional*, App functionality. **Note** : l'enregistrement brut est
  supprimé peu après transcription (voir DATA_RETENTION.md §2).

### 2.8 Files and docs
- **Files and docs** — collecté (PDF du dossier, croquis, signatures),
  lié, *required* pour la finalisation, App functionality.

### 2.9 Calendar
- non.

### 2.10 Contacts
- non.

### 2.11 App activity
- **App interactions** — collecté (analytics pseudonymisés), non lié à
  l'identité (hash SHA-256), *optional*, Analytics + App functionality.
- **In-app search history** — non.
- **Installed apps** — non.
- **Other user-generated content** — collecté (croquis, déclarations
  textuelles, données de constat), lié, *required*, App functionality.

### 2.12 Web browsing
- non.

### 2.13 App info and performance
- **Crash logs** — collecté, non lié (pseudonymisé via Sentry),
  *required*, App functionality + Analytics.
- **Diagnostics** — collecté, non lié, *optional*, Analytics.
- **Other app performance data** — collecté, non lié, *optional*,
  Analytics.

### 2.14 Device or other IDs
- non (pas d'identifiant publicitaire, pas de fingerprint device).

## 3. Données partagées

> *« Shared »* au sens Google Play = transfert à un tiers, hors
> sous-traitants strictement nécessaires à la prestation de services.
> Google précise toutefois que **les transferts à un sous-traitant pour
> fournir des services au nom du développeur ne sont pas considérés
> comme du « sharing »**. Les sous-traitants listés ci-dessous opèrent à
> ce titre.

- **boom.contact ne vend pas** de données personnelles.
- **boom.contact ne partage pas** de données à des fins publicitaires ou
  de tracking.
- Les sous-traitants techniques (voir DPA_SUBPROCESSORS.md) ne sont pas
  des destinataires « tiers » au sens de la rubrique « Shared » mais
  sont mentionnés dans PRIVACY.md.

## 4. Pratiques de sécurité

- **Chiffrement en transit** : oui (TLS 1.2+ sur l'ensemble des
  communications).
- **Suppression de compte dans l'app** : oui (voir DATA_RETENTION.md §6).
- **Demande de suppression hors-app** : oui (privacy@boom.contact).
- **Données traitées de façon éphémère** : audio brut (≤ 24 h après
  transcription), image OCR source (≤ 24 h après extraction).
- **Engagement aux principes du Play Families Policy** : sans objet
  (service non destiné aux enfants).
- **Indépendance vis-à-vis des données de localisation pour la
  publicité** : oui (pas de publicité).

## 5. Permissions sensibles

Permissions Android déclarées dans `AndroidManifest.xml` :

- `INTERNET` — communication avec le backend.
- `CAMERA` — capture photo et OCR documents.
- `RECORD_AUDIO` — enregistrement vocal pour transcription.
- `ACCESS_FINE_LOCATION` / `ACCESS_COARSE_LOCATION` — lieu de l'accident.
- `READ_MEDIA_IMAGES` — sélection de photos existantes.
- `ACCESS_NETWORK_STATE` — détection connectivité, gestion offline.

Chaque permission **sensible** (camera, microphone, location) déclenche
une popup système Android au premier usage et peut être révoquée à tout
moment dans les paramètres du téléphone.

## 6. Suppression de compte (exigence Google Play)

Google Play impose, lorsque le service permet la création d'un compte,
que la **suppression de compte** soit possible :

- **dans l'application** : oui (auth.deleteAccount, voir DATA_RETENTION.md §6) ;
- **depuis le web** : à exposer sur https://www.boom.contact (suppression
  ou demande à privacy@boom.contact).

Indiquer ces deux chemins lors du remplissage du formulaire Data Safety.

## 7. Cohérence avec la fiche Play

La page Google Play affiche :

- titre, sous-titre conformes à LEGAL_CLAIMS_REVIEW.md §6 ;
- description prudente (pas de claims « légalement valable », etc.) ;
- lien vers la politique de confidentialité accessible publiquement.

## 8. Familles et mineurs

- boom.contact n'est pas listé dans la catégorie *Designed for Families*.
- L'application est destinée à des personnes majeures ou aux mineurs
  accompagnés (voir TERMS.md §14).

## 9. Mise à jour

Toute évolution nécessitant une déclaration différente entraîne la mise
à jour de :

- la déclaration Data Safety dans la Play Console ;
- PRIVACY.md ;
- APP_STORE_PRIVACY.md ;
- éventuellement les CGU.
