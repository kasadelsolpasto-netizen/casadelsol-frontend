// Pruebas de "compartir por WhatsApp" del panel del promotor. Ejecutar:  npm run test:scan   (Node >= 22.18)
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTicketsMessage, normalizeWhatsAppPhone, ticketUrl, whatsappLink } from './whatsapp.ts';

test('celular colombiano con o sin espacios, guiones o paréntesis → 57 + número', () => {
  assert.equal(normalizeWhatsAppPhone('3001234567'), '573001234567');
  assert.equal(normalizeWhatsAppPhone('300 123 4567'), '573001234567');
  assert.equal(normalizeWhatsAppPhone('(300) 123-4567'), '573001234567');
  assert.equal(normalizeWhatsAppPhone('  3101234567  '), '573101234567');
});

test('ya con el 57 (con o sin +) se respeta', () => {
  assert.equal(normalizeWhatsAppPhone('573001234567'), '573001234567');
  assert.equal(normalizeWhatsAppPhone('+57 300 123 4567'), '573001234567');
});

test('otro país solo si lo escribieron con + o 00', () => {
  assert.equal(normalizeWhatsAppPhone('+34 612 345 678'), '34612345678');
  assert.equal(normalizeWhatsAppPhone('0034612345678'), '34612345678');
  assert.equal(normalizeWhatsAppPhone('34612345678'), null); // sin + no se adivina el país
});

test('vacío o inválido → null (WhatsApp deja elegir el contacto)', () => {
  assert.equal(normalizeWhatsAppPhone(''), null);
  assert.equal(normalizeWhatsAppPhone('   '), null);
  assert.equal(normalizeWhatsAppPhone('abc'), null);
  assert.equal(normalizeWhatsAppPhone('12345'), null);
  assert.equal(normalizeWhatsAppPhone('2001234567'), null); // no empieza por 3
  assert.equal(normalizeWhatsAppPhone(undefined), null);
});

test('el enlace de la entrada es /ticket/<token> sin dobles barras', () => {
  assert.equal(ticketUrl('https://kasadelsol.co', 'abc'), 'https://kasadelsol.co/ticket/abc');
  assert.equal(ticketUrl('https://kasadelsol.co/', 'abc'), 'https://kasadelsol.co/ticket/abc');
});

test('mensaje: una entrada vs varias, con nombre y evento', () => {
  const uno = buildTicketsMessage({ buyerName: 'Carla Pérez', eventTitle: 'Fiesta Techno', urls: ['https://x.co/ticket/a'] });
  assert.match(uno, /Hola Carla, aquí está tu entrada para \*Fiesta Techno\*/);
  assert.match(uno, /Tu entrada:\nhttps:\/\/x\.co\/ticket\/a/);

  const varias = buildTicketsMessage({ buyerName: 'Carla', eventTitle: 'Fiesta', urls: ['https://x.co/ticket/a', 'https://x.co/ticket/b'] });
  assert.match(varias, /aquí están tus entradas/);
  assert.match(varias, /Entrada 1: https:\/\/x\.co\/ticket\/a\nEntrada 2: https:\/\/x\.co\/ticket\/b/);
});

test('mensaje sin nombre ni evento no deja huecos raros', () => {
  const m = buildTicketsMessage({ urls: ['https://x.co/ticket/a'] });
  assert.match(m, /Hola, aquí está tu entrada para \*el evento\*/);
});

test('enlace de WhatsApp: con número va directo, sin número deja elegir; el texto va codificado', () => {
  const text = 'Hola Ñandú\nhttps://x.co/ticket/a?x=1&y=2';
  const con = whatsappLink('573001234567', text);
  assert.ok(con.startsWith('https://wa.me/573001234567?text='));
  assert.equal(decodeURIComponent(con.split('?text=')[1]), text);
  assert.ok(whatsappLink(null, text).startsWith('https://wa.me/?text='));
});
