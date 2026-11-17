import test from 'node:test';
import assert from 'node:assert/strict';
import { mediaEmbed, linkLabel, safeExternalUrl, linkHost } from './embeds.ts';

test('YouTube: todas las formas del enlace llevan al mismo reproductor', () => {
  const src = 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0';
  for (const url of [
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://youtu.be/dQw4w9WgXcQ?si=abc',
    'youtube.com/shorts/dQw4w9WgXcQ',
    'https://m.youtube.com/watch?v=dQw4w9WgXcQ&feature=share',
    'https://music.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://www.youtube.com/live/dQw4w9WgXcQ',
    'https://www.youtube.com/embed/dQw4w9WgXcQ',
  ]) {
    assert.equal(mediaEmbed(url)?.src, src, url);
  }
  assert.equal(mediaEmbed('https://youtu.be/dQw4w9WgXcQ?t=1m30s')?.src, 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0&start=90');
  assert.equal(mediaEmbed('https://www.youtube.com/watch?v=dQw4w9WgXcQ')?.height, null);
  assert.equal(
    mediaEmbed('https://www.youtube.com/playlist?list=PL1234567890abcdef')?.src,
    'https://www.youtube-nocookie.com/embed/videoseries?list=PL1234567890abcdef&rel=0',
  );
});

test('YouTube: un id inválido o un canal no se incrusta', () => {
  assert.equal(mediaEmbed('https://www.youtube.com/watch?v=corto'), null);
  assert.equal(mediaEmbed('https://www.youtube.com/@canal'), null);
  assert.equal(mediaEmbed('https://www.youtube.com/watch?v=dQw4w9WgXcQ"><script>'), null);
});

test('SoundCloud: pista, lista y perfil', () => {
  const track = mediaEmbed('https://soundcloud.com/artista/mi-set?si=xyz&utm_source=clipboard');
  assert.equal(track?.provider, 'soundcloud');
  assert.equal(track?.height, 166);
  assert.ok(track?.src.startsWith('https://w.soundcloud.com/player/?url=https%3A%2F%2Fsoundcloud.com%2Fartista%2Fmi-set&'));
  assert.equal(mediaEmbed('https://soundcloud.com/artista/sets/lista')?.height, 352);
  assert.equal(mediaEmbed('m.soundcloud.com/artista')?.height, 352);
  assert.ok(mediaEmbed('https://soundcloud.com/artista/privada/s-AbC123')?.src.includes('s-AbC123'));
});

test('SoundCloud: enlaces cortos y páginas del sitio no se incrustan', () => {
  assert.equal(mediaEmbed('https://on.soundcloud.com/AbCdE'), null);
  assert.equal(mediaEmbed('https://soundcloud.com/discover'), null);
});

test('otros sitios y enlaces peligrosos no se incrustan', () => {
  assert.equal(mediaEmbed('https://open.spotify.com/track/1'), null);
  assert.equal(mediaEmbed('https://youtube.com.evil.co/watch?v=dQw4w9WgXcQ'), null);
  assert.equal(mediaEmbed('javascript:alert(1)'), null);
  assert.equal(mediaEmbed(''), null);
  assert.equal(safeExternalUrl('javascript:alert(1)'), null);
  assert.equal(safeExternalUrl('http://x.co'), null);
  assert.equal(safeExternalUrl('https://x.co/a'), 'https://x.co/a');
});

test('nombre de los enlaces', () => {
  assert.equal(linkLabel({ kind: 'instagram', url: 'https://instagram.com/dj' }), 'Instagram');
  assert.equal(linkLabel({ kind: 'instagram', label: 'Mi IG', url: 'https://instagram.com/dj' }), 'Mi IG');
  assert.equal(linkLabel({ kind: 'web', url: 'https://www.midominio.co/x' }), 'midominio.co');
  assert.equal(linkHost('https://www.soundcloud.com/x'), 'soundcloud.com');
});
