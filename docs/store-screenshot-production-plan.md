# Plan screenshots stores — production (Sprint 6)

> Direction visuelle verrouillée : **Hybrid Trust Premium**.  
> Wording **strictement prudent** (aucun claim).  
> Voir aussi : `docs/screenshot-capture-guide.md` (méthode capture) · `docs/demo-data-for-screenshots.md` (données fictives).

## 7 screenshots recommandés

| # | Titre (2 lignes max) | Écran source | Détail |
|---|---|---|---|
| 1 | **Documentez un accident**<br>**en quelques minutes** | ConstatFlow — intro/sécurité | Logo `boom.contact`, fond clair, CTA orange « Commencer le constat », bouton urgence visible. |
| 2 | **Invitez les participants**<br>**par QR** | QRSession | QR foncé sur blanc, chips A(orange) / B(navy) / C-E(gris), compteur véhicules. |
| 3 | **Ajoutez photos, voix**<br>**et informations utiles** | PhotoCapture ou VoiceSketchFlow | Catégories photos lisibles OU micro orange + waveform cyan. |
| 4 | **Signez votre déclaration**<br>**en toute clarté** | SignaturePad | Canvas blanc + encre navy, checkbox de confirmation, bouton « Signer » orange. |
| 5 | **Générez un dossier PDF**<br>**horodaté** | PDFDownload — paywall | Packs 1/3/10, CTA bleu nuit « Payer et générer le PDF ». |
| 6 | **À transmettre**<br>**à votre assureur** | PDFDownload — état done | Encart succès vert, boutons « Télécharger » + « Email », mention assureur. |
| 7 | **Conçu pour les situations**<br>**stressantes** | Modale urgence / guidage | Bouton 🆘 rouge, numéros 112/144/117, rappel « ne remplace pas les secours ». |

## Wording **interdit** sur tous les visuels
- ❌ « certifié » / « certified »
- ❌ « 150 pays » / « 150 countries » / « 150+ »
- ❌ « légalement valable » / « legally valid »
- ❌ « accepté par toutes les assurances » / « accepted by all insurers »
- ❌ « remplace le constat » / « remplace la police »
- ❌ « preuve incontestable » / « inviolable »
- ❌ « valable mondialement » / « première app mondiale »

## Vocabulaire **autorisé** (factuel)
- « Dossier PDF horodaté »
- « À transmettre à votre assureur »
- « Documentez », « Invitez », « Signez », « Ajoutez », « Générez »
- « Multi-participants » / « jusqu'à 5 véhicules »
- « Conçu pour », « En toute clarté »

## Formats requis

### App Store
- iPhone 6.7" : **1290 × 2796** (obligatoire)
- iPhone 6.5" : **1242 × 2688** (obligatoire)
- iPad 12.9" : **2048 × 2732** (si support iPad activé)
- Min. **2 captures**, max. **10** par localisation.

### Google Play
- Phone : min. **1080 × 1920**, ratio 9:16 ou 16:9
- 7-inch tablet : **1200 × 1920** (optionnel)
- 10-inch tablet : **1600 × 2560** (optionnel)
- Min. **2 captures**, max. **8** par localisation.

## Localisation
- **Priorité 1 : FR-CH** (audience initiale)
- **Priorité 2 : FR + EN**
- **Priorité 3** : DE, IT (après validation FR/EN)

## Style visuel (cohérence Hybrid)
- Fond global du device : `#F5F8FC`.
- Cartes : blanc pur `#FFFFFF`, bordures fines `#DDE7F0`, ombre légère `0 8px 24px rgba(16,32,51,0.06)`.
- Titre au-dessus du device : 1 idée par visuel, Manrope 800, navy `#102033`.
- Pas de logo d'assureur tiers, pas de prix barré trompeur.

## Checklist par capture
- [ ] Une seule idée par visuel.
- [ ] Titre 2 lignes max.
- [ ] CTA orange visible et net.
- [ ] Aucun claim interdit (relire la liste ci-dessus).
- [ ] Aucune donnée réelle (cf. `docs/demo-data-for-screenshots.md`).
- [ ] QR anonymisé/flouté ou de test.
- [ ] Cohérence icône + fiche store + URL.

## À produire (hors environnement de build)
- [ ] 7 captures iPhone 6.7" FR (production réelle, thème Hybrid).
- [ ] 7 captures iPhone 6.5" FR.
- [ ] 7 captures Android phone FR.
- [ ] Versions EN (au minimum 2-3 captures clés).
- [ ] Habillage marketing (titre + device frame).
- [ ] Relecture finale claims avant upload.

---

## Génération automatisée (Sprint 7)

Un script Playwright produit chaque capture en mode marketing à partir de `/visual-qa?screenshot=<key>` sur la prod live (ou un serveur local). Le mode marketing utilise les **données fictives** strictes (cf. `demo-data-for-screenshots.md`) — aucune donnée réelle ne peut transiter.

### Commande
```bash
npm install                                  # installe playwright (devDep)
npx playwright install chromium              # télécharge Chromium (~150 MB, une fois)
npm run capture:screenshots                  # contre https://www.boom.contact

# Variantes
BASE_URL=http://localhost:5173 npm run capture:screenshots
FORMATS=iphone67,android-phone npm run capture:screenshots
SCREENS=intro,qr,signature npm run capture:screenshots
```

### Sortie
```
artifacts/store-screenshots/
├── iphone67/          (1290 × 2796)
│   ├── intro.png   qr.png   voice.png   photo.png
│   ├── signature.png   pdf.png   done.png   emergency.png   store.png
├── iphone65/          (1284 × 2778)
├── iphone61/          (1179 × 2556)
├── android-phone/     (1080 × 1920)
├── android-tab/       (1440 × 2560)
└── desktop/           (1440 × 2200) — design-preview.png
```
> `artifacts/` est **gitignored** : les PNG ne sont **pas** commités (poids).

### Tailles générées
| Format | Dimensions | Cible store |
|---|---|---|
| iphone67 | 1290 × 2796 | App Store iPhone 6.7" (obligatoire) |
| iphone65 | 1284 × 2778 | App Store iPhone 6.5" (obligatoire) |
| iphone61 | 1179 × 2556 | App Store iPhone 6.1" (optionnel) |
| android-phone | 1080 × 1920 | Google Play phone (obligatoire) |
| android-tab | 1440 × 2560 | Google Play tablet (optionnel) |

### Checklist AVANT upload stores
- [ ] `npm run capture:screenshots` exécuté sans erreur.
- [ ] Inspection visuelle de chaque PNG dans `artifacts/store-screenshots/`.
- [ ] Vérifier titres marketing alignés (cf. tableau plus haut).
- [ ] Aucune donnée réelle visible (relire `demo-data-for-screenshots.md`).
- [ ] QR stylisé ou réel anonymisé.
- [ ] Tester sur 1 device réel à minima (cf. `device-qa-protocol.md`).
- [ ] Versions FR + EN (relancer le script en changeant la langue browser au besoin).
