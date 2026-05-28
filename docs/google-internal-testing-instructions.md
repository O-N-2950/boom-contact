# Instructions testeurs — Google Play Internal Testing (Android) — boom.contact

## Ce qu'est boom.contact
Application de **constat d'accident automobile numérique** : scan documents (OCR), description (texte ou voix), photos des dégâts, croquis, signatures, et **dossier PDF horodaté** à transmettre soi-même à son assureur.

> ⚠️ **Beta de test.** Ne pas utiliser pour un **vrai accident** pendant la beta. boom.contact **ne remplace pas** les secours, la police ni votre assurance et ne transmet rien automatiquement aux autorités ou assureurs.

## Rejoindre le test
- Accepter l'invitation Internal Testing (lien Play envoyé à votre email).
- Installer via le Play Store (canal test).

## Mode test
- **Carte Stripe de test** : `4242 4242 4242 4242`, date future, CVC quelconque.
- **Email de test** : une adresse à vous.
- **Données** : constat fictif.

## Parcours à tester
1. Lancer l'app → écran intro/sécurité.
2. Démarrer un constat (invité ou compte).
3. OCR document — autoriser **caméra**.
4. Lieu — autoriser **localisation** (ou saisie manuelle).
5. Description **vocale** — autoriser **micro** (ou texte).
6. **Photos** de dégâts.
7. **Deuxième téléphone** : scanner le **QR** pour rejoindre (conducteur B, et C/D/E si 5 véhicules).
8. Chaque conducteur **signe**.
9. **Payer** (carte test).
10. Vérifier **retour dans l'app** + **PDF** + **email**.
11. **App Link** : ouvrir un lien `https://www.boom.contact/...` → doit ouvrir l'app.

## Que faire si Stripe revient dans le navigateur
- Notez-le (capture + URL), revenez manuellement à l'app, précisez si l'app était fermée ou en arrière-plan.

## Comment signaler un bug
- Capture + heure + modèle Android + version OS + versionCode.
- Étapes de repro.
- Par email à **contact@boom.contact** (ou feedback Play).
- Joindre : écran, URL au moment du bug, rôle (A/B/C/D/E).

## Captures/logs utiles
- Permissions (accepté/refusé), retour paiement, PDF, email, comportement App Link.
