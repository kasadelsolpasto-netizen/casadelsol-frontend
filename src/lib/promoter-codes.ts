// Qué código usa el promotor en su panel cuando tiene más de uno.
// El servidor sigue siendo la fuente de verdad (valida dueño, estado, evento y límites al vender); esto solo evita
// que el panel mande un código que no corresponde. Pruebas:  npm run test:scan

export interface PromoterCodeLite {
  id: string;
  code: string;
  event_id?: string | null;
  is_active?: boolean | null;
  created_at?: string | Date | null;
}

const stamp = (v: unknown): number => {
  const t = v ? new Date(v as string).getTime() : NaN;
  return Number.isFinite(t) ? t : 0;
};

/** Orden estable: el más antiguo primero; si empatan, por texto del código y luego por id. */
export function sortCodes<T extends PromoterCodeLite>(codes: T[] | null | undefined): T[] {
  return [...(Array.isArray(codes) ? codes : [])].sort(
    (a, b) => stamp(a.created_at) - stamp(b.created_at) || a.code.localeCompare(b.code) || a.id.localeCompare(b.id),
  );
}

/**
 * Códigos con los que puede vender en ese evento: activos y, o sin evento fijo, o fijados a ese mismo evento.
 * Los fijados al evento van primero. Sin evento elegido todavía: todos los activos.
 */
export function codesForEvent<T extends PromoterCodeLite>(codes: T[] | null | undefined, eventId: string | null | undefined): T[] {
  const active = sortCodes(codes).filter((c) => c.is_active !== false);
  if (!eventId) return active;
  const fits = active.filter((c) => !c.event_id || c.event_id === eventId);
  return [...fits.filter((c) => c.event_id === eventId), ...fits.filter((c) => !c.event_id)];
}

/** El código a usar: el que eligió el promotor (si todavía vale para ese evento) o, si no, el primero de la lista. */
export function pickPromoterCode<T extends PromoterCodeLite>(
  codes: T[] | null | undefined,
  eventId: string | null | undefined,
  chosenId?: string | null,
): T | null {
  const list = codesForEvent(codes, eventId);
  return list.find((c) => c.id === chosenId) ?? list[0] ?? null;
}
