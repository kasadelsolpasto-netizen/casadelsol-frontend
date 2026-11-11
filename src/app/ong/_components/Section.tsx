import type { ReactNode } from "react";

/**
 * Título de sección tomado del contenido.
 *
 * Lo que vaya entre asteriscos lleva el acento de color: «Siete líneas,
 * *un objeto*». Sin asteriscos, el título sale liso. Así el título que se
 * escribe en el panel es el que se publica, con su énfasis incluido.
 */
export function Titulo({
  texto,
  tono = "sun",
}: {
  texto: string;
  tono?: "sun" | "water";
}) {
  const clase = tono === "water" ? "ong-gradient-water" : "ong-gradient-text";
  return (
    <>
      {texto.split("*").map((trozo, i) =>
        i % 2 === 1 ? (
          <span key={i} className={clase}>
            {trozo}
          </span>
        ) : (
          trozo
        ),
      )}
    </>
  );
}

export function SectionHead({
  eyebrow,
  title,
  lead,
  align = "left",
  tone = "sun",
}: {
  eyebrow: string;
  title: ReactNode;
  lead?: string;
  align?: "left" | "center";
  tone?: "sun" | "water";
}) {
  const centrado = align === "center";
  return (
    <div className={centrado ? "mx-auto max-w-3xl text-center" : "max-w-3xl"}>
      <p className={`ong-eyebrow ${tone === "water" ? "ong-eyebrow-water" : ""}`}>
        {eyebrow}
      </p>
      <h2 className="ong-title mt-4 text-3xl md:text-5xl">{title}</h2>
      <div
        className={`ong-rule mt-7 w-28 ${centrado ? "mx-auto" : ""}`}
        aria-hidden="true"
      />
      {lead && (
        <p className="mt-7 text-base leading-relaxed ong-muted md:text-lg">
          {lead}
        </p>
      )}
    </div>
  );
}

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
      className={`mx-auto max-w-7xl scroll-mt-28 px-6 py-20 md:py-28 ${className}`}
    >
      {children}
    </section>
  );
}
