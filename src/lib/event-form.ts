/**
 * Validación del formulario de eventos (crear y editar).
 *
 * Solo se exige lo que de verdad hace falta para que el evento exista y se pueda vender: nombre, fecha y,
 * en cada etapa, nombre, precio y cantidad. El flyer, el lugar y la descripción son opcionales.
 * Si algo falta, el mensaje dice EXACTAMENTE qué campo es (antes salía un cartel genérico).
 *
 * Sin dependencias de React ni del navegador (se puede probar en Node).
 */

export interface EventDraft {
  title?: string | null;
  date?: string | null;
}

export interface StageDraft {
  name?: string | null;
  price?: number | string | null;
  capacity?: number | string | null;
  sale_start?: string | null;
  sale_end?: string | null;
}

const isBlank = (v: unknown): boolean => v === undefined || v === null || String(v).trim() === '';

const toMs = (v: string | null | undefined): number | null => {
  if (isBlank(v)) return null;
  const n = new Date(v as string).getTime();
  return Number.isFinite(n) ? n : NaN;
};

/** Lista de problemas, cada uno nombrando el campo. Vacía si todo está bien. */
export function validateEventForm(event: EventDraft, stages: StageDraft[]): string[] {
  const problems: string[] = [];

  if (isBlank(event.title)) problems.push('El nombre del evento');

  if (isBlank(event.date)) problems.push('La fecha y hora de apertura del evento');
  else if (!Number.isFinite(new Date(event.date as string).getTime())) problems.push('La fecha del evento no es válida');

  (stages ?? []).forEach((s, i) => {
    const named = !isBlank(s.name);
    const label = `Etapa ${i + 1}${named ? ` (${String(s.name).trim()})` : ''}`;

    if (!named) problems.push(`${label}: falta el nombre`);

    if (isBlank(s.price)) problems.push(`${label}: falta el precio (pon 0 si es gratis)`);
    else if (!Number.isFinite(Number(s.price)) || Number(s.price) < 0) problems.push(`${label}: el precio no es válido`);

    if (isBlank(s.capacity)) problems.push(`${label}: falta la cantidad de entradas`);
    else if (!Number.isInteger(Number(s.capacity)) || Number(s.capacity) < 1) {
      problems.push(`${label}: la cantidad de entradas debe ser un número entero de 1 o más`);
    }

    const start = toMs(s.sale_start);
    const end = toMs(s.sale_end);
    if (Number.isNaN(start)) problems.push(`${label}: la fecha de apertura no es válida`);
    if (Number.isNaN(end)) problems.push(`${label}: la fecha de cierre no es válida`);
    if (start !== null && end !== null && !Number.isNaN(start) && !Number.isNaN(end) && end <= start) {
      problems.push(`${label}: el cierre debe ser después de la apertura`);
    }
  });

  return problems;
}

/** Texto para mostrar junto al botón de guardar (una línea por problema). */
export function formatProblems(problems: string[]): string {
  return `Revisa esto antes de guardar:\n${problems.map((p) => `• ${p}`).join('\n')}`;
}
