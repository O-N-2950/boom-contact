# Revue UX/UI premium — boom.contact

> Revue à froid après le Sprint 1 UX/legal. Objectif : niveau « premium » pour une app utilisée **en situation de stress** (accident).
> Chaque point : observation + recommandation. Priorité : **P1** (avant public) · **P2** (souhaitable) · **P3** (nice-to-have).

---

## 1. Clarté du parcours

- **Constat positif** : l'écran intro (Sprint 1) pose le cadre, rassure et oriente vers les urgences avant tout. La séquence A (intro → OCR → location → photos → QR → vocal → form → croquis → choc → signature → done) est linéaire et lisible via le StepIndicator.
- **Reco P2** : afficher une estimation « ~5 min » et la progression « étape X / N » en toutes lettres pour réduire l'incertitude.

## 2. Stress utilisateur

- L'utilisateur type est en état de choc léger. Le bouton 🆘 omniprésent (sauf `done`) est un bon réflexe de sécurité.
- **Reco P1** : sur l'écran intro et l'écran d'erreur, garder des phrases **courtes**, une seule action principale par écran, éviter les blocs de texte longs.
- **Reco P2** : un bouton « Reprendre plus tard » explicite (la sauvegarde locale existe déjà mais n'est pas annoncée).

## 3. Lisibilité mobile

- Thème sombre fixe (`#0a0a14`), cohérent. Tailles de police globalement ≥ 13px.
- **Reco P2** : auditer les textes à `text-[11px]` / `text-[10px]` (notices légales, AUTO, badges) — à la limite basse de lisibilité en plein soleil. Passer les notices importantes à 12–13px.

## 4. Boutons principaux

- CTA en `var(--boom)` (orange) bien identifiables. États désactivés (signature/join) clairs.
- **Reco P2** : uniformiser les hauteurs de zone tactile à ≥ 44–48px (cible Apple/Google) sur tous les boutons secondaires (ex. « Annuler », ↺, liens discrets).

## 5. Gestion des erreurs

- Bandeaux d'erreur présents (ConstatFlow, JoinSession). 
- **Reco P1** : pour les échecs réseau pendant OCR/upload/paiement, message d'action explicite (« Réessayer » + conservation des données saisies). Vérifier qu'aucune erreur technique brute (stack/anglais) ne fuit vers l'utilisateur.

## 6. Couleurs & confiance

- Palette sobre, orange d'accent, vert pour succès. Cohérent et professionnel.
- **Reco P3** : harmoniser les verts/rouges utilisés ponctuellement en hexadécimal en dur avec des tokens CSS.

## 7. Confiance / crédibilité

- **Important** : après le nettoyage des claims, les anciens arguments de réassurance (« certifié », « 150+ pays », « reconnu par les assurances ») ont disparu. 
- **Reco P1** : les remplacer par des éléments de confiance **vrais et vérifiables** : horodatage cryptographique (OpenTimestamps), chiffrement en transit, modèle inspiré du constat européen, multilingue (50 langues), sans inscription. Cela maintient la crédibilité **sans claim juridique**.

## 8. Urgence

- Bouton 🆘 → `EmergencyNumbers` (numéros par pays). Bon.
- **Reco P2** : sur l'intro et l'écran blessure, rendre l'accès urgence encore plus visible (déjà fait sur l'intro). Vérifier la détection pays pour les bons numéros (112/117/118/144…).

## 9. Signature

- Canvas tactile + case de confirmation légale obligatoire (Sprint 1). Wording prudent (exactitude de **ses** infos, pas de responsabilité, pas de certification des autres).
- **Reco P2** : feedback haptique léger à la fin de la signature ; bouton « Effacer » bien distinct du « Confirmer ».

## 10. Paiement

- Notice avant paiement (Sprint 1) présente le paiement comme un **service** (génération/envoi du dossier), pas un achat de contenu — bon pour la conformité store.
- **Reco P1** : le **retour dans l'app** après Stripe doit être impeccable (sinon abandon + perception de bug). À tester en priorité (cf. checklists iOS/Android).

## 11. QR multi-véhicules

- `updateVehicleCount()` unifié (Sprint 1) ; QR + tokens individualisés B/C/D/E ; affichage des rejoints.
- **Reco P2** : sur l'écran QR, indiquer clairement « X / N ont rejoint » et un état d'attente animé pour chaque rôle manquant.

## 12. Textes

- Micro-copies du Sprint 1 (intro, invité, signature, paiement, micro, blessure) cohérentes et prudentes.
- **Reco P1** : faire **relire l'ensemble par un juriste** (drafts `legal/`) — le wording prudent doit être validé.

## 13. i18n

- 48 locales. **Limite connue** : les nouvelles clés `legal.*` (Sprint 1) et plusieurs valeurs nettoyées (claims) ne sont **traduites qu'en FR/EN** ; les autres langues retombent sur le français (`fallbackLng:'fr'`), et quelques valeurs nettoyées affichent désormais du français/anglais dans des locales auparavant traduites.
- **Reco P1** : **passe de traduction dédiée** (idéalement relecture native) sur : `legal.*`, `landing.badge/subtitle/cta`, `landing.features`, `pricing.trust.worldwide`, `pricingPage.*`, `cgu.cgu_sections`. C'est le principal point de polissage i18n restant.

## 14. Accessibilité

- `aria-label` présents sur plusieurs contrôles (signature, photos, reset, checkbox).
- **Reco P2** : vérifier l'ordre de focus clavier, le contraste AA sur les textes `opacity-70` sombre-sur-sombre, et les `role`/`aria-live` sur les bandeaux d'erreur et l'état « rejoint ».

## 15. Cohérence multi-véhicules

- Bonne cohérence après Sprint 1 : checklist PDF rendue générique (« Véhicules » / « Signatures » au lieu de « A & B » / « 2 signatures »), wording « signatures requises » au lieu de « les deux parties ».
- **Reco P3** : vérifier que tous les écrans parlent en « participants/véhicules » et jamais en « les deux conducteurs » résiduel.

---

## Améliorations prioritaires (synthèse)

**P1 (avant public)**
1. Relecture juridique des textes (Legal Pack + micro-copies).
2. Passe de traduction i18n (clés `legal.*` + valeurs nettoyées) au-delà de FR/EN.
3. Retour app après Stripe parfaitement fluide.
4. Réassurance « vraie » (horodatage, chiffrement, multilingue) en remplacement des anciens claims.
5. Messages d'erreur réseau actionnables, sans fuite technique.

**P2 (souhaitable)**
- Lisibilité des petites notices (≥12px), zones tactiles ≥44px, indicateurs d'attente QR par rôle, « reprendre plus tard » explicite, haptique signature.

**P3 (nice-to-have)**
- Tokens couleurs, harmonisation lexicale « participants », focus/contraste AA fin.

---
*Revue indicative. Aucune correction imposée dans ce sprint hormis ce qui a déjà été fait ; ces points alimentent le backlog premium.*
