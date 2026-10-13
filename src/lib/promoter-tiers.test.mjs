// Pruebas de los escalones de promotor (pantalla). Ejecutar:  npm run test:scan   (Node >= 22.18, sin dependencias extra)
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  discountedTotal,
  draftsFromTiers,
  draftsToPayload,
  formatTierDate,
  tierMessage,
  tierStatus,
  toDateInput,
  validateDrafts,
} from './promoter-tiers.ts';

const DAY = 24 * 60 * 60 * 1000;
const now = new Date('2026-10-10T15:00:00.000Z');
const row = (over = {}) => ({ id: 'a', position: 1, quantity: 10, sold: 0, discount_perc: 20, valid_until: null, ...over });

test('fechas: se muestran en hora de Colombia (el límite del 15 oct llega como 16 oct 04:59 UTC)', () => {
  assert.equal(toDateInput('2026-10-16T04:59:59.999Z'), '2026-10-15');
  assert.match(formatTierDate('2026-10-16T04:59:59.999Z'), /^15 oct$/);
  assert.equal(toDateInput(null), '');
  assert.equal(toDateInput('basura'), '');
  assert.equal(formatTierDate(undefined), '');
});

test('el editor convierte escalones a filas y de vuelta al formato del servidor, en orden', () => {
  const drafts = draftsFromTiers([
    row({ id: 'b', position: 2, discount_perc: 10 }),
    row({ id: 'a', position: 1, sold: 4, valid_until: '2026-10-16T04:59:59.999Z' }),
  ]);
  assert.deepEqual(drafts.map((d) => d.id), ['a', 'b']);
  assert.equal(drafts[0].valid_until, '2026-10-15');
  assert.equal(drafts[0].sold, 4);
  const payload = draftsToPayload([...drafts, { quantity: '5', discount_perc: '0', valid_until: '' }]);
  assert.deepEqual(payload[0], { id: 'a', quantity: 10, discount_perc: 20, valid_until: '2026-10-15' });
  assert.deepEqual(payload[2], { quantity: 5, discount_perc: 0, valid_until: null });
});

test('validación del editor: cantidad entera >= 1, descuento 0-100 y nunca menos de lo vendido', () => {
  const ok = { quantity: '10', discount_perc: '20', valid_until: '' };
  assert.equal(validateDrafts([ok]), null);
  assert.equal(validateDrafts([]), null);
  assert.match(validateDrafts([{ ...ok, quantity: '' }]), /Escalón 1: escribe cuántas/);
  assert.match(validateDrafts([ok, { ...ok, quantity: '0' }]), /Escalón 2: escribe cuántas/);
  assert.match(validateDrafts([{ ...ok, quantity: '2.5' }]), /Escalón 1/);
  assert.match(validateDrafts([{ ...ok, discount_perc: '101' }]), /entre 0 y 100/);
  assert.match(validateDrafts([{ ...ok, discount_perc: '' }]), /entre 0 y 100/);
  assert.match(validateDrafts([{ ...ok, quantity: '3', sold: 5 }]), /ya vendió 5/);
  assert.equal(validateDrafts([{ ...ok, quantity: '5', sold: 5 }]), null);
  assert.match(validateDrafts(Array.from({ length: 21 }, () => ok)), /Máximo 20/);
});

test('estado de cada escalón: vigente, en espera, agotado o vencido', () => {
  const tiers = [
    row({ id: 'a', position: 1, quantity: 5, sold: 5 }),
    row({ id: 'b', position: 2, valid_until: new Date(now.getTime() - DAY).toISOString() }),
    row({ id: 'c', position: 3, sold: 2 }),
    row({ id: 'd', position: 4 }),
  ];
  assert.deepEqual(tiers.map((t) => tierStatus(t, tiers, now)), ['done', 'expired', 'current', 'waiting']);
});

test('mensaje para el promotor: cuántas quedan, hasta cuándo y qué viene después', () => {
  const cur = { id: 'a', discount_perc: 20, remaining: 6, quantity: 10, valid_until: '2026-10-16T04:59:59.999Z' };
  const nxt = { id: 'b', discount_perc: 10, remaining: 10, quantity: 10, valid_until: null };
  assert.equal(tierMessage(cur, nxt), 'Te quedan 6 entradas al 20% hasta el 15 oct. Luego 10 entradas al 10%.');
  assert.equal(tierMessage({ ...cur, remaining: 1, valid_until: null }, null), 'Te queda 1 entrada al 20%.');
  assert.equal(tierMessage(null, null), 'Sin descuentos vigentes.');
});

test('total con descuento: redondeo en centavos igual que el servidor', () => {
  assert.equal(discountedTotal(50000, 20, 4), 160000);
  assert.equal(discountedTotal(50000, 0, 2), 100000);
  assert.equal(discountedTotal(50000, 150, 1), 0); // nunca negativo
  assert.equal(discountedTotal(0.1, 0, 3), 0.3); // 0.1 * 3 con flotantes daba 0.30000000000000004
  assert.equal(discountedTotal(49990, 15, 3), 127474.5);
});
