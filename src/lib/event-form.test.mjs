// Pruebas de la validacion del formulario de eventos. Ejecutar:  npm run test:scan   (Node >= 22.18)
import test from 'node:test';
import assert from 'node:assert/strict';
import { validateEventForm, formatProblems } from './event-form.ts';

const ok = { title: 'RITUAL VOL 1', date: '2026-11-20T22:00' };
const stage = (extra = {}) => ({ name: 'General', price: 60000, capacity: 100, sale_start: '', sale_end: '', ...extra });

test('un evento con nombre, fecha y una etapa completa no tiene problemas (sin flyer, lugar ni descripcion)', () => {
  assert.deepEqual(validateEventForm(ok, [stage()]), []);
  assert.deepEqual(validateEventForm(ok, []), []);
});

test('si faltan nombre y fecha, dice cuales', () => {
  assert.deepEqual(validateEventForm({ title: '  ', date: '' }, [stage()]), [
    'El nombre del evento',
    'La fecha y hora de apertura del evento',
  ]);
});

test('fecha basura se detecta', () => {
  assert.deepEqual(validateEventForm({ title: 'X', date: 'ayer' }, []), ['La fecha del evento no es válida']);
});

test('cada etapa indica su numero y nombre y que campo falta', () => {
  const p = validateEventForm(ok, [stage(), stage({ name: 'Regular', price: '', capacity: '' }), stage({ name: '' })]);
  assert.deepEqual(p, [
    'Etapa 2 (Regular): falta el precio (pon 0 si es gratis)',
    'Etapa 2 (Regular): falta la cantidad de entradas',
    'Etapa 3: falta el nombre',
  ]);
});

test('precio 0 es valido (gratis); negativo, texto o cantidad 0 o con decimales no', () => {
  assert.deepEqual(validateEventForm(ok, [stage({ price: 0 })]), []);
  assert.deepEqual(validateEventForm(ok, [stage({ price: '0' })]), []);
  assert.deepEqual(validateEventForm(ok, [stage({ price: -5 })]), ['Etapa 1 (General): el precio no es válido']);
  assert.deepEqual(validateEventForm(ok, [stage({ price: 'abc' })]), ['Etapa 1 (General): el precio no es válido']);
  assert.deepEqual(validateEventForm(ok, [stage({ capacity: 0 })]), [
    'Etapa 1 (General): la cantidad de entradas debe ser un número entero de 1 o más',
  ]);
  assert.deepEqual(validateEventForm(ok, [stage({ capacity: '12.5' })]), [
    'Etapa 1 (General): la cantidad de entradas debe ser un número entero de 1 o más',
  ]);
});

test('el cierre de la etapa debe ser despues de la apertura', () => {
  const a = '2026-11-01T10:00';
  const b = '2026-11-05T10:00';
  assert.deepEqual(validateEventForm(ok, [stage({ sale_start: a, sale_end: b })]), []);
  assert.deepEqual(validateEventForm(ok, [stage({ sale_start: b, sale_end: a })]), [
    'Etapa 1 (General): el cierre debe ser después de la apertura',
  ]);
  assert.deepEqual(validateEventForm(ok, [stage({ sale_start: a, sale_end: a })]), [
    'Etapa 1 (General): el cierre debe ser después de la apertura',
  ]);
  // solo una de las dos fechas: sin problema
  assert.deepEqual(validateEventForm(ok, [stage({ sale_start: a })]), []);
  assert.deepEqual(validateEventForm(ok, [stage({ sale_end: b })]), []);
});

test('el mensaje final lista una linea por problema', () => {
  assert.equal(formatProblems(['A', 'B']), 'Revisa esto antes de guardar:\n• A\n• B');
});
