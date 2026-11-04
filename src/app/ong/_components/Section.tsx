import type { ReactNode } from "react";

/** Encabezado de sección: antetítulo + título + bajada opcional. */
export function SectionHead({
  eyebrow,
  title,
  lead,
  align = "left",
}: {
  eyebrow: string;
  title: ReactNode;
  lead?: string;
  align?: "left" | "center";
}) {
  const centered = align === "center";
  return (
    <div className={centered ? "text-center mx-auto max-w-2xl" : "max-w-3xl"}>
      <p className="ong-eyebrow">{eyebrow}</p>
      <h2 className="ong-title text-3xl md:text-5xl mt-3">{title}</h2>
      <div
        className={`ong-rule mt-6 w-24 ${centered ? "mx-auto" : ""}`}
        aria-hidden="true"
      />
      {lead && (
        <p className="mt-6 text-zinc-400 text-base md:text-lg leading-relaxed text-balance">
          {lead}
        </p>
      )}
    </div>
  );
}

/** Contenedor de sección con ancla, padding y ancho máximo consistentes. */
export function Section({
  id,
  children,
  className = "",
}: {
  id?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={`scroll-mt-28 max-w-7xl mx-auto px-6 py-20 md:py-28 ${className}`}
    >
      {children}
    </section>
  );
}
