import test from 'node:test';
import assert from 'node:assert/strict';
import { canAssignContract, contractForBooking, contractLabel, pendingForArtist } from './artist-contracts.ts';

const c = (id, status, created_at, booking_id = 'b1') => ({ id, status, created_at, booking_id });

test('el contrato de una participación: primero el vigente, luego el aceptado, luego el último cerrado', () => {
  const list = [c('1', 'VOID', '2026-01-01'), c('2', 'SIGNED', '2026-01-02'), c('3', 'SENT', '2026-01-03'), c('x', 'SENT', '2026-01-09', 'b2')];
  assert.equal(contractForBooking(list, 'b1').id, '3');
  assert.equal(contractForBooking(list.filter((x) => x.id !== '3'), 'b1').id, '2');
  assert.equal(contractForBooking([c('1', 'VOID', '2026-01-01'), c('4', 'DECLINED', '2026-01-05')], 'b1').id, '4');
  assert.equal(contractForBooking(list, 'b9'), null);
});

test('solo se indica un contrato nuevo si no hay uno vigente ni aceptado', () => {
  assert.equal(canAssignContract(null), true);
  assert.equal(canAssignContract({ status: 'DECLINED' }), true);
  assert.equal(canAssignContract({ status: 'VOID' }), true);
  assert.equal(canAssignContract({ status: 'DRAFT' }), false);
  assert.equal(canAssignContract({ status: 'SENT' }), false);
  assert.equal(canAssignContract({ status: 'SIGNED' }), false);
});

test('pendientes del artista y etiquetas', () => {
  assert.deepEqual(pendingForArtist([c('1', 'SENT'), c('2', 'SIGNED'), c('3', 'VOID')]).map((x) => x.id), ['1']);
  assert.equal(contractLabel('SENT', 'artist'), 'Por aceptar');
  assert.equal(contractLabel('SIGNED', 'admin'), 'Aceptado');
});
