# Questions à poser à Soluris — Validation Legal Pack boom.contact

> **Pour Claude Cowork** : interroger Soluris (notre outil de recherche
> juridique) avec chacune des questions ci-dessous. Pour chaque question,
> remonter **les textes applicables** (article, alinéa, version en
> vigueur), **la jurisprudence** récente pertinente (Suisse, UE, FR, BE,
> LU si possible), et **les sources officielles**. Pas d'opinion ni de
> rédaction finale — juste de la recherche.
>
> **Contexte** : boom.contact est une application web/mobile (PWA +
> Capacitor iOS/Android) éditée par **PEP's Swiss SA / Groupe NEUKOMM**
> (IDE CHE-476.484.632, siège à Courgenay, Jura, Suisse), qui permet à
> deux ou plusieurs personnes impliquées dans un accident de la
> circulation de générer un **dossier PDF numérique horodaté**
> (OpenTimestamps / SHA-256 ancré Bitcoin) destiné à être transmis à leur
> assureur. Pas de constat officiel, pas de remplacement de la police.
> Stack : hébergement Railway EU-West (Francfort, Allemagne), sous-traitants
> IA (Anthropic, OpenAI), paiement (Stripe Payments Europe Ltd. Irlande),
> e-mail (Resend), analytics (PostHog), monitoring (Sentry).

---

## BLOC 1 — Conditions générales d'utilisation (`TERMS.md`)

### Q1.1 — Droit suisse + clauses de juridiction internationales
> Pour une SA suisse vendant un service numérique en B2C dans plusieurs
> pays européens (Suisse, France, Belgique, Luxembourg, Allemagne, Italie,
> Espagne, Portugal, Pays-Bas, Royaume-Uni) : **dans quelle mesure peut-on
> imposer le droit suisse et la juridiction du canton du Jura** comme
> compétents exclusifs dans les CGU ? Quelles sont les **dispositions
> impératives en droit de la consommation** qui prévalent (notamment
> Règlement Rome I, Bruxelles I bis, LCD suisse, Code de la
> consommation français art. L. 232-3) ?

### Q1.2 — Limitation de responsabilité
> En droit suisse (CO 100, CO 101, LCD) et en droit européen de la
> consommation : **quelles sont les limites légales** à une clause
> limitant la responsabilité contractuelle de l'éditeur d'un service
> numérique payant ? Peut-on plafonner à « le montant payé par
> l'utilisateur au cours des douze derniers mois » comme actuellement
> rédigé ?

### Q1.3 — Mineurs et capacité contractuelle
> Pour un service numérique payant utilisé dans le contexte d'un
> accident de la circulation : **quelles précautions** en droit suisse
> (CC art. 19) et en droit européen prendre vis-à-vis des mineurs ? Notre
> formulation actuelle (« destiné aux personnes majeures ou aux personnes
> autorisées à gérer une déclaration d'accident, les mineurs doivent
> utiliser le service avec l'assistance d'un représentant légal »)
> est-elle suffisante ?

### Q1.4 — Modification unilatérale des CGU
> Peut-on, en droit suisse et européen B2C, **modifier unilatéralement
> les CGU** avec simple notification, ou faut-il un mécanisme d'opt-in
> exprès pour certaines clauses (notamment celles relatives au prix, à
> la responsabilité, aux durées de conservation) ?

---

## BLOC 2 — Politique de confidentialité (`PRIVACY.md`)

### Q2.1 — Représentant UE (art. 27 RGPD)
> Une **SA suisse** sans établissement dans l'UE, offrant ses services à
> des résidents UE en plusieurs langues, à un prix exprimé en EUR,
> doit-elle **désigner un représentant dans l'Union** au sens de l'art.
> 27 RGPD ? Quels sont les **seuils ou critères** retenus par les CNIL
> (FR), DPC (IE), APD (BE), CNPD (LU), EDPB ? Sources officielles
> appréciées.

