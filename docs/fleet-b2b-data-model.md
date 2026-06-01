# Fleet B2B — Data Model (non destructif)

_Spec d'architecture. Rien de ce document n'est encore appliqué en base. Mise à jour : 2026-05-29._

## 1. État actuel audité (référence)
| Table | Lien | Constat |
| --- | --- | --- |
| `users` | — | `role` varchar unique (`customer`/`admin`/…), `credits` int, `company` (texte libre, **pas** un lien org), consentements, country, language |
| `vehicles` | `userId` **notNull** → `users.id` (onDelete **cascade**) | strictement **personnel** ; aucun `organizationId` |
| `users.credits` + `creditTxns` (par `userEmail`) + `payments` (par `userEmail`) | — | crédits **par utilisateur uniquement** |
| `auditLog` | `userId`, `sessionId`, `ip`, `detail` jsonb | **existe déjà** — réutilisable tel quel pour la flotte |
| `sessions` (constats) | participants stockent make/model/plate **dénormalisés** | snapshot au moment de l'accident, pas de FK véhicule |

**Conclusion** : l'architecture ne **bloque pas** l'extension entreprise. Tout se fait en **ajout**
(colonnes nullable + nouvelles tables), zéro migration destructive, le garage perso reste intact.

## 2. Principe directeur
- `users` et `vehicles` **ne changent pas de sémantique**. On **ajoute** `vehicles.organizationId`
  **nullable** : `NULL` = véhicule personnel (comportement actuel), non-NULL = véhicule d'organisation.
- Les crédits personnels restent sur `users.credits`. Les crédits d'organisation vivent dans une
  **table séparée** (`credit_wallets`) — aucun mélange, aucune régression.
- L'`auditLog` existant absorbe les events flotte (pas de nouvelle table d'audit).

## 3. Tables nouvelles (Drizzle — proposé, non appliqué)

```ts
// organizations — une entreprise / flotte
export const organizations = pgTable('organizations', {
  id:           varchar('id', { length: 20 }).primaryKey(),
  name:         text('name').notNull(),
  country:      varchar('country', { length: 10 }),
  vatNumber:    text('vat_number'),                 // optionnel, facturation
  createdBy:    varchar('created_by', { length: 20 }).notNull().references(() => users.id),
  createdAt:    timestamp('created_at').notNull().defaultNow(),
  deletedAt:    timestamp('deleted_at'),            // soft-delete (rétention légale)
});

// organization_members — appartenance + rôle PAR organisation
export const organizationMembers = pgTable('organization_members', {
  id:           varchar('id', { length: 20 }).primaryKey(),
  organizationId: varchar('organization_id', { length: 20 }).notNull()
                   .references(() => organizations.id, { onDelete: 'cascade' }),
  userId:       varchar('user_id', { length: 20 }).notNull()
                   .references(() => users.id, { onDelete: 'cascade' }),
  role:         varchar('role', { length: 20 }).notNull(), // owner|fleet_admin|driver|broker_viewer|insurer_viewer
  status:       varchar('status', { length: 20 }).notNull().default('active'), // active|suspended|removed
  joinedAt:     timestamp('joined_at').notNull().defaultNow(),
  removedAt:    timestamp('removed_at'),
}, (t) => ({
  orgIdx:  index('org_members_org_idx').on(t.organizationId),
  userIdx: index('org_members_user_idx').on(t.userId),
  uniq:    uniqueIndex('org_members_uniq').on(t.organizationId, t.userId),
}));

// organization_invites — invitations par email (avant que le user existe)
export const organizationInvites = pgTable('organization_invites', {
  id:           varchar('id', { length: 20 }).primaryKey(),
  organizationId: varchar('organization_id', { length: 20 }).notNull()
                   .references(() => organizations.id, { onDelete: 'cascade' }),
  email:        text('email').notNull(),
  role:         varchar('role', { length: 20 }).notNull(),
  token:        text('token').notNull().unique(),
  invitedBy:    varchar('invited_by', { length: 20 }).notNull().references(() => users.id),
  expiresAt:    timestamp('expires_at').notNull(),
  acceptedAt:   timestamp('accepted_at'),
  createdAt:    timestamp('created_at').notNull().defaultNow(),
});

// credit_wallets — solde crédits d'une organisation (séparé des users.credits)
export const creditWallets = pgTable('credit_wallets', {
  id:           varchar('id', { length: 20 }).primaryKey(),
  organizationId: varchar('organization_id', { length: 20 }).notNull().unique()
                   .references(() => organizations.id, { onDelete: 'cascade' }),
  balance:      integer('balance').notNull().default(0),
  createdAt:    timestamp('created_at').notNull().defaultNow(),
  updatedAt:    timestamp('updated_at').notNull().defaultNow(),
});

// wallet_transactions — ledger du wallet organisation
export const walletTransactions = pgTable('wallet_transactions', {
  id:           varchar('id', { length: 20 }).primaryKey(),
  organizationId: varchar('organization_id', { length: 20 }).notNull()
                   .references(() => organizations.id, { onDelete: 'cascade' }),
  delta:        integer('delta').notNull(),
  reason:       varchar('reason', { length: 40 }).notNull(), // purchase|constat|refund|grant
  actorUserId:  varchar('actor_user_id', { length: 20 }),
  ref:          text('ref'),
  createdAt:    timestamp('created_at').notNull().defaultNow(),
});

// fleet_report_recipients — qui reçoit le PDF d'un constat (au-delà du conducteur)
export const fleetReportRecipients = pgTable('fleet_report_recipients', {
  id:           varchar('id', { length: 20 }).primaryKey(),
  organizationId: varchar('organization_id', { length: 20 }).notNull()
                   .references(() => organizations.id, { onDelete: 'cascade' }),
  email:        text('email').notNull(),
  label:        text('label'),                      // ex: "Responsable sinistres"
  active:       boolean('active').notNull().default(true),
  createdAt:    timestamp('created_at').notNull().defaultNow(),
});
```

