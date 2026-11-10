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
import { CONTENIDO_BASE, type ContenidoOng } from "@/app/(fundacion)/contenido";

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

/** Documento completo, tal como lo edita el panel. */
export function componer(guardado: unknown): ContenidoOng {
  return fusionar(CONTENIDO_BASE, guardado);
}

/* ── Publicación ──────────────────────────────────────────────────────────
   Regla de la casa: lo que no consta se marca «PENDIENTE» y no se publica.
   El panel trabaja con el documento completo —necesita ver sus pendientes—;
   la página pública recibe este otro, ya depurado. La regla se cumple aquí,
   en un solo lugar, y no depende de que cada componente la recuerde.        */

const PENDIENTE = /^\s*PENDIENTE\b/i;

/** Un texto marcado como pendiente, o un valor que es solo una raya. */
export function esPendiente(v: unknown): boolean {
  return typeof v === "string" && PENDIENTE.test(v);
}

function depurar<T>(v: T): T {
  if (typeof v === "string") return (esPendiente(v) ? "" : v) as T;
  if (Array.isArray(v)) {
    const salida = v.map(depurar);
    // En una lista de textos, el que queda vacío sobra
    return salida.filter((x) => typeof x !== "string" || x.trim() !== "") as T;
  }
  if (esObjetoPlano(v)) {
    const salida: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v)) salida[k] = depurar(x);
    return salida as T;
  }
  return v;
}

const conTexto = (s: string | undefined) => !!s && s.trim() !== "";
const esCifra = (s: string) => conTexto(s) && !/^[\s—–-]+$/.test(s);

/** Documento listo para la página pública: sin pendientes ni enlaces rotos. */
export function publicar(guardado: unknown): ContenidoOng {
  const c = depurar(componer(guardado));

  // Un indicador solo existe si tiene cifra y rótulo
  c.territorio.marcadores = c.territorio.marcadores.filter(
    (m) => esCifra(m.valor) && conTexto(m.etiqueta),
  );
  c.hero.sellos = c.hero.sellos.filter(
    (s) => conTexto(s.etiqueta) && conTexto(s.valor),
  );
  c.lineas.items = c.lineas.items.filter((l) => conTexto(l.titulo));
  c.territorio.zonas = c.territorio.zonas.filter((z) => conTexto(z.nombre));
  c.programas.items = c.programas.items.filter((p) => conTexto(p.nombre));
  c.gobernanza.garantias = c.gobernanza.garantias.filter((g) => conTexto(g.titulo));
  c.vinculacion.vias = c.vinculacion.vias.filter((v) => conTexto(v.titulo));
  c.aliados = c.aliados.filter((a) => conTexto(a.nombre));
  c.contacto.redes = c.contacto.redes.filter(
    (r) => conTexto(r.label) && conTexto(r.href),
  );

  // El índice solo ofrece las secciones que de verdad se dibujan
  const vacias = new Set<string>();
  if (c.lineas.items.length === 0) vacias.add("lineas");
  if (c.programas.items.length === 0) vacias.add("programas");
  if (c.vinculacion.vias.length === 0) vacias.add("vinculacion");
  if (c.aliados.length === 0) vacias.add("aliados");
  c.secciones = c.secciones.filter(
    (s) => conTexto(s.id) && conTexto(s.label) && !vacias.has(s.id),
  );

  // Un botón de la portada no puede apuntar a una sección que no está
  const viva = (href: string) =>
    !href.startsWith("#") || !vacias.has(href.slice(1));
  if (!viva(c.hero.acciones.principal.href)) c.hero.acciones.principal.href = "#tesis";
  if (!viva(c.hero.acciones.secundario.href)) c.hero.acciones.secundario.href = "#contacto";
  for (const v of c.vinculacion.vias) {
    if (v.accion && !viva(v.accion.href)) v.accion.href = "#contacto";
  }

  return c;
}
