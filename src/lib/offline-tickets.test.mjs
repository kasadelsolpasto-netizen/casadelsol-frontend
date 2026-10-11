// Pruebas de la copia local de entradas. Ejecutar:  npm run test:scan   (Node >= 22.18, sin dependencias extra)
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  OFFLINE_PREFIX,
  OFFLINE_TTL_MS,
  clearOfflineTickets,
  isTransientFailure,
  loadOffline,
  removeOffline,
  saveOffline,
} from './offline-tickets.ts';

/** localStorage de mentira (misma interfaz que el real). */
function fakeStorage(initial = {}, opts = {}) {
  const map = new Map(Object.entries(initial));
  return {
    map,
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => {
      if (opts.full) throw new Error('QuotaExceededError');
      map.set(k, v);
    },
    removeItem: (k) => void map.delete(k),
    key: (i) => [...map.keys()][i] ?? null,
    get length() {
      return map.size;
    },
  };
}

test('guarda y recupera una copia con su fecha', () => {
  const st = fakeStorage();
  assert.equal(saveOffline('ticket_abc', { token: 'abc', attendee_name: 'Ana' }, st, 1000), true);
  const got = loadOffline('ticket_abc', st, 2000);
  assert.deepEqual(got, { saved_at: 1000, data: { token: 'abc', attendee_name: 'Ana' } });
});

test('sin copia, o con la copia dañada, devuelve null (nunca lanza)', () => {
  const st = fakeStorage({ [OFFLINE_PREFIX + 'roto']: '{no es json', [OFFLINE_PREFIX + 'raro']: JSON.stringify({ x: 1 }) });
  assert.equal(loadOffline('no-existe', st), null);
  assert.equal(loadOffline('roto', st), null);
  assert.equal(loadOffline('raro', st), null);
});

test('la copia caduca a los 30 días y se borra sola', () => {
  const st = fakeStorage();
  saveOffline('t', { a: 1 }, st, 0);
  assert.notEqual(loadOffline('t', st, OFFLINE_TTL_MS - 1), null);
  assert.equal(loadOffline('t', st, OFFLINE_TTL_MS + 1), null);
  assert.equal(st.map.size, 0);
});

test('sin almacenamiento (modo privado) o con la cuota llena: no se rompe nada', () => {
  assert.equal(saveOffline('t', { a: 1 }, null), false);
  assert.equal(loadOffline('t', null), null);
  assert.equal(saveOffline('t', { a: 1 }, fakeStorage({}, { full: true })), false);
  assert.doesNotThrow(() => clearOfflineTickets(null));
});

test('cerrar sesión borra TODAS las copias de entradas y nada más', () => {
  const st = fakeStorage({
    [OFFLINE_PREFIX + 'ticket_1']: '{}',
    [OFFLINE_PREFIX + 'profile_9']: '{}',
    kasa_theme: 'dark',
  });
  clearOfflineTickets(st);
  assert.deepEqual([...st.map.keys()], ['kasa_theme']);
});

test('removeOffline borra solo esa copia', () => {
  const st = fakeStorage();
  saveOffline('a', 1, st);
  saveOffline('b', 2, st);
  removeOffline('a', st);
  assert.equal(loadOffline('a', st), null);
  assert.notEqual(loadOffline('b', st), null);
});

test('cuándo mostrar la copia: corte de red y errores del servidor sí; respuestas definitivas no', () => {
  assert.equal(isTransientFailure(null), true); // sin respuesta = sin red
  assert.equal(isTransientFailure(undefined), true);
  for (const s of [429, 500, 502, 503, 504]) assert.equal(isTransientFailure(s), true, String(s));
  for (const s of [400, 401, 403, 404]) assert.equal(isTransientFailure(s), false, String(s));
});
