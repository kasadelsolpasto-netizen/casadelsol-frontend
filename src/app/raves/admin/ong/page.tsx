"use client";
/**
 * Panel de edición del contenido de la Fundación (kasadelsol.co).
 *
 * Edita el documento completo y lo guarda de una sola vez. La página pública
 * compone lo guardado sobre el contenido de fábrica, de modo que un campo que
 * se deje vacío aquí se publica vacío, y un campo que aún no exista en lo
 * guardado se toma de fábrica.
 */
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ExternalLink,
  Loader2,
  Save,
  AlertTriangle,
  CheckCircle,
  Sun,
} from "lucide-react";
import { AdminGuard } from "@/components/AdminGuard";
import { API_ONG } from "@/lib/ong-backend";
import { componer } from "@/lib/ong-contenido";
import {
  Texto,
  Area,
  Seleccion,
  Interruptor,
  ListaTextos,
  Lista,
} from "@/components/admin/ong/Campos";
import type {
  ContenidoOng,
  IconKey,
  Linea,
  Programa,
  Garantia,
  Via,
  Aliado,
  Sello,
  Marcador,
  Seccion,
  Zona,
  Documento,
  Red,
} from "@/app/(fundacion)/contenido";

const ICONOS: readonly IconKey[] = [
  "sol", "agua", "hoja", "balanza", "escudo", "lupa",
  "comunidad", "formacion", "cultura", "laboratorio", "convenio", "globo",
];

const PESTANAS = [
  { id: "identidad", label: "Identidad" },
  { id: "portada", label: "Portada" },
  { id: "planteamiento", label: "Planteamiento" },
  { id: "lineas", label: "Líneas" },
  { id: "territorio", label: "Territorio" },
  { id: "programas", label: "Programas" },
  { id: "gobernanza", label: "Gobernanza" },
  { id: "vinculacion", label: "Vinculación" },
  { id: "aliados", label: "Aliados" },
  { id: "contacto", label: "Contacto" },
] as const;

type Pestana = (typeof PESTANAS)[number]["id"];

