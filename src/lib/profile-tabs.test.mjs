import test from 'node:test';
import assert from 'node:assert/strict';
import { profileAreas, profileTabs } from './profile-tabs.ts';

test('profileAreas: artista solo si el perfil está activo; promotor solo con códigos', () => {
  assert.deepEqual(profileAreas(null), { artist: false, promoter: false });
  assert.deepEqual(profileAreas({ artist_profile: { is_active: false }, promoter_codes: [] }), { artist: false, promoter: false });
  assert.deepEqual(profileAreas({ artist_profile: { is_active: true }, promoter_codes: [] }), { artist: true, promoter: false });
  assert.deepEqual(profileAreas({ artist_profile: null, promoter_codes: [{}] }), { artist: false, promoter: true });
  assert.deepEqual(profileAreas({ artist_profile: { is_active: true }, promoter_codes: [{}, {}] }), { artist: true, promoter: true });
});

test('profileTabs: sin otras áreas no hay pestañas', () => {
  assert.deepEqual(profileTabs('u1', { artist: false, promoter: false }), []);
});

test('profileTabs: orden Mi cuenta, Artista, Promotor y enlaces correctos', () => {
  const t = profileTabs('u1', { artist: true, promoter: true });
  assert.deepEqual(t.map((x) => x.key), ['cuenta', 'artista', 'promotor']);
  assert.deepEqual(t.map((x) => x.href), ['/raves/profile/u1', '/raves/profile/artist', '/raves/profile/promoter']);
  assert.deepEqual(profileTabs('u1', { artist: false, promoter: true }).map((x) => x.key), ['cuenta', 'promotor']);
  assert.deepEqual(profileTabs('u1', { artist: true, promoter: false }).map((x) => x.key), ['cuenta', 'artista']);
});

test('profileTabs: sin id de usuario, Mi cuenta lleva al inicio', () => {
  assert.equal(profileTabs(null, { artist: true, promoter: false })[0].href, '/raves');
});
