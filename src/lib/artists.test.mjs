import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMoney, balanceInfo, fmtDate, inviteExpiryText, courtesyRemaining, isEventOver, courtesyStatusText } from './artists.ts';

test('parseMoney: números simples y con separador de miles', () => {
  assert.equal(parseMoney('1500000'), 1500000);
  assert.equal(parseMoney('1.500.000'), 1500000);
  assert.equal(parseMoney('1,500,000'), 1500000);
  assert.equal(parseMoney('$ 1.500.000'), 1500000);
  assert.equal(parseMoney('  200000  '), 200000);
  assert.equal(parseMoney('1.500'), 1500);
});

test('parseMoney: decimales de hasta 2 cifras', () => {
  assert.equal(parseMoney('1500.50'), 1500.5);
  assert.equal(parseMoney('1500,5'), 1500.5);
});

test('parseMoney: lo que no es un número claro es null (nunca adivina)', () => {
  for (const bad of ['', '   ', 'abc', '12abc', '1.2.3', '-5', '1.500.00', '$', '1e6']) {
    assert.equal(parseMoney(bad), null, `"${bad}" debería ser null`);
  }
});

test('balanceInfo: debemos / al día / pagado de más', () => {
  assert.deepEqual(balanceInfo(500000), { tone: 'owed', label: 'Se le debe', amount: 500000 });
  assert.deepEqual(balanceInfo(0), { tone: 'clear', label: 'Al día', amount: 0 });
  assert.deepEqual(balanceInfo(-50), { tone: 'over', label: 'Pagado de más', amount: 50 });
  assert.equal(balanceInfo(NaN).tone, 'clear');
});

test('fmtDate: vacío o inválido da texto vacío', () => {
  assert.equal(fmtDate(null), '');
  assert.equal(fmtDate('no es fecha'), '');
  assert.ok(fmtDate('2026-11-05T15:00:00Z').includes('2026'));
});

test('inviteExpiryText: vence en N días, mañana, hoy o venció', () => {
  const now = Date.parse('2026-10-28T12:00:00Z');
  assert.equal(inviteExpiryText('2026-11-04T12:00:00Z', false, now), 'Vence en 7 días');
  assert.equal(inviteExpiryText('2026-10-29T10:00:00Z', false, now), 'Vence mañana');
  assert.equal(inviteExpiryText('2026-10-28T18:00:00Z', false, now), 'Vence mañana');
  assert.equal(inviteExpiryText('2026-10-28T11:00:00Z', false, now), 'Vence hoy');
  assert.equal(inviteExpiryText('2026-10-20T11:00:00Z', true, now), 'Venció');
});

test('courtesyRemaining: cupo menos las ya entregadas, nunca negativo', () => {
  assert.equal(courtesyRemaining({ courtesy_quota: 2, courtesies: [] }), 2);
  assert.equal(courtesyRemaining({ courtesy_quota: 2, courtesies: [{}] }), 1);
  assert.equal(courtesyRemaining({ courtesy_quota: 2, courtesies: [{}, {}] }), 0);
  assert.equal(courtesyRemaining({ courtesy_quota: 1, courtesies: [{}, {}] }), 0);
  assert.equal(courtesyRemaining({ courtesy_quota: 0, courtesies: [] }), 0);
});

test('isEventOver: pasa un dia despues del evento (igual que el servidor)', () => {
  const now = Date.parse('2026-11-10T12:00:00Z');
  assert.equal(isEventOver('2026-11-12T00:00:00Z', now), false);
  assert.equal(isEventOver('2026-11-10T03:00:00Z', now), false);
  assert.equal(isEventOver('2026-11-09T11:00:00Z', now), true);
  assert.equal(isEventOver('no-es-fecha', now), false);
});

test('courtesyStatusText: un texto distinto por estado', () => {
  const all = ['sent', 'opened', 'claimed'].map(courtesyStatusText);
  assert.equal(new Set(all).size, 3);
  assert.ok(courtesyStatusText('claimed').includes('cuenta'));
});
