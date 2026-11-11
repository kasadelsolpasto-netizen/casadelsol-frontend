import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Kasa del Sol',
    short_name: 'Kasa del Sol',
    description: 'Sistemas de Seguridad y Boletería (Bóveda)',
    start_url: '/',
    display: 'standalone',
    background_color: '#030303',
    theme_color: '#030303',
    icons: [
      {
        src: '/api/brand/icon?v=1',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable any',
      },
      {
        src: '/api/brand/icon?v=1',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable any',
      },
    ],
  };
}
