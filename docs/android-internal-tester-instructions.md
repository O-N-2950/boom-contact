# boom.contact — Instructions Testeurs (Android, Test Interne)

> Version testée : **1.0.0** (versionCode **1**) · Canal : **Tests internes** · Statut : **Actif**
> Lien de test interne Google Play : **https://play.google.com/apps/internaltest/4701728878089201088**

## 1. Accepter l'invitation
1. Ouvre le lien ci-dessus **sur ton téléphone Android** (celui qui servira au test), connecté avec le **compte Google** ajouté à la liste des testeurs.
2. Appuie sur **« Devenir testeur »** (Become a tester).
3. Suis le lien **« Télécharger sur Google Play »** qui apparaît.

## 2. Installer
1. Sur la fiche Play Store, appuie sur **Installer**.
2. Si « Application en test interne » s'affiche, c'est normal.
3. Première installation : la propagation peut prendre quelques minutes après l'acceptation.

## 3. Quoi tester (parcours prioritaires)
- **Installation + premier lancement** (pas d'écran blanc, pas de crash).
- **Langue** : vérifier FR (et EN/DE/IT si tu changes la langue système).
- **Compte** : connexion (magic link par email).
- **Garage** : ajouter un véhicule personnel.
- **Véhicule entreprise** (si tu es dans une organisation de test) : le sélectionner dans un constat.
- **Constat** : créer un constat de bout en bout.
  - **Caméra** : scanner un document → si refus permission, vérifier que la **saisie manuelle** fonctionne.
  - **Photos/galerie** : ajouter une photo de dégât.
  - **Micro** : description vocale → si refus, vérifier le **fallback texte**.
  - **Localisation** : lieu de l'accident → si refus, **adresse manuelle**.
  - **QR participant** : faire rejoindre une 2e partie (2e téléphone si possible).
  - **Signature** → **génération PDF** → **réception email**.
- **Paiement** : achat de crédits (test).
- **Suppression de compte** : vérifier que l'option existe et fonctionne.
- **Offline** : couper le réseau pendant un constat, le rétablir → la session se synchronise.

## 4. Quoi remonter (pour CHAQUE bug)
Utilise le modèle `android-internal-feedback-template.md`. Indique au minimum :
- **Modèle de téléphone** + **version Android** (Paramètres → À propos du téléphone).
- Ce qui a marché / pas marché (cases du template).
- **Étapes exactes** pour reproduire.
- **Capture d'écran** (ou courte vidéo) du problème.
- **Gravité proposée** (P0/P1/P2/P3 — voir `android-internal-qa-report.md`).

## 5. Logs (optionnel, si tu es à l'aise)
Si crash reproductible et que tu peux brancher le téléphone à un PC :
`adb logcat | grep -i "boom\|AndroidRuntime\|chromium"` au moment du bug, et colle l'extrait.
Sinon, une capture d'écran de l'erreur suffit.

## 6. Où envoyer
Renvoie le feedback rempli (un par appareil) au point de collecte convenu (email/Slack interne). Chaque retour est ensuite trié dans `android-internal-qa-report.md`.