### Q2.2 — Bases légales — RGPD art. 6 + 9 + nLPD
> Le service traite potentiellement :
> - données de santé (blessures déclarées),
> - données de géolocalisation précise,
> - données biométriques (signature manuscrite numérisée),
> - images de pièces d'identité (permis via OCR — temporairement).
>
> Quelles **bases légales sont les plus solides** pour chacune de ces
> catégories au regard du RGPD (art. 6 et 9) et de la nLPD (art. 6 et 31) ?
> Le consentement explicite est-il le seul fondement utilisable, ou
> l'exécution du contrat suffit-elle dès lors que l'utilisateur a
> sollicité la fonction ?

### Q2.3 — Transferts internationaux post-DPF
> État actualisé du **Data Privacy Framework (UE-US)** et de son
> équivalent suisse-US : décisions d'adéquation en vigueur,
> sous-traitants américains éligibles, **points de fragilité** identifiés
> par les autorités. Quelles **garanties additionnelles** (CCT 2021,
> mesures techniques) sont actuellement attendues pour Anthropic, OpenAI,
> Resend ?

### Q2.4 — Décision d'adéquation Suisse — UE
> État actualisé de la **reconnaissance d'adéquation Suisse-UE** au
> regard du RGPD (Suisse considérée comme « pays tiers à protection
> adéquate »). Cette adéquation est-elle stable, en révision ? Quelles
> conséquences pour le transfert UE → CH (clients résidents UE vers
> serveurs hébergés à Francfort par une société suisse) ?

### Q2.5 — Droit à l'effacement et obligations comptables
> Comment **concilier le droit à l'effacement (RGPD art. 17, nLPD art.
> 32)** avec l'**obligation de conservation comptable de 10 ans**
> (CO 958f en droit suisse, art. L. 123-22 du Code de commerce français,
> directives européennes TVA) ? L'anonymisation des écritures (e-mail
> remplacé par hash SHA-256, etc.) est-elle considérée comme une
> suppression effective ou comme une simple pseudonymisation ?

### Q2.6 — Données traitées par IA — entraînement des modèles
> Quelles **obligations contractuelles minimales** (DPA art. 28) imposer
> aux sous-traitants IA (Anthropic, OpenAI) concernant l'utilisation des
> données API pour l'entraînement des modèles ? Quels sont les
> engagements actuels publiquement vérifiables de ces fournisseurs ?
> Y a-t-il une obligation d'information renforcée des utilisateurs au
> titre de la **transparence IA** (RGPD art. 13/14 + AI Act art. 50) ?

### Q2.7 — AI Act (Règlement UE IA)
> Le **Règlement (UE) 2024/1689 (AI Act)** s'applique-t-il aux fonctions
> de boom.contact (OCR de documents, transcription vocale Whisper,
> assistance à l'analyse d'accident par LLM) ? Si oui, quelles
> obligations (catégorisation du système IA, transparence, marquage) sont
> applicables au calendrier prévu (entrée en application progressive
> 2025-2026) ?

### Q2.8 — Bannière cookies et consentement analytics
> Notre service utilise **PostHog (analytics pseudonymisés)** et
> **Sentry (monitoring erreurs)**. À quel moment le **consentement
> explicite** est-il requis (RGPD + directive ePrivacy + LFCC suisse) ?
> La pseudonymisation par hash SHA-256 de l'e-mail suffit-elle à
> qualifier ces analytics d'exemptés de consentement ?

---

## BLOC 3 — Conservation et suppression (`DATA_RETENTION.md`)

### Q3.1 — Durée de conservation d'un constat d'accident
> En l'absence de constat officiel et hors obligation comptable :
> **combien de temps** peut-on raisonnablement conserver les données d'un
> dossier d'accident généré par un service privé, au titre :
> - de l'**intérêt légitime** (preuves pour le litige raisonnablement
>   prévisible),
> - des **délais de prescription** en matière d'assurance auto (Suisse :
>   LCA 46 ; France : C. ass. L. 114-1 ; etc.) ?

