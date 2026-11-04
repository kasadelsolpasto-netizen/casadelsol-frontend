import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import { Emblema } from "./Emblema";
import { identidad, hero, secciones } from "../content";

export function Hero() {
  return (
    <header className="relative overflow-hidden border-b ong-hair">
      <div className="ong-horizon" aria-hidden="true" />
      <div className="ong-grid" aria-hidden="true" />
      <div className="ong-contour" aria-hidden="true" />

      <Emblema
        prioridad
        className="pointer-events-none absolute top-2 right-[-34%] z-0 w-[440px] max-w-[135vw] opacity-25 sm:right-[-20%] sm:opacity-40 lg:right-[-7%] lg:w-[500px] lg:opacity-95"
      />

      <div className="relative z-10 mx-auto max-w-7xl px-6 pb-24 pt-20 md:pb-32 md:pt-28">
        <p className="ong-eyebrow">{hero.antetitulo}</p>

        <h1 className="ong-title mt-6 max-w-2xl text-4xl sm:text-5xl md:text-7xl">
          <span className="ong-gradient-text">Sol</span>
          <span className="ong-faint"> y </span>
          <span className="ong-gradient-water">cuenca</span>
        </h1>

        <p className="mt-6 max-w-xl text-sm font-black uppercase tracking-[0.2em] ong-muted">
          {identidad.nombre}
        </p>

        <p className="mt-8 max-w-2xl text-base leading-relaxed ong-muted md:text-lg">
          {hero.entrada}
        </p>

        {/* Acciones */}
        <div className="mt-10 flex flex-wrap items-center gap-4">
          <Link
            href={hero.acciones.principal.href}
            className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[var(--ong-red)] to-[var(--ong-red-deep)] px-7 py-3.5 text-[11px] font-black uppercase tracking-[0.2em] text-white transition-transform hover:scale-[1.02]"
          >
            {hero.acciones.principal.label}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link
            href={hero.acciones.secundario.href}
            className="inline-flex items-center gap-2 rounded-full border ong-hair px-7 py-3.5 text-[11px] font-black uppercase tracking-[0.2em] ong-muted transition-colors hover:border-[var(--ong-red-bright)] hover:text-[var(--ong-red-bright)]"
          >
            {hero.acciones.secundario.label}
          </Link>
        </div>

        {/* Sellos institucionales */}
        <dl className="mt-14 grid max-w-3xl gap-px overflow-hidden rounded-2xl border ong-hair bg-[var(--ong-hair)] sm:grid-cols-3">
          {hero.sellos.map((sello) => (
            <div key={sello.id} className="ong-seal ong-card px-6 py-5">
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
          <MapPin className="h-3.5 w-3.5 text-[var(--ong-red-bright)]" />
          {identidad.domicilio}
          <span className="ong-faint opacity-50">·</span>
          {identidad.ambito}
        </p>
      </div>

      {/* Índice */}
      <nav
        aria-label="Secciones"
        className="relative border-t ong-hair bg-white/80 backdrop-blur-sm"
      >
        <ul className="mx-auto flex max-w-7xl items-center gap-7 overflow-x-auto px-6 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {secciones.map((s) => (
            <li key={s.id} className="shrink-0">
              <Link
                href={`#${s.id}`}
                className="text-[10px] font-black uppercase tracking-[0.24em] ong-faint transition-colors hover:text-[var(--ong-red)]"
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
