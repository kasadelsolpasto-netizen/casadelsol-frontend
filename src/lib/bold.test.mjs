// Pruebas de la URL de abandono del Botón de pagos de Bold. Ejecutar:  npm run test:scan
import test from 'node:test';
import assert from 'node:assert/strict';
import { abandonUrl } from './bold.ts';

test('agrega la referencia y la marca de abandono a la pagina de resultado', () => {
  assert.equal(
    abandonUrl('https://kasadelsol.co/checkout/bold-result', 'ORDER-1'),
    'https://kasadelsol.co/checkout/bold-result?bold-order-id=ORDER-1&bold-abandoned=1',
  );
});

test('respeta una URL que ya trae parametros', () => {
  assert.equal(
    abandonUrl('https://kasadelsol.co/checkout/bold-result?x=1', 'ORDER-1'),
    'https://kasadelsol.co/checkout/bold-result?x=1&bold-order-id=ORDER-1&bold-abandoned=1',
  );
});

test('escapa la referencia para no romper la URL', () => {
  const url = abandonUrl('https://kasadelsol.co/r', 'SHOP_a b&c');
  assert.equal(url, 'https://kasadelsol.co/r?bold-order-id=SHOP_a%20b%26c&bold-abandoned=1');
  assert.equal(new URL(url).searchParams.get('bold-order-id'), 'SHOP_a b&c');
});
