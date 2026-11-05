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

## Pase permanente (QR identificador) y saldo

Cada usuario tiene un QR que **no caduca** y que lo identifica en la puerta y en la barra. No
reemplaza las entradas —cada entrada conserva su QR de un solo uso—: es otra forma de llegar a
ellas, pensada para que mañana vaya impreso en un carné.

- **`/pase`** — la pantalla de la persona: su QR (`KASA_ID:<token>`), el código del carné
  (`KS-XXXX-XXXX-XX`), su saldo, sus movimientos y la recarga en línea. Guarda una copia local:
  sin señal el QR sigue a la vista, igual que las entradas (`lib/offline-tickets`).
- **Scanner** — el mismo lector reconoce entradas, pedidos de barra y ahora pases. Al leer un pase
  se abre `components/scanner/PassPanel`: quién es, sus entradas del evento (una toca para
  admitir), su saldo, sus pedidos abiertos, y el teclado para cobrar o abonar efectivo. Leer el
  pase no consume nada. Si la cámara falla, en *Taquilla* se escribe el código del carné.
- **Admin** — dentro de la ficha de cada usuario (`components/admin/UserWalletCard`): estado del
  pase, saldo, libro completo de movimientos, y devolución o ajuste con motivo.

`lib/pass.ts` guarda las reglas puras (reconocer un pase, leer montos escritos en pesos, nombrar
cada movimiento) y se prueba con `npm run test:scan`.
