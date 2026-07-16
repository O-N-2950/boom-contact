/**
 * Audit logging service — boom.contact
 * Lightweight INSERT-only audit trail for security-relevant events.
 */
import { db } from '../db/index.js';
import { auditLog } from '../db/schema.js';
import { logger } from '../logger.js';

export type AuditEvent =
  | 'user.login'
  | 'user.register'
  | 'user.logout'
  | 'user.email_verified'
  | 'credit.purchase'
  | 'invoice.created'
  | 'invoice.paid'
  | 'credit.gift_claimed'
  | 'pdf.generated'
  | 'police.login'
  | 'admin.action'
  | 'admin.bootstrap'
  | 'session.created'
  | 'session.signed'
  | 'session.absentPedestrianFilled'
  | 'org.created'
  | 'org.member_added'
  | 'org.member_role_updated'
  | 'org.member_removed'
  | 'org.member_left'
  | 'org.member_invited'
  | 'org.invite_accepted'
  | 'org.invite_revoked'
  | 'org.invite_resent';

interface AuditParams {
  event: AuditEvent;
  userId?: string | null;
  sessionId?: string | null;
  ip?: string | null;
  detail?: Record<string, unknown>;
}

/**
 * Log an audit event. Fire-and-forget — never throws.
 */
export function logAudit({ event, userId, sessionId, ip, detail }: AuditParams): void {
  // Fire-and-forget INSERT
  db.insert(auditLog)
    .values({
      event,
      userId: userId ?? null,
      sessionId: sessionId ?? null,
      ip: ip ?? null,
      detail: detail ?? {},
    })
    .then(() => {
      logger.debug('Audit logged', { event, userId: userId?.slice(0, 8) });
    })
    .catch((err) => {
      // Never let audit logging crash the app
      logger.warn('Audit log INSERT failed', { event, error: String(err) });
    });
}
