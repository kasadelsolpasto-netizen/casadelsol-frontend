import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SALE_KINDS,
  kindLabel,
  kindBadge,
  formatCOP,
  ticketsLabel,
  timeAgo,
  rangeLabel,
  shortRef,
  initialOf,
  csvCell,
  buildOrdersCsv,
} from './sales-view.ts';

const NOW = new Date('2026-10-14T18:00:00Z').getTime();
const ago = (ms) => new Date(NOW - ms).toISOString();

test('el admin cobra/liquida y el promotor entrega', () => {
  assert.equal(kindLabel('CASH_PENDING', 'admin'), 'Por cobrar');
  assert.equal(kindLabel('CASH_PENDING', 'promoter'), 'Por entregar');
  assert.equal(kindLabel('CASH_SETTLED', 'admin'), 'Liquidado');
  assert.equal(kindLabel('CASH_SETTLED', 'promoter'), 'Entregado');
  assert.equal(kindLabel('ONLINE', 'admin'), 'Online');
  assert.equal(kindLabel('FREE', 'promoter'), 'Gratis');
});

test('cada tipo tiene etiqueta y color propios', () => {
  const badges = SALE_KINDS.map((k) => kindBadge(k));
  assert.equal(new Set(badges).size, 4);
  for (const k of SALE_KINDS) assert.ok(kindLabel(k, 'admin').length > 0);
});

test('formatCOP: pesos sin decimales y tolera valores raros', () => {
  assert.match(formatCOP(24000).replace(/\s/g, ' '), /24\.000/);
  assert.match(formatCOP(0), /0/);
  assert.match(formatCOP(null), /0/);
  assert.match(formatCOP(NaN), /0/);
});

test('ticketsLabel singular y plural', () => {
  assert.equal(ticketsLabel(1), '1 entrada');
  assert.equal(ticketsLabel(3), '3 entradas');
  assert.equal(ticketsLabel(0), '0 entradas');
});

test('timeAgo', () => {
  assert.equal(timeAgo(ago(20_000), NOW), 'ahora');
  assert.equal(timeAgo(ago(5 * 60_000), NOW), 'hace 5 min');
  assert.equal(timeAgo(ago(3 * 3_600_000), NOW), 'hace 3 h');
  assert.equal(timeAgo(ago(30 * 3_600_000), NOW), 'ayer');
  assert.match(timeAgo(ago(10 * 86_400_000), NOW), /oct/);
  assert.equal(timeAgo('no-es-fecha', NOW), '');
  // una fecha "en el futuro" (reloj desfasado) no se muestra negativa
  assert.equal(timeAgo(new Date(NOW + 60_000).toISOString(), NOW), 'ahora');
});

test('rangeLabel', () => {
  assert.equal(rangeLabel({ page: 1, pageSize: 25, total: 163, totalPages: 7 }), '1–25 de 163');
  assert.equal(rangeLabel({ page: 7, pageSize: 25, total: 163, totalPages: 7 }), '151–163 de 163');
  assert.equal(rangeLabel({ page: 1, pageSize: 25, total: 0, totalPages: 1 }), '0 resultados');
});

test('shortRef y initialOf', () => {
  assert.equal(shortRef(null), '—');
  assert.equal(shortRef('CASH_PROMOTER_85d82321-add6-46d3'), 'CASH_PROMOTER_85d…');
  assert.equal(shortRef('abc'), 'abc');
  assert.equal(initialOf('  ana'), 'A');
  assert.equal(initialOf(''), '?');
  assert.equal(initialOf(null), '?');
});

test('csvCell: comillas, separador y fórmulas de Excel', () => {
  assert.equal(csvCell('hola'), 'hola');
  assert.equal(csvCell('a;b'), '"a;b"');
  assert.equal(csvCell('di "hola"'), '"di ""hola"""');
  assert.equal(csvCell('=SUM(A1)'), "'=SUM(A1)");
  assert.equal(csvCell('+57300'), "'+57300");
  assert.equal(csvCell(null), '');
  assert.equal(csvCell(30000), '30000');
});

test('buildOrdersCsv: encabezado y una fila por orden', () => {
  const csv = buildOrdersCsv([
    {
      id: '1',
      kind: 'CASH_PENDING',
      total: 30000,
      created_at: '2026-10-14T18:00:00Z',
      payment_ref: 'CASH_PROMOTER_u1',
      user: { name: 'Ana Pérez', email: 'ana@x.co' },
      order_items: [{ quantity: 2 }, { quantity: 1 }],
      promoter_code: { code: 'ANA', promoter: { name: 'Promotor Uno' } },
    },
    { id: '2', kind: 'FREE', total: 0, created_at: '2026-10-14T18:00:00Z', user: null },
  ]);
  const lines = csv.split('\r\n');
  assert.equal(lines.length, 3);
  assert.match(lines[0], /^Fecha;Comprador;Correo;Tipo;Estado;Entradas;Total;Promotor;Codigo;Referencia$/);
  assert.match(lines[1], /Ana Pérez;ana@x\.co;Efectivo promotor;Por cobrar;3;30000;Promotor Uno;ANA;CASH_PROMOTER_u1$/);
  assert.match(lines[2], /;Gratis;Gratis;0;0;/);
});
