// SERVER COMPONENT — sin "use client"
// Genera <title>, <meta>, Open Graph y JSON-LD Event (rich results en Google)
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import EventDetailClient from './EventDetailClient';

const API      = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001';
const SITE_URL = 'https://kasadelsol.co';
const SITE_NAME = 'Kasa del Sol';

// ── Fetch compartido ─────────────────────────────────────────────────────────
async function getEvent(id: string) {
  try {
    const res = await fetch(`${API}/events/${id}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// ── generateMetadata ─────────────────────────────────────────────────────────
export async function generateMetadata(
  { params }: { params: { id: string } }
): Promise<Metadata> {
  const event = await getEvent(params.id);
  if (!event) return { title: `Evento no encontrado | ${SITE_NAME}` };

  const title       = event.seo_title       || `${event.title} | ${SITE_NAME}`;
  const description = event.seo_description || event.description?.slice(0, 160) || '';
  const slug        = event.seo_slug        || event.id;
  const canonical   = `${SITE_URL}/events/${slug}`;
  const image       = event.flyer_url       || `${SITE_URL}/og-default.jpg`;
  const eventDate   = new Date(event.date);

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url:       canonical,
      siteName:  SITE_NAME,
      type:      'website',
      images:    [{ url: image, width: 1200, height: 630, alt: event.title }],
    },
    twitter: {
      card:        'summary_large_image',
      title,
      description,
      images:      [image],
      site:        '@kasadelsol',
    },
    robots: {
      index:  event.status === 'PUBLISHED',
      follow: event.status === 'PUBLISHED',
    },
  };
}

// ── Página principal (Server) ────────────────────────────────────────────────
export default async function EventPage({ params }: { params: { id: string } }) {
  const event = await getEvent(params.id);
  if (!event || event.status !== 'PUBLISHED') notFound();

  const slug      = event.seo_slug        || event.id;
  const title     = event.seo_title       || `${event.title} | ${SITE_NAME}`;
  const desc      = event.seo_description || event.description?.slice(0, 160) || '';
  const canonical = `${SITE_URL}/events/${slug}`;
  const image     = event.flyer_url       || `${SITE_URL}/og-default.jpg`;
  const startDate = new Date(event.date).toISOString();

  // Precio mínimo de los tickets para el schema (Google lo muestra en los resultados)
  const activeTickets = (event.ticket_types || []).filter(
    (t: any) => t.available > 0 && (!t.sale_end || new Date(t.sale_end) > new Date())
  );
  const minPrice = activeTickets.length
    ? Math.min(...activeTickets.map((t: any) => t.price))
    : null;

  // ── JSON-LD: schema.org Event ────────────────────────────────────────────
  // Este schema activa los "Event Rich Results" de Google:
  // aparece con fecha, lugar, precio y botón de entradas directamente en la SERP
  const jsonLd: any = {
    '@context': 'https://schema.org',
    '@type': 'Event',

    // Campos obligatorios para rich results
    name:      event.title,
    startDate,
    location: {
      '@type': 'Place',
      name:    event.venue,
      address: {
        '@type':           'PostalAddress',
        addressLocality:   event.venue,
        addressCountry:    'CO',
      },
    },

    // Campos altamente recomendados
    description: desc,
    image:       [image],
    url:         canonical,
    organizer: {
      '@type': 'Organization',
      name:    SITE_NAME,
      url:     SITE_URL,
    },
    eventStatus:         'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',

    // Ofertas de tickets — esto activa el precio en los rich results
    ...(activeTickets.length > 0 && {
      offers: activeTickets.map((t: any) => ({
        '@type':         'Offer',
        name:            t.name,
        price:           t.price,
        priceCurrency:   'COP',
        availability:    t.available > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/SoldOut',
        url:             canonical,
        validFrom:       t.sale_start ? new Date(t.sale_start).toISOString() : startDate,
        ...(t.sale_end && { validThrough: new Date(t.sale_end).toISOString() }),
      })),
    }),

    // Performer (opcional pero mejora visibilidad)
    performer: {
      '@type': 'PerformingGroup',
      name:    SITE_NAME,
    },
  };

  return (
    <>
      {/* JSON-LD inyectado en el <head> — activa Event Rich Results en Google */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Toda la interactividad (checkout, wizard, etc.) en el client component */}
      <EventDetailClient params={params} />
    </>
  );
}
