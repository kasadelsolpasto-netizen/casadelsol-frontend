import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import { Atardecer } from "./Atardecer";
import type { Identidad, Hero as DatosHero } from "../contenido";

export function Hero({
  identidad,
  hero,
}: {
  identidad: Identidad;
  hero: DatosHero;
}) {
  return (
    <header className="relative flex min-h-[94vh] flex-col justify-end overflow-hidden">
      <Atardecer />

      <div className="relative z-10 mx-auto w-full max-w-7xl px-6 pb-20 pt-[36vh] sm:pt-28 md:pb-28 md:pt-36">
        <p className="ong-eyebrow">{hero.antetitulo}</p>

        <h1 className="ong-title ong-gradient-text mt-7 max-w-[min(100%,640px)] text-[clamp(2rem,5.9vw,5.2rem)]">
          {hero.titular}
        </h1>

        <p className="mt-9 max-w-2xl text-base leading-relaxed ong-muted md:text-xl md:leading-relaxed">
          {hero.entrada}
        </p>

        <div className="mt-11 flex flex-wrap items-center gap-4">
          <Link
            href={hero.acciones.principal.href}
            className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[var(--ong-red)] to-[var(--ong-red-deep)] px-8 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-white shadow-[0_22px_50px_-22px_rgba(178,32,26,0.9)] transition-transform duration-500 hover:scale-[1.03]"
          >
            {hero.acciones.principal.label}
            <ArrowRight className="h-4 w-4 transition-transform duration-500 group-hover:translate-x-1" />
          </Link>
          <Link
            href={hero.acciones.secundario.href}
            className="inline-flex items-center gap-2 rounded-full border ong-hair bg-white/60 px-8 py-4 text-[11px] font-black uppercase tracking-[0.2em] ong-muted backdrop-blur-sm transition-colors duration-500 hover:border-[var(--ong-red)] hover:text-[var(--ong-red)]"
          >
            {hero.acciones.secundario.label}
          </Link>
        </div>

        {/* Sellos institucionales */}
        <dl className="mt-14 grid max-w-3xl gap-px overflow-hidden rounded-2xl border ong-hair bg-[var(--ong-hair)] sm:grid-cols-3">
          {hero.sellos.map((sello) => (
            <div
              key={sello.id}
              className="bg-white/80 px-6 py-5 backdrop-blur-sm"
            >
              <dt className="text-[9px] font-black uppercase tracking-[0.28em] ong-faint">
                {sello.etiqueta}
              </dt>
              <dd className="ong-mono mt-2 text-xs font-bold leading-snug ong-strong">
                {sello.valor}
              </dd>
            </div>
          ))}
        </dl>

        <p className="mt-8 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] ong-faint">
          <MapPin className="h-3.5 w-3.5 text-[var(--ong-red)]" />
          {identidad.domicilio}
          <span className="opacity-40">·</span>
          {identidad.ambito}
        </p>
      </div>

    </header>
  );
}
