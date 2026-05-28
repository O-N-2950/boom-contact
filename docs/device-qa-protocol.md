# Protocole QA sur appareils réels — boom.contact

> Objectif : protocole exécutable **sans improvisation**. Chaque test = une ligne à remplir.
> Colonnes : **ID · Scénario · Device · Préconditions · Étapes · Résultat attendu · Résultat réel · Statut · Capture/log · Responsable · Date**.
> Statut : ✅ OK · ❌ KO · ⚪️ non testé · ⏳ en cours.

---

## 0. Parc d'appareils obligatoire

| Slot | Device | OS min | Rôle suggéré |
|---|---|---|---|
| D1 | iPhone récent (15/16) | iOS 17+ | A |
| D2 | iPhone plus ancien supporté (SE / 11) | iOS 16 | B |
| D3 | Android récent (Pixel 8 / S24) | Android 14 | C |
| D4 | Android milieu de gamme (A54 / Redmi) | Android 12 | D |
| D5 | 5e device (iOS ou Android) | — | E |

> Idéalement 3 à 5 téléphones pour tester A/B/C/D/E en parallèle.

---

## 1. Permissions

| ID | Scénario | Device | Préconditions | Étapes | Résultat attendu | Résultat réel | Statut | Capture/log | Resp. | Date |
|---|---|---|---|---|---|---|---|---|---|---|
| P-01 | Micro accepté | D1 | App installée | Voix → autoriser micro | Transcription fonctionne | | ⚪️ | | | |
| P-02 | Micro refusé | D1 | — | Voix → refuser | Fallback saisie texte, pas de blocage | | ⚪️ | | | |
| P-03 | Caméra acceptée | D1 | — | OCR/photo → autoriser | Capture OK | | ⚪️ | | | |
| P-04 | Caméra refusée | D1 | — | OCR/photo → refuser | Message clair, alternative upload | | ⚪️ | | | |
| P-05 | Photos acceptées | D3 | — | Joindre depuis bibliothèque | Sélection OK | | ⚪️ | | | |
| P-06 | Photos refusées | D3 | — | Refuser accès | Pas de crash, message | | ⚪️ | | | |
| P-07 | Localisation acceptée | D1 | — | Lieu → autoriser | Position pré-remplie | | ⚪️ | | | |
| P-08 | Localisation refusée | D1 | — | Refuser | Saisie manuelle adresse | | ⚪️ | | | |

## 2. Flux A/B (2 véhicules)

| ID | Scénario | Device | Préconditions | Étapes | Résultat attendu | Résultat réel | Statut | Capture/log | Resp. | Date |
|---|---|---|---|---|---|---|---|---|---|---|
| AB-01 | A crée | D1 | — | Démarrer constat, 2 véhicules | Session créée, QR B affiché | | ⚪️ | | | |
| AB-02 | B rejoint | D2 | AB-01 | Scanner QR B | B sur écran join + CGU | | ⚪️ | | | |
| AB-03 | A remplit | D1 | AB-01 | OCR + circonstances + photos | Données A enregistrées | | ⚪️ | | | |
| AB-04 | B remplit | D2 | AB-02 | OCR + circonstances | Données B enregistrées, A non écrasé | | ⚪️ | | | |
| AB-05 | A signe | D1 | AB-03 | Cocher + signer | Signature A stockée | | ⚪️ | | | |
| AB-06 | B signe | D2 | AB-04 | Cocher + signer | Signature B stockée | | ⚪️ | | | |
| AB-07 | Paiement | D1 | AB-05/06 | Payer (carte test) | Retour app, crédit consommé | | ⚪️ | | | |
| AB-08 | PDF | D1 | AB-07 | Voir/télécharger PDF | PDF complet A+B | | ⚪️ | | | |
| AB-09 | Email | D1/D2 | AB-08 | Vérifier boîte mail | A et B reçoivent le PDF | | ⚪️ | | | |

## 3. Flux A/B/C/D/E (5 véhicules)

| ID | Scénario | Device | Préconditions | Étapes | Résultat attendu | Résultat réel | Statut | Capture/log | Resp. | Date |
|---|---|---|---|---|---|---|---|---|---|---|
| MV-01 | A choisit 5 véhicules | D1 | — | vehicleCount = 5 | QR B/C/D/E générés | | ⚪️ | | | |
| MV-02 | QR individuels | D1 | MV-01 | Afficher chaque QR | 4 QR distincts (tokens individuels) | | ⚪️ | | | |
| MV-03 | C/D/E rejoignent | D3/D4/D5 | MV-02 | Chacun scanne SON QR | Chaque rôle isolé | | ⚪️ | | | |
| MV-04 | Chacun remplit | tous | MV-03 | Remplir par rôle | Aucun participant n'écrase un autre | | ⚪️ | | | |
| MV-05 | Chacun signe | tous | MV-04 | Signer par rôle | 5 signatures distinctes | | ⚪️ | | | |
| MV-06 | PDF annexes | D1 | MV-05 | Générer PDF | Annexe C/D/E présente | | ⚪️ | | | |
| MV-07 | Emails A-E | tous | MV-06 | Vérifier mails | A/B/C/D/E reçoivent (bonne langue) | | ⚪️ | | | |

