# Politique de confidentialité — boom.contact

> **DRAFT v1.0 — 20 mai 2026**
> **À VALIDER PAR UN JURISTE SUISSE/EUROPÉEN AVANT PUBLICATION.**
> Ce document est une première version prudente, destinée à servir de base à
> la rédaction définitive par un professionnel du droit.

---

## 1. Responsable du traitement

- **PEP's Swiss SA / Groupe NEUKOMM**
- Numéro IDE : CHE-476.484.632
- Siège : Bellevue 7, 2950 Courgenay, canton du Jura, Suisse
- Contact protection des données : **privacy@boom.contact**

Le présent document s'applique au traitement des données personnelles dans
le cadre du service **boom.contact** (https://www.boom.contact) et de ses
applications mobiles iOS et Android.

## 2. Cadres juridiques applicables

- **Suisse** : Loi fédérale sur la protection des données du 25 septembre
  2020 (nLPD / FADP) et son ordonnance d'exécution (OLPD).
- **Espace économique européen** : Règlement (UE) 2016/679 (RGPD) lorsque
  l'utilisateur réside dans l'EEE ou que le traitement est soumis au RGPD.
- **Autres juridictions** : règles locales équivalentes lorsqu'applicables.

## 3. Représentant dans l'Union européenne

> *À compléter / valider avec le juriste.* Si l'activité relève de
> l'article 27 du RGPD, PEP's Swiss SA désignera un représentant dans l'UE
> dont les coordonnées seront publiées ici.

## 4. Catégories de données traitées

| Catégorie | Exemples | Origine |
|---|---|---|
| Identité | Nom, prénom, date de naissance | Utilisateur |
| Contact | E-mail, numéro de téléphone, adresse postale | Utilisateur |
| Véhicule | Marque, modèle, plaque d'immatriculation | Utilisateur / OCR |
| Permis de conduire | Numéro, catégorie, dates de validité | OCR (image temporaire) |
| Assurance | Compagnie, numéro de police, validité | Utilisateur / OCR |
| Lieu de l'accident | Adresse, coordonnées GPS | Géolocalisation (avec consentement) ou saisie manuelle |
| Médias | Photos, croquis | Caméra / galerie (avec autorisation) |
| Voix | Enregistrement audio (déclaration) | Microphone (avec autorisation) |
| Transcription | Texte issu de la transcription IA | Service de transcription |
| Données d'accident | Circonstances, dommages, état (blessures, fuite, refus) | Utilisateur |
| Signature | Signature manuscrite numérisée | Utilisateur |
| Paiement | Identifiant de transaction Stripe, package acheté | Stripe |
| Données techniques | Adresse IP, type d'appareil, version OS, logs | Automatique |
| Données d'usage | Pages visitées, actions effectuées (pseudonymisées) | Automatique (analytics) |

**Données particulièrement sensibles susceptibles d'être traitées** :
informations relatives à des blessures (santé), localisation précise,
images de personnes (passagers, témoins) le cas échéant. Ces données sont
traitées avec un soin particulier, dans le seul but de documenter
l'accident, et ne sont jamais utilisées à d'autres fins.

## 5. Finalités et bases légales

| Finalité | Base légale RGPD | Base légale nLPD |
|---|---|---|
| Fournir le service (génération du dossier d'accident) | Exécution du contrat (art. 6.1.b) | Exécution du contrat |
| Traitement IA pour OCR, transcription, assistance | Exécution du contrat / consentement | Exécution du contrat / consentement |
| Géolocalisation | Consentement explicite (art. 6.1.a) | Consentement |
| Photos et signatures | Exécution du contrat | Exécution du contrat |
| Paiement et facturation | Exécution du contrat + obligation légale (art. 6.1.b et c) | Exécution du contrat + obligation légale |
| Sécurité, prévention de la fraude | Intérêt légitime (art. 6.1.f) | Intérêt prépondérant |
| Amélioration du service (analytics pseudonymisés) | Intérêt légitime / consentement | Intérêt prépondérant / consentement |
| Communication marketing (uniquement si consentement explicite, restreint à la Suisse et au Liechtenstein dans la V1) | Consentement (art. 6.1.a) | Consentement |
| Respect d'une obligation légale (comptabilité, autorités) | Obligation légale (art. 6.1.c) | Obligation légale |

Le traitement de données potentiellement sensibles (blessures, géolocalisation,
biométrie via signature) est réalisé dans le cadre strict du service
demandé par l'utilisateur ; le consentement explicite, lorsqu'il est requis,
est recueilli avant le traitement.

## 6. Destinataires et sous-traitants

Les données peuvent être communiquées aux destinataires suivants, dans la
mesure strictement nécessaire à la fourniture du service :

- **Autres participants au constat** (l'utilisateur partage volontairement
  des informations avec les autres parties à l'accident, via le QR code
  partagé).
- **Sous-traitants techniques** : voir la liste complète et les rôles
  dans DPA_SUBPROCESSORS.md.
- **Autorités compétentes** : sur demande légalement fondée (réquisition
  judiciaire, etc.).

Le dossier PDF final est envoyé à l'adresse e-mail communiquée par
l'utilisateur. **boom.contact ne transmet pas directement les dossiers à
des compagnies d'assurance** : c'est à l'utilisateur de le faire.

## 7. Transferts internationaux

Certains sous-traitants sont situés hors de Suisse et de l'EEE (notamment
aux États-Unis). Ces transferts sont encadrés par :

- des **clauses contractuelles types** (CCT) approuvées par la Commission
  européenne ;
- la décision d'adéquation **Data Privacy Framework** (DPF) lorsque le
  sous-traitant y adhère ;
- des **garanties additionnelles** lorsque nécessaire.

Le détail des transferts, des sous-traitants concernés et des garanties
mises en place figure dans DPA_SUBPROCESSORS.md.

## 8. Durées de conservation

Les durées de conservation par type de données sont détaillées dans
DATA_RETENTION.md. À titre indicatif :

- Données d'un constat : conservées le temps utile à la fourniture du
  service et à d'éventuelles obligations légales, puis supprimées.
- Données comptables/de paiement : 10 ans (obligation légale).
- Compte utilisateur : tant que le compte est actif ; suppression à la
  demande de l'utilisateur, sous réserve des obligations légales.
- Logs techniques : 30 à 90 jours selon le type.
- Données audio (enregistrement vocal brut) : supprimées rapidement après
  transcription (voir DATA_RETENTION.md).

## 9. Sécurité

boom.contact met en œuvre des mesures techniques et organisationnelles
appropriées :

- chiffrement en transit (TLS 1.2+) ;
- chiffrement au repos par le fournisseur d'hébergement (PostgreSQL/Railway) ;
- authentification par JWT, mots de passe hachés avec algorithme moderne ;
- séparation des secrets via variables d'environnement ;
- accès restreint aux données par le personnel habilité ;
- journalisation des accès administrateurs ;
- limitation de débit (rate limiting) sur les endpoints sensibles ;
- horodatage cryptographique des dossiers PDF.

Malgré ces mesures, aucun système n'étant absolument inviolable, boom.contact
ne peut garantir une sécurité absolue.

## 10. Droits des personnes concernées

Conformément à la nLPD et au RGPD, vous disposez des droits suivants :

- **Droit d'accès** à vos données et à des informations sur leur traitement.
- **Droit de rectification** des données inexactes.
- **Droit d'effacement** (« droit à l'oubli ») dans les conditions prévues
  par la loi.
