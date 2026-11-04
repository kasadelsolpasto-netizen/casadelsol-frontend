/**
 * Fusión del documento de la Fundación.
 *
 * Lo que guarda el panel admin se mezcla sobre `CONTENIDO_BASE`, no lo
 * reemplaza. Así, cuando se agrega un campo nuevo en código, aparece aunque el
 * documento almacenado sea anterior y no lo contenga.
 *
 * Regla de fusión:
 *   · objeto  → se recorre campo por campo
 *   · arreglo → el guardado manda completo (si el admin borró un elemento,
 *               debe quedar borrado; no se reinyectan los de fábrica)
 *   · resto   → el guardado manda, salvo que sea `undefined`
 *
 * Módulo sin dependencias: lo usan tanto el servidor como el panel.
 */
import { CONTENIDO_BASE, type ContenidoOng } from "@/app/ong/contenido";

function esObjetoPlano(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function fusionar<T>(base: T, guardado: unknown): T {
  if (guardado === undefined || guardado === null) return base;
  if (Array.isArray(base)) {
    return (Array.isArray(guardado) ? guardado : base) as T;
  }
  if (esObjetoPlano(base) && esObjetoPlano(guardado)) {
    const salida: Record<string, unknown> = { ...base };
    for (const clave of Object.keys(base)) {
      salida[clave] = fusionar(
        (base as Record<string, unknown>)[clave],
        guardado[clave],
      );
    }
    return salida as T;
  }
  return guardado as T;
}

/** Documento completo listo para renderizar. */
export function componer(guardado: unknown): ContenidoOng {
  return fusionar(CONTENIDO_BASE, guardado);
}
