import { MetadataRoute } from 'next';

// El estándar pide un ícono por cada "purpose": 'any' (ícono normal) y 'maskable' (Android lo recorta en círculo/gota).
// Antes se usaba 'maskable any' en una sola entrada, que ya no es válido.
const ICON_SIZES = ['192x192', '512x512'];
const ICON_PURPOSES = ['any', 'maskable'] as const;

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Kasa del Sol',
    short_name: 'Kasa del Sol',
    description: 'Sistemas de Seguridad y Boletería (Bóveda)',
    start_url: '/',
    display: 'standalone',
    background_color: '#030303',
    theme_color: '#030303',
    icons: ICON_SIZES.flatMap((sizes) =>
      ICON_PURPOSES.map((purpose) => ({
        src: '/api/brand/icon?v=1',
        sizes,
        type: 'image/png',
        purpose,
      })),
    ),
  };
}
