# Store Reviewer Account & Test Data (final)

⚠️ AUCUN mot de passe réel dans Git. Renseigner les valeurs réelles directement dans App Store Connect / Play Console (champ "notes pour le reviewer"), pas ici. Voir aussi `reviewer-account-setup.md` et `testflight-reviewer-instructions.md`.

## Compte reviewer
- Email de test : `reviewer@boom.contact` (ou alias dédié) — `<À_CRÉER>`
- Connexion : **magic link** (sans mot de passe). Comme un reviewer ne peut pas recevoir le magic link, prévoir **l'une** des options :
  - (A) un **code de connexion reviewer** à usage de test communiqué dans les notes (mécanisme à confirmer côté auth), ou
  - (B) un compte pré-connecté via build de test, ou
  - (C) fournir un accès à la boîte `reviewer@boom.contact` (identifiants dans les notes ASC/Play, pas dans Git).
- ⚠️ **Action requise** : confirmer le mode d'accès reviewer (le magic link seul peut bloquer le reviewer — P0).

## Données de test à préprovisionner
- Crédits perso : quelques crédits de test sur le compte reviewer.
- Organisation de test : "Flotte Démo" avec le reviewer en `owner`.
- Véhicule personnel de test (garage perso).
- Véhicule entreprise de test (garage org).
- Invitation de test en attente (pour montrer le flux invitation/révocation/renvoi).
- Paiement : utiliser **Stripe en mode test** (carte `4242 4242 4242 4242`) si la build de test pointe une clé test ; sinon documenter que l'achat est réel et fournir un crédit gratuit au reviewer.

## Ce que le reviewer doit tester (parcours)
1. Onboarding + langue (FR/EN/DE/IT).
2. Création d'un constat : scan OCR (caméra), photos, **fallback saisie manuelle** si permission refusée.
3. Description vocale (micro) + **fallback texte**.
4. Localisation accident + **fallback adresse manuelle**.
5. Sélection véhicule (garage perso et entreprise).
6. Signature + génération PDF + envoi email.
7. QR participant (2e partie rejoint la session).
8. B2B : voir membres, inviter, renvoyer/révoquer, solde crédits entreprise, historique.

## Notes permissions (à coller dans ASC/Play)
- Caméra/micro/photos/localisation sont **optionnelles** : chaque refus laisse un chemin manuel. boom.contact ne remplace ni la police, ni les secours, ni l'assureur.
