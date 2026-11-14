import test from 'node:test';
import assert from 'node:assert/strict';
import {
  courtesyRemaining, courtesyTypeQuota, facultySummary, gradeOf, grantForEvent, grantWarnings,
  privateLink, privateState, buildPrivateLinkMessage, money,
} from './partners.ts';

const grant = (over = {}) => ({
  id: 'g1',
  event_id: 'e1',
  can_issue_courtesies: true,
  courtesy_quota: 10,
  courtesy_issued: 0,
  can_set_courtesy_kind: false,
  can_view_metrics: true,
  can_view_revenue: false,
  can_create_private_tickets: false,
  private_ticket_min_price: null,
  is_active: true,
  ...over,
});

test('cupo de cortesías: descuenta lo emitido y no baja de cero', () => {
  assert.equal(courtesyRemaining(grant({ courtesy_issued: 4 })), 6);
  assert.equal(courtesyRemaining(grant({ courtesy_quota: 2, courtesy_issued: 9 })), 0);
});

test('grado: sin habilitación es promotor; suspendida se distingue', () => {
  assert.equal(gradeOf(null), 'PROMOTOR');
  assert.equal(gradeOf(grant()), 'SOCIO');
  assert.equal(gradeOf(grant({ is_active: false })), 'SOCIO_SUSPENDIDO');
});

test('la habilitación del evento manda sobre la de la casa, y las suspendidas no cuentan', () => {
  const casa = grant({ id: 'casa', event_id: null });
  const propia = grant({ id: 'propia', event_id: 'e1' });
  assert.equal(grantForEvent([casa, propia], 'e1').id, 'propia');
  assert.equal(grantForEvent([casa], 'e9').id, 'casa');
  assert.equal(grantForEvent([grant({ is_active: false })], 'e1'), null);
  assert.equal(grantForEvent([], 'e1'), null);
});

test('resumen de facultades: dice el cupo y avisa cuando está lleno', () => {
  assert.deepEqual(facultySummary(grant({ courtesy_issued: 3 })), ['Cortesías 3/10', 'Métricas']);
  assert.ok(facultySummary(grant({ courtesy_issued: 10 }))[0].includes('cupo lleno'));
  const todo = facultySummary(grant({ can_set_courtesy_kind: true, can_view_revenue: true, can_create_private_tickets: true, private_ticket_min_price: 30000 }));
  assert.deepEqual(todo, ['Cortesías 0/10', 'Puede emitir libres', 'Métricas + dinero', `Boletas privadas (mín. ${money(30000)})`]);
});

test('avisos: habilitaciones que quedarían sin efecto', () => {
  assert.match(grantWarnings({ can_issue_courtesies: true, courtesy_quota: 0 })[0], /cupo queda en 0/);
  assert.match(grantWarnings({ can_set_courtesy_kind: true, can_issue_courtesies: false })[0], /no tiene efecto/);
  assert.match(grantWarnings({ can_view_revenue: true, can_view_metrics: false })[0], /no tiene efecto/);
  assert.deepEqual(grantWarnings({ can_issue_courtesies: true, courtesy_quota: 5, can_view_metrics: true }), []);
});

test('enlace privado: se arma sin barras repetidas y sin llave no existe', () => {
  assert.equal(privateLink('https://kasadelsol.co/', 'ev-1', 'k1'), 'https://kasadelsol.co/events/ev-1?pass=k1');
  assert.equal(privateLink('https://kasadelsol.co', 'ev-1', null), null);
});

const priv = (over = {}) => ({ id: 'p1', name: 'Amigos', price: 30000, capacity: 10, available: 5, access_token: 'k1', ...over });

test('estado del enlace privado', () => {
  const ahora = Date.parse('2026-06-15T12:00:00Z');
  assert.equal(privateState(priv(), ahora), 'ABIERTA');
  assert.equal(privateState(priv({ access_token: null }), ahora), 'CERRADA');
  assert.equal(privateState(priv({ available: 0 }), ahora), 'AGOTADA');
  assert.equal(privateState(priv({ sale_start: '2026-07-01T00:00:00Z' }), ahora), 'NO_INICIADA');
  assert.equal(privateState(priv({ sale_end: '2026-06-01T00:00:00Z' }), ahora), 'VENCIDA');
  // cerrada manda sobre todo lo demás
  assert.equal(privateState(priv({ access_token: null, available: 0 }), ahora), 'CERRADA');
});

test('mensaje del enlace privado: trae el precio y el enlace', () => {
  const msg = buildPrivateLinkMessage({ eventTitle: 'Solsticio', name: 'Amigos', price: 30000, url: 'https://k.co/events/e1?pass=k1' });
  assert.match(msg, /Solsticio/);
  assert.ok(msg.includes(money(30000)));
  assert.match(msg, /pass=k1/);
});

test('cupo de una denominación de cortesía', () => {
  assert.equal(courtesyTypeQuota({ id: 't', name: 'Prensa', capacity: 10, available: 4, unlimited: false, transferable_default: false }), '6/10');
  assert.equal(courtesyTypeQuota({ id: 't', name: 'Staff', capacity: 0, available: 0, unlimited: true, transferable_default: false }), 'Sin tope');
});
