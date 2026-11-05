import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PASS_PREFIX,
  describeEntry,
  extractPassToken,
  formatCop,
  formatPassCode,
  isPassPayload,
  normalizePassCode,
  parsePesosToCents,
} from './pass.ts';

test('el scanner distingue un pase de una entrada y de un pedido de barra', () => {
  assert.equal(isPassPayload(`${PASS_PREFIX}abc`), true);
  assert.equal(isPassPayload('kasa_id:abc'), true);
  assert.equal(isPassPayload('https://kasadelsol.co/ticket/deadbeef'), false);
  assert.equal(isPassPayload('KASA_SHOP_DELIVER:1:2'), false);
  assert.equal(isPassPayload(undefined), false);
});

test('saca el token del pase con espacios de sobra', () => {
  assert.equal(extractPassToken(`  ${PASS_PREFIX}tok_123 \n`), 'tok_123');
  assert.equal(extractPassToken('tok_123'), 'tok_123');
  assert.equal(extractPassToken(7), '');
});

test('el código del carné se escribe a mano sin importar cómo se teclee', () => {
  assert.equal(normalizePassCode('ks 7f3k-9qd2-ab'), '7F3K9QD2AB');
  assert.equal(normalizePassCode('KS-7F3K-9QD2-AB'), '7F3K9QD2AB');
  // O, I, L, 0 y 1 no existen en el alfabeto: si aparecen, no es un código.
  assert.equal(normalizePassCode('7F3K9QD2A0'), '');
  assert.equal(normalizePassCode('7F3K'), '');
});

test('el código se imprime en grupos de cuatro', () => {
  assert.equal(formatPassCode('7F3K9QD2AB'), 'KS-7F3K-9QD2-AB');
  assert.equal(formatPassCode(''), '');
});

test('lee montos escritos como se habla en la barra', () => {
  assert.equal(parsePesosToCents('25000'), 2500000);
  assert.equal(parsePesosToCents('25.000'), 2500000);   // punto = separador de miles
  assert.equal(parsePesosToCents('$ 25.000'), 2500000);
  assert.equal(parsePesosToCents('12,50'), 1250);        // coma = decimal
  assert.equal(parsePesosToCents(25000), 2500000);
  // Lo que no es un monto usable da 0 y la pantalla no deja cobrar.
  assert.equal(parsePesosToCents(''), 0);
  assert.equal(parsePesosToCents('0'), 0);
  assert.equal(parsePesosToCents('-5000'), 0);
  assert.equal(parsePesosToCents('mucho'), 0);
  assert.equal(parsePesosToCents('25,123'), 0);          // más de dos decimales no es plata
});

test('los pesos se escriben como los lee la gente', () => {
  assert.equal(formatCop(2500000), '$25.000');
  assert.equal(formatCop(0), '$0');
});

test('cada movimiento del saldo se explica con su signo', () => {
  const recarga = describeEntry('TOPUP_CASH', 2000000);
  assert.equal(recarga.positive, true);
  assert.equal(recarga.amount, '+ $20.000');
  assert.equal(recarga.label, 'Recarga en taquilla');

  const consumo = describeEntry('CHARGE', 800000);
  assert.equal(consumo.positive, false);
  assert.equal(consumo.amount, '− $8.000');

  // Un tipo que el servidor añada mañana no rompe la pantalla.
  assert.equal(describeEntry('ALGO_NUEVO', 100).label, 'Movimiento');
});
