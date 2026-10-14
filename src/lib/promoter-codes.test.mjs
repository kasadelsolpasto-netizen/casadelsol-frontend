// Pruebas de la elección del código del promotor. Ejecutar:  npm run test:scan   (Node >= 22.18)
import test from 'node:test';
import assert from 'node:assert/strict';
import { codesForEvent, pickPromoterCode, sortCodes } from './promoter-codes.ts';

const A = 'evento-a';
const B = 'evento-b';
const mk = (id, code, extra = {}) => ({ id, code, event_id: null, is_active: true, created_at: '2026-01-01T00:00:00Z', ...extra });

test('con un solo código todo sigue igual que antes (con o sin evento elegido)', () => {
  const codes = [mk('1', 'UNICO')];
  assert.equal(pickPromoterCode(codes, '', null).code, 'UNICO');
  assert.equal(pickPromoterCode(codes, A, null).code, 'UNICO');
});

test('el orden NO depende de cómo los devuelva la base de datos', () => {
  const viejo = mk('1', 'VIEJO', { created_at: '2026-01-01T00:00:00Z' });
  const nuevo = mk('2', 'NUEVO', { created_at: '2026-06-01T00:00:00Z' });
  assert.deepEqual(sortCodes([nuevo, viejo]).map((c) => c.code), ['VIEJO', 'NUEVO']);
  assert.deepEqual(sortCodes([viejo, nuevo]).map((c) => c.code), ['VIEJO', 'NUEVO']);
  // misma fecha: por texto del código (estable)
  const x = mk('3', 'BBB');
  const y = mk('4', 'AAA');
  assert.deepEqual(sortCodes([x, y]).map((c) => c.code), ['AAA', 'BBB']);
  assert.deepEqual(sortCodes([y, x]).map((c) => c.code), ['AAA', 'BBB']);
});

test('dos códigos de eventos distintos: cada evento usa el suyo', () => {
  const codes = [mk('1', 'PARA-A', { event_id: A }), mk('2', 'PARA-B', { event_id: B })];
  assert.equal(pickPromoterCode(codes, A, null).code, 'PARA-A');
  assert.equal(pickPromoterCode(codes, B, null).code, 'PARA-B');
  assert.equal(pickPromoterCode([...codes].reverse(), B, null).code, 'PARA-B');
});

test('un código fijado a otro evento NO sirve; si no queda ninguno, null', () => {
  const codes = [mk('1', 'PARA-A', { event_id: A })];
  assert.equal(pickPromoterCode(codes, B, null), null);
  assert.deepEqual(codesForEvent(codes, B), []);
});

test('el del evento va antes que el general; el general sirve en cualquier evento', () => {
  const general = mk('1', 'GENERAL', { created_at: '2026-01-01T00:00:00Z' });
  const propio = mk('2', 'PROPIO', { event_id: A, created_at: '2026-06-01T00:00:00Z' });
  assert.deepEqual(codesForEvent([general, propio], A).map((c) => c.code), ['PROPIO', 'GENERAL']);
  assert.deepEqual(codesForEvent([general, propio], B).map((c) => c.code), ['GENERAL']);
});

test('los códigos desactivados nunca se ofrecen', () => {
  const codes = [mk('1', 'APAGADO', { is_active: false }), mk('2', 'VIVO')];
  assert.equal(pickPromoterCode(codes, A, null).code, 'VIVO');
  assert.equal(pickPromoterCode([mk('1', 'APAGADO', { is_active: false })], A, null), null);
  // si el dato no trae is_active se considera activo
  assert.equal(pickPromoterCode([{ id: '9', code: 'SINDATO' }], A, null).code, 'SINDATO');
});

test('lo que elige el promotor se respeta mientras siga valiendo para ese evento', () => {
  const codes = [
    mk('1', 'UNO', { event_id: A, created_at: '2026-01-01T00:00:00Z' }),
    mk('2', 'DOS', { event_id: A, created_at: '2026-02-01T00:00:00Z' }),
    mk('3', 'OTRO', { event_id: B, created_at: '2026-03-01T00:00:00Z' }),
  ];
  assert.equal(pickPromoterCode(codes, A, null).code, 'UNO'); // por defecto el más antiguo
  assert.equal(pickPromoterCode(codes, A, '2').code, 'DOS'); // lo elegido
  assert.equal(pickPromoterCode(codes, B, '2').code, 'OTRO'); // lo elegido ya no aplica a B -> se ignora
  assert.equal(pickPromoterCode(codes, A, 'no-existe').code, 'UNO');
});

test('datos raros no rompen nada', () => {
  assert.deepEqual(codesForEvent(null, A), []);
  assert.deepEqual(codesForEvent(undefined, ''), []);
  assert.equal(pickPromoterCode([], A, null), null);
  assert.deepEqual(sortCodes('no es lista'), []);
  assert.equal(pickPromoterCode([mk('1', 'X', { created_at: null })], A, null).code, 'X');
});
