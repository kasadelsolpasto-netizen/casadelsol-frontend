/**
 * Preparación de imágenes antes de subirlas (funciones puras, se prueban con `node --test`).
 * La imagen se reduce solo si excede el lado máximo: nunca se agranda ni se le aplica filtro alguno.
 */

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/** Motivo por el que un archivo no se puede subir, o null si sirve. */
export function uploadProblem(file: { type: string; size: number }): string | null {
  if (!IMAGE_TYPES.includes(file.type)) return 'Sube una imagen JPG, PNG o WebP.';
  if (file.size > MAX_UPLOAD_BYTES) return 'La imagen pesa más de 15 MB. Usa una más liviana.';
  if (file.size === 0) return 'El archivo está vacío.';
  return null;
}

/** Tamaño final: se conserva la proporción y solo se reduce cuando el lado mayor pasa de `maxSide`. */
export function fitWithin(width: number, height: number, maxSide: number): { width: number; height: number; resized: boolean } {
  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));
  const longest = Math.max(w, h);
  if (longest <= maxSide) return { width: w, height: h, resized: false };
  const k = maxSide / longest;
  return { width: Math.max(1, Math.round(w * k)), height: Math.max(1, Math.round(h * k)), resized: true };
}

/** Nombre de archivo único dentro de la carpeta (sin datos de la persona). */
export function uploadPath(folder: string, ext: string, now: number = Date.now(), rand: string = Math.random().toString(36).slice(2, 10)): string {
  const safeFolder = folder.replace(/[^a-z0-9/_-]/gi, '').replace(/^\/+|\/+$/g, '') || 'artists';
  const safeExt = /^(jpg|png|webp)$/.test(ext) ? ext : 'jpg';
  return `${safeFolder}/${now}_${rand}.${safeExt}`;
}
