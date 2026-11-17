import test from 'node:test';
import assert from 'node:assert/strict';
import { CUENTA_COBRO_EMAIL, cuentaCobroFaltantes, cuentaCobroMailto, cuentaCobroNumeroSugerido, cuentaCobroTexto, montoEnLetras } from './cuenta-cobro.ts';

const base = {
  numero: '2026-01', ciudad: 'Pasto', fecha: '2026-12-06T15:00:00Z', nombreLegal: 'Pepe Pérez', docTipo: 'cédula de ciudadanía', docNumero: '1.085.000.111',
  nombreArtistico: 'DJ Pepe', evento: 'Rave & Sol', eventoFecha: '2026-12-05T03:00:00Z', eventoLugar: 'Kasa del Sol', valor: 1500000,
  datosPago: 'Bancolombia, cuenta de ahorros n.º 123-456', telefono: '300 000 0000', correo: 'pepe@x.co',
};
const NOW = new Date('2026-12-06T16:00:00Z').getTime();

test('monto en letras', () => {
  assert.equal(montoEnLetras(1500000), 'un millón quinientos mil pesos moneda corriente');
  assert.equal(montoEnLetras(2000000), 'dos millones de pesos moneda corriente');
  assert.equal(montoEnLetras(821000), 'ochocientos veintiún mil pesos moneda corriente');
});

test('la cuenta de cobro trae deudor, acreedor, valor en números y letras, concepto y datos de pago', () => {
  const t = cuentaCobroTexto(base, NOW);
  assert.ok(t.startsWith('Pasto, 6 de diciembre de 2026'));
  assert.ok(t.includes('CUENTA DE COBRO N.º 2026-01'));
  assert.ok(t.includes('FUNDACIÓN KASA DEL SOL\nNIT 902.014.359-1\n\nDEBE A:\n\nPEPE PÉREZ\nCédula de ciudadanía n.º 1.085.000.111'));
  assert.ok(t.includes('LA SUMA DE: $1.500.000 (un millón quinientos mil pesos moneda corriente).'));
  assert.ok(t.includes('Presentación artística de «DJ Pepe» en el evento «Rave & Sol», realizado el 4 de diciembre de 2026 en Kasa del Sol.'));
  assert.ok(t.includes('Bancolombia, cuenta de ahorros n.º 123-456'));
  assert.ok(t.includes('Teléfono: 300 000 0000\nCorreo electrónico: pepe@x.co'));
  assert.ok(!t.includes('Dirección:'));
  // antes del evento se redacta en presente
  assert.ok(cuentaCobroTexto(base, new Date('2026-11-01T00:00:00Z').getTime()).includes('que se realiza el 4 de diciembre de 2026'));
});

test('sale dirigida al correo de artistas, con asunto y cuerpo codificados', () => {
  const m = cuentaCobroMailto(base, NOW);
  assert.ok(m.startsWith(`mailto:${CUENTA_COBRO_EMAIL}?subject=`));
  assert.equal(CUENTA_COBRO_EMAIL, 'artistas@kasadelsol.co');
  assert.equal(decodeURIComponent(m.split('subject=')[1].split('&body=')[0]), 'Cuenta de cobro n.º 2026-01 — DJ Pepe — Rave & Sol');
  assert.equal(decodeURIComponent(m.split('&body=')[1]), cuentaCobroTexto(base, NOW));
  assert.equal(m.split('&').length, 2); // el «&» del nombre del evento va codificado
});

test('faltantes y número sugerido', () => {
  assert.deepEqual(cuentaCobroFaltantes(base), []);
  assert.deepEqual(cuentaCobroFaltantes({ ...base, nombreLegal: ' ', valor: 0, datosPago: '' }), ['tu nombre legal', 'el valor acordado', 'los datos de la cuenta para el pago']);
  assert.equal(cuentaCobroNumeroSugerido('2026-12-05T03:00:00Z', 3), '2026-03');
});
