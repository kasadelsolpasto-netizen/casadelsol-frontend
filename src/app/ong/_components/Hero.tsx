import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import { Emblema } from "./Emblema";
import { identidad, hero, secciones } from "../content";

export function Hero() {
  return (
    <header className="relative overflow-hidden border-b border-white/5">
      <div className="ong-horizon" aria-hidden="true" />
      <div className="ong-grid" aria-hidden="true" />
      <div className="ong-contour" aria-hidden="true" />

      <Emblema className="pointer-events-none absolute -top-24 right-[-22%] w-[680px] max-w-[125vw] opacity-50 md:right-[-8%] md:opacity-70" />

      <div className="relative mx-auto max-w-7xl px-6 pb-24 pt-20 md:pb-32 md:pt-28">
        <p className="ong-eyebrow">{hero.antetitulo}</p>

        <h1 className="ong-title mt-6 max-w-2xl text-4xl sm:text-5xl md:text-7xl">
          <span className="ong-gradient-text">Sol</span>
          <span className="text-zinc-600"> y </span>
          <span className="ong-gradient-water">cuenca</span>
        </h1>

        <p className="mt-6 max-w-xl text-sm font-black uppercase tracking-[0.2em] text-zinc-300">
          {identidad.nombre}
        </p>

        <p className="mt-8 max-w-2xl text-base leading-relaxed text-zinc-400 md:text-lg">
          {hero.entrada}
        </p>

        {/* Acciones */}
        <div className="mt-10 flex flex-wrap items-center gap-4">
          <Link
            href={hero.acciones.principal.href}
            className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[var(--ong-sun)] to-[var(--ong-ember)] px-7 py-3.5 text-[11px] font-black uppercase tracking-[0.2em] text-black transition-transform hover:scale-[1.02]"
          >
            {hero.acciones.principal.label}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link
            href={hero.acciones.secundario.href}
            className="inline-flex items-center gap-2 rounded-full border border-zinc-700 px-7 py-3.5 text-[11px] font-black uppercase tracking-[0.2em] text-zinc-300 transition-colors hover:border-[var(--ong-water)] hover:text-[var(--ong-water)]"
          >
            {hero.acciones.secundario.label}
          </Link>
        </div>

        {/* Sellos institucionales */}
        <dl className="mt-14 grid max-w-3xl gap-px overflow-hidden rounded-2xl border border-white/5 bg-white/5 sm:grid-cols-3">
          {hero.sellos.map((sello) => (
            <div key={sello.id} className="ong-seal bg-[#050706] px-6 py-5">
              <dt className="text-[9px] font-black uppercase tracking-[0.28em] text-zinc-600">
                {sello.etiqueta}
              </dt>
              <dd className="ong-mono mt-2 text-xs font-bold leading-snug text-zinc-200">
                {sello.valor}
              </dd>
            </div>
          ))}
        </dl>

        <p className="mt-8 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-600">
          <MapPin className="h-3.5 w-3.5 text-[var(--ong-water)]" />
          {identidad.domicilio}
          <span className="text-zinc-800">·</span>
          {identidad.ambito}
        </p>
      </div>

      {/* Índice */}
      <nav
        aria-label="Secciones"
        className="relative border-t border-white/5 bg-black/30 backdrop-blur-sm"
      >
        <ul className="mx-auto flex max-w-7xl items-center gap-7 overflow-x-auto px-6 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {secciones.map((s) => (
            <li key={s.id} className="shrink-0">
              <Link
                href={`#${s.id}`}
                className="text-[10px] font-black uppercase tracking-[0.24em] text-zinc-500 transition-colors hover:text-[var(--ong-sun)]"
              >
                {s.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
