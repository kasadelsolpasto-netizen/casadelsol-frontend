/**
 * Sesión del usuario en el navegador (cookie `kasa_auth_token` + localStorage `kasa_user`).
 *
 * - `setAuthCookie` hace que la cookie dure EXACTAMENTE lo que dura el JWT (antes estaba fija en
 *   24 h aunque el token del staff durara más, o menos).
 * - `refreshSession` renueva el token contra el backend y trae el rol REAL de la base de datos
 *   (ascensos a staff, "descanso"), de modo que nadie tenga que cerrar sesión para que se note.
 * - `authFetch` añade el token y, si el servidor responde 401, renueva la sesión y reintenta una vez.
 */

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const COOKIE_NAME = 'kasa_auth_token';
const MAX_COOKIE_SECONDS = 60 * 60 * 24 * 30;

export function getAuthToken(): string | null {
  if (typeof document === 'undefined') return null;
  const row = document.cookie.split('; ').find((r) => r.startsWith(COOKIE_NAME + '='));
  return row ? row.slice(COOKIE_NAME.length + 1) : null;
}

export function decodeJwtPayload(token: string): { exp?: number; iat?: number; role?: string; sub?: string } | null {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    let b64 = part.replace(/-/g, '+').replace(/_/g, '/');
    b64 += '='.repeat((4 - (b64.length % 4)) % 4);
    return JSON.parse(atob(b64));
  } catch {
    return null;
  }
}

/** Guarda el token en la cookie con una vida igual a la del JWT. */
export function setAuthCookie(token: string): void {
  const payload = decodeJwtPayload(token);
  const left = payload?.exp ? Math.floor(payload.exp - Date.now() / 1000) : 86400;
  const maxAge = Math.max(60, Math.min(left, MAX_COOKIE_SECONDS));
  const secure = typeof location !== 'undefined' && location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${COOKIE_NAME}=${token}; path=/; max-age=${maxAge}; SameSite=Lax${secure}`;
}

export type RefreshResult =
  | { ok: true; token: string; user: { id: string; email?: string; name?: string; role: string } }
  | { ok: false; reason: 'expired' | 'network' | 'server' };

let inflightRefresh: Promise<RefreshResult> | null = null;

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function doRefresh(): Promise<RefreshResult> {
  const token = getAuthToken();
  if (!token) return { ok: false, reason: 'expired' };
  try {
    const res = await fetchWithTimeout(
      `${API_URL}/auth/refresh`,
      { method: 'POST', headers: { Authorization: `Bearer ${token}` } },
      10000,
    );
    if (res.status === 401) return { ok: false, reason: 'expired' };
    if (!res.ok) return { ok: false, reason: 'server' };
    const data = await res.json();
    if (!data?.access_token) return { ok: false, reason: 'server' };

    setAuthCookie(data.access_token);
    try {
      const prev = JSON.parse(localStorage.getItem('kasa_user') || '{}');
      localStorage.setItem('kasa_user', JSON.stringify({ ...prev, ...data.user }));
      window.dispatchEvent(new Event('storage'));
    } catch {
      /* localStorage no disponible: la cookie ya quedó guardada */
    }
    return { ok: true, token: data.access_token, user: data.user };
  } catch {
    return { ok: false, reason: 'network' };
  }
}

/** Renueva la sesión (varias llamadas simultáneas comparten una sola petición). */
export function refreshSession(): Promise<RefreshResult> {
  if (!inflightRefresh) {
    inflightRefresh = doRefresh().finally(() => {
      inflightRefresh = null;
    });
  }
  return inflightRefresh;
}

/** fetch con el token puesto; ante un 401 renueva la sesión y reintenta UNA vez. */
export async function authFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const send = (token: string | null) =>
    fetch(url, {
      ...init,
      headers: { ...(init.headers as Record<string, string> | undefined), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });

  const res = await send(getAuthToken());
  if (res.status !== 401) return res;
  const refreshed = await refreshSession();
  return refreshed.ok ? send(refreshed.token) : res;
}
