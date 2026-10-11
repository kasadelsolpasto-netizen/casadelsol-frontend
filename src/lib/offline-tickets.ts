/**
 * Copia local de las entradas para poder mostrar el QR en la puerta aunque NO haya señal o el servidor
 * (Render) esté dormido o caído. Sin dependencias de React: se prueba en Node (npm run test:scan).
 *
 * Privacidad: la copia incluye nombres y documentos de los asistentes, así que se borra al cerrar sesión
 * (clearOfflineTickets) y caduca sola a los 30 días.
 */

export const OFFLINE_PREFIX = 'kasa_offline_';
export const OFFLINE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  key(index: number): string | null;
  readonly length: number;
}

export interface OfflineCopy<T = any> {
  saved_at: number;
  data: T;
}

function defaultStorage(): StorageLike | null {
  try {
    return typeof window !== 'undefined' && window.localStorage ? window.localStorage : null;
  } catch {
    return null; // modo privado / almacenamiento bloqueado
  }
}

/** Guarda una copia. Nunca lanza: si no hay almacenamiento, simplemente no hay copia. */
export function saveOffline(name: string, data: unknown, storage: StorageLike | null = defaultStorage(), now: number = Date.now()): boolean {
  if (!storage) return false;
  try {
    const copy: OfflineCopy = { saved_at: now, data };
    storage.setItem(OFFLINE_PREFIX + name, JSON.stringify(copy));
    return true;
  } catch {
    return false; // cuota llena, etc.
  }
}

/** Lee una copia vigente (o null si no existe, está dañada o caducó). */
export function loadOffline<T = any>(name: string, storage: StorageLike | null = defaultStorage(), now: number = Date.now()): OfflineCopy<T> | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(OFFLINE_PREFIX + name);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.saved_at !== 'number' || !('data' in parsed)) return null;
    if (now - parsed.saved_at > OFFLINE_TTL_MS) {
      storage.removeItem(OFFLINE_PREFIX + name);
      return null;
    }
    return parsed as OfflineCopy<T>;
  } catch {
    return null;
  }
}

export function removeOffline(name: string, storage: StorageLike | null = defaultStorage()): void {
  try {
    storage?.removeItem(OFFLINE_PREFIX + name);
  } catch {
    /* nada que hacer */
  }
}

/** Borra TODAS las copias (cerrar sesión en un dispositivo compartido). */
export function clearOfflineTickets(storage: StorageLike | null = defaultStorage()): void {
  if (!storage) return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < storage.length; i++) {
      const k = storage.key(i);
      if (k && k.startsWith(OFFLINE_PREFIX)) keys.push(k);
    }
    keys.forEach((k) => storage.removeItem(k));
  } catch {
    /* nada que hacer */
  }
}

/**
 * ¿Conviene mostrar la copia local en vez de un error? Sí cuando el problema es de conexión o del
 * servidor (corte de red, 5xx, 429). NO cuando el servidor respondió algo definitivo (404, 401, 403).
 */
export function isTransientFailure(status: number | null | undefined): boolean {
  return status == null || status === 429 || status >= 500;
}

export function formatSavedAt(ts: number): string {
  try {
    return new Date(ts).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return '';
  }
}
