# Guide de capture screenshots — boom.contact

> Méthode opératoire pour produire les 7 screenshots App Store + Google Play en thème **Hybrid Trust Premium**.

## Pré-requis communs
- Build de production déployé sur Railway (HEAD `main`).
- Compte de test (admin/credits 999999 ou compte avec crédits) : `contact@boom.contact` (ou créer un compte démo dédié screenshots).
- Données fictives chargées (cf. `docs/demo-data-for-screenshots.md`).
- Langue de l'OS = **FR-CH** ou **FR** (priorité 1), **EN** (priorité 2).
- Mode clair (light) — pas de dark mode système qui forcerait des overrides.
- Pas de notifications visibles (mode Focus / Ne pas déranger).
- Heure affichée : **9:41** (convention Apple) — paramétrer dans les outils ci-dessous.

## iOS — capture sur simulateur

### Outils
- **Xcode** (récent) — simulateur iPhone 15/16 Pro Max + iPhone 14/15 Plus (6.5").
- `xcrun simctl status_bar` pour figer l'heure.

### Étapes
1. Lancer le simulateur **iPhone 15/16 Pro Max** (6.7", 1290×2796).
2. Figer la barre de statut :
   ```bash
   xcrun simctl status_bar booted override --time "9:41" --batteryState charged --batteryLevel 100 --cellularBars 4 --wifiBars 3 --dataNetwork 5g
   ```
3. Ouvrir Safari → `https://www.boom.contact` (PWA en attendant le build natif).
4. Naviguer vers l'écran cible (`?session=<id>` pour invitations).
5. **Capture** : ⌘+S dans le simulateur OU `xcrun simctl io booted screenshot screenshot1.png`.
6. Répéter pour iPhone 6.5" (1242×2688).
7. Si support iPad : iPad Pro 12.9" (2048×2732).

### Vérifications par capture
- [ ] Barre de statut figée 9:41 / batterie pleine.
- [ ] Pas de safe-area artifact (notch propre, dynamic island OK).
- [ ] Pas de scrollbar visible.
- [ ] Aucun toast/popup ouvert involontairement.

## Android — capture sur émulateur ou device

### Outils
- **Android Studio** + AVD Manager.
- Émulateur recommandé : **Pixel 8 Pro** (1344×2992) ou **Pixel 7** (1080×2400).
- Ou device physique récent (Pixel, Samsung Galaxy S/A) en mode développeur.

### Étapes
1. Démarrer l'émulateur, langue = **FR**, mode clair.
2. Masquer barre de débogage : Settings → Developer options → désactiver overlay debug.
3. Ouvrir Chrome → `https://www.boom.contact` (PWA en attendant build natif).
4. Mode plein écran si possible (PWA installée à l'écran d'accueil).
5. **Capture** : Power + Volume bas OU `adb shell screencap -p /sdcard/screen.png && adb pull /sdcard/screen.png`.
6. Recadrer si nécessaire au ratio 9:16 (1080×1920 ou 1080×2400).

### Vérifications par capture
- [ ] Pas de barre de statut système intrusive (ou recadrée).
- [ ] Pas de barre de débogage / FPS counter / layout bounds.
- [ ] Couleurs cohérentes avec le rendu iOS (mêmes tokens).

## Captures à effectuer (séquence)

Suivre l'ordre de `docs/store-screenshot-production-plan.md` :

1. **Intro** : ouvrir l'app, écran intro / sécurité.
2. **QR** : créer une session, écran QR multi-participants avec 2-3 véhicules.
3. **Photos** : avancer jusqu'à PhotoCapture, ajouter 2-3 photos placeholder (cf. demo-data).
4. **Voix** (alternative) : VoiceSketchFlow avec waveform animée.
5. **Signature** : SignaturePad — signer manuellement (canvas blanc + encre navy).
6. **Paiement** : PDFDownload paywall avec packs visibles.
7. **PDF prêt** : état done, encart succès vert.
8. **Urgence** : modale urgence avec numéros.

## Règles strictes
- **App réelle uniquement** — pas de preview ni de maquette.
- **Aucune donnée réelle** : utiliser `docs/demo-data-for-screenshots.md`.
- **QR anonymisé** : soit QR de session test, soit QR flouté en post-traitement.
- **Emails fictifs** : `demo@boom.contact`, `participant.b@example.com`.
- **Plaques fictives** : pas de plaque réelle (cf. demo-data).
- **Pas de photos d'accident réel** : utiliser images libres de droits ou placeholders abstraits.
- **Pas de visage identifiable**, pas de nom complet réel.

## Post-traitement
- Ajouter le **titre marketing** (2 lignes max) au-dessus du device (cf. plan).
- Habillage device-frame optionnel (mockup iPhone propre).
- Export PNG 24 bits, sans alpha.
- Vérifier la taille finale = format store exact.

## Validation avant upload
- [ ] Relire la liste claims interdits (`docs/store-screenshot-production-plan.md`).
- [ ] Vérifier toutes les captures côte-à-côte → cohérence visuelle.
- [ ] Vérifier que la fiche store ne contredit pas les captures.
- [ ] Double check icône + screenshots + description = même histoire prudente.
