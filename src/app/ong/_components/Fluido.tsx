"use client";
/**
 * Aparición al desplazar.
 *
 * El contenido emerge con una curva lenta y sin rebote. El estado oculto se
 * aplica solo después de montar y solo a lo que aún no está en pantalla, de
 * modo que lo visible en la primera pintura nunca parpadea y, sin JavaScript,
 * la página se ve completa.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";

export function Revelar({
  children,
  retraso = 0,
  className = "",
}: {
  children: ReactNode;
  /** Milisegundos de espera tras entrar en pantalla, para escalonar. */
  retraso?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [oculto, setOculto] = useState(false);

  useEffect(() => {
    const nodo = ref.current;
    if (!nodo) return;

    const prefiereQuieto = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (prefiereQuieto || typeof IntersectionObserver === "undefined") return;

    // Lo que ya está en pantalla se deja como está: no se esconde para volver
    // a mostrarlo.
    const caja = nodo.getBoundingClientRect();
    if (caja.top < window.innerHeight * 0.92) return;

    setOculto(true);
    const observador = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          if (e.isIntersecting) {
            setOculto(false);
            observador.disconnect();
          }
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.08 },
    );
    observador.observe(nodo);
    return () => observador.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`ong-revelar ${oculto ? "ong-sumergido" : ""} ${className}`}
      style={retraso ? { transitionDelay: `${retraso}ms` } : undefined}
    >
      {children}
    </div>
  );
}