## 4. Stripe

| ID | Scénario | Device | Préconditions | Étapes | Résultat attendu | Résultat réel | Statut | Capture/log | Resp. | Date |
|---|---|---|---|---|---|---|---|---|---|---|
| ST-01 | Success | D1 | — | Payer carte test OK | `?payment=success` → app → done | | ⚪️ | | | |
| ST-02 | Cancel | D1 | — | Annuler checkout | `?payment=cancelled` → retour propre | | ⚪️ | | | |
| ST-03 | App froide | D1 | App tuée | Lien retour ouvre l'app | `appUrlOpen` applique params | | ⚪️ | | | |
| ST-04 | App ouverte | D1 | App en bg | Lien retour | Reprise + params | | ⚪️ | | | |
| ST-05 | Retour navigateur | D3 | App non installée | Payer via web | PWA gère le retour | | ⚪️ | | | |
| ST-06 | Perte réseau pendant checkout | D1 | — | Couper réseau pendant paiement | Pas de double débit, état cohérent | | ⚪️ | | | |

## 5. Offline

| ID | Scénario | Device | Préconditions | Étapes | Résultat attendu | Résultat réel | Statut | Capture/log | Resp. | Date |
|---|---|---|---|---|---|---|---|---|---|---|
| OFF-01 | Couper réseau pendant flow | D1 | En cours de constat | Mode avion | Saisie locale conservée | | ⚪️ | | | |
| OFF-02 | Reprise | D1 | OFF-01 | Rétablir réseau | Sync, pas de perte | | ⚪️ | | | |
| OFF-03 | Sauvegarde locale | D1 | OFF-01 | Relancer l'app | État restauré (localStorage) | | ⚪️ | | | |
| OFF-04 | Replay | D1 | OFF-02 | Vérifier envoi différé | Données poussées une seule fois | | ⚪️ | | | |

## 6. PDF

| ID | Scénario | Device | Préconditions | Étapes | Résultat attendu | Résultat réel | Statut | Capture/log | Resp. | Date |
|---|---|---|---|---|---|---|---|---|---|---|
| PDF-01 | Contenu correct | D1 | constat complet | Ouvrir PDF | Tous champs présents | | ⚪️ | | | |
| PDF-02 | Signatures | D1 | — | Vérifier | Signatures visibles par rôle | | ⚪️ | | | |
| PDF-03 | Photos | D1 | — | Vérifier | Photos intégrées | | ⚪️ | | | |
| PDF-04 | Annexes C/D/E | D1 | 5 véhicules | Vérifier | Annexes présentes | | ⚪️ | | | |
| PDF-05 | Wording prudent | D1 | — | Lire textes | « Dossier numérique horodaté », **aucun** « certifié / 150 pays / valable mondialement » | | ⚪️ | | | |

## 7. Emails

| ID | Scénario | Device | Préconditions | Étapes | Résultat attendu | Résultat réel | Statut | Capture/log | Resp. | Date |
|---|---|---|---|---|---|---|---|---|---|---|
| EM-01 | A/B/C/D/E reçus | tous | constat signé | Vérifier mails | Chaque rôle reçoit | | ⚪️ | | | |
| EM-02 | Erreur email | D1 | email invalide | Saisir email erroné | Gestion d'erreur, pas de crash | | ⚪️ | | | |
| EM-03 | Delivery status | — | — | Vérifier Resend dashboard | Statut delivered | | ⚪️ | | | |

## 8. Concurrence

| ID | Scénario | Device | Préconditions | Étapes | Résultat attendu | Résultat réel | Statut | Capture/log | Resp. | Date |
|---|---|---|---|---|---|---|---|---|---|---|
| CC-01 | Signatures simultanées A/B | D1+D2 | tous remplis | Signer en même temps | Pas de collision, 2 signatures | | ⚪️ | | | |
| CC-02 | Signatures simultanées A-E | tous | tous remplis | Signer en même temps | Session → `completed` sans écrasement | | ⚪️ | | | |

---

## Synthèse d'exécution
| Catégorie | Total | ✅ | ❌ | ⚪️ |
|---|---|---|---|---|
| Permissions | 8 | | | |
| A/B | 9 | | | |
| A/B/C/D/E | 7 | | | |
| Stripe | 6 | | | |
| Offline | 4 | | | |
| PDF | 5 | | | |
| Emails | 3 | | | |
| Concurrence | 2 | | | |

> **GO Internal Testing élargi** quand permissions + A/B + Stripe success/cancel sont ✅.
> **GO public** uniquement quand toutes les catégories sont ✅ (+ juriste + consoles privacy).
