// Pruebas de los recaudadores. Ejecutar:  npm run test:scan   (Node >= 22.18)
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CREDENTIAL_FIELDS,
  canDelete,
  missingLabel,
  recipientById,
  recipientSummary,
  routingWarnings,
  selectableRecipients,
  whoCollects,
} from './payment-recipients.ts';

const SERVICES = [
  { key: 'tickets', label: 'Boletería' },
  { key: 'shop', label: 'Tienda' },
];

const recipient = (over = {}) => ({
  id: 'void-juan-vela',
  name: 'Void — Juan Vela',
  gateway: 'wompi',
  environment: 'production',
  effectiveEnvironment: 'production',
  usable: true,
  archived: false,
  missing: [],
  publicCredentials: { publicKey: 'pub_prod_x' },
  savedSecrets: ['integritySecret'],
  ...over,
});

const fundacion = (over = {}) =>
  recipient({
    id: 'fundacion',
    name: 'Fundación',
    gateway: 'bold',
    environment: 'sandbox',
    effectiveEnvironment: 'sandbox',
    publicCredentials: { apiKey: 'llave-identidad' },
    savedSecrets: ['secretKey'],
    ...over,
  });

test('busca un recaudador por identificador y tolera nulos', () => {
  const list = [recipient(), fundacion()];
  assert.equal(recipientById(list, 'fundacion').name, 'Fundación');
  assert.equal(recipientById(list, 'no-existe'), null);
  assert.equal(recipientById(list, null), null);
});

test('la asignacion del servicio pesa mas que el recaudador por defecto', () => {
  const list = [recipient(), fundacion()];
  const routing = { default: 'void-juan-vela', services: { shop: 'fundacion' } };
  assert.equal(whoCollects('tickets', routing, list).id, 'void-juan-vela');
  assert.equal(whoCollects('shop', routing, list).id, 'fundacion');
});

test('un servicio sin asignacion hereda el recaudador por defecto', () => {
  const list = [recipient(), fundacion()];
  const routing = { default: 'fundacion', services: {} };
  assert.equal(whoCollects('tickets', routing, list).id, 'fundacion');
  assert.equal(whoCollects('donaciones', routing, list).id, 'fundacion');
});

test('si al asignado le faltan llaves o esta archivado, cobra otro', () => {
  const incompleta = fundacion({ usable: false, missing: ['secretKey'] });
  const routing = { default: 'fundacion', services: {} };
  assert.equal(whoCollects('tickets', routing, [recipient(), incompleta]).id, 'void-juan-vela');

  const archivada = fundacion({ archived: true });
  assert.equal(whoCollects('tickets', routing, [recipient(), archivada]).id, 'void-juan-vela');
});

test('sin ningun recaudador usable no cobra nadie', () => {
  const routing = { default: 'fundacion', services: {} };
  assert.equal(whoCollects('tickets', routing, [fundacion({ usable: false })]), null);
  assert.equal(whoCollects('tickets', routing, []), null);
});

test('avisa cuando el que cobra no es el asignado', () => {
  const incompleta = fundacion({ usable: false, missing: ['secretKey'] });
  const routing = { default: 'void-juan-vela', services: { shop: 'fundacion' } };
  const avisos = routingWarnings(SERVICES, routing, [recipient(), incompleta]);
  assert.equal(avisos.length, 1);
  assert.equal(avisos[0].service, 'shop');
  assert.match(avisos[0].text, /cobra «Void — Juan Vela»/);
});

test('avisa cuando nadie puede cobrar un servicio', () => {
  const avisos = routingWarnings(SERVICES, { default: null, services: {} }, []);
  assert.equal(avisos.length, 2);
  assert.match(avisos[0].text, /Nadie puede cobrar/);
});

test('avisa cuando no hay asignacion ni recaudador por defecto', () => {
  const avisos = routingWarnings(SERVICES, { default: null, services: {} }, [recipient()]);
  assert.equal(avisos.length, 2);
  assert.match(avisos[0].text, /no tiene recaudador asignado/);
});

test('sin avisos cuando todo esta asignado y con llaves', () => {
  const routing = { default: 'void-juan-vela', services: { tickets: 'void-juan-vela', shop: 'fundacion' } };
  assert.deepEqual(routingWarnings(SERVICES, routing, [recipient(), fundacion()]), []);
});

test('el resumen dice pasarela, entorno y si falta algo', () => {
  assert.equal(recipientSummary(recipient()), 'Wompi · Producción');
  assert.equal(recipientSummary(fundacion()), 'Bold · Pruebas');
  assert.equal(recipientSummary(fundacion({ usable: false })), 'Bold · Pruebas · faltan llaves');
  assert.equal(recipientSummary(fundacion({ archived: true })), 'Bold · Pruebas · archivado');
});

test('no se puede borrar el ultimo recaudador capaz de cobrar', () => {
  assert.equal(canDelete([recipient(), fundacion()], 'fundacion'), true);
  assert.equal(canDelete([recipient()], 'void-juan-vela'), false);
  assert.equal(canDelete([recipient(), fundacion({ usable: false })], 'void-juan-vela'), false);
});

test('solo se ofrecen recaudadores que pueden cobrar', () => {
  const list = [recipient(), fundacion({ usable: false }), fundacion({ id: 'otra', archived: true })];
  assert.deepEqual(selectableRecipients(list).map((r) => r.id), ['void-juan-vela']);
});

test('cada pasarela pide sus propias llaves y marca cuales son obligatorias', () => {
  assert.deepEqual(
    CREDENTIAL_FIELDS.bold.filter((f) => f.required).map((f) => f.field),
    ['apiKey', 'secretKey'],
  );
  assert.deepEqual(
    CREDENTIAL_FIELDS.wompi.filter((f) => f.required).map((f) => f.field),
    ['publicKey'],
  );
  assert.equal(missingLabel('bold', 'secretKey'), 'Llave secreta');
  assert.equal(missingLabel('wompi', 'publicKey'), 'Llave pública');
  assert.equal(missingLabel('bold', 'inventada'), 'inventada');
});
