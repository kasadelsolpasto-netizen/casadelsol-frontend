import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Kasa del Sol',
    short_name: 'Kasa del Sol',
    description: 'Sistemas de Seguridad y Boletería (Bóveda)',
    start_url: '/',
    display: 'standalone',
    background_color: '#000000',
    theme_color: '#000000',
    icons: [
      {
        src: '/api/brand/icon',
        sizes: 'any',
        type: 'image/png',
      },
    ],
  };
}
