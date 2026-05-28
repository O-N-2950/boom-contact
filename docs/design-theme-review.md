# Revue des thèmes visuels — boom.contact

> Décision visuelle V1 prise. Support : `client/src/pages/DesignPreview.tsx` (route cachée `/design-preview`, noindex) + artifact HTML.
> Aucun thème n'est encore appliqué en production — l'application se fera progressivement après validation finale.

## Direction recommandée V1 : **Hybrid Trust Premium**

Fond clair, cartes blanches, texte bleu nuit, **CTA principal orange boom**, **CTA sérieux bleu nuit** (paiement/PDF). Calme, clair, rassurant, premium — esprit Apple / Stripe / Revolut / Alan avec la signature boom en accent. Le noir/orange n'est plus la base du flow accident ; il reste la **marque** (landing, accent).

Intention émotionnelle : « Je suis guidé, c'est clair, sérieux, calme et professionnel. » — réduire le stress, augmenter la confiance, garder la lisibilité.

### Palette validée (app principale)
| Token | Valeur |
|---|---|
| Background global | `#F5F8FC` |
| Surface card | `#FFFFFF` |
| Surface elevated | `#EEF4FA` |
| Text primary | `#102033` |
| Text secondary | `#5D6B7C` |
| Primary CTA | `#FF6B1A` |
| Primary CTA hover | `#F05A0A` |
| Trust blue (CTA sérieux) | `#123A5A` |
| Accent cyan | `#18B8E8` |
| Success | `#16A34A` |
| Warning | `#F59E0B` |
| Danger | `#DC2626` |
| Border | `#DDE7F0` |
| Shadow | `rgba(16,32,51,0.10)` |
| Typo | Titre **Sora**, texte **Hanken Grotesk** |

## Scoring des directions
| Direction | Score | Rôle |
|---|:--:|---|
| **Hybrid Trust Premium** | **95/100** | **App principale V1** |
| Trust Light Premium | 91/100 | Base de Hybrid · variante stores |
| Swiss Calm | 88/100 | B2B / assureurs / juristes / admin / police |
| Boom Dark Signature | 82/100 | Landing marketing / viral / accent de marque |

## Recommandation par surface
| Surface | Direction |
|---|---|
| App principale | **Hybrid Trust Premium** |
| Landing marketing | **Boom Dark Signature adouci** |
| Screenshots stores | **Hybrid Trust Premium / Trust Light** |
| B2B / assureurs / courtiers | **Swiss Calm** |
| Emails / PDF | **Trust Premium / Swiss Calm** |
| Admin / police | **Swiss Calm** |

## Accessibilité — Hybrid Trust Premium

- **Contraste texte/fond** : texte `#102033` sur fond `#F5F8FC` / carte `#FFFFFF` ≈ **15:1** → **AAA**. Texte secondaire `#5D6B7C` sur blanc ≈ **5.2:1** → **AA** (OK petit texte).
- **CTA orange/fond** : ⚠️ texte **blanc sur `#FF6B1A` ≈ 2.4:1** → insuffisant pour petit texte. Comme le libellé CTA est **gros et gras (≥ 18px/700)**, il passe en **AA gros texte (≥ 3:1)** une fois mesuré ; sinon, prévoir texte foncé `#102033` sur l'orange. À **valider au contrôle de contraste réel**.
- **CTA sérieux bleu nuit** : blanc sur `#123A5A` ≈ **11:1** → **AAA**.
- **Urgence rouge** : blanc sur `#DC2626` ≈ **4.6:1** → **AA** ; toujours accompagné de l'icône 🆘 + libellé (pas couleur seule).
- **Focus visible** : prévoir un anneau 2px contrasté (`#123A5A` ou `#18B8E8`) sur tous les éléments interactifs.
- **Boutons ≥ 44×44px** : CTA pleine largeur padding 14px → conforme.
- **Lisibilité plein soleil** : fond clair = **avantage** (vs ancien thème sombre).
- **État disabled** : prévoir surface `#EEF4FA` + texte `#5D6B7C` + curseur not-allowed (contraste réduit assumé).
- **Daltonisme** : success/warning/danger toujours doublés d'icône + texte ; ne jamais s'appuyer sur la couleur seule.
- **Dark mode** : possible plus tard (P2) — fournir une variante sombre dérivée (non requise V1).

**Corrections recommandées avant application réelle** : mesurer le contraste exact du texte sur CTA orange et ajuster (texte foncé si < 3:1 en gros) ; définir le style focus-visible global ; définir l'état disabled.

## Écrans à screenshotter
Intro/sécurité · QR multi-participants · Voix/texte · Signature · PDF/paiement · État d'erreur · Urgence. (Tous présents dans `/design-preview`, version Hybrid réaliste.)

> Décision actée : **Hybrid Trust Premium** pour l'app. Application réelle = étape suivante, progressive, sans casser la prod.
