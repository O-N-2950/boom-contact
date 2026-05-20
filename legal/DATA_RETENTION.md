# Politique de conservation et de suppression des données — boom.contact

> **DRAFT v1.0 — 20 mai 2026**
> **À VALIDER PAR UN JURISTE SUISSE/EUROPÉEN AVANT PUBLICATION.**
> Document d'application interne et d'information transparente des
> utilisateurs ; une partie du contenu est destinée à être reprise dans la
> politique de confidentialité publiée.

---

## 1. Principes

boom.contact applique les principes suivants :

- **Minimisation** : seules les données nécessaires à la fourniture du
  service sont conservées.
- **Limitation de la conservation** : les données sont conservées pour
  une durée définie, proportionnée à la finalité.
- **Sécurité** : conservation chiffrée, accès limité.
- **Effacement** : à expiration de la durée applicable, les données sont
  supprimées ou anonymisées de manière irréversible.

## 2. Tableau récapitulatif des durées de conservation

| Catégorie de données | Durée de conservation | Justification | Action à expiration |
|---|---|---|---|
| Compte utilisateur (e-mail, profil) | Tant que le compte est actif | Exécution du contrat | Suppression sur demande utilisateur ou inactivité prolongée (cf. §5) |
| Données d'un constat (participants, véhicules, circonstances) | Durée du dossier + période utile au litige raisonnablement prévisible | Exécution du contrat ; preuves utiles à l'utilisateur | Suppression définitive |
| Photos et croquis du constat | Idem constat | Idem | Suppression définitive |
| Enregistrement audio brut (voix avant transcription) | Très court (≤ 24 h) après transcription réussie | Minimisation | Suppression automatique |
| Transcription textuelle de la voix | Idem constat | Exécution du contrat | Suppression avec le constat |
| Signature numérisée | Idem constat | Exécution du contrat / preuve | Suppression avec le constat |
| Coordonnées GPS du constat | Idem constat | Exécution du contrat | Suppression avec le constat |
| Documents OCR (carte verte, permis) — image source | Très court (≤ 24 h) après extraction réussie | Minimisation | Suppression automatique |
| Données OCR extraites (texte structuré) | Idem constat | Exécution du contrat | Suppression avec le constat |
| PDF final généré | Idem constat (lien de téléchargement périmé après 7 jours par défaut) | Exécution du contrat | Suppression du fichier ; le PDF reste chez l'utilisateur/destinataire e-mail |
| Preuve d'horodatage (OpenTimestamps) | Idem constat | Intégrité, exécution du contrat | Suppression avec le constat |
| Sessions de constat non finalisées | 7 jours (TTL) puis suppression automatique | Minimisation | Purge cron nocturne |
| Données de paiement (transactions Stripe, factures) | 10 ans | Obligation légale (CO Suisse, droit comptable) | Anonymisation des données rattachées à un utilisateur supprimé ; conservation purement comptable |
| Logs techniques (accès, erreurs) | 30 à 90 jours | Sécurité, exécution du contrat, intérêt légitime | Suppression automatique |
| Logs de monitoring (Sentry) | Selon configuration du sous-traitant (typiquement 90 jours) | Diagnostic incidents | Géré par le sous-traitant |
| Analytics pseudonymisés (PostHog) | Selon configuration du sous-traitant | Amélioration du service | Géré par le sous-traitant |
| Sauvegardes (DB) | Selon configuration du fournisseur d'hébergement (typiquement 7 à 35 jours) | Continuité de service, sécurité | Rotation automatique |
| Tokens de session, JWT, tokens HMAC C/D/E | Durée de vie courte (≤ 8 h pour police, dérivés pour C/D/E) | Sécurité | Invalidation automatique |
| Audit trail (police, accès admin) | 5 ans | Procédure pénale, sécurité | Suppression à l'échéance |

> **Note** : les durées peuvent être ajustées en fonction des conclusions
> du juriste, du contexte juridictionnel et des évolutions du service.

## 3. Données particulièrement sensibles

Les enregistrements audio bruts et les images source OCR (qui peuvent
contenir des données personnelles particulières comme une photo
d'identité figurant sur un permis) sont **traités puis supprimés
rapidement** une fois leur exploitation terminée. Seul le contenu
structuré et utile au dossier est conservé.

## 4. Sessions abandonnées

Toute session de constat non finalisée est automatiquement purgée
**après 7 jours** par une tâche nocturne (cron). Cela couvre les sessions
ouvertes mais jamais signées, et évite la conservation indéfinie de
données personnelles non utilisées.

## 5. Compte inactif

Un compte sans activité pendant une durée prolongée (à définir avec le
juriste, indicativement 36 mois) peut être notifié à l'utilisateur en vue
d'une suppression. Cette politique sera formalisée publiquement après
validation juridique.

## 6. Procédure de suppression de compte

La suppression de compte est accessible depuis l'application
(section compte / paramètres).

### 6.1 Données effectivement supprimées

- E-mail, nom, prénom, téléphone, mot de passe ;
- Constats associés et leurs pièces (photos, audio, signatures, croquis,
  PDF stockés) ;
- Sessions ouvertes liées au compte ;
- Véhicules enregistrés, jetons d'accès, préférences ;
- Données de consentement (sauf à conserver la preuve historique du
  consentement marketing tant qu'il y a lieu de la garder).

### 6.2 Données anonymisées (conservées sans rattachement à la personne)

- Écritures financières et factures (obligation comptable) :
  l'e-mail est remplacé par un **hash SHA-256**, le nom par un identifiant
  pseudonyme, les données nominatives non strictement utiles à la
  comptabilité sont supprimées.

### 6.3 Délais

- Suppression effective immédiate dans la base de production active.
- Suppression effective dans les **sauvegardes** selon le cycle de
  rotation du fournisseur d'hébergement (typiquement 7 à 35 jours).

### 6.4 Confirmation

Une confirmation de suppression est envoyée à l'utilisateur. Après
suppression, l'utilisateur peut recréer un nouveau compte avec le même
e-mail.

## 7. Effacement à la demande (sans suppression de compte)

L'utilisateur peut, sans supprimer son compte, demander l'effacement d'un
constat précis ou d'éléments précis. Une telle demande est traitée par
e-mail à privacy@boom.contact, sous réserve de vérification de l'identité.

## 8. Exceptions à l'effacement

L'effacement peut être refusé ou différé dans les cas prévus par la loi,
notamment :

- conservation pour respecter une obligation légale ou réglementaire ;
- constatation, exercice ou défense de droits en justice ;
- archivage dans l'intérêt public, fins scientifiques ou statistiques
  (sous garanties appropriées) ;
- demande manifestement infondée ou excessive (en particulier par son
  caractère répétitif).

## 9. Audit interne

Une revue de la politique de rétention est effectuée au minimum une fois
par an, ou à l'occasion d'un changement significatif du service ou de la
réglementation.

## 10. Contact

Toute question ou demande relative à la conservation des données :
**privacy@boom.contact**.
