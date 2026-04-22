/** @type {import('next').NextConfig} */
const nextConfig = {
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
              script-src 'self' 'unsafe-eval' 'unsafe-inline' https://accounts.google.com https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/ https://www.recaptcha.net/ https://checkout.wompi.co https://cdn.wompi.co https://wompi.co;
              style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
              img-src 'self' data: blob: https://lh3.googleusercontent.com https://res.cloudinary.com https://grainy-gradients.vercel.app https://snbqdxtrlvymswgqhxky.supabase.co;
              font-src 'self' https://fonts.gstatic.com;
              connect-src 'self' http://localhost:3001 http://127.0.0.1:3001 https://casadelsol-backend.onrender.com wss://casadelsol-backend.onrender.com https://snbqdxtrlvymswgqhxky.supabase.co https://accounts.google.com https://www.googleapis.com https://www.google.com/recaptcha/ https://www.recaptcha.net/;
              frame-src 'self' https://accounts.google.com https://www.google.com/recaptcha/ https://www.recaptcha.net/ https://checkout.wompi.co;
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
