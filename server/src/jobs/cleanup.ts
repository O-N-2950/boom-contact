/**
 * Periodic cleanup jobs — boom.contact
 * Cleans up expired sessions and magic tokens every hour.
 */
import { logger } from '../logger.js';

export function startCleanupJobs() {
  // ── Clean expired magic tokens every hour ──────────────────
  setInterval(async () => {
    try {
      const { db } = await import('../db/index.js');
      const { magicTokens } = await import('../db/schema.js');
      const { lt, and, isNotNull } = await import('drizzle-orm');

      // Delete magic tokens that expired more than 24h ago (keep recent for debugging)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const result = await db.delete(magicTokens)
        .where(lt(magicTokens.expiresAt, oneDayAgo));
      // result type depends on driver, log info only
      logger.info('[Cleanup] Expired magic tokens cleaned');
    } catch (e) {
      logger.warn('[Cleanup] Magic token cleanup failed', { error: String(e) });
    }
  }, 60 * 60 * 1000).unref();

  logger.info('[Cleanup] Periodic cleanup jobs started (hourly)');
}