## 4. Modification additive de `vehicles`
```ts
// AJOUT non destructif (nullable) :
organizationId: varchar('organization_id', { length: 20 })
                 .references(() => organizations.id, { onDelete: 'set null' }),
// + index('vehicles_org_idx').on(t.organizationId)
```
`onDelete: 'set null'` : si une organisation est supprimée, ses véhicules ne sont pas détruits —
ils redeviennent orphelins/personnels selon la politique de rétention (cf. security-review).

## 5. Rôles
- `users.role` (global) **inchangé** — usage existant (customer/admin).
- Le rôle **flotte** vit sur `organization_members.role`, par organisation :
  `owner` · `fleet_admin` · `driver` · `broker_viewer` · `insurer_viewer`.
- Un même user peut être `driver` dans l'org A et `fleet_admin` dans l'org B.

## 6. Requête garage cible (union perso + org)
```
véhicules visibles d'un user =
  vehicles WHERE userId = me                               -- perso (inchangé)
  UNION
  vehicles WHERE organizationId IN (mes orgs actives)      -- véhicules d'org autorisés
```
Le garage perso actuel (`listVehicles(userId)`) reste la branche n°1, **non modifiée**. La branche
org est **ajoutée** seulement si l'utilisateur est membre d'au moins une organisation.

## 7. Migration (non destructive, ordre)
1. `CREATE TABLE organizations / organization_members / organization_invites / credit_wallets / wallet_transactions / fleet_report_recipients`.
2. `ALTER TABLE vehicles ADD COLUMN organization_id varchar(20) NULL` + FK + index.
3. Aucune donnée existante touchée (organizationId NULL par défaut = comportement actuel).
4. Aucune suppression de colonne/table. Réversible.

## 8. Ce qui NE change pas (garanties anti-régression)
- `users`, `creditTxns`, `payments`, webhook Stripe : **intacts**.
- `vehicles.userId` reste `notNull` (un véhicule a toujours un propriétaire/créateur).
- Garage personnel, garage-to-constat, skip OCR : **inchangés**.
- `auditLog` : réutilisé, pas de refonte.

---

## MAJ sprint Foundation (2026-05-29) — IMPLÉMENTÉ
- `organizations` + `organization_members` : **codées** (schema.ts) et **migrées** (migrate.ts Block 14, additif, au boot).
- Rôles supportés : owner / fleet_admin / driver / broker_viewer / insurer_viewer. status : active/suspended/removed.
- Unique `(organization_id, user_id)`. `user_id` nullable (prévu pour invitations email futures ; `addMember` exige aujourd'hui un compte existant).
- **PAS** de `vehicles.organizationId` ce sprint (reporté — garage perso strictement intact).
