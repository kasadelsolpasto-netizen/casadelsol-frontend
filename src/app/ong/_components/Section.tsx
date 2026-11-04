import type { ReactNode } from "react";

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
        <p className="mt-7 text-base leading-relaxed text-zinc-400 md:text-lg">
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