### Q3.2 — Conservation comptable
> **CO 958f suisse** + **directive TVA UE** : confirmer les **10 ans**
> pour les pièces comptables et factures Stripe, et la possibilité de
> n'en conserver que ce qui est nécessaire (anonymisation des données
> personnelles non strictement comptables).

### Q3.3 — Compte inactif
> Quelle est la **durée raisonnable d'inactivité** au-delà de laquelle on
> peut, en informant l'utilisateur, supprimer son compte ? Y a-t-il une
> pratique CNIL / PFPDT / EDPB sur ce point ? (Notre draft mentionne
> 36 mois à confirmer.)

### Q3.4 — Sauvegardes et droit à l'effacement
> Comment traiter le **droit à l'effacement** dans le cas où les
> données restent dans des **sauvegardes** (rotation 7 à 35 jours
> typiquement) ? La pratique EDPB sur ce point (lignes directrices) ?

---

## BLOC 4 — Signature électronique et horodatage

### Q4.1 — Signature électronique simple (eIDAS + SCSE)
> Quelle est la **valeur probatoire** d'une **signature électronique
> simple** (tracé manuscrit numérisé via canvas) :
> - en droit suisse (SCSE — Loi sur la signature électronique) ;
> - en droit européen (règlement eIDAS, art. 25.1) ;
> - dans le contexte spécifique d'un **constat amiable d'accident** non
>   officiel, destiné à être transmis à un assureur.
>
> Y a-t-il une jurisprudence ou doctrine qui en précise la portée et
> les limites ?

### Q4.2 — Horodatage OpenTimestamps / ancrage Bitcoin
> L'horodatage par **OpenTimestamps avec ancrage dans la blockchain
> Bitcoin** est-il reconnu comme un **horodatage électronique** au sens
> d'eIDAS (art. 41 et 42) ? Quelle valeur probatoire en droit suisse
> (SCSE art. 2) ? Peut-on revendiquer **« horodatage qualifié »** ou
> faut-il rester sur **« horodatage électronique simple »** ?

### Q4.3 — Constat amiable européen — terminologie
> Peut-on utiliser le terme **« constat amiable numérique »** ou
> **« inspiré du constat européen d'accident »** sans engager
> juridiquement la conformité à un format réglementé ? Le **constat
> européen d'accident (CEA)** est-il une norme privée
> (assureurs/Conseil Européen des Assurances) ou un texte juridiquement
> contraignant ? Existe-t-il une marque ou un usage protégé à respecter ?

---

## BLOC 5 — Obligations légales en cas d'accident

### Q5.1 — Cas où la police est obligatoire (Suisse)
> Citation exacte des dispositions suisses applicables : **LCR (Loi
> fédérale sur la circulation routière) art. 51 et suivants**, OAV,
> jurisprudence du Tribunal fédéral. Liste des cas où la police doit
> être appelée (blessés, fuite, alcool/drogue, désaccord grave, etc.).

### Q5.2 — Idem France
> Dispositions du **Code de la route** et du Code des assurances qui
> imposent la déclaration aux autorités ou à l'assureur dans un délai
> donné. Le constat amiable papier (CERFA) — peut-il être valablement
> remplacé par un dossier PDF numérique signé électroniquement ?

### Q5.3 — Idem Belgique
> Code de la route belge, Code des assurances belge, obligations vis-à-vis
> de la **police locale**. Spécificité du constat européen d'accident en
> Belgique.

### Q5.4 — Idem Luxembourg
> Cadre luxembourgeois (notamment **Code de la route** et **CAA** —
> Commissariat aux Assurances). Particularités multilingues (FR/DE/LU).

