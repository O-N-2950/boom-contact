# Audit des claims juridiques et marketing — boom.contact

> **DRAFT v1.0 — 20 mai 2026**
> **À VALIDER PAR UN JURISTE SUISSE/EUROPÉEN AVANT PUBLICATION.**
> Document de référence pour la rédaction des contenus (in-app, PDF,
> e-mails, pages stores, communications externes).

---

## 1. Principe directeur

> **boom.contact est un outil de documentation, pas une certification.**

Toute formulation doit :

1. décrire **factuellement** ce que fait le service ;
2. **éviter** toute promesse de validité juridique universelle, de
   reconnaissance par les assurances, ou d'effet probatoire absolu ;
3. rappeler les limites (boom.contact ne détermine pas les
   responsabilités, ne remplace pas les autorités).

## 2. Formulations recommandées (vert)

À privilégier dans tous les supports :

- « dossier numérique structuré »
- « dossier PDF horodaté »
- « dossier d'accident numérique »
- « destiné à faciliter la déclaration de l'accident »
- « à transmettre à votre assureur ou aux autorités compétentes »
- « horodatage cryptographique SHA-256 »
- « OpenTimestamps (ancrage Bitcoin) »
- « signature électronique simple »
- « le service permet de documenter un accident »
- « modèle inspiré du constat européen d'accident »
- « contribue à attester l'intégrité et l'antériorité du fichier »
- « les informations sont fournies par les utilisateurs »
- « multilingue » / « plusieurs langues prises en charge »
- « disponible dans plusieurs pays »

## 3. Formulations à éviter sans validation juridique (rouge)

À **proscrire** dans tout support non explicitement validé par un juriste :