export default function EditorOng() {
  const [doc, setDoc] = useState<ContenidoOng | null>(null);
  const [pestana, setPestana] = useState<Pestana>("identidad");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState("");
  const [error, setError] = useState("");
  const [actualizado, setActualizado] = useState<string | null>(null);
  const [sucio, setSucio] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_ONG}/settings/ong`, { cache: "no-store" });
        if (!res.ok) throw new Error("respuesta no válida");
        const data = await res.json();
        setDoc(componer(data?.documento));
        setActualizado(data?.actualizadoEn ?? null);
      } catch {
        setError("No se pudo cargar el contenido desde el servidor.");
      } finally {
        setCargando(false);
      }
    })();
  }, []);

  /** Reemplaza un bloque de primer nivel del documento. */
  const poner = useCallback(
    <K extends keyof ContenidoOng>(clave: K, valor: ContenidoOng[K]) => {
      setDoc((d) => (d ? { ...d, [clave]: valor } : d));
      setSucio(true);
    },
    [],
  );

  // Aviso del navegador si se sale con cambios sin guardar
  useEffect(() => {
    if (!sucio) return;
    const avisar = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, [sucio]);

  const guardar = async () => {
    if (!doc) return;
    setGuardando(true);
    setAviso("");
    setError("");
    try {
      const token = document.cookie
        .split("; ")
        .find((c) => c.startsWith("kasa_auth_token="))
        ?.split("=")[1];

      const res = await fetch(`${API_ONG}/admin/settings/ong`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ contenido: doc }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(
          res.status === 401 || res.status === 403
            ? "No tienes permiso para publicar. Vuelve a iniciar sesión en el panel."
            : data?.message || "No se pudo guardar.",
        );
      } else {
        setSucio(false);
        setActualizado(data?.actualizadoEn ?? new Date().toISOString());
        setAviso("Contenido publicado en kasadelsol.co");
        setTimeout(() => setAviso(""), 5000);
      }
    } catch {
      setError("Error de conexión al guardar.");
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return (
      <AdminGuard>
        <div className="flex min-h-screen items-center justify-center bg-[#050505]">
          <Loader2 className="h-6 w-6 animate-spin text-neon-purple" />
        </div>
      </AdminGuard>
    );
  }

  if (!doc) {
    return (
      <AdminGuard>
        <div className="flex min-h-screen items-center justify-center bg-[#050505] p-6 text-center">
          <p className="text-sm font-bold uppercase tracking-widest text-red-500">
            {error || "No se pudo cargar el contenido."}
          </p>
        </div>
      </AdminGuard>
    );
  }

  return (
    <AdminGuard>
      <div className="min-h-screen bg-[#050505] p-6 md:p-10">
        <div className="mx-auto max-w-5xl">
          {/* Cabecera */}
          <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
            <div>
              <button
                onClick={() => history.back()}
                className="mb-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-500 transition-colors hover:text-white"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Volver
              </button>
              <h1 className="flex items-center gap-3 text-2xl font-black uppercase tracking-widest text-white md:text-3xl">
                <Sun className="h-6 w-6 text-red-600" />
                Fundación
              </h1>
              <p className="mt-2 text-xs font-bold uppercase tracking-widest text-zinc-500">
                Contenido de kasadelsol.co
                {actualizado && (
                  <>
                    {" · "}
                    Última publicación{" "}
                    {new Date(actualizado).toLocaleString("es-CO", {
                      timeZone: "America/Bogota",
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </>
                )}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/"
                target="_blank"
                className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-zinc-400 transition-colors hover:border-zinc-600 hover:text-white"
              >
                Ver página <ExternalLink className="h-3.5 w-3.5" />
              </Link>
              <button
                onClick={guardar}
                disabled={guardando || !sucio}
                className="inline-flex items-center gap-2 rounded-lg bg-red-700 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {guardando ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {guardando ? "Publicando…" : sucio ? "Publicar" : "Sin cambios"}
              </button>
            </div>
          </div>

          {/* Avisos */}
          {aviso && (
            <div className="mb-6 flex items-center gap-3 rounded-xl border border-green-900/50 bg-green-950/20 p-4 text-xs font-bold uppercase tracking-widest text-neon-green">
              <CheckCircle className="h-4 w-4" /> {aviso}
            </div>
          )}
          {error && (
            <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-900/50 bg-red-950/20 p-4 text-xs font-bold uppercase tracking-widest text-red-400">
              <AlertTriangle className="h-4 w-4" /> {error}
            </div>
          )}

          {/* Pestañas */}
          <nav className="mb-8 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {PESTANAS.map((p) => (
              <button
                key={p.id}
                onClick={() => setPestana(p.id)}
                className={`shrink-0 rounded-lg border px-4 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all ${
                  pestana === p.id
                    ? "border-neon-purple bg-zinc-900 text-white"
                    : "border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300"
                }`}
              >
                {p.label}
              </button>
            ))}
          </nav>

          {/* Paneles */}
          <div className="rounded-2xl border border-zinc-800 bg-black/40 p-6 md:p-8">
            {pestana === "identidad" && (
              <div className="space-y-6">
                <Texto etiqueta="Razón social" valor={doc.identidad.nombre}
                  cambiar={(v) => poner("identidad", { ...doc.identidad, nombre: v })} />
                <Texto etiqueta="Nombre corto" valor={doc.identidad.nombreCorto}
                  cambiar={(v) => poner("identidad", { ...doc.identidad, nombreCorto: v })} />
                <Texto etiqueta="NIT" valor={doc.identidad.nit}
                  cambiar={(v) => poner("identidad", { ...doc.identidad, nit: v })} />
                <Texto etiqueta="Domicilio" valor={doc.identidad.domicilio}
                  cambiar={(v) => poner("identidad", { ...doc.identidad, domicilio: v })} />
                <Texto etiqueta="Ámbito territorial" valor={doc.identidad.ambito}
                  cambiar={(v) => poner("identidad", { ...doc.identidad, ambito: v })} />
                <Texto etiqueta="Correo institucional" valor={doc.identidad.correo}
                  cambiar={(v) => poner("identidad", { ...doc.identidad, correo: v })} />
                <Area etiqueta="Naturaleza jurídica" valor={doc.identidad.naturaleza} filas={3}
                  cambiar={(v) => poner("identidad", { ...doc.identidad, naturaleza: v })} />
                <Texto etiqueta="Entidad de inspección, vigilancia y control" valor={doc.identidad.vigilancia}
                  cambiar={(v) => poner("identidad", { ...doc.identidad, vigilancia: v })} />
                <Texto etiqueta="Registro" valor={doc.identidad.registro}
                  cambiar={(v) => poner("identidad", { ...doc.identidad, registro: v })} />
                <div className="grid gap-6 sm:grid-cols-2">
                  <Texto etiqueta="Representante legal" valor={doc.identidad.representante.nombre}
                    cambiar={(v) => poner("identidad", { ...doc.identidad, representante: { ...doc.identidad.representante, nombre: v } })} />
                  <Texto etiqueta="Cargo" valor={doc.identidad.representante.cargo}
                    cambiar={(v) => poner("identidad", { ...doc.identidad, representante: { ...doc.identidad.representante, cargo: v } })} />
                </div>
                <Interruptor
                  etiqueta="Calificada en el Régimen Tributario Especial"
                  valor={doc.rteCalificado}
                  cambiar={(v) => poner("rteCalificado", v)}
                  ayuda="Actívalo solo con el acto de calificación en firme. Mientras esté apagado, la página no afirma que las donaciones den derecho al descuento del artículo 257 del Estatuto Tributario."
                />
                <Lista<Seccion>
                  titulo="Índice de secciones"
                  nombreElemento="sección"
                  elementos={doc.secciones}
                  cambiar={(v) => poner("secciones", v)}
                  nuevo={() => ({ id: "", label: "" })}
                  rotulo={(s) => s.label}
                  pintar={(s, set) => (
                    <div className="grid gap-5 sm:grid-cols-2">
                      <Texto etiqueta="Ancla (id de la sección)" valor={s.id} cambiar={(v) => set({ ...s, id: v })} />
                      <Texto etiqueta="Rótulo" valor={s.label} cambiar={(v) => set({ ...s, label: v })} />
                    </div>
                  )}
                />
              </div>
            )}

            {pestana === "portada" && (
              <div className="space-y-6">
                <Texto etiqueta="Antetítulo" valor={doc.hero.antetitulo}
                  cambiar={(v) => poner("hero", { ...doc.hero, antetitulo: v })} />
                <Texto etiqueta="Titular" valor={doc.hero.titular} ayuda="Es el titular grande de la portada."
                  cambiar={(v) => poner("hero", { ...doc.hero, titular: v })} />
                <Area etiqueta="Entrada" valor={doc.hero.entrada} filas={5}
                  ayuda="La tesis en una frase. Es lo primero que lee un inversor."
                  cambiar={(v) => poner("hero", { ...doc.hero, entrada: v })} />
                <div className="grid gap-6 sm:grid-cols-2">
                  <Texto etiqueta="Botón principal — texto" valor={doc.hero.acciones.principal.label}
                    cambiar={(v) => poner("hero", { ...doc.hero, acciones: { ...doc.hero.acciones, principal: { ...doc.hero.acciones.principal, label: v } } })} />
                  <Texto etiqueta="Botón principal — destino" valor={doc.hero.acciones.principal.href}
                    cambiar={(v) => poner("hero", { ...doc.hero, acciones: { ...doc.hero.acciones, principal: { ...doc.hero.acciones.principal, href: v } } })} />
                  <Texto etiqueta="Botón secundario — texto" valor={doc.hero.acciones.secundario.label}
                    cambiar={(v) => poner("hero", { ...doc.hero, acciones: { ...doc.hero.acciones, secundario: { ...doc.hero.acciones.secundario, label: v } } })} />
                  <Texto etiqueta="Botón secundario — destino" valor={doc.hero.acciones.secundario.href}
                    cambiar={(v) => poner("hero", { ...doc.hero, acciones: { ...doc.hero.acciones, secundario: { ...doc.hero.acciones.secundario, href: v } } })} />
                </div>
                <Lista<Sello>
                  titulo="Sellos institucionales"
                  nombreElemento="sello"
                  elementos={doc.hero.sellos}
                  cambiar={(v) => poner("hero", { ...doc.hero, sellos: v })}
                  nuevo={() => ({ id: `sello-${Date.now()}`, etiqueta: "", valor: "" })}
                  rotulo={(s) => s.etiqueta}
                  pintar={(s, set) => (
                    <div className="grid gap-5 sm:grid-cols-2">
                      <Texto etiqueta="Etiqueta" valor={s.etiqueta} cambiar={(v) => set({ ...s, etiqueta: v })} />
                      <Texto etiqueta="Valor" valor={s.valor} cambiar={(v) => set({ ...s, valor: v })} />
                    </div>
                  )}
                />
              </div>
            )}

            {pestana === "planteamiento" && (
              <div className="space-y-6">
                <Texto etiqueta="Antetítulo" valor={doc.tesis.antetitulo}
                  cambiar={(v) => poner("tesis", { ...doc.tesis, antetitulo: v })} />
                <Texto etiqueta="Título" ayuda="Lo que vaya entre *asteriscos* lleva el acento de color." valor={doc.tesis.titulo}
                  cambiar={(v) => poner("tesis", { ...doc.tesis, titulo: v })} />
                <ListaTextos etiqueta="Párrafos" nombreElemento="párrafo" filas={5}
                  valores={doc.tesis.parrafos}
                  cambiar={(v) => poner("tesis", { ...doc.tesis, parrafos: v })} />
                <Area etiqueta="Frase destacada" valor={doc.tesis.destacado} filas={3}
                  cambiar={(v) => poner("tesis", { ...doc.tesis, destacado: v })} />
              </div>
            )}

            {pestana === "lineas" && (
              <div className="space-y-6">
                <Texto etiqueta="Antetítulo" valor={doc.lineas.antetitulo}
                  cambiar={(v) => poner("lineas", { ...doc.lineas, antetitulo: v })} />
                <Texto etiqueta="Título" ayuda="Lo que vaya entre *asteriscos* lleva el acento de color." valor={doc.lineas.titulo}
                  cambiar={(v) => poner("lineas", { ...doc.lineas, titulo: v })} />
                <Area etiqueta="Bajada" valor={doc.lineas.lead} filas={3}
                  cambiar={(v) => poner("lineas", { ...doc.lineas, lead: v })} />
                <Lista<Linea>
                  titulo="Líneas misionales"
                  nombreElemento="línea"
                  elementos={doc.lineas.items}
                  cambiar={(v) => poner("lineas", { ...doc.lineas, items: v })}
                  nuevo={() => ({
                    id: `linea-${Date.now()}`, icono: "sol", titulo: "", sumario: "",
                    acciones: [], fundamento: { articulo: "", norma: "" },
                  })}
                  rotulo={(l) => l.titulo}
                  pintar={(l, set) => (
                    <>
                      <div className="grid gap-5 sm:grid-cols-2">
                        <Texto etiqueta="Identificador" valor={l.id} ayuda="Lo usan los programas para vincularse a esta línea."
                          cambiar={(v) => set({ ...l, id: v })} />
                        <Seleccion etiqueta="Icono" valor={l.icono} opciones={ICONOS}
                          cambiar={(v) => set({ ...l, icono: v })} />
                      </div>
                      <Texto etiqueta="Título" valor={l.titulo} cambiar={(v) => set({ ...l, titulo: v })} />
                      <Area etiqueta="Sumario" valor={l.sumario} filas={3} cambiar={(v) => set({ ...l, sumario: v })} />
                      <ListaTextos etiqueta="Acciones" nombreElemento="acción" filas={2}
                        valores={l.acciones} cambiar={(v) => set({ ...l, acciones: v })} />
                      <div className="grid gap-5 sm:grid-cols-2">
                        <Texto etiqueta="Fundamento — artículo" valor={l.fundamento.articulo}
                          cambiar={(v) => set({ ...l, fundamento: { ...l.fundamento, articulo: v } })} />
                        <Texto etiqueta="Fundamento — norma" valor={l.fundamento.norma}
                          cambiar={(v) => set({ ...l, fundamento: { ...l.fundamento, norma: v } })} />
                      </div>
                    </>
                  )}
                />
              </div>
            )}

            {pestana === "territorio" && (
              <div className="space-y-6">
                <Texto etiqueta="Antetítulo" valor={doc.territorio.antetitulo}
                  cambiar={(v) => poner("territorio", { ...doc.territorio, antetitulo: v })} />
                <Texto etiqueta="Título" ayuda="Lo que vaya entre *asteriscos* lleva el acento de color." valor={doc.territorio.titulo}
                  cambiar={(v) => poner("territorio", { ...doc.territorio, titulo: v })} />
                <ListaTextos etiqueta="Párrafos" nombreElemento="párrafo" filas={5}
                  valores={doc.territorio.parrafos}
                  cambiar={(v) => poner("territorio", { ...doc.territorio, parrafos: v })} />
                <Lista<Zona>
                  titulo="Zonas de trabajo"
                  nombreElemento="zona"
                  elementos={doc.territorio.zonas}
                  cambiar={(v) => poner("territorio", { ...doc.territorio, zonas: v })}
                  nuevo={() => ({ id: `zona-${Date.now()}`, nombre: "", ambito: "", descripcion: "", apuestas: [] })}
                  rotulo={(z) => z.nombre}
                  pintar={(z, set) => (
                    <>
                      <Texto etiqueta="Nombre" valor={z.nombre} cambiar={(v) => set({ ...z, nombre: v })} />
                      <Texto etiqueta="Ámbito" valor={z.ambito}
                        ayuda="Ubicación y condición del lugar, en una línea. No se describen predios."
                        cambiar={(v) => set({ ...z, ambito: v })} />
                      <Area etiqueta="Descripción" valor={z.descripcion} filas={3}
                        cambiar={(v) => set({ ...z, descripcion: v })} />
                      <ListaTextos etiqueta="Apuestas" nombreElemento="apuesta" filas={2}
                        valores={z.apuestas} cambiar={(v) => set({ ...z, apuestas: v })} />
                    </>
                  )}
                />
                <Area etiqueta="Nota al pie de los indicadores" valor={doc.territorio.nota} filas={2}
                  cambiar={(v) => poner("territorio", { ...doc.territorio, nota: v })} />
                <Lista<Marcador>
                  titulo="Indicadores del territorio"
                  nombreElemento="indicador"
                  elementos={doc.territorio.marcadores}
                  cambiar={(v) => poner("territorio", { ...doc.territorio, marcadores: v })}
                  nuevo={() => ({ id: `m-${Date.now()}`, valor: "—", etiqueta: "" })}
                  rotulo={(m) => m.etiqueta}
                  pintar={(m, set) => (
                    <div className="grid gap-5 sm:grid-cols-[1fr_2fr]">
                      <Texto etiqueta="Cifra" valor={m.valor} ayuda="Deja «—» mientras no esté verificada."
                        cambiar={(v) => set({ ...m, valor: v })} />
                      <Texto etiqueta="Etiqueta" valor={m.etiqueta} cambiar={(v) => set({ ...m, etiqueta: v })} />
                    </div>
                  )}
                />
              </div>
            )}

            {pestana === "programas" && (
              <div className="space-y-6">
                <Texto etiqueta="Antetítulo" valor={doc.programas.antetitulo}
                  cambiar={(v) => poner("programas", { ...doc.programas, antetitulo: v })} />
                <Texto etiqueta="Título" ayuda="Lo que vaya entre *asteriscos* lleva el acento de color." valor={doc.programas.titulo}
                  cambiar={(v) => poner("programas", { ...doc.programas, titulo: v })} />
                <Area etiqueta="Bajada" valor={doc.programas.lead} filas={3}
                  cambiar={(v) => poner("programas", { ...doc.programas, lead: v })} />
                <Lista<Programa>
                  titulo="Proyectos"
                  nombreElemento="proyecto"
                  elementos={doc.programas.items}
                  cambiar={(v) => poner("programas", { ...doc.programas, items: v })}
                  nuevo={() => ({
                    id: `proyecto-${Date.now()}`, nombre: "", resumen: "",
                    estado: "En formulación", linea: doc.lineas.items[0]?.id ?? "",
                    requerimiento: "",
                  })}
                  rotulo={(p) => p.nombre}
                  pintar={(p, set) => (
                    <>
                      <Texto etiqueta="Nombre" valor={p.nombre} cambiar={(v) => set({ ...p, nombre: v })} />
                      <Area etiqueta="Resumen" valor={p.resumen} filas={3} cambiar={(v) => set({ ...p, resumen: v })} />
                      <div className="grid gap-5 sm:grid-cols-2">
                        <Seleccion etiqueta="Estado" valor={p.estado}
                          opciones={["En formulación", "Piloto", "En ejecución", "Permanente"] as const}
                          cambiar={(v) => set({ ...p, estado: v })} />
                        <Seleccion etiqueta="Línea misional" valor={p.linea}
                          opciones={doc.lineas.items.map((l) => l.id)}
                          cambiar={(v) => set({ ...p, linea: v })} />
                      </div>
                      <Area etiqueta="Qué requiere" valor={p.requerimiento ?? ""} filas={2}
                        ayuda="Monto, contrapartida técnica y plazo. Se muestra a inversores y cooperantes."
                        cambiar={(v) => set({ ...p, requerimiento: v })} />
                      <div className="grid gap-5 sm:grid-cols-2">
                        <Texto etiqueta="Imagen (ruta o URL)" valor={p.imagen ?? ""} cambiar={(v) => set({ ...p, imagen: v })} />
                        <Texto etiqueta="Enlace a la ficha" valor={p.enlace ?? ""} cambiar={(v) => set({ ...p, enlace: v })} />
                      </div>
                    </>
                  )}
                />
              </div>
            )}

            {pestana === "gobernanza" && (
              <div className="space-y-6">
                <Texto etiqueta="Antetítulo" valor={doc.gobernanza.antetitulo}
                  cambiar={(v) => poner("gobernanza", { ...doc.gobernanza, antetitulo: v })} />
                <Texto etiqueta="Título" ayuda="Lo que vaya entre *asteriscos* lleva el acento de color." valor={doc.gobernanza.titulo}
                  cambiar={(v) => poner("gobernanza", { ...doc.gobernanza, titulo: v })} />
                <Area etiqueta="Bajada" valor={doc.gobernanza.lead} filas={3}
                  cambiar={(v) => poner("gobernanza", { ...doc.gobernanza, lead: v })} />
                <Lista<Garantia>
                  titulo="Garantías estatutarias"
                  nombreElemento="garantía"
                  elementos={doc.gobernanza.garantias}
                  cambiar={(v) => poner("gobernanza", { ...doc.gobernanza, garantias: v })}
                  nuevo={() => ({ id: `g-${Date.now()}`, titulo: "", texto: "", fundamento: "" })}
                  rotulo={(g) => g.titulo}
                  pintar={(g, set) => (
                    <>
                      <Texto etiqueta="Título" valor={g.titulo} cambiar={(v) => set({ ...g, titulo: v })} />
                      <Area etiqueta="Texto" valor={g.texto} filas={3} cambiar={(v) => set({ ...g, texto: v })} />
                      <Texto etiqueta="Fundamento" valor={g.fundamento}
                        ayuda="Artículo de los estatutos y norma, por ejemplo «Art. 6, par. 2 · art. 362 E.T.»"
                        cambiar={(v) => set({ ...g, fundamento: v })} />
                    </>
                  )}
                />
                <Lista<Documento>
                  titulo="Documentos descargables"
                  nombreElemento="documento"
                  elementos={doc.gobernanza.documentos}
                  cambiar={(v) => poner("gobernanza", { ...doc.gobernanza, documentos: v })}
                  nuevo={() => ({ id: `doc-${Date.now()}`, nombre: "", archivo: "" })}
                  rotulo={(d) => d.nombre}
                  pintar={(d, set) => (
                    <>
                      <Texto etiqueta="Nombre" valor={d.nombre} cambiar={(v) => set({ ...d, nombre: v })} />
                      <Texto etiqueta="Archivo (ruta o URL)" valor={d.archivo}
                        ayuda="Vacío, el documento no aparece en la página."
                        cambiar={(v) => set({ ...d, archivo: v })} />
                    </>
                  )}
                />
              </div>
            )}

            {pestana === "vinculacion" && (
              <div className="space-y-6">
                <Texto etiqueta="Antetítulo" valor={doc.vinculacion.antetitulo}
                  cambiar={(v) => poner("vinculacion", { ...doc.vinculacion, antetitulo: v })} />
                <Texto etiqueta="Título" ayuda="Lo que vaya entre *asteriscos* lleva el acento de color." valor={doc.vinculacion.titulo}
                  cambiar={(v) => poner("vinculacion", { ...doc.vinculacion, titulo: v })} />
                <Area etiqueta="Bajada" valor={doc.vinculacion.lead} filas={3}
                  cambiar={(v) => poner("vinculacion", { ...doc.vinculacion, lead: v })} />
                <Area etiqueta="Texto del beneficio tributario" valor={doc.vinculacion.beneficioTributario} filas={3}
                  ayuda="Solo se publica si la Fundación está marcada como calificada en el RTE, en la pestaña Identidad."
                  cambiar={(v) => poner("vinculacion", { ...doc.vinculacion, beneficioTributario: v })} />
                <Lista<Via>
                  titulo="Vías de vinculación"
                  nombreElemento="vía"
                  elementos={doc.vinculacion.vias}
                  cambiar={(v) => poner("vinculacion", { ...doc.vinculacion, vias: v })}
                  nuevo={() => ({
                    id: `via-${Date.now()}`, icono: "convenio", titulo: "", texto: "",
                    contrapartida: "", accion: { label: "", href: "#contacto" },
                  })}
                  rotulo={(v) => v.titulo}
                  pintar={(via, set) => (
                    <>
                      <div className="grid gap-5 sm:grid-cols-2">
                        <Texto etiqueta="Título" valor={via.titulo} cambiar={(v) => set({ ...via, titulo: v })} />
                        <Seleccion etiqueta="Icono" valor={via.icono} opciones={ICONOS}
                          cambiar={(v) => set({ ...via, icono: v })} />
                      </div>
                      <Area etiqueta="Texto" valor={via.texto} filas={3} cambiar={(v) => set({ ...via, texto: v })} />
                      <Area etiqueta="Contrapartida" valor={via.contrapartida ?? ""} filas={2}
                        ayuda="Qué recibe la contraparte." cambiar={(v) => set({ ...via, contrapartida: v })} />
                      <div className="grid gap-5 sm:grid-cols-2">
                        <Texto etiqueta="Botón — texto" valor={via.accion?.label ?? ""}
                          cambiar={(v) => set({ ...via, accion: { label: v, href: via.accion?.href ?? "#contacto" } })} />
                        <Texto etiqueta="Botón — destino" valor={via.accion?.href ?? ""}
                          cambiar={(v) => set({ ...via, accion: { label: via.accion?.label ?? "", href: v } })} />
                      </div>
                    </>
                  )}
                />
              </div>
            )}

            {pestana === "aliados" && (
              <Lista<Aliado>
                titulo="Aliados"
                nombreElemento="aliado"
                elementos={doc.aliados}
                cambiar={(v) => poner("aliados", v)}
                nuevo={() => ({ id: `aliado-${Date.now()}`, nombre: "", logo: "", enlace: "" })}
                rotulo={(a) => a.nombre}
                pintar={(a, set) => (
                  <>
                    <Texto etiqueta="Nombre" valor={a.nombre} cambiar={(v) => set({ ...a, nombre: v })} />
                    <div className="grid gap-5 sm:grid-cols-2">
                      <Texto etiqueta="Logo (ruta o URL)" valor={a.logo ?? ""}
                        ayuda="Vacío, se muestra el nombre en texto." cambiar={(v) => set({ ...a, logo: v })} />
                      <Texto etiqueta="Enlace" valor={a.enlace ?? ""} cambiar={(v) => set({ ...a, enlace: v })} />
                    </div>
                  </>
                )}
              />
            )}

            {pestana === "contacto" && (
              <div className="space-y-6">
                <Texto etiqueta="Antetítulo" valor={doc.contacto.antetitulo}
                  cambiar={(v) => poner("contacto", { ...doc.contacto, antetitulo: v })} />
                <Texto etiqueta="Título" ayuda="Lo que vaya entre *asteriscos* lleva el acento de color." valor={doc.contacto.titulo}
                  cambiar={(v) => poner("contacto", { ...doc.contacto, titulo: v })} />
                <Area etiqueta="Bajada" valor={doc.contacto.lead} filas={3}
                  cambiar={(v) => poner("contacto", { ...doc.contacto, lead: v })} />
                <Texto etiqueta="Correo" valor={doc.contacto.correo}
                  cambiar={(v) => poner("contacto", { ...doc.contacto, correo: v })} />
                <Texto etiqueta="Teléfono" valor={doc.contacto.telefono}
                  ayuda="Formato internacional. Vacío, no aparece."
                  cambiar={(v) => poner("contacto", { ...doc.contacto, telefono: v })} />
                <Texto etiqueta="Dirección" valor={doc.contacto.direccion}
                  ayuda="Vacío, no aparece."
                  cambiar={(v) => poner("contacto", { ...doc.contacto, direccion: v })} />
                <Lista<Red>
                  titulo="Redes"
                  nombreElemento="red"
                  elementos={doc.contacto.redes}
                  cambiar={(v) => poner("contacto", { ...doc.contacto, redes: v })}
                  nuevo={() => ({ id: `red-${Date.now()}`, label: "", href: "" })}
                  rotulo={(r) => r.label}
                  pintar={(r, set) => (
                    <div className="grid gap-5 sm:grid-cols-2">
                      <Texto etiqueta="Nombre" valor={r.label} cambiar={(v) => set({ ...r, label: v })} />
                      <Texto etiqueta="Enlace" valor={r.href} cambiar={(v) => set({ ...r, href: v })} />
                    </div>
                  )}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminGuard>
  );
}
