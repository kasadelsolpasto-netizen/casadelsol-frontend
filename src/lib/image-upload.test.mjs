import test from 'node:test';
import assert from 'node:assert/strict';
import { fitWithin, uploadPath, uploadProblem } from './image-upload.ts';

test('solo imágenes JPG, PNG o WebP de hasta 15 MB', () => {
  assert.equal(uploadProblem({ type: 'image/jpeg', size: 1000 }), null);
  assert.match(uploadProblem({ type: 'image/svg+xml', size: 1000 }), /JPG, PNG o WebP/);
  assert.match(uploadProblem({ type: 'text/html', size: 1000 }), /JPG/);
  assert.match(uploadProblem({ type: 'image/png', size: 16 * 1024 * 1024 }), /15 MB/);
  assert.match(uploadProblem({ type: 'image/png', size: 0 }), /vacío/);
});

test('la imagen solo se reduce, nunca se agranda ni se deforma', () => {
  assert.deepEqual(fitWithin(800, 600, 2000), { width: 800, height: 600, resized: false });
  assert.deepEqual(fitWithin(4000, 3000, 2000), { width: 2000, height: 1500, resized: true });
  assert.deepEqual(fitWithin(3000, 6000, 2000), { width: 1000, height: 2000, resized: true });
});

test('ruta de subida sin caracteres raros', () => {
  assert.equal(uploadPath('artists/photos', 'webp', 1, 'abc'), 'artists/photos/1_abc.webp');
  assert.ok(!uploadPath('../../etc', 'php', 1, 'a').includes('..'));
  assert.ok(uploadPath('../../etc', 'php', 1, 'a').endsWith('.jpg'));
});
