# Sélection finale screenshots stores — boom.contact

> Sélection définitive (à uploader telle quelle après habillage marketing).
> Source : `artifacts/store-screenshots/<viewport>/<screen>.png` (généré par `npm run capture:screenshots`, gitignored).
> Titres : cf. `docs/store-screenshot-copy-fr-en.md`.

## App Store — iPhone (3 viewports requis)

Tailles obligatoires : iphone67 (1290×2796), iphone65 (1284×2778). Optionnel : iphone61 (1179×2556).

| # | Fichier source | Titre FR (2 lignes) | Sous-texte | Usage | Pourquoi ce choix | Risque |
|---|---|---|---|---|---|---|
| 1 | `iphone67/intro.png` | **Documentez un accident<br>en quelques minutes** | CTA principal visible · bouton urgence rouge | Hero — première impression | Communique le bénéfice + la prudence (urgence) ; CTA orange clair | aucun |
| 2 | `iphone67/qr.png` | **Invitez les participants<br>par QR** | Chips A/B/C-E + jusqu'à 5 véhicules | Différenciation multi-véhicules | Met en avant la fonctionnalité unique (multi-participants) | aucun |
| 3 | `iphone67/voice.png` | **Ajoutez photos, voix<br>et informations utiles** | Micro orange + waveform cyan + timer | Démonstration capture | Vocal = différenciateur fort, simple à comprendre | aucun |
| 4 | `iphone67/signature.png` | **Signez votre déclaration<br>en toute clarté** | Signature navy sur canvas blanc + ✓ SIGNÉ | Confiance · sérieux | Visualise le caractère formel de l'app | aucun |
| 5 | `iphone67/pdf.png` | **Générez un dossier PDF<br>horodaté** | 3 packs (4.90 / 12.90 / 34.90) + CTA navy | Modèle économique transparent | Prix visibles · CTA navy = sérieux paiement | mention « horodaté » = factuel |
| 6 | `iphone67/done.png` | **À transmettre<br>à votre assureur** | Encart succès vert + email demo | Closure du flow + transition assureur | Wording neutre validé (« à transmettre » ≠ « accepté par ») | aucun |
| 7 | `iphone67/emergency.png` | **Conçu pour les situations<br>stressantes** | Bouton 🆘 rouge + 112/144/117 | Trust & safety | Disclaimer prudent visible « ne remplace pas les services de secours » | aucun |

**Bonus optionnel** : `iphone67/photo.png` (catégories photos) — peut remplacer `voice.png` en alternance localisation.

## Google Play — Phone (1 viewport minimum)

Tailles : android-phone (1080×1920). Optionnel : android-tab (1440×2560).

| # | Fichier source | Titre FR (2 lignes) | Usage | Pourquoi ce choix |
|---|---|---|---|---|
| 1 | `android-phone/intro.png` | **Documentez un accident<br>en quelques minutes** | Hero | Mêmes raisons qu'App Store |
| 2 | `android-phone/qr.png` | **Invitez les participants<br>par QR** | Multi-véhicules | — |
| 3 | `android-phone/photo.png` | **Ajoutez photos, voix<br>et informations utiles** | Capture visuelle | Sur Android, valoriser la capture photo est plus parlant que vocal |
| 4 | `android-phone/voice.png` | **Ajoutez photos, voix<br>et informations utiles** | (rotation possible) | Si seulement 7 emplacements : préférer photo seul |
| 5 | `android-phone/signature.png` | **Signez votre déclaration<br>en toute clarté** | Sérieux | — |
| 6 | `android-phone/pdf.png` | **Générez un dossier PDF<br>horodaté** | Pricing transparent | — |
| 7 | `android-phone/emergency.png` | **Conçu pour les situations<br>stressantes** | Safety | — |

**Note Google Play** : `store.png` (vue d'ensemble grille) peut servir pour la **bannière feature** (1024×500) après recadrage marketing.

## Variantes par localisation
- **Build FR** (priorité 1) : tous les titres en FR.
- **Build EN** (priorité 2) : titres traduits, captures **régénérées** en navigateur EN si possible (`locale: 'en-US'` dans le script). Pour V1, on peut uploader les mêmes PNG (la card UI est en français — acceptable car le contenu de l'app est multilangue mais les screenshots reflètent un cas d'usage).
- **DE / IT** : V2 — pas requis pour le lancement initial.

## Recommandation finale
- **Démarrer avec 7 captures iphone67 + 7 captures android-phone** (= 14 PNG après habillage).
- **Habillage marketing** post-traitement (Figma / Photoshop) :
  - Reprendre le PNG brut généré (titre déjà incrusté).
  - Optionnel : ajouter device frame iPhone/Pixel.
  - Optionnel : ajouter un caption secondaire (cf. `store-screenshot-copy-fr-en.md`).
- **Avant upload** : valider visuellement chaque PNG (cf. checklist `store-upload-checklist.md`).

## Statut Sprint 8
- ✅ 46/46 captures générées (5 viewports × 9 écrans + design-preview).
- ✅ Sélection finale documentée (ce fichier).
- ✅ Titres FR/EN documentés (`store-screenshot-copy-fr-en.md`).
- ⏳ Habillage marketing → manuel post-traitement.
- ⏳ Upload stores → après Team ID / SHA-256 / builds signés.
