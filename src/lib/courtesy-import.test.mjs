import test from 'node:test';
import assert from 'node:assert/strict';
import { buildImport, parseDelimited, chunk, templateCsv, normalizeDniText, parseKind, parseQuantity, MAX_QUANTITY, MAX_ROWS } from './courtesy-import.ts';

const TYPES = [
  { id: 't-gen', name: 'General' },
  { id: 't-vip', name: 'VIP' },
];

test('plantilla: se lee tal cual y todas las filas quedan listas', () => {
  const r = buildImport(parseDelimited(templateCsv(['General'])), TYPES, 't-gen');
  assert.equal(r.headerFound, true);
  assert.equal(r.rows.length, 3);
  assert.ok(r.rows.every((x) => x.status === 'ok'));
  assert.deepEqual(r.rows[0], { line: 2, name: 'Juan Pérez', dni: '1000000001', email: 'juan@correo.com', ticket_type_id: 't-gen', ticket_type_name: 'General', quantity: 1, kind: 'PERSONAL', status: 'ok', message: '' });
  // la plantilla trae una fila con 3 cortesías libres para la misma persona
  assert.deepEqual([r.rows[1].quantity, r.rows[1].kind], [3, 'LIBRE']);
  // sin cédula y sin tipo: usa el tipo elegido en pantalla
  assert.equal(r.rows[2].dni, '');
  assert.equal(r.rows[2].ticket_type_id, 't-gen');
  assert.deepEqual([r.rows[2].quantity, r.rows[2].kind], [1, 'PERSONAL']);
});

test('cantidad: varias cortesías a nombre de la misma persona', () => {
  const rows = [
    ['Nombre', 'Correo', 'Cantidad'],
    ['Ana Torres', 'ana@x.co', '4'],
    ['Beto Páez', 'beto@x.co', ''],
    ['Caro Díaz', 'caro@x.co', '0'],
    ['Dani Mora', 'dani@x.co', 'dos'],
    ['Eva Cruz', 'eva@x.co', String(MAX_QUANTITY + 1)],
  ];
  const r = buildImport(rows, TYPES, 't-gen');
  assert.deepEqual(r.rows.map((x) => [x.quantity, x.status]), [
    [4, 'ok'],
    [1, 'ok'],
    [1, 'error'],
    [1, 'error'],
    [1, 'error'],
  ]);
  assert.match(r.rows[2].message, /1 o más/);
  assert.match(r.rows[3].message, /entero/);
  assert.match(r.rows[4].message, new RegExp(String(MAX_QUANTITY)));
});

test('clase: personal es intransferible, libre es transferible, y lo que no se entiende se reporta', () => {
  const rows = [
    ['Nombre', 'Correo', 'Clase'],
    ['Ana Torres', 'ana@x.co', 'libre'],
    ['Beto Páez', 'beto@x.co', 'Intransferible'],
    ['Caro Díaz', 'caro@x.co', ''],
    ['Dani Mora', 'dani@x.co', 'oro'],
  ];
  const r = buildImport(rows, TYPES, 't-gen');
  assert.deepEqual(r.rows.map((x) => [x.kind, x.status]), [
    ['LIBRE', 'ok'],
    ['PERSONAL', 'ok'],
    ['PERSONAL', 'ok'],
    ['PERSONAL', 'error'],
  ]);
  assert.match(r.rows[3].message, /personal/i);
});

test('clase: la denominación puede traerla por defecto, y quien no puede elegirla emite siempre personal', () => {
  const rows = [
    ['Nombre', 'Correo', 'Clase'],
    ['Ana Torres', 'ana@x.co', ''],
    ['Beto Páez', 'beto@x.co', 'libre'],
  ];
  const porDefecto = buildImport(rows, TYPES, 't-gen', [], { defaultKind: 'LIBRE' });
  assert.deepEqual(porDefecto.rows.map((x) => x.kind), ['LIBRE', 'LIBRE']);

  // Socio sin la facultad: la columna «Clase» se ignora y nada sale libre.
  const sinFacultad = buildImport(rows, TYPES, 't-gen', [], { defaultKind: 'LIBRE', canSetKind: false });
  assert.deepEqual(sinFacultad.rows.map((x) => [x.kind, x.status]), [['PERSONAL', 'ok'], ['PERSONAL', 'ok']]);
});

test('la cantidad y la clase NO se adivinan sin encabezado (una columna de números no es una cantidad)', () => {
  const rows = [
    ['1000000001', 'Luis Pardo', 'luis@x.co'],
    ['1000000002', 'Eva Cruz', 'eva@x.co'],
  ];
  const r = buildImport(rows, TYPES, 't-gen');
  assert.deepEqual(r.rows.map((x) => [x.dni, x.quantity]), [
    ['1000000001', 1],
    ['1000000002', 1],
  ]);
});

test('parseQuantity y parseKind por separado', () => {
  assert.deepEqual(parseQuantity(''), { quantity: 1, error: '' });
  assert.deepEqual(parseQuantity('  5 '), { quantity: 5, error: '' });
  assert.equal(parseQuantity('2.5').error !== '', true);
  assert.equal(parseQuantity('-3').error !== '', true);
  assert.deepEqual(parseKind('', 'LIBRE'), { kind: 'LIBRE', error: '' });
  assert.deepEqual(parseKind('TRANSFERIBLE', 'PERSONAL'), { kind: 'LIBRE', error: '' });
  assert.deepEqual(parseKind('nominal', 'LIBRE'), { kind: 'PERSONAL', error: '' });
  assert.equal(parseKind('vip', 'PERSONAL').error !== '', true);
});

