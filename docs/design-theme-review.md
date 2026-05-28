# Revue des thèmes visuels — boom.contact

> But : décider de la direction visuelle avant TestFlight / Internal Testing, **sans** redesign global irréversible.
> Support : `client/src/pages/DesignPreview.tsx` (route cachée `/design-preview`, noindex) + artifact HTML de comparaison.
> Aucun thème n'est appliqué en production — ce document sert à **choisir**.

---

## Les 3 thèmes

### A — Boom Signature
| | |
|---|---|
| Palette | Noir profond `#0a0a14` · Orange boom `#ff6b1a` · Cyan `#00d4ff` · Blanc cassé `#f5f5f0` |
| Typo | Titre **Sora**, texte **Manrope** |
| Personnalité | Énergique, virale, technologique |
| Avantages | Branding **fort et mémorable**, excellent pour le viral/TikTok, CTA qui claque |
| Risques | Sombre = moins « rassurant » après un accident, **lisibilité plein soleil plus faible**, perçu moins institutionnel par assureurs/juristes, blanc sur orange = contraste limite |
| Usage recommandé | **Landing marketing / viral**, accent de marque (logo, CTA) |

### B — Trust Premium
| | |
|---|---|
| Palette | Fond clair `#eef3f9` · Bleu nuit `#1b3a5b` · Bleu électrique `#0ea5e9` · Orange CTA `#ff6b1a` |
| Typo | Titre **Fraunces** (serif premium), texte **Hanken Grotesk** |
| Personnalité | Calme, sûr, fintech/assurance |
| Avantages | **Confiance élevée**, lisible plein soleil, premium, orange réservé au CTA → forte conversion, compatible Apple/Google et assureurs |
| Risques | Bleu fintech un peu **moins différenciant** que le noir/orange ; nécessite rigueur typographique |
| Usage recommandé | **App principale (flow accident)**, **screenshots stores**, B2B |

### C — Swiss Calm
| | |
|---|---|
| Palette | Blanc cassé `#faf9f7` · Anthracite `#1f2227` · Rouge/orange discret `#d6452a` · Gris premium `#8a9099` |
| Typo | Titre **Archivo**, texte **IBM Plex Sans** |
| Personnalité | Institutionnel, suisse, élégant, juridique |
| Avantages | **Acceptabilité maximale assureurs/juristes/entreprises**, très lisible, haut de gamme, beaucoup d'espace |
| Risques | Accent discret = **CTA moins punchy** (conversion B2C), moins mémorable que Boom |
| Usage recommandé | **B2B / institutionnel**, variante « sérieuse » du flow |

---

## Matrice d'évaluation (1 = faible, 5 = fort)

| Critère | Boom | Trust | Swiss |
|---|:--:|:--:|:--:|
| Confiance | 3 | 5 | 5 |
| Clarté | 4 | 5 | 5 |
| Premium | 4 | 5 | 5 |
| Réduction du stress | 2 | 5 | 4 |
| Lisibilité plein soleil | 2 | 5 | 5 |
| Accessibilité contraste | 3 | 4 | 4 |
| Différenciation marque | 5 | 3 | 3 |
| Conversion paiement | 4 | 5 | 3 |
| Acceptabilité assureurs/B2B | 2 | 5 | 5 |
| Acceptabilité Apple/Google | 4 | 5 | 5 |
| Internationalisation | 4 | 5 | 5 |
| **Total /55** | **37** | **52** | **49** |

---

## Accessibilité

**AA OK / à vérifier (par thème)**
- **Boom** : texte blanc cassé sur fond sombre = **AAA**. ⚠️ **Risque** : texte **blanc sur orange `#ff6b1a` ≈ 2.2:1 < AA**. Correction : texte foncé sur boutons orange, ou orange plus sombre pour le texte, ou réserver le blanc-sur-orange aux **gros** libellés (≥ 24px / 18px gras).
- **Trust** : navy `#1b3a5b` + blanc = **AAA** ; texte navy sur clair = **AAA**. ⚠️ CTA orange : même précaution blanc-sur-orange que Boom (l'orange est ici réservé au CTA, donc gros texte → acceptable, à mesurer).
- **Swiss** : anthracite sur blanc cassé = **AAA**. ⚠️ rouge `#d6452a` + blanc ≈ **3.9:1** → OK pour **gros** texte/CTA, **insuffisant** pour petit texte.

**Risques transverses**
- Couleurs danger/success/warning : ne pas s'appuyer **uniquement** sur la couleur (daltonisme) → toujours **icône + libellé**.
- Plein soleil : Boom désavantagé (sombre) ; Trust/Swiss avantagés (clair).

**Corrections recommandées**
- Boutons primaires : viser **≥ 4.5:1** (petit texte) ou **≥ 3:1** (gros texte) — ajuster la teinte du texte sur orange/rouge.
- Cibles tactiles **≥ 44×44px**, **focus visible** (anneau 2px contrasté), états hover/active distincts.
- Mode sombre/clair : Boom = sombre natif ; Trust/Swiss = clair natif → prévoir une variante sombre si besoin (P2).

---

## Quels écrans screenshotter (pour comparer)
Intro/sécurité · QR multi-véhicules · Vocal · Signature · Paiement/PDF · Landing hero · État d'erreur · Bouton urgence. (Tous présents dans `/design-preview`.)

## Recommandation
- **App principale (V1)** : **Trust Premium** comme base (confiance + lisibilité + conversion), en **conservant l'orange boom pour le CTA principal et le logo** → approche **hybride**.
- **Landing marketing / viral** : **Boom Signature**.
- **Screenshots stores** : **Trust Premium**.
- **B2B / institutionnel** : **Swiss Calm** (ou Trust Premium).

> Décision attendue d'Olivier après visualisation. Tant que non tranché, la production reste **inchangée** (aucun risque).
