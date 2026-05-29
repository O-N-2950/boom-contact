import { describe, it, expect } from 'vitest';
import { resolveClientUrl } from '../config';

describe('resolveClientUrl — le lien magique doit toujours etre absolu', () => {
  it('CLIENT_URL explicite est prioritaire', () => {
    expect(resolveClientUrl({ CLIENT_URL: 'https://app.example.com' } as any)).toBe('https://app.example.com');
  });
  it('sans CLIENT_URL mais avec RAILWAY_PUBLIC_DOMAIN -> https://<domaine>', () => {
    expect(resolveClientUrl({ RAILWAY_PUBLIC_DOMAIN: 'www.boom.contact' } as any)).toBe('https://www.boom.contact');
  });
  it('rien de defini -> fallback domaine de prod (jamais vide)', () => {
    expect(resolveClientUrl({} as any)).toBe('https://www.boom.contact');
  });
  it('CLIENT_URL vide est ignore au profit du fallback', () => {
    expect(resolveClientUrl({ CLIENT_URL: '   ', RAILWAY_PUBLIC_DOMAIN: 'www.boom.contact' } as any)).toBe('https://www.boom.contact');
  });
  it('le resultat est TOUJOURS une URL absolue (regression du lien /?magic=)', () => {
    for (const env of [{}, { CLIENT_URL: '' }, { RAILWAY_PUBLIC_DOMAIN: 'x.up.railway.app' }] as any[]) {
      const url = resolveClientUrl(env);
      expect(url.startsWith('https://')).toBe(true);
      // un lien magique construit dessus n'est jamais relatif
      expect(`${url}/?magic=TOKEN`.startsWith('https://')).toBe(true);
    }
  });
});
