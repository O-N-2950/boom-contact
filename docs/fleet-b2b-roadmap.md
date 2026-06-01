# Fleet B2B — Roadmap d'exécution

_Mise à jour : 2026-05-29. Voir aussi : mvp-spec, data-model, security-review, monetization._

## 30 jours — Fondations + sélection véhicule d'org
1. Spec validée (ce dossier) ✅ + revue juriste lancée.
2. Migration DB **non destructive** : 6 tables + `vehicles.organizationId` nullable (cf. data-model).
3. Service + routes tRPC : créer org, inviter membre, accepter invitation, ajouter véhicule d'org.
   Gardes de permission (helper « rôle dans org ») + audit log sur chaque action.
4. Garage unifié : union perso + org côté serveur ; UI sections « Mon garage » / « Flotte <nom> »
   (conditionnelle — invisible pour les particuliers).
5. ConstatFlow : option « véhicule d'entreprise » (réutilise garage-to-constat, skip OCR).
6. Dashboard flotte **minimal** : véhicules, membres, derniers constats (métadonnées).
7. Analytics B2B : câbler `organization_created`, `organization_member_invited/joined`,
   `fleet_vehicle_added`, `fleet_vehicle_selected_for_constat` (sans PII).
- **Jalon** : un owner crée une org, ajoute un véhicule, un driver l'utilise dans un constat. Zéro régression B2C.

## 90 jours — Wallet, PDF multi-destinataires, pilote
1. **Wallet organisation** : achat crédits org (route serveur dédiée, webhook Stripe **intact**),
   débit wallet au constat avec fallback crédits perso. Ledger `wallet_transactions`.
2. **PDF multi-destinataires** : boucle d'envoi conducteur + `fleet_report_recipients` actifs +
   events `fleet_report_sent_to_admin`. Gestion des bounces.
3. **Import CSV véhicules** (gestionnaire de parc) avec validation + dédoublonnage.
4. **Analytics B2B complet** : `fleet_wallet_used`, `fleet_dashboard_viewed`, `company_interest_submitted`.
5. **Pilote** avec **une PME / flotte réelle** (20–100 véhicules) : onboarding, crédits offerts, feedback.
- **Jalon** : une flotte pilote utilise boom.contact en conditions réelles, rapports reçus par le responsable.

## 12 mois — Portails partenaires, API, white-label
1. **Portail courtier** (`broker_viewer`) multi-clients + offre revendeur.
2. **Portail assureur** (`insurer_viewer`) + **API / export sinistre structuré** (webhook sortant).
3. **White-label** : branding partenaire, licence annuelle.
4. **Statistiques flotte** : sinistralité par véhicule/zone/période (données agrégées, anonymisées).
5. **Expansion internationale** : facturation multi-devises, conformité par juridiction, hébergement
   souverain si exigé (cf. plan stratégique police pour le pattern d'hébergement).
- **Jalon** : revenus récurrents B2B + au moins un partenaire courtier/assureur intégré.

## Dépendances & garde-fous (toutes phases)
- Aucune migration destructive ; chaque étape réversible.
- Webhook Stripe non modifié tant qu'on reste sur le wallet crédits (Modèle 1).
- `quality:prestore` vert à chaque sprint ; garage perso + flow constat jamais cassés.
- Sécurité : filtrage serveur, moindre privilège, audit log (cf. security-review) appliqués dès la phase 30 j.
- Ne pas déclarer « public-ready » B2B avant pilote réussi + revue juridique.

## Indicateurs de réussite
- 30 j : 1 org de test fonctionnelle, 0 régression.
- 90 j : 1 flotte pilote active, PDF multi-destinataires opérationnel, wallet débité correctement.
- 12 mois : ≥ 1 partenaire intégré, MRR B2B mesurable, funnels B2B alimentés dans PostHog.

---

## MAJ sprint Foundation (2026-05-29)
**30 jours — point 2 et 3 (partiel) livrés** : migration additive (organizations + organization_members) + service org + guards de permission + routes tRPC + 16 tests. Reste du 30j : `vehicles.organizationId`, garage unifié, sélection véhicule d'org dans le constat, analytics B2B câblés UI.
