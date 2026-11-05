import Link from "next/link";
import { Mail, Phone, MapPin, ArrowUpRight } from "lucide-react";
import { Section, SectionHead } from "./Section";
import { Revelar } from "./Fluido";
import { Ondas } from "./Ondas";
import { SolEntero } from "./Sol";
import type { Contacto as DatosContacto, Identidad } from "../contenido";

export function Contacto({
  datos: contacto,
  identidad,
}: {
  datos: DatosContacto;
  identidad: Identidad;
}) {
  return (
    <div className="relative border-t ong-hair">
      <div className="ong-crepusculo" aria-hidden="true" />

      <Section id="contacto" className="relative">
        <Revelar>
        <div className="grid gap-14 lg:grid-cols-2 lg:gap-20">
          <SectionHead
            eyebrow={contacto.antetitulo}
            title={contacto.titulo}
            lead={contacto.lead}
          />

          <div className="space-y-4">
            {contacto.correo && (
              <Link
                href={`mailto:${contacto.correo}`}
                className="ong-panel group flex items-center gap-5 rounded-2xl p-6"
              >
                <Mail className="h-5 w-5 shrink-0 text-[var(--ong-red)]" />
                <span className="ong-mono flex-1 break-all text-sm font-bold ong-strong">
                  {contacto.correo}
                </span>
                <ArrowUpRight className="h-4 w-4 shrink-0 ong-faint transition-colors group-hover:text-[var(--ong-red)]" />
              </Link>
            )}

            {contacto.telefono && (
              <Link
                href={`tel:${contacto.telefono.replace(/\s+/g, "")}`}
                className="ong-panel group flex items-center gap-5 rounded-2xl p-6"
              >
                <Phone className="h-5 w-5 shrink-0 text-[var(--ong-red)]" />
                <span className="ong-mono flex-1 text-sm font-bold ong-strong">
                  {contacto.telefono}
                </span>
                <ArrowUpRight className="h-4 w-4 shrink-0 ong-faint transition-colors group-hover:text-[var(--ong-red)]" />
              </Link>
            )}

            {contacto.direccion && (
              <div className="ong-panel flex items-center gap-5 rounded-2xl p-6">
                <MapPin className="h-5 w-5 shrink-0 text-[var(--ong-red-bright)]" />
                <span className="text-sm font-bold ong-strong">
                  {contacto.direccion}
                </span>
              </div>
            )}

            {contacto.redes.length > 0 && (
              <ul className="flex flex-wrap gap-3 pt-2">
                {contacto.redes.map((red) => (
                  <li key={red.id}>
                    <Link
                      href={red.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-full border ong-hair px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] ong-muted transition-colors hover:border-[var(--ong-red)] hover:text-[var(--ong-red)]"
                    >
                      {red.label}
                      <ArrowUpRight className="h-3 w-3" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <footer className="mt-20 border-t ong-hair pt-10">
          {/* Firma institucional */}
          <div className="mb-8 flex items-center gap-4">
            <SolEntero className="h-14 w-14 shrink-0" />
            <span className="text-lg font-black uppercase leading-[1.05] tracking-[0.14em] ong-brand">
              Kasa
              <br />
              del Sol
            </span>
          </div>
          <div className="flex flex-col gap-4 text-[10px] font-bold uppercase tracking-[0.2em] ong-faint sm:flex-row sm:items-center sm:justify-between">
            <p className="ong-mono">
              {identidad.nombre} · NIT {identidad.nit} · {identidad.domicilio}
            </p>
            <Link href="/" className="transition-colors hover:text-[var(--ong-red)]">
              ← Kasa del Sol
            </Link>
          </div>
        </footer>
        </Revelar>
      </Section>

      {/* La página termina en el agua */}
      <Ondas
        className="relative z-0 -mt-10 opacity-70"
        color="var(--ong-tint-2)"
      />
    </div>
  );
}
