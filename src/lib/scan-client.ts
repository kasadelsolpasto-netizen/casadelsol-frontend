/**
 * Cliente de escaneo para la puerta. Sin dependencias de React ni del navegador (se puede probar en Node).
 *
 * Reglas que antes NO existían:
 *  - Cada resultado del servidor se clasifica por su `code` / status HTTP: un 401 (sesión vencida),
 *    un 429 (límite), un 5xx o un corte de red YA NO se muestran como "QR inválido" ni "YA QUEMADO".
 *  - Reintentos automáticos con espera creciente ante corte de red, timeout, 5xx y 429.
 *  - Cada lectura lleva un `scan_id`: si la respuesta se pierde, el reintento es seguro (el servidor
 *    devuelve el mismo resultado en vez de decir "ya quemado").
 *  - Ante un 401 intenta renovar la sesión UNA vez y repite la misma lectura.
 */

export type ScanOutcome =
  | { kind: 'ok'; data: any; replayed: boolean }
  | { kind: 'already_used'; message: string; usedAt?: string; usedBy?: string }
  | { kind: 'wrong_event'; message: string }
  | { kind: 'invalid'; message: string }
  | { kind: 'forbidden'; message: string }
  | { kind: 'session_expired' }
  | { kind: 'rate_limited'; retryAfterSec: number | null }
  | { kind: 'server_error'; message: string; status: number }
  | { kind: 'network'; message: string };

export type ScanResult = ScanOutcome & {
  /** Id de la lectura (reutilizar en un reintento manual). */
  scanId: string;
  /** true si la petición pudo haber llegado al servidor sin que viéramos la respuesta. */
  maybeProcessed: boolean;
  attempts: number;
};

export function classifyResponse(status: number, body: any, retryAfterHeader?: string | null): ScanOutcome {
  const message: string = typeof body?.message === 'string' ? body.message : Array.isArray(body?.message) ? body.message.join(' ') : '';
  const code: string | undefined = body?.code;

  if (status >= 200 && status < 300) return { kind: 'ok', data: body, replayed: body?.replayed === true };
  if (status === 401) return { kind: 'session_expired' };
  if (status === 403) {
    return {
      kind: 'forbidden',
      message: code === 'NOT_STAFF' || !message ? 'Tu cuenta no tiene permisos de staff (¿está en descanso?).' : message,
    };
  }
  if (status === 429) {
    const n = retryAfterHeader ? Number(retryAfterHeader) : NaN;
    return { kind: 'rate_limited', retryAfterSec: Number.isFinite(n) && n >= 0 ? n : null };
  }
  if (status >= 500) return { kind: 'server_error', status, message: message || 'El servidor no respondió bien.' };

  // 400 / 404 / otros 4xx
  if (code === 'ALREADY_USED') return { kind: 'already_used', message, usedAt: body?.used_at, usedBy: body?.used_by };
  if (code === 'WRONG_EVENT') return { kind: 'wrong_event', message: message || 'Esta entrada es para otro evento.' };
  if (code === 'INVALID' || code === 'BAD_REQUEST') return { kind: 'invalid', message: message || 'QR inválido' };

  // Compatibilidad con un backend que todavía no envía `code`
  if (/YA QUEMADO|YA UTILIZADA/i.test(message)) return { kind: 'already_used', message };
  if (/EVENTO INCORRECTO/i.test(message)) return { kind: 'wrong_event', message };
  return { kind: 'invalid', message: message || 'QR inválido' };
}

export interface PostScanOptions {
  url: string;
  body: Record<string, unknown>;
  getToken: () => string | null;
  /** Renueva la sesión y devuelve el token nuevo (o null si ya no se puede). */
  refreshToken?: () => Promise<string | null>;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  maxAttempts?: number;
  backoffMs?: number[];
  /** Máximo que se espera un Retry-After de un 429 antes de rendirse y avisar. */
  maxRetryAfterWaitMs?: number;
  sleep?: (ms: number) => Promise<void>;
  /** Reutilizar el id de una lectura anterior (reintento manual). */
  scanId?: string;
  /** El intento anterior pudo haber llegado al servidor (reintento manual tras corte). */
  assumeSent?: boolean;
  /** false para rutas sin idempotencia (cédula): no se repite solo tras un corte, evita doble quemado. */
  autoRetryUnsafe?: boolean;
  onRetry?: (attempt: number, reason: string) => void;
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function newScanId(): string {
  const c: any = typeof globalThis !== 'undefined' ? (globalThis as any).crypto : undefined;
  if (c?.randomUUID) return c.randomUUID();
  return `scan-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function postScan(o: PostScanOptions): Promise<ScanResult> {
  const doFetch = o.fetchImpl ?? fetch;
  const sleep = o.sleep ?? defaultSleep;
  const timeoutMs = o.timeoutMs ?? 10000;
  const maxAttempts = o.maxAttempts ?? 4;
  const backoff = o.backoffMs ?? [600, 1500, 3000];
  const maxRetryAfterWaitMs = o.maxRetryAfterWaitMs ?? 4000;
  const autoRetryUnsafe = o.autoRetryUnsafe ?? true;
  const scanId = o.scanId ?? newScanId();

  let maybeProcessed = o.assumeSent === true;
  let refreshed = false;
  let attempts = 0;
  let last: ScanOutcome = { kind: 'network', message: 'Sin respuesta del servidor.' };

  const finish = (outcome: ScanOutcome): ScanResult => ({ ...outcome, scanId, maybeProcessed, attempts });

  while (attempts < maxAttempts) {
    attempts++;
    const token = o.getToken();
    if (!token) return finish({ kind: 'session_expired' });

    let outcome: ScanOutcome;
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => ctrl.abort(), timeoutMs) : null;
    try {
      const res = await doFetch(o.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...o.body, scan_id: scanId, retry: maybeProcessed }),
        signal: ctrl?.signal,
      });
      let body: any = null;
      try {
        body = await res.json();
      } catch {
        body = null; // 502/504 de Render suelen venir como HTML
      }
      outcome = classifyResponse(res.status, body, res.headers?.get?.('retry-after'));
    } catch (e: any) {
      outcome = {
        kind: 'network',
        message: e?.name === 'AbortError' ? 'El servidor tardó demasiado en responder.' : 'Sin conexión con el servidor.',
      };
    } finally {
      if (timer) clearTimeout(timer);
    }
    last = outcome;

    switch (outcome.kind) {
      case 'session_expired': {
        if (!refreshed && o.refreshToken) {
          refreshed = true;
          const fresh = await o.refreshToken();
          if (fresh) continue; // la petición NO se procesó (401): se repite igual con el token nuevo
        }
        return finish(outcome);
      }
      case 'rate_limited': {
        if (attempts >= maxAttempts) return finish(outcome);
        const wait = outcome.retryAfterSec != null ? outcome.retryAfterSec * 1000 : backoff[Math.min(attempts - 1, backoff.length - 1)];
        if (wait > maxRetryAfterWaitMs) return finish(outcome);
        o.onRetry?.(attempts, 'rate_limited');
        await sleep(wait);
        continue;
      }
      case 'network':
      case 'server_error': {
        maybeProcessed = true; // puede que el servidor sí lo haya procesado
        if (!autoRetryUnsafe || attempts >= maxAttempts) return finish(outcome);
        o.onRetry?.(attempts, outcome.kind);
        await sleep(backoff[Math.min(attempts - 1, backoff.length - 1)]);
        continue;
      }
      default:
        return finish(outcome);
    }
  }
  return finish(last);
}
