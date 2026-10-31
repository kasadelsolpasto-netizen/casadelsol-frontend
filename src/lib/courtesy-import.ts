/**
 * Carga masiva de cortesías desde Excel (.xlsx), CSV o texto pegado (Google Sheets / Excel).
 * Acepta cualquier orden de columnas: se reconocen por el encabezado ("Nombre", "Cédula", "Correo", "Tipo de entrada")
 * o, si no hay encabezado, por el contenido (la columna con @ es el correo, la de solo números es la cédula).
 * Este archivo no toca la red ni la pantalla: solo convierte filas en una lista revisable.
 */

export interface TicketTypeLite {
  id: string;
  name: string;
}

export type RowStatus = 'ok' | 'error' | 'dup_file' | 'already';

export interface ImportRow {
  /** Número de fila en el archivo original (empezando en 1). */
  line: number;
  name: string;
  dni: string;
  email: string;
  ticket_type_id: string;
  ticket_type_name: string;
  status: RowStatus;
  message: string;
}

export interface ImportResult {
  rows: ImportRow[];
  headerFound: boolean;
  /** Filas de datos que traía el archivo (sin contar encabezado ni filas vacías). */
  total: number;
  /** Si el archivo trae más filas que el máximo permitido por carga, no se arma la lista. */
  tooMany: boolean;
}

export const MAX_ROWS = 500;
export const BATCH_SIZE = 20;

const fold = (s: unknown): string =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

const HEADERS: Record<'name' | 'dni' | 'email' | 'type', string[]> = {
  name: ['nombre', 'nombres', 'nombrecompleto', 'nombreyapellido', 'nombresyapellidos', 'apellidosynombres', 'name', 'fullname', 'invitado', 'asistente', 'persona'],
  dni: ['cedula', 'cedulas', 'cc', 'documento', 'documentodeidentidad', 'dni', 'identificacion', 'numerodedocumento', 'numerodecedula', 'id'],
  email: ['correo', 'correos', 'correoelectronico', 'email', 'mail', 'emailaddress'],
  type: ['tipo', 'tipodeentrada', 'tipoentrada', 'entrada', 'ticket', 'tickettype', 'localidad', 'categoria', 'zona'],
};

type Field = keyof typeof HEADERS;

const fieldOfHeader = (cell: unknown): Field | null => {
  const f = fold(cell);
  if (!f) return null;
  for (const k of Object.keys(HEADERS) as Field[]) if (HEADERS[k].includes(f)) return k;
  return null;
};

export const isEmail = (s: string): boolean => /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/.test(s);

const cellText = (v: unknown): string => {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number') return Number.isFinite(v) ? (Number.isInteger(v) ? String(v) : String(v)) : '';
  if (typeof v === 'boolean' || v instanceof Date) return '';
  return String(v).replace(/\s+/g, ' ').trim();
};

/** Cédulas con puntos, espacios o guiones ("1.000.000.001") quedan solo con números; pasaportes con letras se dejan como están. */
export const normalizeDniText = (s: string): string => {
  const t = s.trim();
  if (!t) return '';
  if (/^[\d.\s-]+$/.test(t)) return t.replace(/\D/g, '');
  return t.toUpperCase();
};

const looksLikeDni = (s: string): boolean => /^[\d.\s-]{5,}$/.test(s);

const isEmptyRow = (r: unknown[]): boolean => r.every((c) => cellText(c) === '');

/** Convierte texto pegado o un .csv en filas. Detecta si va separado por tabulaciones, punto y coma o comas, y respeta las comillas. */
export function parseDelimited(text: string): string[][] {
  const src = text.replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  const firstLine = src.split('\n').find((l) => l.trim() !== '') ?? '';
  const count = (ch: string) => firstLine.split(ch).length - 1;
  const tab = count('\t');
  const semi = count(';');
  const comma = count(',');
  const delim = tab >= semi && tab >= comma && tab > 0 ? '\t' : semi > comma ? ';' : ',';

  const rows: string[][] = [];
  let row: string[] = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cur += '"';
          i++;
        } else quoted = false;
      } else cur += ch;
    } else if (ch === '"' && cur === '') {
      quoted = true;
    } else if (ch === delim) {
      row.push(cur);
      cur = '';
    } else if (ch === '\n') {
      row.push(cur);
      rows.push(row);
      row = [];
      cur = '';
    } else cur += ch;
  }
  row.push(cur);
  if (row.length > 1 || row[0] !== '') rows.push(row);
  return rows;
}

type ColumnMap = Partial<Record<Field, number>>;

function mapFromHeader(header: unknown[]): ColumnMap {
  const map: ColumnMap = {};
  header.forEach((cell, i) => {
    const f = fieldOfHeader(cell);
    if (f && map[f] === undefined) map[f] = i;
  });
  return map;
}

function mapFromContent(dataRows: unknown[][], types: TicketTypeLite[]): ColumnMap {
  const width = Math.max(0, ...dataRows.map((r) => r.length));
  const map: ColumnMap = {};
  const used = new Set<number>();
  const stats = Array.from({ length: width }, (_, c) => {
    const cells = dataRows.map((r) => cellText(r[c])).filter((t) => t !== '');
    return { c, n: cells.length, mails: cells.filter(isEmail).length, nums: cells.filter(looksLikeDni).length };
  });
  const email = stats.filter((s) => s.n > 0 && s.mails / s.n >= 0.5).sort((a, b) => b.mails - a.mails)[0];
  if (email) {
    map.email = email.c;
    used.add(email.c);
  }
  const dni = stats.find((s) => !used.has(s.c) && s.n > 0 && s.nums / s.n >= 0.5);
  if (dni) {
    map.dni = dni.c;
    used.add(dni.c);
  }
  const name = stats.find((s) => !used.has(s.c) && s.n > 0);
  if (name) {
    map.name = name.c;
    used.add(name.c);
  }
  // Solo es la columna de tipo si la mayoría de sus celdas son nombres de tipos de entrada de este evento.
  const typeNames = new Set(types.map((t) => fold(t.name)));
  const type = stats.find((s) => {
    if (used.has(s.c) || s.n === 0) return false;
    const cells = dataRows.map((r) => fold(cellText(r[s.c]))).filter((t) => t !== '');
    return cells.filter((t) => typeNames.has(t)).length / cells.length >= 0.5;
  });
  if (type) map.type = type.c;
  return map;
}

