import { describe, it, expect } from 'vitest';

describe('maskEmail utility', () => {
  it('should mask a standard email', async () => {
    const { maskEmail } = await import('../logger.js');
    const m = maskEmail('john@example.com');
    expect(m).not.toBe('john@example.com');
    expect(m).toContain('@');
    expect(m).toMatch(/^jo/);
  });
  it('should handle short local parts', async () => {
    const { maskEmail } = await import('../logger.js');
    expect(maskEmail('a@b.com')).toContain('@');
  });
  it('should return *** for invalid input', async () => {
    const { maskEmail } = await import('../logger.js');
    expect(maskEmail('')).toBe('***');
    expect(maskEmail('noemail')).toBe('***');
  });
});

describe('makeId utility', () => {
  it('should generate IDs of correct length', async () => {
    const { makeId } = await import('../constants.js');
    expect(makeId(12)).toHaveLength(12);
  });
  it('should generate unique IDs', async () => {
    const { makeId } = await import('../constants.js');
    const ids = new Set(Array.from({ length: 100 }, () => makeId(16)));
    expect(ids.size).toBe(100);
  });
});

describe('escapeHtml utility', () => {
  it('should escape HTML special chars', async () => {
    const { escapeHtml } = await import('../routes/trpc.js');
    expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
    expect(escapeHtml('"q"')).toBe('&quot;q&quot;');
    expect(escapeHtml("it's")).toBe("it&#39;s");
  });
});

describe('NON_SIGNING_TYPES constant', () => {
  it('should include all expected types', async () => {
    const { NON_SIGNING_TYPES } = await import('../constants.js');
    expect(NON_SIGNING_TYPES).toContain('pedestrian');
    expect(NON_SIGNING_TYPES).toContain('bicycle');
    expect(NON_SIGNING_TYPES).toHaveLength(5);
  });
});