- **Droit à la limitation** du traitement.
- **Droit d'opposition** au traitement, notamment fondé sur l'intérêt
  légitime, et au marketing direct.
- **Droit à la portabilité** de vos données dans un format structuré
  (RGPD).
- **Droit de retirer votre consentement** à tout moment lorsque le
  traitement est fondé sur celui-ci, sans effet rétroactif.
- **Droit de définir des directives** sur le sort de vos données après
  votre décès (le cas échéant selon le droit applicable).

Ces droits s'exercent par e-mail à **privacy@boom.contact**, accompagnés
de tout justificatif permettant raisonnablement de vérifier votre identité.

### Droit de réclamation

Vous pouvez introduire une réclamation auprès de l'autorité de contrôle
compétente, notamment :

- **Suisse** : Préposé fédéral à la protection des données et à la
  transparence (PFPDT), https://www.edoeb.admin.ch ;
- **France** : Commission nationale de l'informatique et des libertés
  (CNIL), https://www.cnil.fr ;
- **Autres pays** : l'autorité nationale compétente.

## 11. Suppression de compte

L'utilisateur peut supprimer son compte à tout moment depuis l'application.
Cette action déclenche :

- l'effacement des données personnelles identifiantes ;
- la suppression des constats associés et de leurs pièces (photos, audio,
  signatures) ;
- l'anonymisation des écritures financières conservées pour les
  obligations légales (e-mail haché en SHA-256, données de transaction
  réduites à ce qui est strictement nécessaire) ;
- la suppression effective des données dans les sauvegardes selon la
  politique de rétention.

