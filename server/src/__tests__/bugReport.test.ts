import { describe, it, expect } from 'vitest';
import { validateBugReport, friendlyError, isValidEmail, MIN_MESSAGE } from '../../../client/src/components/bugReportUtils';

describe('bugReport — validation client', () => {
  it('refuse un message trop court (< 5, comme le serveur)', () => {
    const v = validateBugReport('test', '');
    expect(v.messageOk).toBe(false);
    expect(v.messageTooShort).toBe(true);
    expect(v.canSend).toBe(false);
  });
  it('accepte un message >= 5 sans email', () => {
    const v = validateBugReport('bonjour', '');
    expect(v.canSend).toBe(true);
  });
  it('accepte un message valide + email valide', () => {
    const v = validateBugReport('ceci est un bug', 'olivier.neukomm@bluewin.ch');
    expect(v.emailOk).toBe(true);
    expect(v.canSend).toBe(true);
  });
  it('refuse un email rempli mais invalide', () => {
    const v = validateBugReport('ceci est un bug', 'pasunemail');
    expect(v.emailOk).toBe(false);
    expect(v.canSend).toBe(false);
  });
  it('ignore les espaces (trim) pour la longueur', () => {
    expect(validateBugReport('   ab   ', '').messageOk).toBe(false);
  });
  it('MIN_MESSAGE est aligné avec le serveur (5)', () => {
    expect(MIN_MESSAGE).toBe(5);
  });
});

describe('isValidEmail', () => {
  it.each([
    ['olivier.neukomm@bluewin.ch', true],
    ['a@b.co', true],
    ['pasunemail', false],
    ['a@b', false],
    ['@b.co', false],
    ['a@.co', false],
    ['', false],
  ])('%s -> %s', (input, expected) => {
    expect(isValidEmail(input as string)).toBe(expected);
  });
});

describe('friendlyError — ne montre JAMAIS d erreur brute', () => {
  it('erreur de validation Zod brute (tableau JSON) -> message propre', () => {
    const rawZod = '[ { "code": "too_small", "minimum": 5, "message": "String must contain at least 5 character(s)", "path": ["message"] } ]';
    const out = friendlyError({ message: rawZod, data: { code: 'BAD_REQUEST' } });
    expect(out).not.toContain('too_small');
    expect(out).not.toContain('[');
    expect(out).toContain('caractères');
  });
  it('objet JSON brut -> message generique propre', () => {
    const out = friendlyError({ message: '{"foo":"bar"}' });
    expect(out.startsWith('{')).toBe(false);
    expect(out).toContain('Envoi impossible');
  });
  it('rate limit -> message dédié', () => {
    expect(friendlyError({ data: { code: 'TOO_MANY_REQUESTS' } })).toContain('Trop');
  });
  it('message serveur lisible -> conservé', () => {
    expect(friendlyError({ message: 'Connexion requise.' })).toBe('Connexion requise.');
  });
  it('erreur inconnue -> fallback propre, jamais vide', () => {
    expect(friendlyError(undefined).length).toBeGreaterThan(0);
  });
});
