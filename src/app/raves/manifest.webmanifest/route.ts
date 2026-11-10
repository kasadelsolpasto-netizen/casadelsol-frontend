/**
 * Manifiesto de la app instalable. Pertenece a la plataforma de raves —es su
 * boletería la que se instala—, así que se sirve bajo /raves y solo lo
 * enlaza el layout de /raves. La página de la Fundación no ofrece instalar nada.
 */
export function GET() {
  return Response.json(
    {
      name: "Kasa del Sol",
      short_name: "Kasa del Sol",
      description: "Sistemas de Seguridad y Boletería (Bóveda)",
      id: "/raves",
      start_url: "/raves",
      scope: "/raves",
      display: "standalone",
      background_color: "#030303",
      theme_color: "#030303",
      icons: [
        { src: "/api/brand/icon?v=1", sizes: "192x192", type: "image/png", purpose: "any" },
        { src: "/api/brand/icon?v=1", sizes: "192x192", type: "image/png", purpose: "maskable" },
        { src: "/api/brand/icon?v=1", sizes: "512x512", type: "image/png", purpose: "any" },
        { src: "/api/brand/icon?v=1", sizes: "512x512", type: "image/png", purpose: "maskable" },
      ],
    },
    { headers: { "Content-Type": "application/manifest+json" } },
  );
}