const key = (email: string, typeId: string) => `${email.toLowerCase()}|${typeId}`;

/**
 * Arma la lista revisable. `existing` son las cortesías que ya tiene el evento (para no repetirlas si se sube el mismo archivo dos veces).
 * `defaultTypeId` se usa cuando el archivo no trae columna de tipo o la celda va vacía.
 */
export function buildImport(
  table: unknown[][],
  types: TicketTypeLite[],
  defaultTypeId: string,
  existing: Array<{ email?: string | null; ticket_type_id?: string | null }> = [],
): ImportResult {
  const numbered = table.map((r, i) => ({ r, line: i + 1 })).filter((x) => !isEmptyRow(x.r));

  // ¿La primera fila (entre las 5 primeras) es un encabezado?
  let headerIdx = -1;
  for (let i = 0; i < Math.min(5, numbered.length); i++) {
    const m = mapFromHeader(numbered[i].r);
    const known = Object.keys(m).length;
    if (known >= 2 || (known === 1 && (m.email !== undefined || m.name !== undefined) && !numbered[i].r.some((c) => isEmail(cellText(c))))) {
      headerIdx = i;
      break;
    }
  }

  const headerFound = headerIdx >= 0;
  const data = headerFound ? numbered.slice(headerIdx + 1) : numbered;
  if (data.length > MAX_ROWS) return { rows: [], headerFound, total: data.length, tooMany: true };

  const map: ColumnMap = headerFound ? mapFromHeader(numbered[headerIdx].r) : {};
  if (!headerFound || map.email === undefined || map.name === undefined) {
    const guess = mapFromContent(data.map((x) => x.r), types);
    const taken = new Set(Object.values(map));
    // Con encabezado solo se completan correo y nombre; sin encabezado, todo se deduce por el contenido.
    const fields: Field[] = headerFound ? ['email', 'name'] : ['email', 'dni', 'name', 'type'];
    for (const f of fields) {
      const g = guess[f];
      if (map[f] === undefined && g !== undefined && !taken.has(g)) {
        map[f] = g;
        taken.add(g);
      }
    }
  }

  const typeByName = new Map(types.map((t) => [fold(t.name), t]));
  const typeById = new Map(types.map((t) => [t.id, t]));
  const seen = new Set<string>();
  const already = new Set(
    existing.filter((e) => e.email && e.ticket_type_id).map((e) => key(String(e.email), String(e.ticket_type_id))),
  );

  const rows: ImportRow[] = data.map(({ r, line }) => {
    const get = (f: Field) => (map[f] === undefined ? '' : cellText(r[map[f] as number]));
    const name = get('name');
    const email = get('email').toLowerCase();
    const dni = normalizeDniText(get('dni'));
    const typeText = get('type');

    let type = typeById.get(defaultTypeId);
    let typeErr = '';
    if (typeText) {
      const f = fold(typeText);
      const found = typeByName.get(f) ?? types.find((t) => fold(t.name).startsWith(f) && f.length >= 3);
      if (found) type = found;
      else typeErr = `El tipo "${typeText}" no existe en este evento.`;
    }

    const base = { line, name, dni, email, ticket_type_id: type?.id ?? '', ticket_type_name: type?.name ?? typeText };
    if (!name) return { ...base, status: 'error' as const, message: 'Falta el nombre.' };
    if (!email) return { ...base, status: 'error' as const, message: 'Falta el correo.' };
    if (!isEmail(email)) return { ...base, status: 'error' as const, message: 'El correo no es válido.' };
    if (typeErr) return { ...base, status: 'error' as const, message: typeErr };
    if (!type) return { ...base, status: 'error' as const, message: 'Elige el tipo de entrada.' };
    const k = key(email, type.id);
    if (seen.has(k)) return { ...base, status: 'dup_file' as const, message: 'Repetida en el archivo: se envía solo una.' };
    seen.add(k);
    if (already.has(k)) return { ...base, status: 'already' as const, message: 'Ya tiene una cortesía de este tipo en este evento.' };
    return { ...base, status: 'ok' as const, message: '' };
  });

  return { rows, headerFound, total: data.length, tooMany: false };
}

export function chunk<T>(items: readonly T[], size: number): T[][] {
  const n = Math.max(1, Math.floor(size) || 1);
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += n) out.push(items.slice(i, i + n));
  return out;
}

export const TEMPLATE_HEADERS = ['Nombre', 'Cédula', 'Correo', 'Tipo de entrada'] as const;

/** Contenido de la plantilla CSV (con BOM para que Excel respete las tildes). */
export function templateCsv(typeNames: string[]): string {
  const t = typeNames[0] ?? 'General';
  const lines = [
    TEMPLATE_HEADERS.join(','),
    `Juan Pérez,1000000001,juan@correo.com,${t}`,
    `María Gómez,1000000002,maria@correo.com,${t}`,
    `Carlos Ruiz,,carlos@correo.com,`,
  ];
  return '﻿' + lines.join('\r\n') + '\r\n';
}
