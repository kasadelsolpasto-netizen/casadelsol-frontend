"use client";
import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";

/**
 * Flyer en 3D: gira con el cursor/giroscopio global (--mx/--my) y además
 * responde al puntero local con un brillo especular. Capas con profundidad real
 * (preserve-3d): imagen, marco neón, esquinas y sello flotan a distintas alturas.
 */
export function TiltFlyer({
  href,
  src,
  title,
  stamp,
  emptyLabel = "// no signal",
}: {
  href: string;
  src?: string | null;
  title: string;
  stamp: string;
  emptyLabel?: string;
}) {
  const ref = useRef<HTMLAnchorElement>(null);

  const onMove = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--gx", `${((e.clientX - r.left) / r.width) * 100}%`);
    el.style.setProperty("--gy", `${((e.clientY - r.top) / r.height) * 100}%`);
  };

  // Escuadras cúbicas: capas apiladas en profundidad (extrusión real en 3D)
  const LAYERS = 9;
  const cube = (pos: "tl" | "tr" | "bl" | "br") => (
    <span className={`corner-cube ${pos}`} aria-hidden="true">
      {Array.from({ length: LAYERS }, (_, i) => (
        <i key={i} style={{ ["--i" as string]: i, ["--n" as string]: LAYERS } as React.CSSProperties} />
      ))}
    </span>
  );

  return (
    <div className="flyer-stage w-[min(72vw,300px)] sm:w-full sm:max-w-[420px] lg:w-[min(38vw,500px)] lg:max-w-none">
      <Link
        ref={ref}
        href={href}
        onPointerMove={onMove}
        aria-label={`Ver ${title}`}
        className="flyer-3d group relative block aspect-[4/5] rounded-2xl"
      >
        {/* Halo trasero que late */}
        <span className="flyer-halo absolute -inset-6 rounded-[2rem] pointer-events-none" aria-hidden="true" />

        {/* Borde conic giratorio (firma visual de las tarjetas de Kasa) */}
        <span className="absolute inset-0 rounded-2xl overflow-hidden p-[2px]" aria-hidden="true">
          <span className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] animate-[spin_4s_linear_infinite] bg-[conic-gradient(from_0deg,transparent_60%,#39ff14_80%,#bf00ff_100%)]" />
        </span>

        <span className="flyer-img absolute inset-[2px] rounded-[14px] overflow-hidden bg-[#050505]">
          {src ? (
            <Image
              src={src}
              alt={title}
              fill
              priority
              sizes="(max-width: 640px) 400px, (max-width: 1024px) 460px, 500px"
              className="object-cover"
            />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center font-mono text-xs uppercase tracking-[0.35em] text-neon-green/70 animate-pulse">
              {emptyLabel}
            </span>
          )}
          {/* Brillo especular que sigue al puntero */}
          <span className="flyer-glare absolute inset-0 pointer-events-none" aria-hidden="true" />
          {/* Barrido de líneas CRT */}
          <span className="absolute inset-0 pointer-events-none bg-[repeating-linear-gradient(0deg,rgba(0,0,0,0.18),rgba(0,0,0,0.18)_1px,transparent_1px,transparent_3px)]" aria-hidden="true" />
        </span>

        {/* Esquinas cúbicas: se levantan un poco fuera del recuadro, como una tapa */}
        {cube("tl")}
        {cube("tr")}
        {cube("bl")}
        {cube("br")}
        <span className="flyer-stamp absolute -bottom-4 left-1/2 whitespace-nowrap rounded-full border border-neon-green/60 bg-black/85 px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.3em] text-neon-green shadow-[0_0_20px_rgba(57,255,20,0.35)]">
          <span className="inline-block w-1.5 h-1.5 mr-2 rounded-full bg-[#ff2a2a] shadow-[0_0_6px_#ff2a2a] animate-pulse align-middle" />
          {stamp}
        </span>
      </Link>
    </div>
  );
}
