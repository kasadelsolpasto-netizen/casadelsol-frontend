// Pruebas de la etapa de venta vigente. Ejecutar:  npm run test:scan   (Node >= 22.18)
import test from 'node:test';
import assert from 'node:assert/strict';
import { pickStage, isWindowOpen, isEventSalesClosed, sortStages, SALES_GRACE_MS } from './sale-stage.ts';

const NOW = Date.parse('2026-10-14T15:00:00Z');
const H = 3600 * 1000;
const iso = (offsetHours) => new Date(NOW + offsetHours * H).toISOString();
const t = (id, name, price, extra = {}) => ({ id, name, price, available: 50, sale_start: null, sale_end: null, ...extra });

test('toma la etapa cuya ventana esta abierta ahora, no las pasadas ni las futuras', () => {
  const stages = [
    t('1', 'Early Bird', 40000, { sale_start: iso(-200), sale_end: iso(-10) }),
    t('2', 'Fase 2', 50000, { sale_start: iso(-10), sale_end: iso(100) }),
    t('3', 'Fase 3', 60000, { sale_start: iso(100), sale_end: iso(300) }),
  ];
  const v = pickStage(stages, NOW);
  assert.equal(v.current.id, '2');
  assert.equal(v.next.id, '3');
  assert.equal(v.soldOut, false);
});

test('cuando se agota la etapa abierta, avisa agotada y muestra la proxima', () => {
  const stages = [
    t('2', 'Fase 2', 50000, { sale_start: iso(-10), sale_end: iso(100), available: 0 }),
    t('3', 'Fase 3', 60000, { sale_start: iso(100), sale_end: iso(300) }),
  ];
  const v = pickStage(stages, NOW);
  assert.equal(v.current, null);
  assert.equal(v.soldOut, true);
  assert.equal(v.next.id, '3');
});

test('sin fechas (campos en blanco) cuenta como abierta y, si hay varias, sale la mas barata', () => {
  const stages = [t('b', 'Segunda', 60000), t('a', 'Primera', 50000)];
  assert.equal(pickStage(stages, NOW).current.id, 'a');
  // si la primera se agota, pasa sola a la siguiente
  stages[1].available = 0;
  assert.equal(pickStage(stages, NOW).current.id, 'b');
});

test('si hay varias abiertas a la vez, gana la que cierra primero', () => {
  const stages = [
    t('x', 'Larga', 50000, { sale_start: iso(-5), sale_end: iso(500) }),
    t('y', 'Corta', 70000, { sale_start: iso(-5), sale_end: iso(20) }),
    t('z', 'Sin cierre', 30000, { sale_start: iso(-5) }),
  ];
  assert.equal(pickStage(stages, NOW).current.id, 'y');
});

test('los boletos gratis o de precio 0 nunca son la etapa de venta en efectivo', () => {
  const v = pickStage([t('g', 'Cortesia', 0), t('p', 'Pago', 45000)], NOW);
  assert.equal(v.current.id, 'p');
  assert.equal(pickStage([t('g', 'Cortesia', 0)], NOW).current, null);
});

test('ninguna etapa abierta ni agotada: current y next vacios, soldOut falso', () => {
  const v = pickStage([t('1', 'Pasada', 40000, { sale_start: iso(-200), sale_end: iso(-10) })], NOW);
  assert.deepEqual([v.current, v.next, v.soldOut], [null, null, false]);
  assert.deepEqual(pickStage(undefined, NOW), { current: null, next: null, soldOut: false });
  assert.deepEqual(pickStage([], NOW), { current: null, next: null, soldOut: false });
});

test('la ventana usa la misma regla del servidor (inicio inclusivo, cierre inclusivo)', () => {
  assert.equal(isWindowOpen(t('1', 'A', 1, { sale_start: iso(0) }), NOW), true);
  assert.equal(isWindowOpen(t('1', 'A', 1, { sale_end: iso(0) }), NOW), true);
  assert.equal(isWindowOpen(t('1', 'A', 1, { sale_start: iso(0.001) }), NOW), false);
  assert.equal(isWindowOpen(t('1', 'A', 1, { sale_end: iso(-0.001) }), NOW), false);
  // fecha basura: se ignora en vez de romper
  assert.equal(isWindowOpen(t('1', 'A', 1, { sale_start: 'no-es-fecha' }), NOW), true);
});

test('evento terminado: 12 h despues de su fecha ya no se vende', () => {
  assert.equal(SALES_GRACE_MS, 12 * H);
  assert.equal(isEventSalesClosed(iso(-11.9), NOW), false);
  assert.equal(isEventSalesClosed(iso(-12.1), NOW), true);
  assert.equal(isEventSalesClosed(iso(48), NOW), false);
  assert.equal(isEventSalesClosed(null, NOW), false);
});

test('las etapas se muestran en orden (la que abre primero, primero) sin importar como las devuelva la base de datos', () => {
  const e1 = t('1', 'Etapa 1', 40000, { sale_start: iso(-200), sale_end: iso(-10) });
  const e2 = t('2', 'Etapa 2', 50000, { sale_start: iso(-10), sale_end: iso(100) });
  const e3 = t('3', 'Etapa 3', 60000, { sale_start: iso(100), sale_end: iso(300) });
  const orden = (xs) => sortStages(xs).map((x) => x.id).join(',');
  assert.equal(orden([e1, e3, e2]), '1,2,3'); // tras una venta la fila vendida pasa al final
  assert.equal(orden([e3, e2, e1]), '1,2,3');
  // sin fechas: de la mas barata a la mas cara; no modifica el arreglo original
  const sinFechas = [t('v', 'VIP', 90000), t('g', 'General', 50000)];
  assert.equal(orden(sinFechas), 'g,v');
  assert.equal(sinFechas[0].id, 'v');
  assert.deepEqual(sortStages(null), []);
});