- ❌ « légalement valable »
- ❌ « juridiquement valable dans X pays »
- ❌ « valable mondialement »
- ❌ « reconnu par toutes les assurances »
- ❌ « accepté par toutes les compagnies d'assurance »
- ❌ « certifié »
- ❌ « document certifié »
- ❌ « certification légale »
- ❌ « preuve incontestable »
- ❌ « preuve juridique opposable »
- ❌ « preuve blockchain juridiquement opposable »
- ❌ « remplace le constat amiable officiel »
- ❌ « remplace le constat de police »
- ❌ « valable dans 150 pays / 46 pays »
- ❌ « Convention européenne (CEA) — conforme »
  *(sauf à pouvoir documenter la conformité auprès d'un organisme compétent)*
- ❌ « première application mondiale » / « world's first »
  *(superlatif difficile à prouver)*
- ❌ promesses chiffrées non documentées :
  « -80 % de délai », « -60 % d'erreurs », « 90 % de précision »

## 4. Formulations à utiliser avec prudence (orange)

Acceptables seulement si nuancées :

- « facilite la déclaration » ✓ (plutôt que « valide la déclaration »)
- « PWA fonctionne hors-ligne » ✓ (factuel — vérifié)
- « 50 langues prises en charge » ✓ si effectivement supporté
- « disponible dans plusieurs pays » ✓ (plutôt qu'un chiffre exact)
- « horodatage cryptographique » ✓ (description factuelle du mécanisme)
- « conforme RGPD » → préférer « conçu en application du RGPD » ou
  « traitement des données conforme aux principes du RGPD »
- « conforme nLPD » → préférer « conçu en application de la nLPD »

## 5. Inventaire et statut actuel des claims dans le code

### 5.1 PDF (server/src/services/pdf.service.ts)

| Emplacement | Texte précédent (RISQUÉ) | Texte actuel (PRUDENT) | Statut |
|---|---|---|---|
| Sous-titre unilatéral | « Document valable auprès des assurances — Convention Européenne 46 pays » | « Dossier d'accident numerique horodate — a transmettre a votre assureur » | ✅ Corrigé |
| Footer ligne 1 (normal) | URL Railway technique | « boom.contact - Constat amiable numerique - www.boom.contact » | ✅ Corrigé |
| Footer ligne 1 (unilatéral) | « Document légalement valable - 46 pays » | « Declaration unilaterale de sinistre - Dossier numerique horodate » | ✅ Corrigé |
| Footer ligne 3 (normal) | « Document numérique certifié · Valable mondialement » | « Dossier numerique horodate » | ✅ Corrigé |
| Footer ligne 3 (unilatéral) | « Déclaration unilatérale certifiée · Convention Européenne Assurances » | « Declaration unilaterale · Horodatage cryptographique » | ✅ Corrigé |
| Badge horodatage | « Preuve blockchain Bitcoin » | « OpenTimestamps (ancrage Bitcoin) » | ✅ Corrigé |

### 5.2 E-mails (server/src/services/email.service.ts)

| Élément | Statut |
|---|---|
| Wording « les deux conducteurs ont signé » (faux à 3+ véhicules) | ✅ Reformulé neutre dans 13 langues |
| « certifié / certified / zertifiziert » dans intros 13 langues | ✅ Remplacé par « horodaté » |
| Footer FR « Valable dans 150+ pays » | ✅ Retiré |
| shareText « valable dans 150 pays » | ✅ Retiré |
| Pitch B2B « world's first » | ✅ Retiré |
| Pitch B2B métriques fabriquées (-80%/-60%/90%) | ✅ Remplacées par capacités factuelles |
| Pitch B2B « 150+ countries » | ✅ Remplacé par « multi-country » |
| Pitch B2B « certified PDF with blockchain timestamp » | ✅ « cryptographic blockchain timestamp (OpenTimestamps) » |
| Pitch B2B « Compliant with CEA / GDPR compliant » | ✅ « Built around the European Accident Statement model. Designed with GDPR in mind. » |

### 5.3 Pages publiques (client/src — landing, à auditer)

À auditer manuellement dans l'application web et les pages stores
(non couvert automatiquement par le présent inventaire — à valider lors
d'une revue spécifique avant publication publique).

## 6. Pages App Store / Google Play (texte de description)

### 6.1 À utiliser (prudent)

> boom.contact aide à documenter un accident de la circulation et à
> générer un dossier PDF numérique horodaté, à transmettre à son
> assureur ou aux autorités compétentes.
>
> Fonctionnalités : capture de photos, dictée vocale, lecture de
> documents (OCR), géolocalisation, signature électronique simple,
> croquis, horodatage cryptographique (OpenTimestamps).
>
> boom.contact ne détermine pas les responsabilités, ne remplace pas les
> services d'urgence, la police, un avocat ou un assureur, et ne
> garantit pas l'acceptation du dossier par une compagnie d'assurance.

### 6.2 À éviter dans les pages stores

- « valable mondialement »
- « reconnu par toutes les assurances »
- « remplace le constat amiable »
- « première application mondiale juridiquement certifiée »
- toute promesse de résultat (« obtenez gain de cause », « gagnez du
  temps avec votre assureur garanti », etc.)

## 7. Communications marketing externes

Les supports marketing (LinkedIn, newsletter, articles de presse,
relations publiques) doivent **respecter les mêmes règles**. Toute
communication mentionnant la valeur juridique du dossier ou son
acceptation par les assureurs doit être validée par le juriste.

## 8. Consentement marketing

Conformément à PRIVACY.md :

- l'envoi de communications marketing nécessite un **consentement
  spécifique**, opt-in ;
- ce consentement est **distinct** du consentement nécessaire à
  l'exécution du service ;
- l'utilisateur peut le retirer à tout moment ;
- dans la V1, le consentement marketing est restreint aux utilisateurs
  résidant en Suisse ou au Liechtenstein.

## 9. Processus de revue

- Toute nouvelle communication mentionnant le service à un large public
  passe par une revue interne.
- Toute formulation susceptible d'engager juridiquement boom.contact est
  validée par le juriste avant publication.
- Une revue annuelle de l'ensemble des supports est effectuée.

## 10. Référence croisée

- TERMS.md §4 (« Ce que boom.contact n'est pas »)
- PRIVACY.md (politique de confidentialité)
- EMERGENCY_DISCLAIMER.md (texte d'urgence)
- DPA_SUBPROCESSORS.md (sous-traitants et engagements)
