"use client";
/**
 * Primitivas de formulario del editor de la Fundación.
 *
 * Mantienen el registro visual del panel (negro, zinc, acentos neón) y
 * concentran aquí el marcado para que las pantallas solo declaren qué campo
 * editan, no cómo se dibuja.
 */
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import type { ReactNode } from "react";

export function Campo({
  etiqueta,
  ayuda,
  children,
}: {
  etiqueta: string;
  ayuda?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] font-black uppercase tracking-widest text-zinc-400">
        {etiqueta}
      </span>
      {children}
      {ayuda && <span className="mt-2 block text-[11px] text-zinc-600">{ayuda}</span>}
    </label>
  );
}

const BASE_ENTRADA =
  "w-full rounded-lg border border-zinc-800 bg-black/60 px-4 py-3 text-sm text-zinc-200 outline-none transition-colors placeholder-zinc-700 focus:border-neon-purple";

export function Texto({
  valor,
  cambiar,
  marcador,
  etiqueta,
  ayuda,
}: {
  valor: string;
  cambiar: (v: string) => void;
  marcador?: string;
  etiqueta: string;
  ayuda?: string;
}) {
  return (
    <Campo etiqueta={etiqueta} ayuda={ayuda}>
      <input
        type="text"
        value={valor}
        placeholder={marcador}
        onChange={(e) => cambiar(e.target.value)}
        className={BASE_ENTRADA}
      />
    </Campo>
  );
}

export function Area({
  valor,
  cambiar,
  filas = 4,
  marcador,
  etiqueta,
  ayuda,
}: {
  valor: string;
  cambiar: (v: string) => void;
  filas?: number;
  marcador?: string;
  etiqueta: string;
  ayuda?: string;
}) {
  return (
    <Campo etiqueta={etiqueta} ayuda={ayuda}>
      <textarea
        value={valor}
        rows={filas}
        placeholder={marcador}
        onChange={(e) => cambiar(e.target.value)}
        className={`${BASE_ENTRADA} resize-y leading-relaxed`}
      />
    </Campo>
  );
}

export function Seleccion<T extends string>({
  valor,
  cambiar,
  opciones,
  etiqueta,
  ayuda,
}: {
  valor: T;
  cambiar: (v: T) => void;
  opciones: readonly T[];
  etiqueta: string;
  ayuda?: string;
}) {
  return (
    <Campo etiqueta={etiqueta} ayuda={ayuda}>
      <select
        value={valor}
        onChange={(e) => cambiar(e.target.value as T)}
        className={BASE_ENTRADA}
      >
        {opciones.map((o) => (
          <option key={o} value={o} className="bg-black">
            {o}
          </option>
        ))}
      </select>
    </Campo>
  );
}

