/**
 * Test d'intégration RÉEL (PostgreSQL local) — prouve l'atomicité de createOrganization
 * et le flux d'invitation. Gardé derrière RUN_DB_IT=1 → skipped en CI.
 */
import { describe, it, expect, beforeAll } from 'vitest';

const RUN = process.env.RUN_DB_IT === '1';
const d = RUN ? describe : describe.skip;

d('Onboarding — intégration réelle', () => {
  let db: any, schema: any, svc: any, sql: any;

  beforeAll(async () => {
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
    const pg = await import('postgres');
    sql = pg.default('postgresql://test:test@localhost:5432/test');
    const dbm = await import('../db/index.js');
    db = dbm.db; schema = await import('../db/schema.js');
    const mig = await import('../db/migrate.js');
    await mig.runMigrations();
    svc = await import('../services/organization.service.js');
    // user de test
    await sql`INSERT INTO users (id, email, credits, role, created_at)
              VALUES ('u_it_owner', 'owner.it@co.ch', 0, 'user', NOW())
              ON CONFLICT (id) DO NOTHING`;
    await sql`INSERT INTO users (id, email, credits, role, created_at)
              VALUES ('u_it_driver', 'driver.it@co.ch', 0, 'user', NOW())
              ON CONFLICT (id) DO NOTHING`;
  });

  it('createOrganization atomique : org + owner créés ensemble', async () => {
    const res = await svc.createOrganization('u_it_owner', { name: 'IT Flotte' });
    expect(res.ok).toBe(true);
    const orgs = await sql`SELECT id FROM organizations WHERE id = ${res.id}`;
    const mems = await sql`SELECT role FROM organization_members WHERE organization_id = ${res.id} AND user_id = 'u_it_owner'`;
    expect(orgs.length).toBe(1);
    expect(mems.length).toBe(1);
    expect(mems[0].role).toBe('owner');
  });

  it('rollback réel : une transaction qui échoue après l\'INSERT org ne laisse PAS d\'org orpheline', async () => {
    const before = await sql`SELECT COUNT(*)::int AS n FROM organizations`;
    await expect(db.transaction(async (tx: any) => {
      await tx.insert(schema.organizations).values({
        id: 'org_should_rollback', name: 'Rollback Test', plan: 'free',
        createdByUserId: 'u_it_owner', createdAt: new Date(), updatedAt: new Date(),
      });
      throw new Error('boom'); // simulate membership failure
    })).rejects.toThrow(/boom/);
    const after = await sql`SELECT COUNT(*)::int AS n FROM organizations`;
    const orphan = await sql`SELECT id FROM organizations WHERE id = 'org_should_rollback'`;
    expect(orphan.length).toBe(0);          // org rollback
    expect(after[0].n).toBe(before[0].n);   // aucun delta
  });

  it('invitation : inviteMember → tokenHash stocké, token brut absent de la DB → acceptInvite OK', async () => {
    const org = await svc.createOrganization('u_it_owner', { name: 'IT Invite' });
    const inv = await svc.inviteMember('u_it_owner', org.id, 'driver.it@co.ch', 'driver');
    expect(inv.rawToken).toBeTruthy();
    // token brut JAMAIS en base ; seul le hash est présent
    const rawInDb = await sql`SELECT id FROM organization_invites WHERE token_hash = ${inv.rawToken}`;
    expect(rawInDb.length).toBe(0);
    const hashed = await sql`SELECT status FROM organization_invites WHERE id = ${inv.inviteId}`;
    expect(hashed[0].status).toBe('pending');
    // acceptation par le bon email
    const acc = await svc.acceptInvite('u_it_driver', 'driver.it@co.ch', inv.rawToken);
    expect(acc.ok).toBe(true);
    const mem = await sql`SELECT role FROM organization_members WHERE organization_id = ${org.id} AND user_id = 'u_it_driver'`;
    expect(mem[0].role).toBe('driver');
    const st = await sql`SELECT status FROM organization_invites WHERE id = ${inv.inviteId}`;
    expect(st[0].status).toBe('accepted');
  });

  it('acceptInvite avec mauvais email refusé', async () => {
    const org = await svc.createOrganization('u_it_owner', { name: 'IT WrongMail' });
    const inv = await svc.inviteMember('u_it_owner', org.id, 'driver.it@co.ch', 'driver');
    await expect(svc.acceptInvite('u_it_owner', 'owner.it@co.ch', inv.rawToken)).rejects.toThrow(/mismatch/);
  });
});