### Q5.5 — Délais de déclaration à l'assureur
> Pour chacun de ces pays, le **délai légal de déclaration** d'un
> sinistre à l'assureur (Suisse : LCA 38 ; France : C. ass. L. 113-2 ;
> etc.). Y a-t-il un risque que notre service incite implicitement à
> dépasser ces délais ?

---

## BLOC 6 — Stores Apple et Google

### Q6.1 — Caractère « service » vs « contenu numérique »
> Notre paiement Stripe (packages 1/3/10 constats) couvre **la
> génération, l'horodatage et l'envoi** d'un dossier PDF. Apple et Google
> peuvent considérer cela comme un **service réel lié à un événement**
> (autorisé hors IAP) ou comme du **contenu numérique** (devant passer
> par les achats intégrés). Quelles sont les **règles actuelles** Apple
> (Guidelines 3.1.1 + 3.1.3) et Google Play (Payments Policy) ? Y a-t-il
> des décisions récentes (notamment post-DMA en UE, décisions
> Epic v. Apple, jugements coréens, néerlandais) qui modifient la marge
> de manœuvre ?

### Q6.2 — Politique IA générative dans les apps
> Quelles sont les **règles actuelles d'Apple et Google** concernant
> les apps intégrant des fonctions d'IA générative (OCR, transcription,
> analyse) ? Y a-t-il des **obligations de transparence** spécifiques à
> respecter dans l'App Privacy / Data Safety / description ?

### Q6.3 — Suppression de compte
> État actuel des exigences Apple et Google sur la **suppression de
> compte** : in-app + hors-app, délais, confirmation. Notre
> implémentation actuelle (in-app via `auth.deleteAccount`, suppression
> sur demande à `privacy@boom.contact`) est-elle conforme aux exigences
> 2025-2026 ?

---

## BLOC 7 — Sous-traitants et DPA

### Q7.1 — Cadre des DPA art. 28 RGPD
> Quelles **clauses minimales** doit contenir un DPA avec un
> sous-traitant US (Anthropic, OpenAI, Resend) pour être conforme à
> l'art. 28 RGPD + Schrems II + DPF ? Existe-t-il des **modèles de
> référence** EDPB ou des autorités nationales ?

### Q7.2 — Hébergement chez Railway
> Railway opère son infrastructure sur **Google Cloud / AWS** selon les
> régions. Pour la région **EU-West (Francfort)** : qui est le
> sous-traitant ultime (sous-sous-traitance) ? Cette chaîne doit-elle
> être divulguée dans notre `DPA_SUBPROCESSORS.md` ?

### Q7.3 — Stripe et facturation
> Stripe Payments Europe Ltd. (Irlande) est-il considéré comme
> **responsable conjoint** ou **sous-traitant** pour le traitement des
> données de paiement ? Quelle est la position de la CNIL / DPC sur ce
> point ?

---

## BLOC 8 — Communication et claims marketing

### Q8.1 — Usage du mot « certifié »
> Quelles sont les **limites légales** à l'usage des termes « certifié »,
> « validé », « légalement valable », « conforme » dans une
> communication B2C en Suisse (LCD, LPC) et en UE (directive
> 2005/29/CE sur les pratiques commerciales déloyales) ? Notre choix
> actuel — **éviter complètement « certifié »** et **utiliser
> uniquement « horodaté »** — est-il prudent au-delà du nécessaire, ou
> juste prudent ?

### Q8.2 — Mention « ancrage Bitcoin »
> Mentionner l'ancrage Bitcoin de l'horodatage OpenTimestamps dans une
> communication grand public peut-il être qualifié de **pratique
> commerciale trompeuse** si l'utilisateur moyen comprend mal le
> mécanisme ? Faut-il une **formulation pédagogique** obligatoire à
> côté ?

### Q8.3 — Référence au constat européen
> Peut-on dire que boom.contact est **« inspiré du constat européen
> d'accident »** sans risque de confusion ou de revendication d'une
> certification que nous n'avons pas ?

---

