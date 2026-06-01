import { describe, it, expect } from 'vitest';
import {
  EVENTS, ALLOWED_EVENT_NAMES, sanitizeProps, isForbiddenKey,
  creditsBucket, isValidEventName, VEHICLE_SOURCES,
} from '../../../client/src/analytics-events';

describe('analytics — sanitisation privacy (jamais de PII)', () => {
  it('supprime les clés sensibles (email, nom, plaque, téléphone, transcript, pdf...)', () => {
    const out = sanitizeProps({
      email: 'a@b.com', userEmail: 'x@y.fr', firstName: 'Jean', lastName: 'Dupont',
      plate: 'JU12345', licensePlate: 'VD1', phone: '079', address: 'Rue X',
      gps: '46.5,7.5', lat: 46.5, transcript: 'blabla', pdfContent: '...', vin: 'WVW',
      description: 'récit accident', iban: 'CH..', password: 'x',
    });
    expect(Object.keys(out)).toHaveLength(0);
  });
  it('supprime une valeur ressemblant à un email même sur clé neutre', () => {
    expect(sanitizeProps({ ref: 'contact me at a@b.com' })).toEqual({});
  });
  it('supprime les chaînes trop longues (texte libre)', () => {
    expect(sanitizeProps({ note: 'x'.repeat(80) })).toEqual({});
  });
  it('conserve les propriétés sûres (language, source, loggedIn, count, step)', () => {
    const out = sanitizeProps({ language: 'de', source: 'garage', loggedIn: true, count: 3, step: 'sign' });
    expect(out).toEqual({ language: 'de', source: 'garage', loggedIn: true, count: 3, step: 'sign' });
  });
  it('isForbiddenKey détecte par sous-chaîne insensible à la casse', () => {
    expect(isForbiddenKey('userEmail')).toBe(true);
    expect(isForbiddenKey('PlateNumber')).toBe(true);
    expect(isForbiddenKey('source')).toBe(false);
    expect(isForbiddenKey('language')).toBe(false);
  });
  it('ne crashe jamais sur entrée vide / undefined', () => {
    expect(sanitizeProps()).toEqual({});
    expect(sanitizeProps({})).toEqual({});
  });
});

describe('analytics — taxonomie', () => {
  it('tous les noms d\'events sont uniques', () => {
    const names = Object.values(EVENTS);
    expect(new Set(names).size).toBe(names.length);
  });
  it('les noms MVP critiques existent', () => {
    for (const n of ['landing_viewed','cta_start_constat_clicked','auth_login_success',
      'garage_viewed','constat_started','constat_vehicle_source_selected',
      'payment_success','pdf_generation_success','participant_joined_via_qr']) {
      expect(ALLOWED_EVENT_NAMES.has(n)).toBe(true);
      expect(isValidEventName(n)).toBe(true);
    }
  });
  it('rejette un nom hors taxonomie', () => {
    expect(isValidEventName('random_event_xyz')).toBe(false);
  });
  it('sources véhicule = garage|organization_garage|scan|manual', () => {
    expect([...VEHICLE_SOURCES].sort()).toEqual(['garage','manual','organization_garage','scan']);
  });
  it('creditsBucket ne révèle pas le compte exact', () => {
    expect(creditsBucket(0)).toBe('0');
    expect(creditsBucket(1)).toBe('1');
    expect(creditsBucket(2)).toBe('2-3');
    expect(creditsBucket(7)).toBe('4-10');
    expect(creditsBucket(42)).toBe('10+');
  });
});
