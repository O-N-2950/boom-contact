# App Store Privacy (Apple) — mapping boom.contact

> **DRAFT v1.0 — 20 mai 2026**
> **À VALIDER PAR UN JURISTE SUISSE/EUROPÉEN AVANT PUBLICATION.**
> Document de référence pour remplir la section **App Privacy** (Privacy
> Nutrition Label) du compte App Store Connect. Doit être cohérent avec
> PRIVACY.md et DPA_SUBPROCESSORS.md.

---

## 1. Principes pour la déclaration

- **Cohérence absolue** entre la déclaration App Store, la politique de
  confidentialité (PRIVACY.md) et le formulaire Google Data Safety
  (GOOGLE_DATA_SAFETY.md).
- **Lister tout ce qui est réellement collecté**, par soi-même et par
  les sous-traitants intégrés à l'app (SDK ou appels backend).
- Catégoriser chaque donnée selon les trois questions Apple :
  *Collected ? Linked to user ? Used for tracking ?*
- **Tracking = NON** pour boom.contact : aucune publicité ciblée, pas
  de partage de données avec des tiers à des fins de tracking inter-apps.

## 2. Privacy Nutrition Label proposée

Pour chaque catégorie Apple, la déclaration recommandée est la suivante.

### 2.1 Contact Info
- **Collecté** : oui
- **Lié à l'utilisateur** : oui
- **Tracking** : non
- **Sous-catégories** : Name, Email Address, Phone Number, Physical
  Address (le cas échéant pour les véhicules / assurances).
- **Finalités Apple à cocher** : App Functionality.