test('cualquier orden de columnas y encabezados con tildes, mayúsculas o sinónimos', () => {
  const rows = [
    ['E-mail', 'Documento', 'Nombre completo', 'Localidad'],
    ['ana@x.co', 1234567890, 'Ana Torres', 'vip'],
  ];
  const r = buildImport(rows, TYPES, 't-gen');
  assert.equal(r.rows[0].status, 'ok');
  assert.deepEqual([r.rows[0].name, r.rows[0].dni, r.rows[0].email, r.rows[0].ticket_type_id], ['Ana Torres', '1234567890', 'ana@x.co', 't-vip']);
});

test('sin encabezado: se deduce por el contenido (correo con @, cédula numérica, nombre)', () => {
  const rows = [
    ['1.000.000.001', 'Luis Pardo', 'luis@x.co'],
    ['1000000002', 'Eva Cruz', 'eva@x.co'],
  ];
  const r = buildImport(rows, TYPES, 't-gen');
  assert.equal(r.headerFound, false);
  assert.deepEqual(r.rows.map((x) => [x.name, x.dni, x.email, x.status]), [
    ['Luis Pardo', '1000000001', 'luis@x.co', 'ok'],
    ['Eva Cruz', '1000000002', 'eva@x.co', 'ok'],
  ]);
});

test('solo nombre y correo (sin cédula) funciona con o sin encabezado', () => {
  const a = buildImport([['Nombre', 'Correo'], ['Pedro', 'pedro@x.co']], TYPES, 't-gen');
  const b = buildImport([['Pedro', 'pedro@x.co']], TYPES, 't-gen');
  for (const r of [a, b]) {
    assert.equal(r.rows.length, 1);
    assert.deepEqual([r.rows[0].name, r.rows[0].email, r.rows[0].dni, r.rows[0].status], ['Pedro', 'pedro@x.co', '', 'ok']);
  }
});

test('Google Sheets pegado (tabuladores) y CSV con punto y coma o comillas', () => {
  const tsv = 'Nombre\tCédula\tCorreo\nJuan\t111111\tj@x.co\nAna\t222222\ta@x.co';
  assert.equal(buildImport(parseDelimited(tsv), TYPES, 't-gen').rows.length, 2);
  const semi = 'Nombre;Cédula;Correo\r\nJuan;111111;j@x.co\r\n';
  assert.equal(buildImport(parseDelimited(semi), TYPES, 't-gen').rows[0].email, 'j@x.co');
  const quoted = 'Nombre,Correo\n"Pérez, Juan",j@x.co\n"Dijo ""hola""",h@x.co';
  const q = buildImport(parseDelimited(quoted), TYPES, 't-gen');
  assert.deepEqual(q.rows.map((x) => x.name), ['Pérez, Juan', 'Dijo "hola"']);
});

test('filas malas se marcan sin tumbar el resto', () => {
  const r = buildImport(
    [
      ['Nombre', 'Cédula', 'Correo', 'Tipo'],
      ['', '1', 'a@x.co', ''],
      ['Sin correo', '2', '', ''],
      ['Correo malo', '3', 'no-es-correo', ''],
      ['Tipo raro', '4', 't@x.co', 'Platino'],
      ['Buena', '5', 'ok@x.co', 'General'],
    ],
    TYPES,
    't-gen',
  );
  assert.deepEqual(r.rows.map((x) => x.status), ['error', 'error', 'error', 'error', 'ok']);
  assert.match(r.rows[0].message, /nombre/i);
  assert.match(r.rows[1].message, /correo/i);
  assert.match(r.rows[2].message, /válido/);
  assert.match(r.rows[3].message, /Platino/);
});

test('repetidas en el archivo y ya enviadas antes se separan; mismo correo con otro tipo sí se permite', () => {
  const rows = [
    ['Nombre', 'Correo', 'Tipo'],
    ['Ana', 'ANA@x.co', 'General'],
    ['Ana otra vez', 'ana@x.co', 'General'],
    ['Ana VIP', 'ana@x.co', 'VIP'],
    ['Beto', 'beto@x.co', 'General'],
  ];
  const r = buildImport(rows, TYPES, 't-gen', [{ email: 'Beto@x.co', ticket_type_id: 't-gen' }]);
  assert.deepEqual(r.rows.map((x) => x.status), ['ok', 'dup_file', 'ok', 'already']);
});

test('un archivo de más de 500 filas se rechaza entero', () => {
  const big = [['Nombre', 'Correo'], ...Array.from({ length: MAX_ROWS + 1 }, (_, i) => [`P${i}`, `p${i}@x.co`])];
  const r = buildImport(big, TYPES, 't-gen');
  assert.equal(r.tooMany, true);
  assert.equal(r.rows.length, 0);
  assert.equal(buildImport(big.slice(0, MAX_ROWS + 1), TYPES, 't-gen').tooMany, false);
});

test('filas vacías del final o del medio no cuentan y el número de fila es el del archivo', () => {
  const r = buildImport([['Nombre', 'Correo'], ['A', 'a@x.co'], ['', ''], ['B', 'b@x.co'], [null, undefined]], TYPES, 't-gen');
  assert.deepEqual(r.rows.map((x) => x.line), [2, 4]);
  assert.equal(r.total, 2);
});

test('cédulas: con puntos o espacios quedan solo números, pasaportes se respetan', () => {
  assert.equal(normalizeDniText('1.000.000.001'), '1000000001');
  assert.equal(normalizeDniText(' 1 234 '), '1234');
  assert.equal(normalizeDniText('ab123456'), 'AB123456');
  assert.equal(normalizeDniText(''), '');
});

test('chunk corta en lotes y no pierde nada', () => {
  assert.deepEqual(chunk([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
  assert.deepEqual(chunk([], 20), []);
});
