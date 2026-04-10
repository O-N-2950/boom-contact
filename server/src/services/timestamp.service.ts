import crypto from 'crypto';
import { logger } from '../logger.js';

const OTS_CALENDARS = [
  'https://a.pool.opentimestamps.org/digest',
  'https://b.pool.opentimestamps.org/digest',
];

/** Timeout for each calendar request (10 seconds) */
const CALENDAR_TIMEOUT_MS = 10_000;

export interface TimestampProof {
  sha256: string;
  otsProofBase64: string;
  calendarUrl: string;
  submittedAt: string;
}

/**
 * Submit a PDF's SHA-256 hash to OpenTimestamps calendars.
 * Returns the raw OTS proof bytes (base64-encoded).
 * The proof is "pending" until Bitcoin confirms (~1-2h).
 *
 * IMPORTANT: This never throws — if all calendars fail, returns a result
 * with empty proof (graceful degradation). PDF delivery is never blocked.
 */
export async function timestampPDF(pdfBuffer: Buffer): Promise<TimestampProof> {
  const sha256 = crypto.createHash('sha256').update(pdfBuffer).digest('hex');

  // Try each calendar until one responds
  for (const url of OTS_CALENDARS) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), CALENDAR_TIMEOUT_MS);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/vnd.opentimestamps.v1',
          'User-Agent': 'boom.contact/1.0',
        },
        body: Buffer.from(sha256, 'hex'),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (response.ok) {
        const proofBuffer = Buffer.from(await response.arrayBuffer());
        logger.info('[OTS] Timestamp proof obtained', { url, sha256: sha256.slice(0, 16) + '...' });
        return {
          sha256,
          otsProofBase64: proofBuffer.toString('base64'),
          calendarUrl: url,
          submittedAt: new Date().toISOString(),
        };
      }

      logger.warn('[OTS] Calendar returned non-OK status', { url, status: response.status });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.warn('[OTS] Calendar request failed', { url, error: message });
      continue;
    }
  }

  // If all calendars fail, return just the hash (graceful degradation)
  logger.warn('[OTS] All calendars failed — proof not created, returning hash only');
  return {
    sha256,
    otsProofBase64: '',
    calendarUrl: '',
    submittedAt: new Date().toISOString(),
  };
}

/**
 * Verify a document against its stored SHA-256 hash.
 */
export function verifyHash(pdfBuffer: Buffer, expectedSha256: string): boolean {
  const actual = crypto.createHash('sha256').update(pdfBuffer).digest('hex');
  return actual === expectedSha256;
}
