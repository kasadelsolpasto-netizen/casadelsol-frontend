/**
 * Rutas de la plataforma de raves antes de mudarse a /raves.
 *
 * Siguen circulando en correos ya enviados, códigos QR de entradas impresas,
 * enlaces de promotores y en lo que tengan registrado Google y la pasarela de
 * pagos. Se redirigen a su nueva dirección —conservando parámetros— para que
 * nada de eso se rompa. No son enlaces de la Fundación hacia raves: la página
 * de la raíz no menciona ninguna.
 */
const RUTAS_RAVES = [
  'admin', 'artist-invite', 'auth', 'checkout', 'claim-courtesy', 'events',
  'forgot-password', 'login', 'posts', 'profile', 'promos', 'register',
  'reset-password', 'scanner', 'shop', 'ticket',
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      ...RUTAS_RAVES.flatMap((r) => [
        { source: `/${r}`, destination: `/raves/${r}`, permanent: false },
        { source: `/${r}/:resto*`, destination: `/raves/${r}/:resto*`, permanent: false },
      ]),
      // Enlaces de promotor a la portada antigua: kasadelsol.co/?promo=CODIGO
      ...['promo', 'ref'].map((key) => ({
        source: '/',
        has: [{ type: 'query', key }],
        destination: '/raves',
        permanent: false,
      })),
      // La Fundación pasó de /ong a la raíz
      { source: '/ong', destination: '/', permanent: true },
      // Apps ya instaladas buscan el manifiesto en su dirección anterior
      { source: '/manifest.webmanifest', destination: '/raves/manifest.webmanifest', permanent: false },
    ];
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'snbqdxtrlvymswgqhxky.supabase.co',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Content-Security-Policy',
            value: `
              default-src 'self';
              script-src 'self' 'unsafe-eval' 'unsafe-inline' https://checkout.bold.co https://*.bold.co https://accounts.google.com https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/ https://www.recaptcha.net/ https://checkout.wompi.co https://cdn.wompi.co https://wompi.co;
              style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://*.bold.co;
              img-src 'self' data: blob: https://*.bold.co https://lh3.googleusercontent.com https://res.cloudinary.com https://grainy-gradients.vercel.app https://snbqdxtrlvymswgqhxky.supabase.co;
              font-src 'self' https://fonts.gstatic.com;
              connect-src 'self' https://*.bold.co http://localhost:3001 http://127.0.0.1:3001 https://casadelsol-backend.onrender.com wss://casadelsol-backend.onrender.com https://snbqdxtrlvymswgqhxky.supabase.co https://accounts.google.com https://www.googleapis.com https://www.google.com/recaptcha/ https://www.recaptcha.net/;
              frame-src 'self' https://*.bold.co https://accounts.google.com https://www.google.com/recaptcha/ https://www.recaptcha.net/ https://checkout.wompi.co;
              media-src 'self' https://assets.mixkit.co;
              worker-src 'self';
              upgrade-insecure-requests;
            `.replace(/\s{2,}/g, ' ').trim(),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