### 2.2 Health & Fitness
- **Collecté** : oui (uniquement si l'utilisateur renseigne des blessures)
- **Lié à l'utilisateur** : oui
- **Tracking** : non
- **Sous-catégorie** : Health (limitée aux informations sur les blessures
  saisies par l'utilisateur dans le cadre du constat).
- **Finalité Apple** : App Functionality.

### 2.3 Financial Info
- **Collecté** : oui
- **Lié à l'utilisateur** : oui
- **Tracking** : non
- **Sous-catégorie** : Payment Info (transaction Stripe, identifiant de
  paiement). boom.contact n'accède pas aux numéros de carte (traités
  directement par Stripe).
- **Finalité Apple** : App Functionality.

### 2.4 Location
- **Collecté** : oui (avec autorisation utilisateur)
- **Lié à l'utilisateur** : oui
- **Tracking** : non
- **Sous-catégorie** : Precise Location (lieu de l'accident).
- **Finalité Apple** : App Functionality.

### 2.5 Sensitive Info
- **Collecté** : oui (potentiellement)
- **Lié à l'utilisateur** : oui
- **Tracking** : non
- **Sous-catégorie** : information relative à la santé d'une personne
  (en cas de blessure) ; potentiellement données d'identification
  figurant sur un permis si l'utilisateur l'utilise via l'OCR.
- **Finalité Apple** : App Functionality.

### 2.6 Contacts
- **Collecté** : non.
- L'application ne lit pas le carnet d'adresses.

### 2.7 User Content
- **Collecté** : oui
- **Lié à l'utilisateur** : oui
- **Tracking** : non
- **Sous-catégories** : Photos or Videos (photos du lieu, des dommages,
  des documents), Audio Data (enregistrement vocal en vue de
  transcription), Other User Content (croquis, signature, déclarations
  écrites, données du formulaire de constat).
- **Finalité Apple** : App Functionality.

### 2.8 Browsing History
- **Collecté** : non.

### 2.9 Search History
- **Collecté** : non (aucune recherche utilisateur enregistrée).

### 2.10 Identifiers
- **Collecté** : oui
- **Lié à l'utilisateur** : oui
- **Tracking** : non
- **Sous-catégories** : User ID (identifiant de compte interne). Pas
  d'IDFA, pas d'identifiant publicitaire.
- **Finalité Apple** : App Functionality.

### 2.11 Purchases
- **Collecté** : oui (historique des packages achetés)
- **Lié à l'utilisateur** : oui
- **Tracking** : non
- **Sous-catégorie** : Purchase History.
- **Finalité Apple** : App Functionality.

### 2.12 Usage Data
- **Collecté** : oui (analytics pseudonymisés)
- **Lié à l'utilisateur** : non (pseudonymisation via hash SHA-256 de
  l'e-mail dans PostHog)
- **Tracking** : non
- **Sous-catégorie** : Product Interaction.
- **Finalité Apple** : Analytics, App Functionality.

### 2.13 Diagnostics
- **Collecté** : oui
- **Lié à l'utilisateur** : non (pseudonymisé via Sentry)
- **Tracking** : non
- **Sous-catégorie** : Crash Data, Performance Data, Other Diagnostic
  Data.
- **Finalité Apple** : App Functionality, Analytics.

### 2.14 Other Data
- **Collecté** : oui
- **Lié à l'utilisateur** : oui
- **Tracking** : non
- **Sous-catégorie** : informations relatives au véhicule (plaque,
  marque, modèle), à l'assurance (compagnie, numéro de police, validité),
  au permis (numéro, catégorie, validité), à l'accident (circonstances,
  horodatage, dommages).
- **Finalité Apple** : App Functionality.

## 3. Permissions natives à déclarer dans Info.plist

Permissions et descriptions actuelles à confirmer dans `ios/App/App/Info.plist` :

- `NSCameraUsageDescription` — « boom.contact utilise l'appareil photo
  pour ajouter des photos au dossier d'accident. »
- `NSMicrophoneUsageDescription` — « boom.contact utilise le microphone
  pour enregistrer votre déclaration et la transcrire dans le dossier. »
- `NSPhotoLibraryUsageDescription` — « boom.contact accède à votre
  photothèque si vous souhaitez utiliser une image existante. »
- `NSLocationWhenInUseUsageDescription` — « boom.contact utilise votre
  position pour renseigner le lieu de l'accident. La saisie manuelle
  reste possible. »

Ces descriptions doivent être traduites dans les principales langues
d'usage (FR, EN, DE, IT au minimum).

## 4. Suppression de compte (exigence Apple)

Apple exige depuis 2022 une fonction de suppression de compte
**dans l'app** lorsque le service permet la création d'un compte.

- boom.contact propose cette fonction (auth.deleteAccount). Voir
  DATA_RETENTION.md §6.
- Chemin d'accès à indiquer dans App Store Connect : *Compte > Sécurité
  & confidentialité > Supprimer mon compte*.
- Conséquences de la suppression : voir DATA_RETENTION.md §6.

## 5. Tracking — Réponse à App Tracking Transparency (ATT)

- boom.contact **ne suit pas** les utilisateurs à travers les applications
  et sites web de tiers.
- **Aucune** SDK publicitaire de tracking n'est intégrée.
- À la question « *Does this app use data for tracking?* » : **NON**.
- En conséquence, **aucune popup ATT** n'est nécessaire.

## 6. Données IA

L'utilisation des sous-traitants IA (Anthropic, OpenAI) est mentionnée
dans la politique de confidentialité publiée et reflétée par les
catégories ci-dessus. Apple peut, lors de la revue, demander des
précisions sur l'usage de l'IA générative : voir PRIVACY.md §14.6.

## 7. Cohérence avec la fiche store

La page App Store affiche :

- titre, sous-titre conformes à LEGAL_CLAIMS_REVIEW.md §6 ;
- description prudente (pas de claims « valable mondialement », etc.) ;
- lien vers la politique de confidentialité accessible publiquement
  (https://www.boom.contact/privacy ou équivalent).

## 8. Mise à jour

Toute évolution du service nécessitant une déclaration différente
(nouveau sous-traitant, nouvelle catégorie de données, nouveau type de
collecte) entraîne la mise à jour de :

- la fiche App Privacy dans App Store Connect ;
- PRIVACY.md ;
- GOOGLE_DATA_SAFETY.md ;
- éventuellement les CGU si nécessaire.
