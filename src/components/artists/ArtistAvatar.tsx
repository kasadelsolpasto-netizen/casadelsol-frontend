"use client";
import { useEffect, useState } from 'react';
import { Music } from 'lucide-react';

/** Foto del artista dentro de un círculo. Si el enlace no carga (o la página lo bloquea por seguridad) muestra el ícono en vez de un círculo vacío. */
export default function ArtistAvatar({ url, iconClass = 'w-5 h-5' }: { url: string | null | undefined; iconClass?: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [url]);
  if (!url || failed) return <Music className={`${iconClass} text-zinc-600`} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="" className="w-full h-full object-cover" onError={() => setFailed(true)} />;
}