# Sous-traitants et clauses contractuelles (DPA) — boom.contact

> **DRAFT v1.0 — 20 mai 2026**
> **À VALIDER PAR UN JURISTE SUISSE/EUROPÉEN AVANT PUBLICATION.**
> Document destiné à servir de référence pour la gestion contractuelle
> des sous-traitants. La partie publique (liste des sous-traitants et
> finalités) est destinée à être reprise dans PRIVACY.md.

---

## 1. Principes

PEP's Swiss SA, en qualité de **responsable du traitement** au sens du
RGPD et de la nLPD, fait appel à des **sous-traitants** pour des
fonctions spécifiques du service boom.contact.

Pour chaque sous-traitant :

1. un **accord de sous-traitance (DPA)** est conclu, conforme à l'article
   28 du RGPD et à l'article 9 de la nLPD ;
2. les **transferts internationaux** éventuels sont encadrés (CCT,
   décision d'adéquation, garanties additionnelles) ;
3. la **liste publique** des sous-traitants est tenue à jour dans la
   politique de confidentialité ;
4. l'utilisateur est informé en cas de **changement substantiel** de
   sous-traitant.

## 2. Liste des sous-traitants (au 20 mai 2026)

### 2.1 Anthropic

- **Service** : intelligence artificielle (OCR sur les documents,
  analyse de scène d'accident, assistance à la transcription).
- **Données traitées** : images de documents (carte verte, permis,
  papiers du véhicule), descriptions textuelles, photos d'accident.
- **Localisation** : États-Unis.
- **Cadre du transfert** : DPF (Data Privacy Framework) le cas échéant +
  clauses contractuelles types.
- **Engagement modèle** : Anthropic ne réutilise pas par défaut les
  données API client pour entraîner ses modèles (à vérifier dans le DPA
  signé et lors de chaque évolution des CGU Anthropic).
- **Statut DPA** : *à confirmer et joindre au dossier interne.*

### 2.2 OpenAI

- **Service** : transcription vocale automatique (Whisper).
- **Données traitées** : enregistrements audio des déclarations
  utilisateur.
- **Localisation** : États-Unis.
- **Cadre du transfert** : DPF + clauses contractuelles types.
- **Engagement modèle** : OpenAI s'engage à ne pas entraîner ses modèles
  sur les données API par défaut (engagement à vérifier dans le DPA
  signé).
- **Statut DPA** : *à confirmer et joindre au dossier interne.*

### 2.3 Resend

- **Service** : envoi d'e-mails transactionnels (PDF d'accident, notifications,
  liens magic-link).
- **Données traitées** : adresse e-mail, nom, contenu du message, pièce
  jointe PDF.
- **Localisation** : États-Unis (infrastructure AWS, région eu-west-1
  utilisée pour boom.contact).
- **Cadre du transfert** : DPF + clauses contractuelles types.
- **Statut DPA** : *à confirmer et joindre au dossier interne.*

### 2.4 Stripe Payments Europe Ltd.

- **Service** : traitement des paiements et facturation.
- **Données traitées** : identifiant client, transaction, package
  acheté, e-mail. Les données bancaires (numéros de carte) sont traitées
  directement par Stripe ; boom.contact n'y a pas accès.
- **Localisation** : Stripe Payments Europe Ltd. — Irlande / EEE.
- **Cadre du transfert** : intra-EEE ; transferts internationaux le cas
  échéant encadrés par CCT.
- **Statut DPA** : DPA Stripe standard accepté lors de la création du
  compte ; à joindre au dossier interne.

### 2.5 Railway (hébergement)

- **Service** : hébergement applicatif et base de données PostgreSQL.
- **Données traitées** : ensemble des données applicatives.
- **Localisation** : région **EU-West (Allemagne, Francfort)** pour
  boom.contact.
- **Cadre du transfert** : intra-EEE ; transferts éventuels encadrés.
- **Chiffrement** : TLS en transit ; chiffrement au repos par le
  fournisseur d'infrastructure.
- **Statut DPA** : *à confirmer et joindre au dossier interne.*

### 2.6 PostHog

- **Service** : analytics produit.
- **Données traitées** : événements pseudonymisés (e-mail haché en
  SHA-256), parcours, propriétés.
- **Localisation** : à vérifier selon la région choisie (EU recommandé).
- **Cadre du transfert** : selon région ; CCT si hors EEE.
- **Statut DPA** : *à confirmer et joindre au dossier interne.*

### 2.7 Sentry

- **Service** : capture d'erreurs et monitoring technique.
- **Données traitées** : traces d'erreurs, contexte technique. Les
  identifiants utilisateurs sont pseudonymisés.
- **Localisation** : selon configuration (région UE recommandée).
- **Cadre du transfert** : selon région ; CCT si hors EEE.
- **Statut DPA** : *à confirmer et joindre au dossier interne.*

### 2.8 OpenTimestamps (service public)

- **Service** : horodatage cryptographique (preuve d'antériorité ancrée
  Bitcoin).
- **Données traitées** : **uniquement un hash SHA-256** du PDF (pas de
  données personnelles, pas de contenu du PDF transmis).
- **Cadre** : protocole ouvert et public ; aucune donnée personnelle
  envoyée.
- **DPA** : non requis dans la mesure où aucune donnée personnelle
  n'est transmise. À documenter explicitement.

### 2.9 OpenStreetMap / Nominatim (géocodage)

- **Service** : géocodage et cartographie (lieu de l'accident).
- **Données traitées** : coordonnées GPS / requête d'adresse ;
  pas d'identifiant utilisateur transmis.
- **Cadre** : service public sous licence ouverte.
- **DPA** : non applicable ; à documenter explicitement.

### 2.10 Cloud Apple / Google (selon usage)

- Lorsque l'utilisateur utilise les applications natives iOS/Android,
  certaines données techniques (push, notifications, crash reports)
  peuvent transiter par les services d'Apple ou Google. Ces flux sont
  gouvernés par les politiques respectives de ces sociétés et les
  obligations contractuelles propres aux stores.

## 3. Tableau de synthèse

| Sous-traitant | Données | Pays | Cadre transfert | DPA |
|---|---|---|---|---|
| Anthropic | images, texte | US | DPF + CCT | À confirmer |
| OpenAI | audio | US | DPF + CCT | À confirmer |
| Resend | e-mail, PDF | US (AWS eu-west-1) | DPF + CCT | À confirmer |
| Stripe Payments Europe Ltd. | paiement | IE (EEE) | Intra-EEE | DPA standard |
| Railway | DB + app | DE (EEE) | Intra-EEE | À confirmer |
| PostHog | analytics pseudo | UE/US selon région | CCT si hors EEE | À confirmer |
| Sentry | erreurs | UE/US selon région | CCT si hors EEE | À confirmer |
| OpenTimestamps | hash uniquement | public | non-applicable | non applicable |
| OpenStreetMap/Nominatim | coordonnées | public | non-applicable | non applicable |

## 4. Modifications de sous-traitants

- L'ajout, le remplacement ou la suppression d'un sous-traitant
  substantiel fait l'objet d'une mise à jour du présent document et
  d'une mise à jour de la politique de confidentialité publiée.
- Une information est faite aux utilisateurs en cas de changement
  pouvant les concerner directement (par exemple, changement de
  localisation de l'hébergement).

## 5. Vérifications périodiques

- Revue annuelle de la liste des sous-traitants et de l'état des DPA.
- Vérification des engagements relatifs à l'entraînement des modèles
  pour les sous-traitants IA (Anthropic, OpenAI) à chaque évolution de
  leurs conditions générales.
- Vérification des cadres de transfert (DPF, CCT) à chaque évolution
  juridique majeure.

## 6. Contact

Pour toute question relative aux sous-traitants et aux transferts de
données : **privacy@boom.contact**.
