// WinWin SSO Integration Service
// Base URL : https://www.winwin.swiss
// Secret   : partagé via env WINWIN_SECRET

import { logger } from '../logger.js';

const WINWIN_BASE   = 'https://www.winwin.swiss';
const WINWIN_SECRET = process.env.WINWIN_SECRET || '';

export interface WinWinClient {
  email:      string;
  firstName:  string;
  lastName:   string;
  phone?:     string;
  address?:   string;
  city?:      string;
  postalCode?: string;
  country?:   string;
  language?:  string;
  winwinId:   string;
}

export interface WinWinVehicle {
  plate:            string;
  make:             string;
  model:            string;
  year?:            string;
  color?:           string;
  category?:        string;
  insurerName?:     string;
  policyNumber?:    string;
  policyValidUntil?: string;
}

// ── Vérifier identité WinWin ──────────────────────────────────
// Retourne le profil client si les credentials sont valides
export async function verifyWinWin(
  email: string,
  password: string
): Promise<WinWinClient | null> {
  if (!WINWIN_SECRET) {
    logger.warn('WINWIN_SECRET non configuré');
    return null;
  }

  try {
    const res = await fetch(`${WINWIN_BASE}/api/boom/auth/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${WINWIN_SECRET}`,
      },
      body: JSON.stringify({ email, password }),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      logger.warn('WinWin verify HTTP error', { status: res.status });
      return null;
    }

    const data = await res.json();
    if (!data.ok || !data.client) return null;

    logger.info('WinWin verify success', { email, winwinId: data.client.winwinId });
    return data.client as WinWinClient;

  } catch (err) {
    logger.error('WinWin verify error', { error: String(err) });
    return null;
  }
}

// ── Récupérer les véhicules WinWin ────────────────────────────
export async function getWinWinVehicles(
  winwinId: string
): Promise<WinWinVehicle[]> {
  if (!WINWIN_SECRET) return [];

  try {
    const res = await fetch(`${WINWIN_BASE}/api/boom/auth/garage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${WINWIN_SECRET}`,
      },
      body: JSON.stringify({ winwinId }),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      logger.warn('WinWin garage HTTP error', { status: res.status });
      return [];
    }

    const data = await res.json();
    if (!data.ok || !Array.isArray(data.vehicles)) return [];

    logger.info('WinWin garage success', { winwinId, count: data.vehicles.length });
    return data.vehicles as WinWinVehicle[];

  } catch (err) {
    logger.error('WinWin garage error', { error: String(err) });
    return [];
  }
}

// ── Générer un magic link WinWin ──────────────────────────────
export async function requestWinWinMagicLink(
  email: string
): Promise<{ token: string; expiresAt: string } | null> {
  if (!WINWIN_SECRET) return null;

  try {
    const res = await fetch(`${WINWIN_BASE}/api/boom/auth/magic-link`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${WINWIN_SECRET}`,
      },
      body: JSON.stringify({ email }),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return null;
    const data = await res.json();
    if (!data.ok || !data.token) return null;

    return { token: data.token, expiresAt: data.expiresAt };

  } catch (err) {
    logger.error('WinWin magic-link error', { error: String(err) });
    return null;
  }
}

// ── Vérifier si un email est client WinWin ───────────────────
// Retourne true si l'email existe dans WinWin (sans credentials)
export async function checkWinWinEmail(
  email: string
): Promise<{ exists: boolean; firstName?: string }> {
  if (!WINWIN_SECRET || !email) return { exists: false };

  try {
    const res = await fetch(`${WINWIN_BASE}/api/boom/auth/check-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${WINWIN_SECRET}`,
      },
      body: JSON.stringify({ email }),
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return { exists: false };
    const data = await res.json();
    if (!data.ok) return { exists: false };

    logger.info('WinWin check-email hit', { email });
    return { exists: true, firstName: data.firstName };

  } catch {
    // WinWin indisponible ou endpoint pas encore déployé → silencieux
    return { exists: false };
  }
}

