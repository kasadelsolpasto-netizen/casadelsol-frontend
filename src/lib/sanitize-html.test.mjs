import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeHtml, htmlToText, toJsonLd, safeHref } from './sanitize-html.ts';

test('conserva el formato del editor', () => {
  const html = '<h2 style="text-align: center">Hola</h2><p>Un <strong>texto</strong> con <em>cursiva</em>, <u>subrayado</u> y <s>tachado</s>.</p><ul><li><p>uno</p></li></ul><blockquote><p>cita</p></blockquote><hr>';
  assert.equal(sanitizeHtml(html), html);
});

test('los enlaces externos abren aparte y sin acceso a la pestaña', () => {
  const out = sanitizeHtml('<p><a target="_blank" rel="noopener noreferrer nofollow" href="https://soundcloud.com/x?a=1&amp;b=2">mi set</a></p>');
  assert.equal(out, '<p><a href="https://soundcloud.com/x?a=1&amp;b=2" target="_blank" rel="noopener noreferrer nofollow">mi set</a></p>');
});

test('quita scripts, manejadores y esquemas peligrosos', () => {
  assert.equal(sanitizeHtml('<p>a</p><script>alert(1)</script><p>b</p>'), '<p>a</p><p>b</p>');
  assert.equal(sanitizeHtml('<img src="https://x.co/a.png" onerror="alert(1)">'), '<img src="https://x.co/a.png" loading="lazy">');
  assert.equal(sanitizeHtml('<a href="javascript:alert(1)">x</a>'), '<a>x</a>');
  assert.equal(sanitizeHtml('<a href="jav&#x61;script&colon;alert(1)">x</a>'), '<a>x</a>');
  assert.equal(sanitizeHtml('<a href=" java\tscript:alert(1)">x</a>'), '<a>x</a>');
  assert.equal(sanitizeHtml('<img src="data:image/png;base64,AAAA">'), '<img loading="lazy">');
  assert.ok(!/<(img|svg)/i.test(sanitizeHtml('<img src="data:image/svg+xml,<svg onload=alert(1)>">')));
  assert.equal(sanitizeHtml('<iframe src="https://evil.co"></iframe>hola'), 'hola');
  assert.equal(sanitizeHtml('<svg><script>alert(1)</script></svg>ok'), 'ok');
  assert.equal(sanitizeHtml('<form action="https://evil.co"><input name="clave"></form>'), '');
  assert.equal(sanitizeHtml('<p style="background:url(javascript:alert(1)); color: red">x</p>'), '<p style="color: red">x</p>');
  assert.equal(sanitizeHtml('<script>alert(1)'), '');
  assert.ok(!/<script/i.test(sanitizeHtml('<scr<script>ipt>alert(1)</scr</script>ipt>')));
  assert.ok(!sanitizeHtml('<p onclick=alert(1) class="a">x</p>').includes('onclick'));
  assert.ok(!sanitizeHtml('<img src=x onerror=alert(1)//').includes('<img'));
});

test('conserva las clases del título del inicio', () => {
  const t = 'Próximos <span class="text-white drop-shadow-[0_0_15px_rgba(57,255,20,0.8)] [text-shadow:0_0_20px_#39ff14]">Eventos</span>';
  assert.equal(sanitizeHtml(t), t);
});

test('vacío', () => {
  assert.equal(sanitizeHtml(null), '');
  assert.equal(sanitizeHtml(''), '');
});

test('htmlToText deja solo el texto, con los enlaces por su nombre', () => {
  assert.equal(
    htmlToText('<p>Escucha <a target="_blank" rel="noopener" href="https://soundcloud.com/x">el set</a> completo.</p><p>Nos vemos &amp; bailamos.</p>'),
    'Escucha el set completo. Nos vemos & bailamos.',
  );
  assert.equal(htmlToText('<p>uno dos tres cuatro</p>', 9), 'uno dos…');
  assert.equal(htmlToText('<script>x</script>hola'), 'hola');
});

test('safeHref y toJsonLd', () => {
  assert.equal(safeHref('/events/x'), '/events/x');
  assert.equal(safeHref('//evil.co'), null);
  assert.equal(safeHref('mailto:a@b.co'), 'mailto:a@b.co');
  assert.equal(toJsonLd({ t: '</script><script>alert(1)' }).includes('</script>'), false);
});

test('excerptHtml conserva el formato sin enlaces pulsables ni imágenes', async () => {
  const { excerptHtml } = await import('./sanitize-html.ts');
  assert.equal(
    excerptHtml('<h2>Hola</h2><p>Oye <a href="https://soundcloud.com/x">el <strong>set</strong></a><img src="https://x.co/a.png"></p>'),
    '<p>Hola</p><p>Oye <span class="post-link">el <strong>set</strong></span></p>',
  );
});
