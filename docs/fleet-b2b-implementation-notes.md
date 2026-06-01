# Fleet B2B — Implementation Notes (sprint Foundation)

_Mise à jour : 2026-05-29. Ce qui est réellement codé vs ce qui reste._

## ✅ Implémenté dans ce sprint (backend uniquement, aucune UI publique)
- **Schéma** (`server/src/db/schema.ts`) : tables `organizations` + `organization_members` (additif).
- **Migration** (`server/src/db/migrate.ts`, Block 14) : `CREATE TABLE IF NOT EXISTS` + index + unique
  `(organization_id, user_id)`. Idempotent, exécuté au boot par `runMigrations()` (convention du projet).
  Aucune modification de `users` / `vehicles` / `payments` / `creditTxns`.
- **Service** (`server/src/services/organization.service.ts`) :
  - Matrice de permissions **pure** : `roleCan`, `canAssignRole`, `canRemoveRole`, `isViewerRole`.
  - Guards DB : `getUserOrganizationRole`, `assertOrganizationMember/Admin/Owner`,
    `canManageOrganizationVehicles`, `canInviteOrganizationMember`.
  - CRUD : `createOrganization` (créateur = owner), `listMyOrganizations`, `getOrganization`,
    `listMembers`, `addMember` (utilisateur existant par email), `updateMemberRole`, `removeMember`
    (soft, `status='removed'`), `leaveOrganization`. Protection du **dernier owner**.
- **Router tRPC** (`server/src/routes/organization.router.ts`) : `organization.*`, toutes en
  `protectedProcedure`, erreurs métier mappées en TRPCError. Enregistré dans l'appRouter.
- **Audit** : events `org.created`, `org.member_added`, `org.member_role_updated`,
  `org.member_removed`, `org.member_left` via `logAudit` (sans PII).
- **Tests** (`server/src/__tests__/organization.test.ts`) : 16 tests — matrice pure + service (mock DB).

## 🚫 Volontairement NON construit (hors périmètre, pour limiter le risque)
- Aucune **UI** (ni onglet « Entreprise » dans AccountPage). Backend + tests seulement.
- Aucune **invitation par email** d'un utilisateur inexistant (`addMember` exige un compte existant).
- **Aucune** modification de `vehicles` (pas d'`organizationId` ce sprint) → garage personnel intact.
- Pas de wallet, pas de PDF multi-destinataires, pas de dashboard.

## 🔜 Reste avant « véhicules d'organisation »
1. `ALTER TABLE vehicles ADD COLUMN organization_id` (nullable) + index (Block 15 additif).
2. Garage : requête union perso + véhicules d'org autorisés (branche additionnelle).
3. ConstatFlow : option « véhicule d'entreprise » (réutilise garage-to-constat, skip OCR).
4. `canManageOrganizationVehicles` (déjà codé) branché sur les routes véhicules d'org.

## 🔜 Reste avant « wallet entreprise »
1. Tables `credit_wallets` + `wallet_transactions` (Block 16 additif).
2. Route serveur « achat crédits org » (metadata Checkout) — **webhook Stripe inchangé**.
3. Débit wallet au constat si véhicule d'org, fallback crédits perso.

## 🔜 Reste avant « PDF multi-destinataires »
1. Table `fleet_report_recipients` (Block 17 additif).
2. Boucle d'envoi (conducteur + destinataires actifs) dans le flux d'envoi PDF existant.
3. Events `fleet_report_sent_to_admin`.

## Notes techniques
- Les routes `organization.*` existent mais **aucune UI ne les appelle** → prod sûre même avant usage.
- Génération d'ID : `nanoid(20)` (même pattern que `vehicle.service`).
- Les guards `assert*` lèvent des `Error` préfixées (`FORBIDDEN`/`NOT_FOUND`/`CONFLICT`) traduites en
  TRPCError par le router.

---

## MAJ sprint Value Chain (2026-05-29) — véhicules d'organisation
### Maintenant fonctionnel
- `vehicles.organizationId` nullable (Block 15, additif). NULL=perso (inchangé), non-NULL=org. userId reste NOT NULL (créateur).
- `listVehicles` filtre désormais `organizationId IS NULL` (perso strict) — aucun changement pour les données existantes (toutes NULL).
- Service véhicules : listPersonalVehicles, listOrganizationVehicles, **listAccessibleVehicles** (garage unifié), guards assertCanRead/Manage/CreateOrganizationVehicle, saveOrganizationVehicle, deleteOrganizationVehicle.
- Routes : vehicle.listAccessible, vehicle.saveOrganization, vehicle.deleteOrganization (list/save/delete perso INCHANGÉES).
- ConstatFlow : sélecteur bascule sur listAccessible → propose perso + org avec badge scope ; sélection véhicule d'org préremplit + **skip OCR** (même mapping) ; analytics scope-aware (source=organization_garage, fleet_vehicle_selected_for_constat).
- AccountPage : section « Véhicules d'entreprise » visible UNIQUEMENT si membre d'une org ; lecture pour tous, gestion (ajout/édition/suppression) pour owner/fleet_admin.
- Tests : fleetVehicles.test.ts (11) — mapping pur, guards, garage unifié.
### Reste : wallet entreprise, PDF multi-destinataires, dashboard flotte, invitation email, import CSV.
