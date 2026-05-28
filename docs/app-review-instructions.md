# Instructions reviewers — Apple App Review & Google Play Review

> À copier dans le champ **App Review Information / Reviewer Notes** des deux consoles.
> Tout est exécutable sans devoir provoquer un vrai accident.

---

## Présentation de l'app

**boom.contact** est une application qui aide à documenter un accident de la route (constat amiable) depuis un mobile :
- Création d'une session
- Invitation des autres participants par QR (jusqu'à 5 véhicules)
- Capture de photos, voix, croquis, données véhicule et assurance
- Signature digitale par chaque participant
- Génération d'un dossier PDF horodaté
- Téléchargement ou envoi par email

L'app fonctionne hors-ligne et synchronise au retour du réseau. Hébergement Europe (Frankfurt).

**Limites importantes** :
- boom.contact ne remplace **pas** les services de secours, la police, l'assureur ni un avocat.
- L'acceptation du PDF par l'assureur reste à sa discrétion selon le contrat et la juridiction.

---

## Comment tester sans provoquer d'accident réel

Le reviewer **n'a pas besoin** d'avoir eu un accident. Le flow se teste avec des données fictives.

### A. Test rapide (sans paiement) — 3 minutes
1. Ouvrir l'app.
2. Sur l'écran intro, taper **« Commencer le constat »**.
3. Remplir les champs avec les **données fictives** (cf. section ci-dessous).
4. Sur l'écran QR, prendre une capture du QR (ne pas le scanner — pour un test solo, suffit).
5. Avancer jusqu'à la signature : signer dans le canvas (n'importe quel trait au doigt).
6. Arrêter avant le paiement ou continuer en mode test (cf. B).

### B. Test complet avec paiement — 5 minutes (Stripe test mode)
> ⚠️ Le compte de production utilise Stripe **live**. Pour tester sans facturer, utiliser le compte de test fourni ci-dessous.

1. Suivre A jusqu'à l'écran PDF · paiement.
2. Cliquer sur **« Payer et générer le PDF »**.
3. Sur Stripe Checkout, utiliser la carte de test :
   - Numéro : `4242 4242 4242 4242`
   - Date expiration : n'importe quelle date future (ex. `12/30`)
   - CVC : `123`
   - ZIP : `2950` (ou n'importe lequel)
4. Le paiement test ne génère **pas** de débit réel.
5. Le PDF est généré et téléchargeable.

### C. Test multi-participants (optionnel)
1. Sur device 1, créer une session, augmenter à 2 véhicules.
2. Scanner le QR du véhicule B avec le device 2 (ou ouvrir le lien `?session=<id>&role=B`).
3. Remplir et signer des deux côtés.
4. Le PDF généré inclut les deux conducteurs.

---

## Données fictives à utiliser

Voir aussi `docs/demo-data-for-screenshots.md`.

- **Conducteur A** : `Camille Martin` · `demo.a@boom.contact` · `+41 79 000 00 01`
- **Conducteur B** : `Luca Rossi` · `participant.b@example.com` · `+41 79 000 00 02`
- **Véhicule A** : berline générique · plaque `VD 000 000` · année 2019
- **Véhicule B** : SUV générique · plaque `VD 000 001` · année 2021
- **Assurance (A et B)** : `Assurance Démo` · `DEMO-A-2026-0001` / `DEMO-B-2026-0002`
- **Permis A/B** : `VD-DEMO-A-1234567` / `VD-DEMO-B-7654321`
- **Lieu** : `Lausanne, Suisse`
- **Email screenshots / receveur PDF** : `demo@boom.contact`
- **Description neutre** : « Deux véhicules circulaient en direction du centre. Un changement de file a entraîné un contact léger au niveau de l'aile arrière droite du véhicule A. Aucun blessé. »

> ⚠️ Aucune marque réelle de voiture, aucune vraie plaque (`VD 000 000` est hors plage émise), aucun vrai assureur, aucun visage identifiable.

---

## Permissions requises et raisons

| Permission | Raison | Quand demandée |
|---|---|---|
| **Camera** | OCR permis & carte grise · capture photos accident | Première utilisation OCR ou PhotoCapture |
| **Microphone** | Reconnaissance vocale pour décrire l'accident sans taper | Premier appui sur micro dans VoiceSketchFlow |
| **Location (optionnel)** | Pré-remplissage du lieu de l'accident (l'utilisateur peut le saisir manuellement) | Sur clic explicite « Localiser » |
| **Photo Library** | Ajout de photos déjà prises (alternative à la capture directe) | Sur clic « Choisir depuis la galerie » |
| **Notifications (optionnel)** | Confirmation envoi PDF par email · pas de marketing | À l'envoi PDF par email |

Toutes les permissions sont **demandées au moment de l'usage** (pas au lancement), conformément aux guidelines.

---

## Compte de test pour reviewers (à provisionner avant submission)

> ⚠️ Le compte décrit ci-dessous **doit être créé** par l'équipe boom.contact côté admin avant submission. Ne PAS partager les identifiants administratifs réels du Groupe NEUKOMM.

- **Email** : `reviewer@boom.contact` (à créer)
- **Mot de passe** : à générer (envoyer via le champ sécurisé d'App Store Connect / Play Console)
- **Compte** : utilisateur standard avec **10 crédits offerts** pour permettre les tests sans Stripe.
- **Cookie consent** : à accepter en début de session.

Alternative sans compte : la **plupart du flow se teste sans authentification** (création de session anonyme). L'authentification n'est requise que pour acheter des crédits supplémentaires.

---

## URLs et contacts

| Élément | Valeur |
|---|---|
| Marketing URL | https://www.boom.contact/ |
| Support URL | https://www.boom.contact/ |
| Email support | `contact@boom.contact` |
| Privacy Policy | https://www.boom.contact/privacy |
| Terms of Service | https://www.boom.contact/cgu |
| Status / hébergement | Railway EU-West (Frankfurt) |

---

## Pays ciblés au lancement

🇨🇭 Suisse · 🇫🇷 France · 🇧🇪 Belgique · 🇱🇺 Luxembourg.

Langue principale : **français**. EN supporté pour les autres marchés européens (V1.1).

---

## Notes spécifiques par store

### Apple App Review
- Stripe paywall : conforme aux *App Store Review Guidelines 3.1.5 (a)* — paiement d'un **service réel hors-app** (génération d'un dossier PDF associé à une situation hors-app). Le paiement Stripe est légitime.
- iCloud / Sign in with Apple : non utilisés en V1.
- Crashlytics : Sentry intégré (consent utilisateur respecté).
- Background modes : aucun.
- Universal Links : `applinks:www.boom.contact` + `applinks:boom.contact` (Associated Domains).

### Google Play Review
- Pas de pub.
- Pas de SDK publicitaire.
- Pas de tracking commercial tiers.
- Stripe paiement : service hors-app (génération PDF).
- Permissions justifiées au-dessus.
- App Links Android : `assetlinks.json` avec SHA-256 du certificat de signature (à finaliser avant upload).

---

## Si quelque chose ne fonctionne pas

- Vérifier que la connexion réseau est active (l'app marche aussi hors-ligne mais le paiement Stripe nécessite Internet).
- Effacer le cache si comportement étrange.
- Contact direct : `contact@boom.contact` (réponse sous 24h ouvrées).
