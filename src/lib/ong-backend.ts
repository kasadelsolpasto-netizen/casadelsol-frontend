/**
 * Contenido de la Fundación, guardado en el backend.
 *
 * Vive donde el resto de la configuración del panel —junto a la marca, las
 * llaves de pago y la DIAN—, en la misma tabla de ajustes del sistema bajo la
 * clave `ong_contenido`. Se lee por el endpoint público, porque es lo mismo
 * que ya muestra la página, y se escribe por el de administración, que el
 * backend reserva al OWNER.
 */
import type { ContenidoOng } from "@/app/ong/contenido";

export const API_ONG = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export type GuardadoOng = {
  documento: Partial<ContenidoOng> | null;
  actualizadoEn: string | null;
};

/**
 * Lee lo guardado. Devuelve null si el backend no responde: la página pública
 * no puede caerse porque el servicio esté caído, publica el contenido de
 * fábrica y ya.
 */
export async function leerContenido(): Promise<GuardadoOng | null> {
  try {
    const res = await fetch(`${API_ONG}/settings/ong`, { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      documento: (data?.documento ?? null) as Partial<ContenidoOng> | null,
      actualizadoEn: data?.actualizadoEn ?? null,
    };
  } catch {
    return null;
  }
}
