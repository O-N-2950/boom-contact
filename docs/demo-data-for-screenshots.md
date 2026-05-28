# Données fictives pour screenshots — boom.contact

> **Règle absolue** : aucune donnée réelle (personne, plaque, marque, email, accident, photo).  
> Tout est fictif et conçu pour ne **pas** matcher un cas réel.  
> Ces données sont utilisées par `/visual-qa?screenshot=<key>` (mode marketing) et le script Playwright.

## Identités (verrouillées Sprint 7)

| Rôle | Nom (fictif) | Email | Téléphone |
|---|---|---|---|
| Conducteur A | **Camille Martin** | demo.a@boom.contact | +41 79 000 00 01 |
| Conducteur B | **Luca Rossi** | participant.b@example.com | +41 79 000 00 02 |
| Conducteur C | **Sofia Keller** | participant.c@example.com | +41 79 000 00 03 |
| Conducteur D | Dakota Placeholder | participant.d@example.com | +41 79 000 00 04 |
| Conducteur E | Elliott Fictif | participant.e@example.com | +41 79 000 00 05 |

## Véhicules (génériques)

| Véhicule | Type | Plaque | Année |
|---|---|---|---|
| A | **Exemple Auto · berline** | **VD 000 000** | 2019 |
| B | **Exemple Auto · SUV** | **VD 000 001** | 2021 |

> ⚠️ Pas de marque réelle (Audi, BMW, VW, Tesla, etc.). Les silhouettes sketch (16 types génériques) sont déjà neutres.

## Assurance & permis

- **Compagnie A & B** : **Assurance Démo**
- **N° police A** : `DEMO-A-2026-0001`
- **N° police B** : `DEMO-B-2026-0002`
- **N° permis A** : `VD-DEMO-A-1234567`
- **N° permis B** : `VD-DEMO-B-7654321`

> ⚠️ Pas de nom d'assureur réel (AXA, Baloise, Helvetia, Mobilière, Vaudoise).

## Email principal screenshots

- **`demo@boom.contact`** (boîte de démo / placeholder visible dans les captures).

## Lieu

- **Lausanne, Suisse** (générique, sans coordonnées GPS précises identifiables).
- Date d'accident : *jour de la capture*, heure **9:41** (convention Apple).

## Description neutre

> « Deux véhicules circulaient en direction du centre. Un changement de file a entraîné un contact léger au niveau de l'aile arrière droite du véhicule A. Aucun blessé. »

## QR / sessions

- Soit **QR stylisé propre** (généré localement dans `/visual-qa` — pattern de coin valide, non-scannable car données factices).
- Soit **QR réel** d'une session de démo dédiée — à flouter/anonymiser en post-traitement avant upload store.
- **Jamais** un QR pointant vers une session client réelle.

## Photos placeholder

- Images abstraites neutres (gris/blanc), pas de plaque réelle visible, pas de visage, pas de marque.
- Sources : Unsplash / Pexels (licence libre), recadrées pour anonymiser.
- **Interdits** : photos d'accident réel, visages, plaques réelles, marques visibles, intérieur de véhicule personnel.

## Croquis

- 2 véhicules génériques (berline + SUV).
- Intersection en T ou en croix.
- Flèches claires mais non accusatrices.

## Validation finale

- [ ] Aucun nom de personne réelle.
- [ ] Aucune plaque valide (VD 000 000 / VD 000 001 sont fictives, hors plage émise).
- [ ] Aucune marque de voiture identifiable.
- [ ] Aucun nom d'assureur réel.
- [ ] Aucun email réel actif (sauf `demo@boom.contact` = boîte démo Groupe NEUKOMM, OK).
- [ ] Lieu générique « Lausanne, Suisse » sans adresse précise.
- [ ] Description sans blessure réelle, sans blâme, sans tiers identifiable.
- [ ] Photos sans personne reconnaissable et sans marque visible.
