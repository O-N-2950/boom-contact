# Dossier de remise au juriste — boom.contact

> Objet : permettre à un juriste **suisse / européen** de valider l'app avant publication publique.
> Documents joints : `legal/TERMS.md`, `legal/PRIVACY.md`, `legal/DATA_RETENTION.md`, `legal/DPA_SUBPROCESSORS.md`, `legal/EMERGENCY_DISCLAIMER.md`, `legal/APP_STORE_PRIVACY.md`, `legal/GOOGLE_DATA_SAFETY.md`, `legal/LEGAL_CLAIMS_REVIEW.md`.
> Tous ces documents sont des **brouillons prudents**, non validés. Ce dossier en est la synthèse.

---

## 1. Ce qu'est boom.contact
Éditeur : **Groupe NEUKOMM / PEP's Swiss SA**, Bellevue 7, 2950 Courgenay, Jura, Suisse (IDE CHE-476.484.632).
Application mobile + web (PWA) permettant de réaliser un **dossier d'accident automobile numérique** entre conducteurs, puis de générer un **PDF horodaté**.

## 2. Ce que l'app fait
- Scan de documents (carte verte, permis) via **OCR** (Anthropic Claude Vision).
- Description de l'accident en **texte** ou **voix** (transcription OpenAI Whisper).
- **Photos** des dégâts, **croquis**, **zones de choc**.
- Sessions multi-véhicules **A à E** (jusqu'à 5), chaque participant rejoint via **QR** avec un **token individuel**.
- **Signatures** numériques par rôle.
- **Horodatage OpenTimestamps** (ancrage blockchain) du dossier.
- Génération d'un **PDF** que **l'utilisateur transmet lui-même** à son assureur.
- Paiement par **packages de crédits** (Stripe).

## 3. Ce que l'app NE fait PAS
- Ne transmet **rien automatiquement** aux assureurs, à la police ou aux autorités.
- Ne remplace **pas** les secours, la police, ni l'assurance.
- N'affirme **pas** de valeur légale particulière (cf. claims interdits §13).
- Ne stocke **pas** les données de carte bancaire (gérées par Stripe, PCI-DSS).

## 4. Pays ciblés
Ambition **globale** (pas Suisse uniquement). Marchés initiaux : Suisse, France, Belgique, Luxembourg, puis Europe. Conformité visée : **RGPD** (UE) + **nLPD** (Suisse).

## 5. Données collectées
Email, nom (si saisi), contenu du constat, photos, audio (transitoire), localisation, identifiants de session, historique d'achat. Détail dans `legal/PRIVACY.md` et les checklists console.

## 6. Sous-traitants
Anthropic (OCR), OpenAI (transcription), Stripe (paiement), Resend (email), Railway/EU-West (hébergement), PostHog (analytics), Sentry (erreurs), OpenTimestamps (horodatage), OSM/Nominatim (cartes). Détail + localisation dans `legal/DPA_SUBPROCESSORS.md`.

## 7. IA / OCR / transcription
- OCR : images de documents envoyées à Anthropic pour extraction de champs.
- Transcription : audio envoyé à OpenAI Whisper.
- **Question** : durée de conservation et base légale du traitement de l'audio/photos.

## 8. Paiement
Stripe (CHF + EUR), packages 1/3/10 crédits, frais fixe une fois par package. Paiement **externe** (hors achat in-app Apple/Google). Wording actuel : « 1 constat numérique horodaté ».

## 9. Conservation / suppression
Cf. `legal/DATA_RETENTION.md` (brouillon). Sessions temporaires, suppression de compte possible. **Durées à valider.**

## 10. Horodatage OpenTimestamps
Le dossier est ancré via OpenTimestamps (preuve d'existence à une date). **Question** : comment décrire cette fonction sans surévaluer sa portée probatoire.

## 11. Signature
Signature manuscrite numérisée intégrée au PDF. **Question** : qualification juridique (simple, avancée, eIDAS/ZertES ?).

## 12. Police / urgence
Cf. `legal/EMERGENCY_DISCLAIMER.md`. L'app rappelle d'appeler les secours/police si nécessaire ; **jamais** de notification automatique. Module police = hors V1.

## 13. Claims interdits (déjà retirés du produit)
« valable mondialement », « 150 pays », « certifié », « légalement valable », « reconnu par toutes les assurances », « première app mondiale », « remplace le constat papier », « supérieur au papier », « inviolable ». Inventaire dans `legal/LEGAL_CLAIMS_REVIEW.md`. Wording retenu : « dossier numérique horodaté ».

---

## Décisions demandées au juriste
1. Peut-on utiliser le terme **« constat amiable numérique »** (ou variante) ? Sous quelles conditions ?
2. Comment décrire la **valeur probatoire** du PDF sans surévaluer ?
3. Comment décrire **OpenTimestamps** (preuve d'existence/horodatage) de façon exacte ?
4. Quelle **durée de conservation** par type de donnée (constat, photos, audio, logs) ?
5. Quelles **limites de responsabilité** formuler (TERMS) ?
6. Quel **wording assurance** prudent (« à transmettre à votre assureur ») ?
7. Quelles **mentions spécifiques Suisse (nLPD) / UE (RGPD)** ?
8. **Paiement externe** App Store / Google Play : quelle **formulation acceptable** (service vs contenu numérique) ?
9. Quelles **obligations** pour les données **audio / photos / localisation** (base légale, information, consentement) ?
10. **Suppression de compte** : quelles données doit-on **conserver légalement** malgré la demande de suppression (ex. comptable) ?
11. Données **sensibles** (blessés/santé) potentiellement présentes dans un constat : quelles obligations spécifiques ?

---

## Ce qui est demandé en retour
- Validation (ou corrections) des 8 documents `legal/`.
- Wording validé pour : valeur probatoire, OpenTimestamps, assurance, paiement, suppression.
- Réponses aux 11 décisions ci-dessus.
- Feu vert (ou réserves) pour la publication publique App Store / Google Play.
