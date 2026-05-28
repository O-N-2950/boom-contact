# Données fictives pour screenshots — boom.contact

> **Règle absolue** : aucune donnée réelle (personne, plaque, marque/modèle traçable, email, accident, photo).  
> Tout est fictif et conçu pour ne **pas** matcher un cas réel.

## Identités

### Conducteur A
- **Prénom / Nom** : Alex Demo
- **Né(e)** : 12/03/1985
- **Adresse** : Rue de l'Exemple 42, 2950 Courgenay, Suisse
- **Email** : `demo.a@boom.contact`
- **Téléphone** : +41 79 000 00 01

### Conducteur B
- **Prénom / Nom** : Camille Sample
- **Né(e)** : 27/08/1990
- **Adresse** : Avenue du Test 7, 2800 Delémont, Suisse
- **Email** : `participant.b@example.com`
- **Téléphone** : +41 79 000 00 02

### (Optionnels) Conducteurs C / D / E
- Charlie Mock — `participant.c@example.com`
- Dakota Placeholder — `participant.d@example.com`
- Elliott Fictif — `participant.e@example.com`

## Véhicules (génériques, sans marque réelle)

### Véhicule A
- **Type** : berline (silhouette générique)
- **Couleur** : gris foncé
- **Plaque** : **JU-DEMO-1** (fictive, jamais émise par le canton)
- **Année** : 2019
- **N° châssis** : WAAA000000000000A (fictif, ne respecte pas la convention VIN réelle)

### Véhicule B
- **Type** : SUV compact (silhouette générique)
- **Couleur** : blanc
- **Plaque** : **JU-DEMO-2** (fictive)
- **Année** : 2021
- **N° châssis** : WBBB000000000000B (fictif)

> ⚠️ **Ne pas utiliser** : marques Audi, BMW, VW, Tesla, etc. — risque IP. Préférer « berline » / « SUV » / « break » génériques. Les silhouettes sketch internes (16+ types) sont déjà génériques.

## Assurances (fictives)

- **Compagnie A** : « Assurance Démo SA »
- **N° police A** : `DEMO-A-2026-0001`
- **Compagnie B** : « Sample Insurance AG »
- **N° police B** : `DEMO-B-2026-0002`

> ⚠️ **Ne pas utiliser** : AXA, Baloise, Helvetia, Mobilière, La Vaudoise — risques d'association non autorisée.

## Permis (fictifs)

- **N° permis A** : `JU-DEMO-A-1234567`
- **N° permis B** : `JU-DEMO-B-7654321`
- **Catégorie** : B
- **Date d'émission** : 2010-06-15

## Lieu de l'accident (fictif)

- **Adresse** : Carrefour Avenue Démo / Rue Sample, 2950 Courgenay, Suisse
- **Coordonnées GPS** : `47.4750, 7.1500` (approximative, lieu non identifiable précis)
- **Date** : *jour de la capture, heure 9:41*

## Description (neutre, non sensible)

> « Deux véhicules circulaient en direction du centre. Un changement de file a entraîné un contact léger au niveau de l'aile arrière droite du véhicule A. Aucun blessé. »

> ⚠️ Pas de blâme explicite ; pas de blessé décrit ; pas de mention de témoin identifiable ; pas de détail sensible.

## Photos placeholder

- Privilégier des photos **placeholder neutres** :
  - Image abstraite de carrosserie gris/blanc.
  - Capot ou aile vue rapprochée, **sans plaque réelle visible**.
  - Vue de carrefour générique (Google Street View **non recommandé** — IP).
- Sources autorisées : Unsplash / Pexels (licence libre, vérifier) — recadrer pour anonymiser.
- **Interdits** : photos d'accident réel, visages, plaques réelles, marques visibles, intérieur de véhicule personnel.

## QR / sessions

- Créer une **session de démonstration** dédiée aux captures (séparée de la prod réelle).
- Le QR généré peut être **réel** (scannable vers la session démo) ou **flouté en post-traitement** pour les captures publiques.
- **Ne jamais** capturer un QR qui pointe vers une session client réelle.

## Croquis / sketch

- Utiliser 2 véhicules génériques (berline + SUV).
- Position simple : intersection en T ou en croix.
- Direction des flèches : claire mais non accusatrice.

## Validation finale (avant utilisation)

- [ ] Aucun nom de personne réelle.
- [ ] Aucune plaque valide ou ayant été émise.
- [ ] Aucune marque de voiture identifiable.
- [ ] Aucun nom d'assureur réel.
- [ ] Aucun email réel actif.
- [ ] Aucune adresse précise réelle (Courgenay = générique siège Groupe NEUKOMM, OK).
- [ ] Description sans blessure réelle, sans blâme, sans tiers identifiable.
- [ ] Photos sans personne reconnaissable et sans marque visible.
