import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import { SunDisc } from "./SunDisc";
import { identidad, cta, secciones } from "../content";

export function Hero() {
  return (
    <header className="relative overflow-hidden border-b border-zinc-900/80">
      <div className="ong-dawn" aria-hidden="true" />
      <div className="ong-grid" aria-hidden="true" />

      {/* Disco solar de fondo */}
      <SunDisc className="absolute -top-40 right-[-18%] w-[620px] max-w-[110vw] opacity-45 pointer-events-none md:opacity-60" />

      <div className="relative max-w-7xl mx-auto px-6 pt-20 pb-24 md:pt-28 md:pb-32">
        <p className="ong-eyebrow">Fundación · Sin ánimo de lucro</p>

        <h1 className="ong-title text-4xl sm:text-5xl md:text-7xl mt-5 max-w-3xl">
          <span className="ong-gradient-text ong-sun-glow">
            {identidad.nombre}
          </span>
        </h1>

        {identidad.lema && (
          <p className="mt-5 text-lg md:text-2xl font-bold uppercase tracking-[0.18em] text-zinc-300">
            {identidad.lema}
          </p>
        )}

        <p className="mt-8 max-w-2xl text-base md:text-lg text-zinc-400 leading-relaxed text-balance">
          {identidad.entrada}
        </p>

        {/* Llamados a la acción */}
        <div className="mt-10 flex flex-wrap items-center gap-4">
          <Link
            href={cta.principal.href}
            className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[var(--ong-sun)] to-[var(--ong-ember)] px-7 py-3.5 text-[11px] font-black uppercase tracking-[0.2em] text-black shadow-[0_18px_45px_-20px_rgba(255,155,26,0.9)] transition-transform hover:scale-[1.03]"
          >
            {cta.principal.label}
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link
            href={cta.secundario.href}
            className="inline-flex items-center gap-2 rounded-full border border-zinc-700 px-7 py-3.5 text-[11px] font-black uppercase tracking-[0.2em] text-zinc-300 transition-colors hover:border-[var(--ong-sun)] hover:text-[var(--ong-sun)]"
          >
            {cta.secundario.label}
          </Link>
        </div>

        {/* Ubicación */}
        {identidad.ciudad && (
          <p className="mt-10 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500">
            <MapPin className="w-3.5 h-3.5 text-[var(--ong-amber)]" />
            {identidad.ciudad}
          </p>
        )}
      </div>

      {/* Índice de secciones */}
      <nav
        aria-label="Secciones de la fundación"
        className="relative border-t border-zinc-900/80 bg-black/40 backdrop-blur-sm"
      >
        <ul className="max-w-7xl mx-auto px-6 flex items-center gap-7 overflow-x-auto py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {secciones.map((s) => (
            <li key={s.id} className="shrink-0">
              <Link
                href={`#${s.id}`}
                className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500 transition-colors hover:text-[var(--ong-sun)]"
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
