# Checklist accessibilité visuelle — Hybrid Trust Premium

> Référence : WCAG 2.2 AA. Cibles : iOS / Android / PWA mobile.  
> À valider lors de la **QA device réelle** (`docs/device-qa-protocol.md`).

## 1. Contraste texte / fond

| Élément | Couleurs | Ratio calculé | Statut |
|---|---|---|---|
| Texte principal sur fond global | `#102033` sur `#F5F8FC` | **≈ 15:1** | ✅ AAA |
| Texte principal sur carte blanche | `#102033` sur `#FFFFFF` | **≈ 17:1** | ✅ AAA |
| Texte secondaire (muted) sur blanc | `#5D6B7C` sur `#FFFFFF` | **≈ 5.2:1** | ✅ AA |
| Texte secondaire sur surface elevated | `#5D6B7C` sur `#EEF4FA` | **≈ 5.0:1** | ✅ AA |

## 2. Contraste CTA

| CTA | Couleurs texte / fond | Ratio | Statut |
|---|---|---|---|
| **Orange (action principale)** : blanc sur orange | `#FFFFFF` sur `#FF6B1A` | **≈ 2.4:1** | ⚠️ < AA petit texte. Acceptable en gros texte (≥ 18px / 700) — **à mesurer sur device**. **Fallback** : si insuffisant, basculer texte CTA orange en `#102033` (≈ 7:1). |
| **Bleu nuit (paiement/PDF)** : blanc sur navy | `#FFFFFF` sur `#123A5A` | **≈ 11:1** | ✅ AAA |
| **Rouge (urgence)** : blanc sur rouge | `#FFFFFF` sur `#DC2626` | **≈ 4.6:1** | ✅ AA |
| **Vert (succès)** : blanc sur vert | `#FFFFFF` sur `#16A34A` | **≈ 3.0:1** | ⚠️ borderline — acceptable pour bouton ; pour texte succès préférer `text-[var(--green)]` sur fond clair (ratio ≈ 4.5:1). |

## 3. États

| État | Comportement attendu | Vérifié ? |
|---|---|---|
| **Focus visible** | Outline 2px sur tous les éléments interactifs. Style global : `outline: 2px solid var(--boom)`. | ✅ défini (index.css) — à confirmer sur clavier device. |
| **Disabled (bouton paiement, +/-)** | Fond `var(--muted)` (#5D6B7C) + curseur not-allowed + texte blanc lisible (5:1). | ✅ corrigé Sprint 5 (rgba(255,255,255,0.x) éliminés). |
| **Erreur** | Bordure + libellé : `var(--red)` (#DC2626) + icône ⚠️ + texte (jamais couleur seule). | ✅ pattern en place. |
| **Succès** | Couleur `var(--green)` (#16A34A) + icône ✓ + texte. | ✅ pattern en place. |

## 4. Taille des cibles tactiles

| Cible | Taille | Statut |
|---|---|---|
| CTA principal (Commencer / Signer / Payer / Continuer) | 100% × ~48px | ✅ ≥ 44px |
| Bouton urgence flottant | 48×48px | ✅ ≥ 44px |
| Catégories photos | ~95×95px | ✅ ≥ 44px |
| QRSession +/- véhicules | **32×32px** | ⚠️ < 44px — **à ajuster** (passer à 40×40 min). |
| Chips de rôle (A/B/C/D/E) | ~36×36px (preview) — production ≥ 44×44px nécessaire | ⚠️ à vérifier sur device |
| Checkbox CGU | ~20×20px (mais clic sur label étendu) | ✅ acceptable si label cliquable |

## 5. Lisibilité responsive

| Viewport | Cible | À tester |
|---|---|---|
| **iPhone 6.7"** (1290×2796) | Aucun débord, CTA visible sans scroll | sur device |
| **iPhone SE 4.7"** (1334×750) | Petits écrans : CTA visible, pas de texte coupé | sur device |
| **Galaxy A petit** (1080×2280, 5.5") | Lisibilité OK, touch targets OK | sur device |
| **Tablet portrait** | Card max-width pour ne pas s'étaler | à vérifier (max-width sur cards mobiles) |

## 6. Conditions difficiles

| Condition | Test attendu | Statut |
|---|---|---|
| **Plein soleil** | Fond clair `#F5F8FC` = avantage vs ancien dark theme. Texte navy `#102033` ≈ 15:1 → lisible. | ✅ favorable |
| **Utilisateur stressé** | Wording calme, urgence rouge claire, CTA principal très visible. | ✅ vérifié wording |
| **Texte allemand long** | Le DE est plus long que le FR — vérifier débordements sur boutons et headings. | ⚠️ à tester sur device (FR validé) |
| **Texte italien / anglais** | À vérifier sur device. | ⚠️ |
| **Daltonisme (rouge/vert)** | Tous les statuts doublés par icône (✓/⚠️/🆘) + texte explicite — pas de signal couleur seul. | ✅ pattern respecté |
| **Mode dyslexie / VoiceOver** | Manrope = très lisible. ARIA labels présents (SignaturePad canvas a `aria-label`, inputs ont `aria-label`). | ✅ patterns en place — à tester VoiceOver/TalkBack device. |

## 7. Texte long et i18n

- **Manrope** supporte latin + latin-ext (FR/DE/IT/EN couverts par les 2 woff2 chargés).
- Pour cyrillic / arabe / hébreu / asiatiques : Manrope embarqué ne couvre que latin/latin-ext → fallback `DM Sans` / `system-ui`. Les 43 langues du flow utilisent en majorité des scripts non-latins ; **à valider visuellement** sur device pour AR/HE/RU/ZH (RTL pour AR/HE déjà géré via `dir="rtl"` côté i18n).

## 8. Actions à faire avant launch
- [ ] Passer **QRSession +/- de 32 à 40+px** (minor code change).
- [ ] **Mesurer le contraste réel** texte blanc sur `#FF6B1A` sur device — si < 3:1 même en gros texte, basculer texte CTA orange en `#102033`.
- [ ] **VoiceOver iOS + TalkBack Android** : passer tous les écrans (intro → done).
- [ ] **Test plein soleil** : intro + signature + paiement.
- [ ] **Test petit écran Android** (Galaxy A14/A05).
- [ ] **Test DE/IT/EN** : longueur des textes vs débordement boutons/headings.
- [ ] Valider l'**ordre de tabulation** (clavier externe / accessibilité moteur).

## 9. Décisions documentées
- **Pas de dark mode système** : `data-theme="hybrid"` force le clair pour le flow accident. Décision motivée par l'usage en situation stressante (clarté > préférence cosmétique) et la cohérence stores. Dark mode landing reste possible (hors flow).
- **Police app principale** : Manrope (cf. décision Sprint 5). Inter rejetée (moins distinctive).
