/**
 * Almacén del documento de la Fundación.  SOLO SERVIDOR.
 *
 * Nunca se importe desde un componente cliente: usa la llave de servicio de
 * Supabase, que no puede salir del servidor.
 *
 * ── Puesta en marcha ──────────────────────────────────────────────────────
 * 1. Ejecutar `supabase/ong_contenido.sql` en el proyecto de Supabase.
 * 2. Definir la variable de entorno `SUPABASE_SERVICE_ROLE_KEY`
 *    (Project Settings → API → service_role). NO lleva prefijo NEXT_PUBLIC_:
 *    si lo llevara, quedaría expuesta en el navegador.
 *
 * Mientras no estén esas dos cosas, `obtener()` devuelve null y la página
 * publica el contenido de fábrica. La página nunca se cae por esto.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { ContenidoOng } from "@/app/ong/contenido";

const TABLA = "ong_contenido";
const FILA = "actual";

export type Almacenado = {
  documento: Partial<ContenidoOng>;
  actualizadoEn: string | null;
  actualizadoPor: string | null;
};

export function almacenConfigurado(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

function cliente(): SupabaseClient | null {
  if (!almacenConfigurado()) return null;
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

/** Devuelve lo guardado, o null si no hay nada o el almacén no está listo. */
export async function obtener(): Promise<Almacenado | null> {
  const sb = cliente();
  if (!sb) return null;
  try {
    const { data, error } = await sb
      .from(TABLA)
      .select("documento, actualizado_en, actualizado_por")
      .eq("id", FILA)
      .maybeSingle();
    if (error || !data) return null;
    return {
      documento: (data.documento ?? {}) as Partial<ContenidoOng>,
      actualizadoEn: data.actualizado_en ?? null,
      actualizadoPor: data.actualizado_por ?? null,
    };
  } catch {
    // El almacén nunca debe tumbar la página pública.
    return null;
  }
}

/** Guarda el documento completo. Lanza si el almacén no está configurado. */
export async function guardar(
  documento: ContenidoOng,
  autor: string,
): Promise<void> {
  const sb = cliente();
  if (!sb) {
    throw new Error(
      "El almacén no está configurado: falta SUPABASE_SERVICE_ROLE_KEY o la tabla ong_contenido.",
    );
  }
  const { error } = await sb.from(TABLA).upsert(
    {
      id: FILA,
      documento,
      actualizado_en: new Date().toISOString(),
      actualizado_por: autor,
    },
    { onConflict: "id" },
  );
  if (error) throw new Error(error.message);
}
