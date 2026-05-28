# Handoff juriste — boom.contact

> Document de remise au conseil juridique. À lire en 15 minutes.
> Owner : Olivier Neukomm (PEP's Swiss SA — Groupe NEUKOMM, CHE-476.484.632, Courgenay JU).
> Date de préparation : 28 mai 2026, post-Sprint 9.

---

## 1. Résumé

**boom.contact** est une PWA + apps Capacitor iOS/Android qui aide à documenter un accident de la route depuis un téléphone. Production : https://www.boom.contact. Hébergement Railway EU-West (Frankfurt, Allemagne).

Édité par **PEP's Swiss SA — Groupe NEUKOMM**, Bellevue 7, 2950 Courgenay, Jura, Suisse.

Modèle : freemium — création de session gratuite, génération de PDF facturée au pack (1 / 3 / 10 constats).

---

## 2. Ce que l'app fait

1. L'utilisateur démarre une session de constat amiable.
2. Il invite les autres conducteurs via un **QR** (jusqu'à 5 véhicules).
3. Chacun complète : photos, voix (transcrite), saisie texte, croquis, données véhicule + assurance.
4. Chacun signe digitalement (canvas tactile).
5. boom.contact génère un **dossier PDF horodaté** + ancrage **OpenTimestamps** (preuve cryptographique d'existence à un instant T).
6. Le PDF est téléchargeable et envoyable par email à l'assureur.

L'utilisateur peut aussi solliciter des numéros d'urgence (112 / 144 / 117) depuis l'app — un disclaimer rappelle que **boom.contact ne remplace pas les services de secours**.

---

## 3. Ce que l'app **ne fait pas** (limites explicites)

- ❌ Ne remplace **pas** la police, les services de secours, l'assureur ni un avocat.
- ❌ Ne **garantit pas** l'acceptation du PDF par l'assureur (à sa discrétion, selon contrat + juridiction).
- ❌ Ne **certifie** rien juridiquement.
- ❌ Ne **notifie pas automatiquement** la police (action utilisateur explicite uniquement).
- ❌ Ne valide pas la véracité des informations entrées par l'utilisateur.
- ❌ N'est pas un service de stockage long terme — données supprimables sur demande.

---

## 4. Pays ciblés au lancement (V1)

🇨🇭 Suisse · 🇫🇷 France · 🇧🇪 Belgique · 🇱🇺 Luxembourg.

V1.1 : reste UE (langues FR/EN couvertes).
V2 : DE/IT/ES/PT localisés.
**Hors V1** : USA (système d'assurance auto fondamentalement différent — wording à adapter).

---

## 5. Données collectées

| Catégorie | Données | Quand | Stockage |
|---|---|---|---|
| Compte (optionnel) | email, prénom, nom, téléphone, pays, langue | Création de compte / paiement | PostgreSQL Railway EU-West, chiffré au repos |
| Constat | identité conducteurs, plaques, marques véhicules, assurances, lieu, date, description, dégâts | Saisie utilisateur | Idem |
| Photos | jusqu'à 6 photos par véhicule (vue, dégâts, plaque, lieu, document, libre) | Capture / galerie | Stockage chiffré (S3-compatible) |
| Audio | jusqu'à 3 minutes voix → transcrites via Whisper, puis **audio supprimé** | Capture utilisateur | Transcription stockée, **fichier audio purgé sous 24 h** *(à confirmer juridiquement)* |
| Localisation | latitude / longitude **optionnelles** sur clic utilisateur | Sur appui explicite « Localiser » | Stockée dans la session |
| Signatures | trait vectoriel (canvas) | Capture utilisateur | Embarqué dans le PDF + ancrage OpenTimestamps |
| Technique | IP, user-agent, événements PostHog (consent opt-in) | À chaque requête | Logs Railway + Sentry |
| Paiement | jamais stocké côté boom.contact | Stripe traite tout | Stripe (PCI-DSS) |

---

## 6. Sous-traitants (Annexe RGPD art. 28)

| Sous-traitant | Rôle | Localisation données | DPA |
|---|---|---|---|
| **Railway** (USA, GDPR DPA) | Hébergement applicatif + PostgreSQL | EU-West (Frankfurt, DE) | Signé |
| **Stripe** | Paiement | UE / USA selon entité | Signé |
| **Resend** | Email transactionnel (envoi PDF, confirmations) | UE (eu-west-1) | Signé |
| **Anthropic** (Claude Vision) | OCR permis & carte grise | USA (Claude API) | DPA standard |
| **OpenAI** (Whisper) | Transcription voix | USA | DPA standard |
| **OpenTimestamps** | Horodatage cryptographique blockchain | Pair-to-pair (Bitcoin) | N/A (service décentralisé) |
| **PostHog** | Product analytics (opt-in) | EU-cloud (eu.i.posthog.com) | Signé |
| **Sentry** | Crash reporting | EU-cloud | Signé |
| **OpenStreetMap (Nominatim)** | Géocodage adresses | UE | N/A (service public) |

---

## 7. IA / OCR / Transcription

- **OCR (Claude Vision Anthropic)** : photos de permis et carte grise envoyées via API HTTPS, traitées en temps réel, **pas de stockage permanent côté Anthropic** (selon conditions Anthropic Privacy Policy au 2026-05). Données structurées extraites stockées dans la session.
- **Transcription voix (OpenAI Whisper)** : fichier audio envoyé via API, transcription retournée, **audio purgé côté serveur boom.contact sous 24 h** *(à confirmer juridiquement : durée acceptable ? RGPD art. 5 minimisation ?)*.
- **Pas de profilage automatisé** (RGPD art. 22) : l'IA extrait des données factuelles, ne prend pas de décision juridique sur l'accident.

---

## 8. Paiement / Stripe

- Stripe **live**, mode classique (pas de Connect).
- Packs unitaires : 1 constat 4.90 / 3 constats 12.90 / 10 constats 34.90 (CHF / EUR).
- Aucune donnée carte transitée par boom.contact (intégration **Stripe Checkout** hosted).
- Crédits sans expiration (à confirmer juridiquement : durée légale max en Suisse ?).
- **Apple / Google** : paiement via Stripe est **autorisé par les guidelines stores** pour les biens/services hors-app (le PDF est un livrable hors-app).

---

## 9. Signatures + OpenTimestamps

- Signature **digitale (capture canvas)**, intégrée au PDF.
- **OpenTimestamps** : hash SHA-256 du PDF ancré sur Bitcoin = preuve cryptographique d'existence à T.
- ⚠️ **Pas une signature électronique qualifiée** au sens eIDAS / ZertES. C'est une **signature simple** + **horodatage cryptographique vérifiable**.
- Le wording de l'app et des CGU le précise déjà — à valider.

---

## 10. Photos / audio / localisation

- **Photos** : opt-in (permission caméra + galerie demandée à l'usage).
- **Audio** : opt-in (permission micro). Purgé après transcription.
- **Localisation** : **opt-in explicite** (clic « Localiser »), précision coarse. Peut être saisie manuellement à la place.
- Mentions affichées dans les écrans concernés (Sprint 8 wording validé interne).

---

## 11. Suppression / conservation

- **Suppression sur demande** : email à `contact@boom.contact` → délai 30 jours.
- **Conservation par défaut** :
  - Sessions actives : tant que payant en attente / signature en attente.
  - PDF généré : 90 jours après création (à confirmer juridiquement).
  - Compte utilisateur : tant qu'actif + 12 mois inactivité, puis purge.
- **Logs techniques** : 90 jours (Sentry + PostHog).
- **Documents légaux ou fiscaux** : conservation 10 ans (obligation suisse).

---

## 12. Urgence / police / assurance

- Bouton **🆘 Urgence** permanent → numéros 112 / 144 / 117 (selon pays).
- Disclaimer affiché : « boom.contact ne remplace pas les services de secours. »
- Module police (`police.boom.contact`) en développement : **les agents ne sont jamais notifiés automatiquement**, seulement sur action explicite utilisateur (RGPD + souveraineté).
- Aucune transmission automatique à l'assureur : c'est l'utilisateur qui envoie le PDF.

---

## 13. Claims interdits déjà supprimés (Sprint 8 + 9)

Suite à audit Sprint 8 + 9, **les expressions suivantes ont été supprimées de TOUTES les surfaces vivantes** (HTML servi, JSON-LD, locales i18n, copy emails, copy PDF, pitch deck, screenshots stores) :

`certifié` · `150+ pays` / `150 countries` · `valable mondialement` / `valid worldwide` · `légalement valable` / `legally valid` · `valeur légale` / `valeur probante` · `preuve incontestable` / `preuve officielle` · `accepté par toutes les assurances` · `première application mondiale` · `world's first` · `monde entier` · `conforme CEA` · `valeur légale officielle` · `legally binding` · `officially recognized` · `99 langues`

Un **`aggregateRating`** factice (4.8/127 avis fabriqués) a aussi été retiré du JSON-LD `SoftwareApplication`.

Un **script permanent** (`npm run check:claims`) bloque toute régression — exit code 1 si un claim revient.

---

## 14. Wording actuellement validé en interne (à valider juriste)

| Concept | Wording autorisé |
|---|---|
| Le PDF | « dossier PDF horodaté » / « timestamped PDF report » |
| L'usage attendu | « à transmettre à votre assureur » / « to send to your insurer » |
| L'action | « documenter un accident » / « document an accident » |
| Composants captés | « photos, voix, signature, QR » |
| Disclaimers | « ne remplace pas les secours, la police, votre assureur ni un avocat » |
| Acceptation | « à la discrétion de l'assureur selon le contrat et la juridiction » |

---

## 15. Onze (11) questions à trancher par le conseil juridique

> Format demandé : pour chaque question, indiquer **wording recommandé** + **justification** (loi / arrêt / pratique).

1. **Peut-on utiliser le terme « constat amiable numérique » ?** Sans risque de confusion avec le constat amiable européen papier (Convention CEA) ? Quelle forme préférable en FR / EN / DE / IT ?

2. **Comment décrire la valeur probatoire** du PDF ? Quelle formulation est défendable sans induire en erreur (le PDF n'est pas un acte authentique ni un titre exécutoire) ?

3. **Comment décrire OpenTimestamps / horodatage** ? Peut-on parler de « preuve cryptographique d'existence » ? D'« horodatage qualifié » ? Quelles précautions ?

4. **Quelle durée de conservation** recommander pour : (a) sessions actives, (b) PDF généré, (c) compte utilisateur inactif, (d) audio post-transcription, (e) logs ? Y a-t-il un cadre minimum / maximum par juridiction (CH / FR / BE / LU) ?

5. **Quelle limitation de responsabilité** insérer dans les CGU ? Quel plafond ? Quelles exclusions licites en Suisse vs France vs Belgique vs Luxembourg ?

6. **Quel wording assurance** est sûr ? Peut-on parler du PDF comme « pièce » pour la déclaration d'assurance ? « Dossier à transmettre » ? « Documentation préparatoire » ?

7. **Quelles mentions Suisse / UE** sont obligatoires sur la landing / les CGU / la privacy ? (notamment hébergement en Allemagne pour un éditeur suisse traitant des données UE).

8. **Paiement externe (Stripe) versus IAP** App Store / Google Play : la formulation actuelle (« paiement Stripe pour un livrable hors-app : génération d'un PDF ») est-elle acceptable au regard des guidelines Apple 3.1.5 (a) et Google Play Payments Policy ?

9. **Quelles obligations spécifiques** pour la captation **audio**, **photos** (potentiellement de tiers : autres véhicules, plaques) et **localisation** ? RGPD art. 6 (base légale) + art. 13 (information) ? Mentions de consent à afficher ?

10. **Suppression de compte** : quelles données doit-on conserver **obligatoirement** (et combien de temps) même après une demande de suppression ? (facturation = 10 ans en Suisse, etc.)

11. **Faut-il adapter les CGU par pays ciblé** (FR / BE / LU) ou un texte unifié suisse-droit-applicable est-il suffisant ? Si adaptation requise, quelles clauses minimum modifier ?

---

## 16. Annexes (à fournir au juriste sur demande)

- Drafts CGU & Privacy actuels : `legal/TERMS.md`, `legal/PRIVACY.md`
- Audit claims complet : `legal/LEGAL_CLAIMS_REVIEW.md`
- Disclaimer urgence : `legal/EMERGENCY_DISCLAIMER.md`
- Apple App Privacy questionnaire prévu : `legal/APP_STORE_PRIVACY.md`
- Google Data Safety questionnaire prévu : `legal/GOOGLE_DATA_SAFETY.md`
- Questions Soluris (audit externe) : `legal/SOLURIS_QUESTIONS.md`
- Précédent handoff (compatible) : `docs/legal-handoff-for-lawyer.md`

---

## 17. Demande au juriste

Validation prioritaire (V1) :
1. Les 11 questions ci-dessus.
2. Validation que le wording produit ne contient aucun risque résiduel (cf. script `npm run check:claims` → exit 0 actuel).
3. Approbation finale des CGU + Privacy en vue de l'envoi App Store / Google Play.

Délai souhaité : 4 semaines à compter de la remise.

Contact : Olivier Neukomm — `contact@boom.contact` — PEP's Swiss SA.
