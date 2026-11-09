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
`/admin/ong`. No comparte el esquema del sitio de eventos: no lleva la barra
de cuentas, ni el rastreador de promotores, ni el aviso de pedidos, ni
reCAPTCHA. Ese filtro vive en `src/components/ChromeSitio.tsx`.

El contenido de fábrica está en `src/app/ong/contenido.ts`. Lo que se publica
desde el panel se guarda en el backend, en la tabla de ajustes del sistema
bajo la clave `ong_contenido`, junto a la marca y las llaves de pago:

- `GET /settings/ong` — público, es lo mismo que ya muestra la página.
- `PUT /admin/settings/ong` — solo OWNER, por el guard de rol del backend.

Lo guardado se fusiona sobre el contenido de fábrica (`src/lib/ong-contenido.ts`),
de modo que los campos nuevos que se agreguen en código aparecen aunque el
documento almacenado sea anterior. Si el backend no responde, la página
publica el contenido de fábrica en vez de caerse.
