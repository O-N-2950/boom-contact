# boom.contact — Android Internal QA Report

| Champ | Valeur |
|---|---|
| Version | **1.0.0** |
| versionCode | **1** |
| Canal | **Tests internes** (statut : Actif) |
| Lien de test | https://play.google.com/apps/internaltest/4701728878089201088 |
| Date d'ouverture QA | 2026-06-01 |

## Testeurs
| Testeur | Compte Google ajouté | Appareil | Version Android | Statut |
|---|---|---|---|---|
| _(à remplir)_ | | | | invité / installé / testé |

## Appareils cibles (rappel)
- iPhone hors scope ici (TestFlight séparé).
- Android récent (14/15), Android milieu de gamme (12), **Android 8 ou 9 ancien** (prioritaire — voir `android-legacy-device-compatibility.md`).

## Résultats (synthèse)
| Parcours | Récent | Milieu gamme | Ancien (8/9) |
|---|---|---|---|
| Installation + lancement (pas d'écran blanc) | | | |
| Connexion magic link | | | |
| Garage perso | | | |
| Véhicule entreprise | | | |
| Constat complet | | | |
| Caméra + fallback manuel | | | |
| Galerie | | | |
| Micro + fallback texte | | | |
| Localisation + adresse manuelle | | | |
| QR participant | | | |
| Signature → PDF → email | | | |
| Paiement test | | | |
| Suppression de compte | | | |
| Offline → reconnexion | | | |

## Bugs (triage)
| # | Description | Appareil / Android | Gravité | Statut | Build cible |
|---|---|---|---|---|---|
| _(vide — à remplir au fil des retours)_ | | | P0/P1/P2/P3 | ouvert/corrigé | |

## Matrice de priorité
**P0 (bloque les stores)** : ne s'installe pas · ne s'ouvre pas · crash · connexion impossible · constat impossible à démarrer · PDF impossible · paiement débité sans crédit livré · perte de données.
**P1 (bloque le lancement public)** : garage inutilisable · permission bloque sans fallback · signature cassée · PDF incomplet · email non reçu · performance catastrophique sur appareil ancien · traduction critique manquante.
**P2 (polish)** : UI · wording · alignement · lenteur modérée · confusion mineure.
**P3 (futur)** : amélioration future.

## Décision GO / NO-GO prochain build
- **NO-GO** tant qu'un **P0** est ouvert.
- **GO build correctif** dès qu'un P0/P1 est confirmé et corrigé (⚠️ **bump `versionCode` obligatoire**, ex. 1 → 2, + `quality:prestore` avant le nouvel AAB).
- Statut actuel : **en attente des premiers retours** (aucun bug enregistré).
