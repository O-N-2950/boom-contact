# Audit visuel automatique — 2026-05-28 (Sprint 6)

Audit semi-automatique des 7 composants du flow accident (ConstatFlow, JoinSession, QRSession, SignaturePad, PDFDownload, VoiceSketchFlow, PhotoCapture) après application du thème Hybrid Trust Premium.

## Résultats par contrôle

| # | Contrôle | Résultat | Statut |
|---|---|---|---|
| 1 | `text-[#fff]` hardcodé dans le flow | **0 occurrence** | ✅ OK |
| 2 | Fonds sombres `bg-[#06060C]/#0E0E18/#111/black]` | **0 occurrence** | ✅ OK |
| 3 | Inline `background: '#0xxxxx'/'#1xxxxx'` (fonds sombres) | **0 occurrence** | ✅ OK |
| 4 | Boutons disabled illisibles (`disabled` + `rgba(255,255,255,0.x)`) | **0 occurrence** | ✅ OK (corrigés Sprint 5) |
| 5 | Urgence : couleur autre que rouge | toutes urgences sur `var(--red)` ou `#c00` | ✅ OK |
| 6 | Paiement : couleur autre que navy | `payOneShot` + `buyPack` → `var(--navy,#123A5A)` | ✅ OK |
| 7 | Succès : couleur autre que vert strict | `text-green-500` (Tailwind) remplacé par `text-[var(--green)]` (#16A34A) | ✅ OK |
| 8 | CTA orange sur action non-principale | nombre par composant : ConstatFlow 2 · JoinSession 1 · QRSession 1 · PDFDownload 2 (download) · PhotoCapture 3 (catégories) — tous sur actions primaires (Commencer/Continuer/Signer/Télécharger/Ajouter). | ✅ OK |
| 9 | Fond global du flow non-clair | `data-theme="hybrid"` scoped sur `view ∈ {constat,join}` → `--black: #F5F8FC`. | ✅ OK |
| 10 | Champs input/textarea héritant texte blanc | règle CSS `[data-theme="hybrid"] input, [data-theme="hybrid"] textarea` force `color:#102033; background:#fff` `!important` | ✅ OK (couvert par règle CSS) |

## Classification
- **OK** : 10/10 contrôles.
- **À corriger maintenant** : 0.
- **Acceptable hors flow principal** : couleurs hardcodées résiduelles dans **landing/B2B/admin/police** non-touchées par Sprint 5 (par décision : direction = Boom Dark / Swiss Calm, hors scope de cet audit).
- **Faux positifs** : 2 — `onBuyPack` apparaît comme nom de prop dans les interfaces (recherche payment) ; QRSession:31 = commentaire de code.

## Décoratifs vérifiés
- Couleurs de rôle QRSession (`ROLE_COLORS`) : A `var(--boom)` · B `var(--navy,#123A5A)` · C `#5D6B7C` · D `#7E8CA0` · E `#9AA7B4` → conforme spec « A orange / B bleu nuit / C/D/E gris ».
- Couleurs catégories PhotoCapture/VoiceSketchFlow : accents décoratifs (bleu/violet/cyan/rose), sur fond clair, lisibles — décoration acceptable, hors palette stricte (pas un risque légal/UX).

## À tester sur device réel (non-vérifiable ici)
- Contraste réel du texte blanc sur `var(--boom)` `#FF6B1A` (calcul théorique ≈ 2.4:1 — passe en AA gros texte mais à mesurer sur écran).
- Touch targets ≥ 44×44px sur boutons compacts (QRSession +/- vérifié 32×32 → **à ajuster** ; voir accessibility-visual-checklist).
- Plein soleil sur iPhone 6.7" et petit Android (Galaxy A series).
- Rendu Manrope sur Android (woff2 latin/latin-ext servis).
- Apparence du QR (dark `#123A5A` sur blanc) sur écran moyen-gamme.

## Recommandations
1. **Touch target QRSession +/−** : passer de 32×32 à 40×40 minimum pour conformité (note dans accessibility-visual-checklist).
2. **Mesurer le contraste réel** du CTA orange + texte blanc sur device. Si < 3:1, basculer texte CTA orange en `#102033` (texte foncé sur orange).
3. **QA device complète** : protocole `docs/device-qa-protocol.md` (43 tests) reste prérequis avant launch.
