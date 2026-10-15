/**
 * Llamadas al backend con la sesión del usuario (cookie `kasa_auth_token`). Si el servidor responde con error lanza
 * un `ApiError` con el mensaje YA en español que mandó el servidor (o uno claro si no mandó ninguno).
 */
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export function authToken(): string | null {
  if (typeof document === 'undefined') return null;
  const row = document.cookie.split('; ').find((r) => r.startsWith('kasa_auth_token='));
  return row ? row.split('=')[1] : null;
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function apiFetch<T = any>(path: string, init: { method?: string; body?: unknown; signal?: AbortSignal } = {}): Promise<T> {
  const token = authToken();
  const res = await fetch(`${API_URL}${path}`, {
    method: init.method ?? 'GET',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    signal: init.signal,
  });
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    // respuesta sin cuerpo
  }
  if (!res.ok) {
    const m = data?.message;
    const text = Array.isArray(m) ? m.join(' ') : typeof m === 'string' ? m : '';
    throw new ApiError(
      res.status,
      text ||
        (res.status === 429
          ? 'Demasiadas consultas seguidas. Espera unos segundos e intenta de nuevo.'
          : res.status === 401 || res.status === 403
            ? 'No tienes permiso para esto. Vuelve a iniciar sesión.'
            : 'No se pudo completar la acción. Intenta de nuevo.'),
    );
  }
  return data as T;
}

/** Arma una URL con parámetros, omitiendo los vacíos. */
export function withQuery(path: string, params: Record<string, string | number | null | undefined>): string {
  const q = Object.entries(params)
    .filter(([, v]) => v !== null && v !== undefined && String(v) !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  return q ? `${path}?${q}` : path;
}
