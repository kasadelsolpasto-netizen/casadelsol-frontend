import test from 'node:test';
import assert from 'node:assert/strict';
import { ARTIST_DOCS_EMAIL, docsMailto, docsSeenKey } from './rut-guide.ts';

test('el correo sale dirigido a artistas con el asunto del artista y del evento', () => {
  const m = docsMailto('DJ Ñandú & Co.', 'Rave #3');
  assert.ok(m.startsWith(`mailto:${ARTIST_DOCS_EMAIL}?subject=`));
  assert.equal(ARTIST_DOCS_EMAIL, 'artistas@kasadelsol.co');
  const subject = decodeURIComponent(m.split('subject=')[1].split('&body=')[0]);
  assert.equal(subject, 'Documentos para pago — DJ Ñandú & Co. — Rave #3');
  assert.ok(!m.includes(' ') && !m.includes('\n'));
  assert.equal(decodeURIComponent(docsMailto().split('subject=')[1].split('&body=')[0]), 'Documentos para pago');
});

test('el aviso se recuerda por cuenta', () => {
  assert.notEqual(docsSeenKey('u1'), docsSeenKey('u2'));
});
