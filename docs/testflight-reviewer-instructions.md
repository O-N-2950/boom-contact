# Instructions testeurs — TestFlight (iOS) — boom.contact

## Ce qu'est boom.contact
Une application pour réaliser un **constat d'accident automobile numérique** : scan des documents (OCR), description (texte ou voix), photos des dégâts, croquis, signatures des conducteurs, et génération d'un **dossier PDF horodaté** à transmettre soi-même à son assureur.

> ⚠️ **Beta de test.** Ne pas utiliser pour un **vrai accident** pendant la phase beta. En cas d'accident réel, suivez la procédure habituelle (secours, police si nécessaire, votre assureur). boom.contact **ne remplace pas** les secours, la police ni votre assurance, et ne transmet rien automatiquement aux autorités ou assureurs.

## Mode test
- **Carte Stripe de test** : `4242 4242 4242 4242`, date future quelconque, CVC quelconque, code postal quelconque.
- **Email de test** : utilisez une adresse à vous (vous recevrez le PDF).
- **Session de test** : créez un constat fictif (plaques/infos bidon).

## Parcours à tester
1. Lancer l'app → écran d'intro/sécurité.
2. Démarrer un constat (mode invité ou compte).
3. Scanner/charger un document (OCR) — autoriser la **caméra**.
4. Renseigner le lieu — autoriser la **localisation** (ou saisir l'adresse).
5. Ajouter une description **vocale** — autoriser le **micro** (ou utiliser la saisie texte).
6. Ajouter des **photos** de dégâts.
7. Utiliser un **deuxième téléphone** : scanner le **QR** pour rejoindre en tant que conducteur B.
8. Chaque conducteur **signe**.
9. **Payer** avec la carte test.
10. Vérifier le **retour dans l'app** et le **PDF**.
11. Vérifier la réception de l'**email**.

## Que faire si Stripe revient dans le navigateur
Si après le paiement vous restez dans Safari au lieu de revenir dans l'app :
- notez-le comme bug (capture d'écran de l'URL),
- revenez manuellement à l'app,
- précisez : iPhone ouvert à froid ou app déjà ouverte ?

## Comment signaler un bug
- Capture d'écran + heure + device + version iOS.
- Étapes pour reproduire.
- Via le bouton de feedback TestFlight (secouer l'appareil) ou par email à **contact@boom.contact**.
- Joindre si possible : l'écran, l'URL au moment du bug, le rôle (A/B/C/D/E).

## Captures/logs utiles
- Écran de permission (accepté/refusé).
- Écran de retour paiement.
- PDF généré.
- Email reçu.