export function Interruptor({
  valor,
  cambiar,
  etiqueta,
  ayuda,
}: {
  valor: boolean;
  cambiar: (v: boolean) => void;
  etiqueta: string;
  ayuda?: string;
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-black/40 p-4">
      <button
        type="button"
        onClick={() => cambiar(!valor)}
        className="flex w-full items-center justify-between gap-4 text-left"
      >
        <span className="text-[11px] font-black uppercase tracking-widest text-zinc-300">
          {etiqueta}
        </span>
        <span
          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
            valor ? "bg-neon-green" : "bg-zinc-700"
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-black transition-transform ${
              valor ? "translate-x-[1.4rem]" : "translate-x-0.5"
            }`}
          />
        </span>
      </button>
      {ayuda && <p className="mt-3 text-[11px] leading-relaxed text-zinc-600">{ayuda}</p>}
    </div>
  );
}

/** Editor de una lista de párrafos o viñetas. */
export function ListaTextos({
  valores,
  cambiar,
  etiqueta,
  ayuda,
  filas = 3,
  nombreElemento = "elemento",
}: {
  valores: string[];
  cambiar: (v: string[]) => void;
  etiqueta: string;
  ayuda?: string;
  filas?: number;
  nombreElemento?: string;
}) {
  const poner = (i: number, v: string) =>
    cambiar(valores.map((x, j) => (j === i ? v : x)));
  const quitar = (i: number) => cambiar(valores.filter((_, j) => j !== i));
  const mover = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= valores.length) return;
    const copia = [...valores];
    [copia[i], copia[j]] = [copia[j], copia[i]];
    cambiar(copia);
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
          {etiqueta}
        </span>
        <span className="text-[10px] font-bold text-zinc-600">
          {valores.length}
        </span>
      </div>
      <div className="space-y-3">
        {valores.map((v, i) => (
          <div key={i} className="flex gap-2">
            <textarea
              value={v}
              rows={filas}
              onChange={(e) => poner(i, e.target.value)}
              className={`${BASE_ENTRADA} resize-y leading-relaxed`}
            />
            <div className="flex shrink-0 flex-col gap-1">
              <BotonIcono
                titulo="Subir"
                onClick={() => mover(i, -1)}
                deshabilitado={i === 0}
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </BotonIcono>
              <BotonIcono
                titulo="Bajar"
                onClick={() => mover(i, 1)}
                deshabilitado={i === valores.length - 1}
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </BotonIcono>
              <BotonIcono titulo="Eliminar" peligro onClick={() => quitar(i)}>
                <Trash2 className="h-3.5 w-3.5" />
              </BotonIcono>
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => cambiar([...valores, ""])}
        className="mt-3 inline-flex items-center gap-2 rounded-lg border border-dashed border-zinc-700 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-zinc-400 transition-colors hover:border-neon-green hover:text-neon-green"
      >
        <Plus className="h-3.5 w-3.5" /> Añadir {nombreElemento}
      </button>
      {ayuda && <p className="mt-2 text-[11px] text-zinc-600">{ayuda}</p>}
    </div>
  );
}

function BotonIcono({
  children,
  onClick,
  titulo,
  deshabilitado,
  peligro,
}: {
  children: ReactNode;
  onClick: () => void;
  titulo: string;
  deshabilitado?: boolean;
  peligro?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={deshabilitado}
      aria-label={titulo}
      className={`rounded-md border border-zinc-800 p-2 transition-colors disabled:opacity-25 ${
        peligro
          ? "text-zinc-500 hover:border-red-800 hover:text-red-500"
          : "text-zinc-500 hover:border-zinc-600 hover:text-zinc-200"
      }`}
    >
      {children}
    </button>
  );
}

/**
 * Repetidor genérico: tarjetas con añadir, eliminar y reordenar.
 * `pintar` recibe el elemento y una función para reemplazarlo.
 */
export function Lista<T>({
  elementos,
  cambiar,
  nuevo,
  titulo,
  nombreElemento,
  rotulo,
  pintar,
}: {
  elementos: T[];
  cambiar: (v: T[]) => void;
  /** Fábrica del elemento en blanco que se agrega. */
  nuevo: () => T;
  titulo: string;
  nombreElemento: string;
  /** Texto de cabecera de cada tarjeta. */
  rotulo: (el: T, i: number) => string;
  pintar: (el: T, poner: (v: T) => void) => ReactNode;
}) {
  const ponerEn = (i: number, v: T) =>
    cambiar(elementos.map((x, j) => (j === i ? v : x)));
  const quitar = (i: number) => cambiar(elementos.filter((_, j) => j !== i));
  const mover = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= elementos.length) return;
    const copia = [...elementos];
    [copia[i], copia[j]] = [copia[j], copia[i]];
    cambiar(copia);
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-black uppercase tracking-widest text-white">
          {titulo}
        </h3>
        <span className="text-[10px] font-bold text-zinc-600">
          {elementos.length}
        </span>
      </div>

      <div className="space-y-4">
        {elementos.map((el, i) => (
          <div
            key={i}
            className="rounded-xl border border-zinc-800 bg-black/40 p-5"
          >
            <div className="mb-5 flex items-start justify-between gap-4 border-b border-zinc-900 pb-4">
              <p className="text-[11px] font-black uppercase tracking-widest text-neon-purple">
                {rotulo(el, i) || `${nombreElemento} ${i + 1}`}
              </p>
              <div className="flex shrink-0 gap-1">
                <BotonIcono
                  titulo="Subir"
                  onClick={() => mover(i, -1)}
                  deshabilitado={i === 0}
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </BotonIcono>
                <BotonIcono
                  titulo="Bajar"
                  onClick={() => mover(i, 1)}
                  deshabilitado={i === elementos.length - 1}
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </BotonIcono>
                <BotonIcono titulo="Eliminar" peligro onClick={() => quitar(i)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </BotonIcono>
              </div>
            </div>
            <div className="space-y-5">{pintar(el, (v) => ponerEn(i, v))}</div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => cambiar([...elementos, nuevo()])}
        className="mt-4 inline-flex items-center gap-2 rounded-lg border border-dashed border-zinc-700 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-zinc-400 transition-colors hover:border-neon-green hover:text-neon-green"
      >
        <Plus className="h-4 w-4" /> Añadir {nombreElemento}
      </button>
    </div>
  );
}
