import test from 'node:test';
import assert from 'node:assert/strict';
import { paginate } from './paging.ts';

const list = Array.from({ length: 23 }, (_, i) => i + 1);

test('paginate: primera, intermedia y última página', () => {
  assert.deepEqual(paginate(list, 1, 10).rows, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.deepEqual(paginate(list, 2, 10).rows, [11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
  assert.deepEqual(paginate(list, 3, 10).rows, [21, 22, 23]);
  assert.deepEqual(paginate(list, 1, 10).p, { page: 1, pageSize: 10, total: 23, totalPages: 3 });
});

test('paginate: una página que ya no existe cae en la última (por ejemplo tras borrar)', () => {
  const r = paginate(list, 9, 10);
  assert.equal(r.p.page, 3);
  assert.deepEqual(r.rows, [21, 22, 23]);
  assert.equal(paginate(list, 0, 10).p.page, 1);
  assert.equal(paginate(list, -4, 10).p.page, 1);
  assert.equal(paginate(list, Number.NaN, 10).p.page, 1);
});

test('paginate: lista vacía o exacta no inventa páginas', () => {
  assert.deepEqual(paginate([], 1, 10), { rows: [], p: { page: 1, pageSize: 10, total: 0, totalPages: 1 } });
  assert.equal(paginate([1, 2, 3, 4], 1, 2).p.totalPages, 2);
  assert.equal(paginate([1, 2, 3, 4], 5, 4).p.totalPages, 1);
});

test('paginate: tamaño de página inválido no rompe', () => {
  assert.equal(paginate(list, 1, 0).p.pageSize, 1);
  assert.equal(paginate(list, 1, -3).p.pageSize, 1);
});
