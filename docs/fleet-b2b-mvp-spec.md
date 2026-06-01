# Fleet B2B — MVP Spec

_Périmètre produit du MVP entreprise. Architecture + spec ; le code n'est pas livré dans ce sprint._
_Mise à jour : 2026-05-29._

## 1. Objectif
Rendre boom.contact vendable à des entreprises possédant des flottes (20 → 5000 véhicules), sans
ajouter aucune complexité pour les particuliers (B2C), et sans toucher au flow constat ni au garage
personnel existants.

## 2. Personae
- **A. Particulier** — garage personnel, aucun changement, ne voit jamais rien de « flotte ».
- **B. Chauffeur** — membre d'une organisation, sélectionne un véhicule d'entreprise pendant un constat.
- **C. Admin flotte** — gère véhicules, membres, destinataires de rapport, wallet.
- **D. Owner entreprise** — comme admin + facturation + suppression d'organisation.
- **E. Courtier / assureur (viewer)** — accès en lecture restreint (phase 12 mois, pas MVP).

## 3. Périmètre MVP (30 jours) — ce qui est « in »
1. **Créer une organisation** (nom, pays) → le créateur devient `owner`.
2. **Inviter des membres** par email (`organization_invites`) avec rôle `fleet_admin` ou `driver`.
3. **Rôles** : `owner` / `fleet_admin` / `driver` (les viewers courtier/assureur sont hors MVP).
4. **Ajouter des véhicules d'organisation** (`vehicles.organizationId` renseigné).
5. **Garage unifié** : le chauffeur voit ses véhicules perso **+** les véhicules de ses organisations,
   clairement séparés (sections « Mon garage » / « Flotte <nom> »).
6. **Sélection d'un véhicule d'org dans le constat** → préremplissage, **skip OCR** (réutilise le
   mécanisme garage-to-constat actuel, aucune nouvelle logique de scan).
7. **PDF envoyé au conducteur + responsable(s) flotte** (`fleet_report_recipients`).
8. **Wallet organisation** : un constat avec véhicule d'org débite le `credit_wallets` de l'org
   (et non les crédits perso du chauffeur). Fallback perso si pas de wallet/solde.
9. **Dashboard flotte minimal** : liste véhicules, membres, solde wallet, derniers constats (métadonnées).

## 4. Hors MVP (différé explicitement)
- Portails courtier / assureur, API publique, white-label, import CSV massif, stats avancées,
  multi-tenant par pays. → roadmap 90 j / 12 mois.

## 5. User stories clés
- _En tant qu'owner_, je crée mon organisation et j'invite mon gestionnaire de parc en `fleet_admin`.
- _En tant que fleet_admin_, j'ajoute 40 véhicules et je définis l'email « sinistres@… » comme
  destinataire des rapports.
- _En tant que chauffeur_, après un accrochage, j'ouvre l'app, je choisis le véhicule de société
  concerné (sans rescanner la carte grise), je remplis le constat ; le PDF part au responsable.
- _En tant que particulier_, je ne vois jamais « Flotte » : mon expérience est strictement identique
  à aujourd'hui.

## 6. Flow constat — sélection véhicule (cible)
Étape « véhicule » du ConstatFlow, choix clair :
1. **Véhicule personnel** (garage perso — existant).
2. **Véhicule d'entreprise** (si membre d'une org — nouveau, conditionnel).
3. **Autre véhicule** (saisie manuelle — existant).
4. **Scanner un document** (OCR — existant).

Règle : options 1 et 2 préremplissent et **sautent l'OCR** (`isScanRequiredAfterGarageSelection = false`,
déjà en place). Aucun changement du moteur de scan.

## 7. Débit crédits (cible)
```
Au déclenchement d'un constat avec véhicule :
  si vehicle.organizationId != NULL et wallet org a du solde → débiter credit_wallets (org)
  sinon → comportement actuel (users.credits du chauffeur)
```
Webhook Stripe **non modifié** : l'achat de crédits org créditera `credit_wallets` via une route
serveur dédiée (à spécifier en phase 90 j), pas via une modification du webhook existant.

## 8. Changements minimaux requis (récap technique)
| Domaine | Changement | Risque |
| --- | --- | --- |
| DB | +6 tables, +1 colonne nullable (cf. data-model) | Faible (additif) |
| Garage query | union perso + org (branche additionnelle) | Faible |
| ConstatFlow | option « véhicule d'entreprise » conditionnelle | Faible (réutilise garage-to-constat) |
| Débit crédits | branchement wallet org si applicable | Moyen (tests requis) |
| Email PDF | boucle multi-destinataires | Faible |
| Auth/permissions | helper « rôle dans org » + garde tRPC | Moyen (sécurité — cf. security-review) |

## 9. Définition de « done » MVP
- Un owner peut créer une org, inviter un driver, ajouter un véhicule d'org.
- Un driver voit le véhicule d'org dans son garage et l'utilise dans un constat (skip OCR).
- Le PDF part au driver + 1 destinataire flotte.
- Le constat débite le wallet org.
- **Zéro régression** B2C : `quality:prestore` vert, garage perso et flow constat intacts.

---
## MAJ sprint Value Chain (2026-05-29)
- vehicles.organizationId nullable livré (Block 15). Garage unifié + sélection véhicule d'org dans le constat opérationnels. Guards lecture/gestion par rôle. UI entreprise conditionnelle (membres seulement). 30j MVP: points 4,5,6 livrés.

---
## MAJ sprint Monetization (2026-05-29)
- credit_wallets + wallet_transactions + sessions.billing_organization_id (Block 16, additif). Routage débit org/perso opérationnel (non bloquant). users.credits coexiste, non migré. Webhook Stripe intact. Sécurité : re-vérif appartenance au débit, idempotence par session, jamais de solde négatif, viewers exclus de la consommation.
