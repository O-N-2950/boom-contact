# Textes screenshots stores — FR & EN

> Textes prêts à incruster (déjà rendus dans `/visual-qa?screenshot=<key>` pour les captures FR).
> Pour EN : régénérer les captures avec navigateur en `en-US` OU réécrire le titre en post-traitement.

## Mapping écran → titre marketing (2 lignes max)

| Screen key | FR (rendu dans le PNG) | EN |
|---|---|---|
| `intro`     | Documentez un accident<br>en quelques minutes | Document an accident<br>in minutes |
| `qr`        | Invitez les participants<br>par QR | Invite participants<br>by QR code |
| `voice`     | Ajoutez photos, voix<br>et informations utiles | Add photos, voice<br>and key details |
| `photo`     | Ajoutez photos, voix<br>et informations utiles | Add photos, voice<br>and key details |
| `signature` | Signez votre déclaration<br>en toute clarté | Sign your statement<br>clearly |
| `pdf`       | Générez un dossier PDF<br>horodaté | Generate a timestamped<br>PDF report |
| `done`      | À transmettre<br>à votre assureur | Ready to send<br>to your insurer |
| `emergency` | Conçu pour les situations<br>stressantes | Designed for<br>stressful situations |

## Sous-textes optionnels (caption sous le titre, ≤ 70 caractères)

| Screen | FR | EN |
|---|---|---|
| intro     | Étape par étape, en toute clarté. | Step by step, in plain language. |
| qr        | Jusqu'à 5 véhicules. Chacun son QR. | Up to 5 vehicles. One QR each. |
| voice     | À l'oral ou en texte — comme vous préférez. | Voice or text — whichever works for you. |
| photo     | Vue, dégâts, plaque, lieu, documents. | Scene, damage, plate, location, documents. |
| signature | Canvas blanc, encre nette, signé localement. | White canvas, clean ink, signed locally. |
| pdf       | Packs 1 / 3 / 10 — paiement sécurisé. | Packs 1 / 3 / 10 — secure payment. |
| done      | Téléchargement direct ou email. | Direct download or email. |
| emergency | 112 · 144 · 117 toujours accessibles. | 112 · 144 · 117 always within reach. |

## Wording **AUTORISÉ** (validé prudent)
- Documenter / Document
- Inviter / Invite
- Ajouter / Add
- Signer / Sign
- Générer / Generate
- Transmettre à votre assureur / Send to your insurer
- Dossier PDF horodaté / Timestamped PDF report
- Multi-participants / Multi-participant
- Conçu pour / Designed for
- Étape par étape / Step by step

## Wording **INTERDIT** (jamais dans les screenshots)

### FR
- ❌ certifié
- ❌ 150 pays
- ❌ légalement valable
- ❌ accepté par toutes les assurances
- ❌ remplace la police
- ❌ remplace le constat officiel
- ❌ preuve incontestable
- ❌ valable mondialement
- ❌ officiellement reconnu

### EN
- ❌ certified
- ❌ 150 countries
- ❌ legally valid
- ❌ legally binding
- ❌ officially recognized
- ❌ accepted by all insurers
- ❌ valid worldwide
- ❌ replaces police / police report
- ❌ replaces the official statement
- ❌ irrefutable proof / indisputable evidence

## Disclaimers prudents (à intégrer si screenshot ou page propose des claims)
- **FR** : « boom.contact ne remplace pas les services de secours, la police, votre assureur, ni un avocat. »
- **EN** : « boom.contact does not replace emergency services, the police, your insurer, or legal counsel. »

## Procédure de régénération EN (optionnel V1)
```bash
# Modifier scripts/capture-store-screenshots.ts ligne `locale` -> 'en-US'
# Puis dans VisualQA.tsx : injecter les titres EN du tableau ci-dessus
# OU : ajouter un paramètre ?lang=en pour basculer
npm run capture:screenshots
```
> V1 : on uploade les captures FR sur les stores FR/CH/BE/LU et on prépare les EN pour V1.1.
