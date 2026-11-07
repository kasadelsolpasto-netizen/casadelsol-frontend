"use client";
import { useEffect, useRef } from "react";

/**
 * Fondo ambiental de la portada: grano analógico + osciloscopio que late a tempo techno.
 * Publica `--viz-beat` y `--viz-mid` en <html> para que el flyer y las tarjetas respiren con el pulso.
 */
const BPM = 136;

export function RaveCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const root = document.documentElement;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const beatMs = 60000 / BPM;
    // Resolución reducida a propósito: el escalado aporta textura y abarata el render.
    const SCALE = 3;
    let w = 0, h = 0, raf = 0, last = 0;

    const resize = () => {
      w = Math.ceil(window.innerWidth / SCALE);
      h = Math.ceil(window.innerHeight / SCALE);
      canvas.width = w;
      canvas.height = h;
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = (t: number) => {
      raf = requestAnimationFrame(draw);
      if (t - last < 33) return; // ~30 fps
      last = t;

      const phase = (t % beatMs) / beatMs;
      const beat = Math.pow(1 - phase, 4);
      const bar = Math.floor(t / beatMs) % 16;
      const mid = 0.5 + 0.5 * Math.sin((t / beatMs) * Math.PI * 0.5);

      root.style.setProperty("--viz-beat", beat.toFixed(3));
      root.style.setProperty("--viz-mid", (mid * 0.35).toFixed(3));

      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, w, h);

      // Grano
      const img = ctx.getImageData(0, 0, w, h);
      const d = img.data;
      const amp = 14 + beat * 22;
      for (let i = 0; i < d.length; i += 4) {
        const v = Math.random() * amp;
        d[i] = d[i + 1] = d[i + 2] = v;
        d[i + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);

      // Osciloscopio
      const cy = h * 0.62;
      ctx.lineWidth = 1;
      for (let layer = 0; layer < 3; layer++) {
        ctx.strokeStyle = `rgba(255,255,255,${0.08 + beat * 0.22 - layer * 0.03})`;
        ctx.beginPath();
        for (let x = 0; x <= w; x += 2) {
          const k = x / w;
          const y =
            cy +
            Math.sin(k * 18 + t / 420 + layer) * (6 + beat * 26) * Math.sin(k * Math.PI) +
            Math.sin(k * 71 - t / 130) * (1.5 + beat * 6) +
            layer * 4;
          if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      // Barrido horizontal ocasional (cada 4 compases)
      if (bar === 15 && phase < 0.35) {
        const y = Math.random() * h;
        ctx.fillStyle = "rgba(255,255,255,0.12)";
        ctx.fillRect(0, y, w, 2 + Math.random() * 6);
      }
    };

    if (reduced) {
      root.style.setProperty("--viz-beat", "0");
      root.style.setProperty("--viz-mid", "0");
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, w, h);
    } else {
      raf = requestAnimationFrame(draw);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      root.style.removeProperty("--viz-beat");
      root.style.removeProperty("--viz-mid");
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="fixed inset-0 w-screen h-screen pointer-events-none -z-10 [image-rendering:pixelated]"
    />
  );
}
