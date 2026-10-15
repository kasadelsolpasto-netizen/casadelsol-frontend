import test from 'node:test';
import assert from 'node:assert/strict';
import { titleMatches, impactLines, impactWarnings, orderDeleteNotes } from './delete-impact.ts';

const b = (orders = 0, tickets = 0, amount = 0) => ({ orders, tickets, amount });
const empty = () => ({
  orders: 0,
  not_completed: 0,
  scanned: 0,
  summary: { online: b(), cash_pending: b(), cash_settled: b(), free: b(), all: b() },
  walk_in: { count: 0, amount: 0 },
  courtesies: 0,
  promoter_codes: 0,
});

test('titleMatches: ignora mayúsculas y espacios de más, pero no acepta vacío ni otro nombre', () => {
  assert.equal(titleMatches('  fiesta DE prueba ', 'Fiesta de Prueba'), true);
  assert.equal(titleMatches('', 'Fiesta'), false);
  assert.equal(titleMatches('   ', '   '), false);
  assert.equal(titleMatches('Fiesta 2', 'Fiesta'), false);
});

test('impactLines: solo sale lo que existe', () => {
  assert.deepEqual(impactLines(empty()), []);
  const i = empty();
  i.summary.online = b(1, 2, 100000);
  i.summary.cash_pending = b(3, 5, 150000);
  i.not_completed = 2;
  i.walk_in = { count: 1, amount: 30000 };
  i.courtesies = 1;
  i.promoter_codes = 2;
  const lines = impactLines(i);
  assert.equal(lines.length, 6);
  assert.match(lines[0], /^1 compra online \(2 entradas, .*100\.000/);
  assert.match(lines[1], /^3 ventas de promotores en efectivo sin entregar \(5 entradas/);
  assert.match(lines[2], /^2 órdenes sin completar/);
  assert.match(lines[3], /^1 venta en puerta/);
  assert.equal(lines[4], '1 cortesía');
  assert.equal(lines[5], '2 códigos de promotor de este evento');
});

test('impactWarnings: escaneadas y reembolso solo cuando aplican', () => {
  assert.deepEqual(impactWarnings(empty()), []);
  const i = empty();
  i.scanned = 1;
  i.summary.online = b(1, 1, 50000);
  const w = impactWarnings(i);
  assert.equal(w.length, 2);
  assert.match(w[0], /^1 entrada ya se escaneó/);
  assert.match(w[1], /NO se devuelven solos/);
});

test('orderDeleteNotes: según tipo y si ya se usó', () => {
  const online = orderDeleteNotes({ kind: 'ONLINE', status: 'COMPLETED', scanned: 2 });
  assert.equal(online.length, 3);
  assert.match(online[0], /^2 entradas de esta orden ya se escanearon/);
  assert.match(online[1], /NO se devuelve solo/);
  assert.match(online[2], /vuelven a quedar disponibles/);

  assert.match(orderDeleteNotes({ kind: 'CASH_PENDING', status: 'COMPLETED' })[0], /no se le cobrará/i);
  assert.match(orderDeleteNotes({ kind: 'CASH_SETTLED', status: 'COMPLETED' })[0], /ya se había entregado/);

  // Pendiente / fallida: no llevó cupos ni se cobró, no hay nada que avisar.
  assert.deepEqual(orderDeleteNotes({ kind: 'ONLINE', status: 'PENDING' }), []);
});
