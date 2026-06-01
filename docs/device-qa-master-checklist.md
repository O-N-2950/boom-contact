# Device QA Master Checklist (boom.contact)

Consolide `device-qa-protocol.md` + `qa-mobile-e2e-matrix.md`. Classement : **P0** bloque les stores · **P1** bloque le lancement public · **P2** polish · **P3** futur.

## Appareils cibles
- iPhone récent (iOS 17/18), iPhone ancien supporté (iOS 16, écran 4.7").
- Android récent (14/15), Android milieu de gamme (Android 12, 6").

## P0 — Bloque la soumission stores
- [ ] Installation depuis TestFlight / Internal Testing sans crash au lancement.
- [ ] Onboarding s'affiche, pas d'écran blanc, splash → app.
- [ ] Inscription / connexion (magic link) fonctionne sur device.
- [ ] **Refus de permission caméra** → fallback saisie manuelle fonctionne (pas de blocage).
- [ ] **Refus permission micro** → fallback texte fonctionne.
- [ ] **Refus permission localisation** → saisie adresse manuelle fonctionne.
- [ ] Création d'un constat complet de bout en bout (sans crash).
- [ ] Signature → génération PDF → réception email.
- [ ] **Bouton suppression de compte** présent et fonctionnel (exigence Apple/Google).
- [ ] Analytics **gated par consentement** (aucun event avant accord).
- [ ] Universal Links / App Links : `https://www.boom.contact/?invite=…` ouvre l'app.
- [ ] Aucun claim interdit visible (légal/certifié/mondial).

## P1 — Bloque le lancement public
- [ ] FR / EN / DE / IT : interfaces complètes, pas de clés i18n brutes.
- [ ] OCR scan document (carte verte/permis) sur device réel (qualité acceptable).
- [ ] Galerie : import photo dégâts.
- [ ] Sélection véhicule garage perso + entreprise (skip OCR) sur device.
- [ ] B2B : inviter / renvoyer / révoquer / changer rôle / retirer (owner & fleet_admin).
- [ ] Solde + historique crédits entreprise + export CSV.
- [ ] Paiement test (Stripe) → crédit ajouté.
- [ ] QR participant : 2e partie rejoint, sync temps réel.
- [ ] Offline → reconnexion : la session se synchronise sans perte.
- [ ] Retour arrière (navigation) cohérent, état session préservé.

## P2 — Polish
- [ ] Accessibilité VoiceOver (iOS) / TalkBack (Android) sur écrans clés.
- [ ] Lisibilité sur petit écran (4.7" / police agrandie).
- [ ] Performance : transitions fluides, pas de jank sur milieu de gamme.
- [ ] Dark/light selon réglage système (si prévu).

## P3 — Futur
- [ ] Transfert d'ownership (promotion 2e owner) en UI.
- [ ] Enregistrer PDF dans la galerie (nécessiterait NSPhotoLibraryAddUsageDescription).
- [ ] Notifications push.

## Procédure de relevé
Pour chaque ligne : appareil, OS, résultat (OK / KO), capture si KO, sévérité. Reporter les KO P0/P1 dans `store-go-no-go.md` avant toute soumission.
