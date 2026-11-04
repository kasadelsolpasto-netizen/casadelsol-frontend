This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Fundación Kasa del Sol (`/ong`)

Página institucional de la Fundación, editable desde el panel en
`/admin/ong`. El contenido de fábrica vive en `src/app/ong/contenido.ts` y lo
que se publica desde el panel se guarda en Supabase y se compone sobre esa
base, de modo que los campos nuevos que se agreguen en código aparecen aunque
el documento guardado sea anterior.

Para habilitar la publicación desde el panel:

1. Ejecutar `supabase/ong_contenido.sql` en el SQL Editor del proyecto de
   Supabase. Crea la tabla `ong_contenido` con RLS activo y sin políticas: solo
   se accede desde el servidor con la llave de servicio.
2. Definir la variable de entorno `SUPABASE_SERVICE_ROLE_KEY` (Supabase →
   Project Settings → API → `service_role`). **Sin** el prefijo
   `NEXT_PUBLIC_`: con él quedaría expuesta en el navegador.

Mientras eso no esté, la página publica el contenido de fábrica y el panel
avisa que el almacén no está configurado.

La escritura (`PUT /api/ong/contenido`) autoriza reenviando el token de sesión
al backend, a un endpoint que este solo responde a un administrador
(`ONG_ENDPOINT_VERIFICACION`, por defecto `/admin/settings/wompi`). El
`middleware.ts` que protege `/admin` solo lee el payload del JWT y no verifica
la firma: sirve de puerta para la interfaz, no de control de acceso.
