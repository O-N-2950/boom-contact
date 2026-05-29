# i18n Readiness Audit — boom.contact

_Dernière mise à jour : 2026-05-29 (sprint i18n Switzerland Completion)._

## 1. Principe d'exposition

La **vérité d'exposition** est `getLangOrder()` dans `client/src/i18n/geo-lang.ts`, qui ne
retourne que **4 langues** : `fr, de, it, en`. Le `LanguageSwitcher` n'affiche donc que ces
4 drapeaux. Les 46 autres fichiers de locales existent dans le repo mais **ne sont pas
atteignables** par l'utilisateur tant qu'ils ne sont pas ajoutés à `getLangOrder()`.

**Règle d'or : on n'expose jamais une langue qui n'est pas à 100 % du périmètre grand public.**

## 2. Périmètre "core" (grand public)

Le périmètre de complétude exigé = toutes les clés de `fr.json` **sauf le namespace `police`**.

Le namespace `police` (132 clés) appartient au produit **B2G `police.boom.contact`**, qui est
FR-first par décision produit et sera traduit au rythme du déploiement par pays (CH/FR/BE/LU).
Il est donc **hors périmètre** de l'application grand public et des stores.

Périmètre core actuel : **559 clés** (feuilles, tableaux développés) sur 9+ namespaces
user-facing : `landing, location, ocr, ocrScanner, constatForm, signature, postConstat,
pricingPage, pricing, auth, voice, app, legal, cgu, common, steps, language, offline, flow`.

## 3. Complétude des langues EXPOSÉES (bloquant)

| Langue | Avant sprint | Après sprint | Statut |
| --- | --- | --- | --- |
| FR | 100 % | 100 % (559/559) | ✅ référence |
| EN | 100 % | 100 % (559/559) | ✅ complète |
| DE | 34 % (213) | **100 % (559/559)** | ✅ complétée ce sprint |
| IT | 34 % (213) | **100 % (559/559)** | ✅ complétée ce sprint |

**Méthode de complétion DE/IT** : traduction automatique via API Anthropic
(`claude-sonnet-4-6`), avec :
- préservation stricte des placeholders `{{…}}`, balises HTML et emojis (validée par script) ;
- terminologie verrouillée (Unfallbericht / grüne Karte / Versicherer / Fahrzeugausweis ;
  constatazione amichevole / carta verde / assicuratore / libretto di circolazione) ;
- formulations prudentes uniquement, **aucun claim interdit** (vérifié par `check:claims`) ;
- vouvoiement (Sie / Lei).

⚠️ **Statut qualité** : traduction automatique vérifiée par garde-fous automatiques
(placeholders + claims). Une **relecture humaine** par un germanophone / italophone est
**recommandée avant publication App Store / Google Play**, mais non bloquante pour TestFlight
/ Internal Testing (les 4 langues sont désormais réellement utilisables de bout en bout).

## 4. ES / PT Readiness

- `es.json` et `pt.json` **existent** (~50 % du core après dédup, comme les autres locales
  non exposées). **Non exposés** (absents de `getLangOrder()`).
- **Effort pour exposition propre** : compléter ~280 clés core × 2 langues (même périmètre que
  DE/IT ce sprint), ~même process automatisé + relecture. Estimation : ~1 itération de sprint.
- **Risques claims ES/PT** : couverts en amont par `check:claims` (14 patterns ES/PT ajoutés
  couvrant validité mondiale, validité légale, acceptation universelle, substitution police,
  force probante absolue, comptage de pays, primauté mondiale, reconnaissance officielle).
  La liste exacte vit dans `scripts/check-claims.ts`. « certificado de seguro » reste autorisé
  (nom de document, non-claim).
- **Date logique d'activation** : après DE/IT (fait) + relecture, lors d'un sprint
  « International Expansion ES/PT ».
- **Score ES/PT Readiness : 50/100** (fichiers présents, infra prête, claims gardés ;
  complétude + exposition à faire).

## 5. 46 autres locales

Présentes à ~50 % du core, **non exposées**, conservées pour réutilisation future (chaque
langue a déjà landing + location + ocr + cgu). Aucune n'est atteignable par l'utilisateur.
Elles ne bloquent jamais le build (le garde-fou ne contrôle que les langues exposées).

## 6. Garde-fous automatiques

- `npm run check:i18n` — échoue si une langue **exposée** est < 100 % du core. Les locales non
  exposées sont auditées en informatif. Intégré à `quality:prestore`.
- `npm run check:claims` — bloque tout claim interdit (FR/EN/DE/IT/ES/PT) dans toutes les
  surfaces vivantes, y compris les locales.
- Test `server/src/__tests__/i18nCompleteness.test.ts` — assertion de complétude des 4 langues
  exposées.

## 7. Recommandation permanente

Avant d'exposer une nouvelle langue : la compléter à 100 % du core, l'ajouter à
`getLangOrder()` **et** à la liste `EXPOSED` de `scripts/check-i18n.ts`. Ne jamais exposer une
langue partielle — le repli (`fallbackLng: 'fr'`) masquerait des trous par du français et
dégraderait l'expérience.
