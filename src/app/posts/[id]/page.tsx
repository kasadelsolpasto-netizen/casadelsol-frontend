// SERVER COMPONENT — sin "use client"
// Genera <title>, <meta>, Open Graph y JSON-LD desde los campos SEO del post
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import PostDetailClient from './PostDetailClient';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001';
const SITE_URL = 'https://kasadelsol.co';
const SITE_NAME = 'Kasa del Sol';

// ── Fetch compartido ─────────────────────────────────────────────────────────
async function getPost(id: string) {
  try {
    const res = await fetch(`${API}/posts/${id}/public`, { cache: 'no-store' });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// ── generateMetadata — Next.js 14 ────────────────────────────────────────────
export async function generateMetadata(
  { params }: { params: { id: string } }
): Promise<Metadata> {
  const post = await getPost(params.id);
  if (!post) return { title: 'Publicación no encontrada | Kasa del Sol' };

  // Usar campos SEO si el admin los definió; si no, usar defaults del post
  const title       = post.seo_title       || `${post.title} | ${SITE_NAME}`;
  const description = post.seo_description || post.content?.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160) || '';
  const slug        = post.seo_slug        || post.id;
  const canonical   = `${SITE_URL}/posts/${slug}`;
  const image       = post.cover_url       || `${SITE_URL}/og-default.jpg`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: SITE_NAME,
      type: 'article',
      publishedTime: post.published_at,
      images: [{ url: image, width: 1200, height: 630, alt: post.title }],
    },
    twitter: {
      card:        'summary_large_image',
      title,
      description,
      images:      [image],
      site:        '@kasadelsol',
    },
    robots: {
      index:  !post.is_draft,
      follow: !post.is_draft,
    },
  };
}

// ── Página principal (Server) ────────────────────────────────────────────────
export default async function PostDetailPage({ params }: { params: { id: string } }) {
  const post = await getPost(params.id);
  if (!post) notFound();

  // ── JSON-LD: Article Schema.org ──────────────────────────────────────────
  const slug        = post.seo_slug        || post.id;
  const title       = post.seo_title       || `${post.title} | ${SITE_NAME}`;
  const description = post.seo_description || post.content?.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160) || '';
  const canonical   = `${SITE_URL}/posts/${slug}`;
  const image       = post.cover_url       || `${SITE_URL}/og-default.jpg`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline:      post.title,
    name:          title,
    description,
    url:           canonical,
    datePublished: post.published_at,
    dateModified:  post.published_at,
    image: {
      '@type': 'ImageObject',
      url:     image,
      width:   1200,
      height:  630,
    },
    author: {
      '@type': 'Person',
      name:    post.author?.name || SITE_NAME,
    },
    publisher: {
      '@type': 'Organization',
      name:    SITE_NAME,
      logo: {
        '@type': 'ImageObject',
        url:     `${SITE_URL}/logo.png`,
      },
    },
    mainEntityOfPage: {
      '@type': '@WebPage',
      '@id':   canonical,
    },
  };

  return (
    <>
      {/* JSON-LD inyectado en <head> */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Componente cliente (reacciones, interactividad) */}
      <PostDetailClient post={post} />
    </>
  );
}
