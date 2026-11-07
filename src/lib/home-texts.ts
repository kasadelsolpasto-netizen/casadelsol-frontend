/**
 * Catálogo de todos los textos de la portada.
 * Fuente única para la portada (valores por defecto) y para el panel del Supremo (formulario).
 * Se guardan en la configuración de marca bajo `homeTexts`; `homeTitle` y `homeDescription`
 * conservan sus campos históricos.
 */

export type HomeTextKey =
  | 'badgeOnSale' | 'badgeIdle' | 'badgeTag'
  | 'heroEyebrow' | 'heroLine1' | 'heroLine2' | 'heroAccent'
  | 'soundOn' | 'soundOff' | 'soundHintIdle' | 'soundHintPointer' | 'soundHintTilt' | 'dockIdle' | 'dockPlaying'
  | 'nextLabel' | 'buyButton' | 'soldOutButton' | 'soldOutLabel' | 'priceFrom'
  | 'listEyebrow' | 'listEmpty' | 'cardButton'
  | 'feedEyebrow' | 'feedTitle' | 'feedAccent' | 'feedSeeAll' | 'feedMore'
  | 'flyerStamp' | 'flyerEmpty'
  | 'footer';

export type HomeTextField = {
  key: HomeTextKey;
  label: string;
  fallback: string;
  help?: string;
};

export type HomeTextGroup = { title: string; fields: HomeTextField[] };

export const HOME_TEXT_GROUPS: HomeTextGroup[] = [
  {
    title: 'Portada · Encabezado',
    fields: [
      { key: 'badgeOnSale', label: 'Etiqueta: boletas en venta', fallback: 'boletas en venta' },
      { key: 'badgeIdle', label: 'Etiqueta: sin venta activa', fallback: 'stand by' },
      { key: 'badgeTag', label: 'Etiqueta secundaria', fallback: 'tribal techno · private raves' },
      { key: 'heroEyebrow', label: 'Antetítulo', fallback: '// sound system' },
      { key: 'heroLine1', label: 'Título · línea 1', fallback: 'Kasa' },
      { key: 'heroLine2', label: 'Título · línea 2', fallback: 'del' },
      { key: 'heroAccent', label: 'Título · palabra en verde', fallback: 'Sol' },
    ],
  },
  {
    title: 'Portada · Sonido',
    fields: [
      { key: 'soundOn', label: 'Botón para encender', fallback: 'prender la rave' },
      { key: 'soundOff', label: 'Botón para apagar', fallback: 'apagar el sonido' },
      { key: 'soundHintIdle', label: 'Ayuda con el sonido apagado', fallback: '// ritmo tribal generado en vivo · sube el volumen' },
      { key: 'soundHintPointer', label: 'Ayuda sonando (computador)', fallback: '// mueve el cursor: tocas el bajo y el eco' },
      { key: 'soundHintTilt', label: 'Ayuda sonando (celular)', fallback: '// inclina el teléfono: tocas el bajo y el eco' },
      { key: 'dockIdle', label: 'Botón flotante apagado', fallback: 'sound' },
      { key: 'dockPlaying', label: 'Botón flotante sonando', fallback: 'on air' },
    ],
  },
  {
    title: 'Portada · Próxima rave',
    fields: [
      { key: 'nextLabel', label: 'Rótulo del panel', fallback: '// próxima rave' },
      { key: 'priceFrom', label: 'Prefijo de precio', fallback: 'Desde' },
      { key: 'soldOutLabel', label: 'Texto de agotado', fallback: 'Sold out' },
      { key: 'buyButton', label: 'Botón de compra', fallback: 'Comprar boletas' },
      { key: 'soldOutButton', label: 'Botón si está agotado', fallback: 'Ver evento' },
      { key: 'flyerStamp', label: 'Sello del flyer (antes de la fecha)', fallback: 'rec' },
      { key: 'flyerEmpty', label: 'Flyer sin imagen', fallback: '// no signal' },
    ],
  },
  {
    title: 'Portada · Cartelera y feed',
    fields: [
      { key: 'listEyebrow', label: 'Antetítulo de la cartelera', fallback: '// cartelera' },
      { key: 'listEmpty', label: 'Cartelera vacía', fallback: '// sin fechas anunciadas — stay tuned' },
      { key: 'cardButton', label: 'Botón de cada evento', fallback: 'Ver detalles' },
      { key: 'feedEyebrow', label: 'Antetítulo del feed', fallback: '// transmisión' },
      { key: 'feedTitle', label: 'Título del feed', fallback: 'Del' },
      { key: 'feedAccent', label: 'Título del feed · palabra en degradé', fallback: 'Feed' },
      { key: 'feedSeeAll', label: 'Enlace "ver todo"', fallback: 'Ver todo' },
      { key: 'feedMore', label: 'Botón de más publicaciones', fallback: 'Ver más publicaciones' },
      { key: 'footer', label: 'Pie de página', fallback: 'kasa del sol · 128 bpm · tribal techno all night long' },
    ],
  },
];

export type HomeTexts = Record<HomeTextKey, string>;

export const HOME_TEXT_DEFAULTS: HomeTexts = Object.fromEntries(
  HOME_TEXT_GROUPS.flatMap((g) => g.fields.map((f) => [f.key, f.fallback])),
) as HomeTexts;

/** Mezcla lo guardado con los valores por defecto (un campo vacío usa el defecto). */
export function resolveHomeTexts(saved: unknown): HomeTexts {
  const out = { ...HOME_TEXT_DEFAULTS };
  if (saved && typeof saved === 'object') {
    for (const k of Object.keys(out) as HomeTextKey[]) {
      const v = (saved as Record<string, unknown>)[k];
      if (typeof v === 'string' && v.trim() !== '') out[k] = v;
    }
  }
  return out;
}

/** Solo los valores que difieren del defecto (lo que se guarda). */
export function diffHomeTexts(values: Partial<HomeTexts>): Partial<HomeTexts> {
  const out: Partial<HomeTexts> = {};
  for (const k of Object.keys(HOME_TEXT_DEFAULTS) as HomeTextKey[]) {
    const v = values[k];
    if (typeof v === 'string' && v.trim() !== '' && v !== HOME_TEXT_DEFAULTS[k]) out[k] = v;
  }
  return out;
}