La procédure complète est décrite dans DATA_RETENTION.md.

## 12. Cookies et technologies similaires

boom.contact utilise un nombre limité de cookies et technologies
similaires :

- **Cookies techniques** strictement nécessaires (authentification,
  préférences) — exemptés de consentement.
- **Cookies de mesure d'audience** (analytics pseudonymisés) — soumis au
  consentement de l'utilisateur via la bannière dédiée.

Pour plus de détails, voir la bannière cookies au sein du service.

## 13. Mineurs

Le service n'est pas destiné aux mineurs sans assistance d'un représentant
légal. Si vous estimez qu'un mineur nous a fourni des données sans une telle
assistance, contactez privacy@boom.contact pour suppression.

## 14. Données traitées par fonctionnalité

### 14.1 Microphone et transcription vocale

- **Données traitées** : enregistrement audio de votre déclaration.
- **Finalité** : transcription automatique pour intégration au dossier.
- **Sous-traitant** : OpenAI (Whisper) — voir DPA_SUBPROCESSORS.md.
- **Alternative** : saisie manuelle disponible à tout moment.
- **Conservation** : l'audio brut n'est pas conservé après transcription
  réussie (voir DATA_RETENTION.md).

### 14.2 Caméra et photographies

- **Données traitées** : images du lieu, des dommages, des documents.
- **Finalité** : illustration du dossier d'accident.
- **Sous-traitant pour OCR** : Anthropic (Claude Vision) lorsque l'image
  est destinée à extraire un texte (permis, carte verte) — voir
  DPA_SUBPROCESSORS.md.
- **Alternative** : saisie manuelle des informations.
- **Conservation** : avec le constat, supprimées avec celui-ci.

### 14.3 Géolocalisation

- **Données traitées** : coordonnées GPS, ville, pays.
- **Finalité** : renseigner automatiquement le lieu de l'accident.
- **Sous-traitant** : services de géocodage cartographique
  (OpenStreetMap/Nominatim).
- **Alternative** : saisie manuelle de l'adresse.
- **Conservation** : avec le constat, supprimées avec celui-ci.

### 14.4 Signature

- **Données traitées** : tracé manuscrit numérisé.
- **Finalité** : finalisation du dossier PDF par l'utilisateur.
- **Sous-traitant** : aucun (signature traitée en interne).
- **Conservation** : intégrée au PDF, conservée avec le constat.

### 14.5 Paiement

- **Données traitées** : identifiant de transaction, package acheté,
  pays, taxes.
- **Finalité** : facturation, comptabilité, prévention de la fraude.
- **Sous-traitant** : Stripe Payments Europe Ltd. — voir
  DPA_SUBPROCESSORS.md.
- **Conservation** : 10 ans (obligation comptable).
- **Note** : boom.contact n'accède pas aux numéros de carte bancaire.

### 14.6 IA et transcription

Les sous-traitants IA (Anthropic, OpenAI) traitent les contenus envoyés
**uniquement pour fournir le service demandé**. Selon leurs engagements
contractuels actuels :

- Anthropic : pas d'entraînement de modèles sur les données API client par
  défaut.
- OpenAI : pas d'entraînement de modèles sur les données API client par
  défaut (engagement API/Whisper).

Ces engagements sont susceptibles d'évoluer et sont vérifiés régulièrement.
Voir DPA_SUBPROCESSORS.md pour les références contractuelles.

### 14.7 Analytics et monitoring

- **Données traitées** : événements pseudonymisés (PostHog : e-mail haché
  en SHA-256), erreurs techniques (Sentry).
- **Finalité** : amélioration du service, diagnostic des incidents.
- **Conservation** : limitée (voir DATA_RETENTION.md).
- **Consentement** : géré via la bannière cookies pour les visiteurs web.

## 15. Stores Apple et Google

Les pages App Store et Google Play du service publient des informations de
confidentialité conformes aux exigences des stores. Ces informations sont
cohérentes avec la présente politique. Voir APP_STORE_PRIVACY.md et
GOOGLE_DATA_SAFETY.md.

## 16. Modifications de la politique

La présente politique peut être modifiée. Les modifications substantielles
sont notifiées aux utilisateurs actifs par tout moyen approprié, avec un
délai raisonnable avant entrée en vigueur. La date de dernière mise à jour
figure en tête du document.

## 17. Contact

Pour toute question relative à la protection des données :

- **E-mail** : privacy@boom.contact
- **Courrier** : PEP's Swiss SA — Protection des données, Bellevue 7,
  2950 Courgenay, Suisse