## BLOC 9 — Cas particuliers du métier

### Q9.1 — Données d'un tiers (témoin, passager, autre conducteur)
> Lorsque l'utilisateur saisit dans boom.contact des données concernant
> **un autre conducteur** (nom, plaque, assurance) ou un **témoin**
> (nom, contact) : sur quelle **base légale** repose ce traitement ?
> L'utilisateur agit-il pour son propre compte (intérêt légitime du
> conducteur de boom.contact) ou pour le compte du tiers ? Quelle
> information faut-il donner au tiers (RGPD art. 14) ?

### Q9.2 — Photo d'un véhicule comportant une plaque
> Une **plaque d'immatriculation** est-elle une **donnée personnelle**
> au sens du RGPD/nLPD ? La doctrine et la jurisprudence (CNIL,
> EDPB, jurisprudence européenne).

### Q9.3 — Photos de personnes (passagers, piétons)
> Si une photo prise sur les lieux contient **incidentellement** des
> personnes identifiables : quelles obligations (droit à l'image, RGPD) ?
> Faut-il un avertissement dans l'app au moment de la prise de photo ?

### Q9.4 — Module police (futur)
> Pour le module **police B2G** prévu en roadmap (poste de police
> jurassien pilote, polices municipales FR, zones de police BE, Police
> Grand-Ducale LU) : **quel cadre juridique** pour la mise à disposition
> d'un outil de capture par des agents de l'État ? Une **convention
> spécifique** (RGPD art. 26 « responsable conjoint » ? art. 28
> « sous-traitant » ?) doit-elle être conclue avec chaque autorité ?

---

## BLOC 10 — Spécificités suisses (nLPD)

### Q10.1 — Obligations sous nLPD
> Synthèse des **obligations spécifiques** de la nLPD (entrée en vigueur
> 1er septembre 2023) qui s'ajoutent au RGPD pour une société suisse :
> registre des traitements, conseil à la protection des données,
> annonces de violation (art. 24 nLPD), évaluation d'impact (art. 22
> nLPD).

### Q10.2 — Notification de violation
> Obligations de notification d'une **violation de données** :
> - PFPDT : délai et seuil (art. 24 nLPD) ;
> - Personnes concernées : critères de notification (art. 24 al. 4 nLPD) ;
> - Comparaison RGPD (art. 33 + 34 « 72 heures »).

### Q10.3 — DPO suisse
> Un **conseiller à la protection des données** est-il **obligatoire**
> pour PEP's Swiss SA au regard de la nLPD ? Si non, est-il
> **fortement recommandé** ?

---

## Format de retour attendu

Pour chaque question, Soluris devrait idéalement renvoyer :

```
Q[X.X] — [Question]

TEXTES APPLICABLES :
- [Référence exacte article + version en vigueur]
- [Lien source officielle]

JURISPRUDENCE / PRATIQUE :
- [Décision pertinente avec date et juridiction]
- [Doctrine ou ligne directrice d'autorité]

POINTS D'ATTENTION :
- [Risques ou incertitudes]

RECOMMANDATIONS DE FORMULATION (si pertinent) :
- [Suggestion de wording]
```

---

## Méta — pour Cowork

- Si Soluris est conçu pour des questions de droit français, **traiter
  d'abord les questions FR + UE**, puis demander si Soluris peut
  également traiter le **droit suisse**. Sinon, marquer les blocs
  suisses comme « à passer à un juriste CH ».
- Si une question est trop large pour Soluris, **la subdiviser** en
  sous-questions plus ciblées.
- Demander toujours les **sources officielles** (Legifrance, Admin.ch,
  Eur-lex, EDPB, CNIL, PFPDT) plutôt que des paraphrases.
- Conserver toutes les réponses dans un fichier markdown structuré
  (`legal/SOLURIS_RESULTS.md`) qui sera ensuite transmis au juriste
  humain avec le Legal Pack.
