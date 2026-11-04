/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  CONTENIDO EDITABLE — FUNDACIÓN (kasadelsol.co/ong)
 * ═══════════════════════════════════════════════════════════════════════════
 *  Todo el texto, las cifras y los enlaces de la página viven en este archivo.
 *  La maquetación (page.tsx y _components/) no contiene copy: para actualizar
 *  la página se edita únicamente este archivo.
 *
 *  Los valores marcados con "PENDIENTE" son marcadores de posición a la espera
 *  del material definitivo. Ninguna cifra está inventada: los indicadores
 *  llegan vacíos ("—") para no publicar datos sin respaldo.
 * ═══════════════════════════════════════════════════════════════════════════
 */

/** Claves de icono admitidas. El mapa vive en _components/icons.tsx */
export type IconKey =
  | "sun"
  | "heart"
  | "music"
  | "book"
  | "sprout"
  | "users"
  | "scale"
  | "megaphone"
  | "sparkles"
  | "globe";

/* ── IDENTIDAD ──────────────────────────────────────────────────────────── */

export const identidad = {
  /** PENDIENTE: razón social exacta de la fundación */
  nombre: "Fundación Kasa del Sol",
  /** Nombre corto para titulares */
  nombreCorto: "La Fundación",
  /** PENDIENTE: lema oficial */
  lema: "Cultura que transforma",
  /** Frase de apertura del hero (1–2 líneas) */
  entrada:
    "PENDIENTE: párrafo de apertura. Qué es la fundación, a quién sirve y desde dónde actúa.",
  /** PENDIENTE: NIT / registro de la entidad sin ánimo de lucro */
  nit: "",
  ciudad: "Pasto, Nariño — Colombia",
};

/* ── NAVEGACIÓN INTERNA ─────────────────────────────────────────────────── */

export const secciones = [
  { id: "manifiesto", label: "Manifiesto" },
  { id: "pilares", label: "Pilares" },
  { id: "programas", label: "Programas" },
  { id: "impacto", label: "Impacto" },
  { id: "participa", label: "Participa" },
  { id: "contacto", label: "Contacto" },
] as const;

/* ── MANIFIESTO ─────────────────────────────────────────────────────────── */

export const manifiesto = {
  titulo: "Quiénes somos",
  /** Párrafos del manifiesto. Añadir o quitar elementos libremente. */
  parrafos: [
    "PENDIENTE: primer párrafo del manifiesto — el origen de la fundación y el problema que decidió atender.",
    "PENDIENTE: segundo párrafo — la apuesta: cómo la cultura, la música y la organización comunitaria operan como herramienta de transformación.",
  ],
  mision: {
    titulo: "Misión",
    texto: "PENDIENTE: misión en una sola frase, verificable y concreta.",
  },
  vision: {
    titulo: "Visión",
    texto: "PENDIENTE: visión a cinco años.",
  },
};

/* ── PILARES / LÍNEAS DE ACCIÓN ─────────────────────────────────────────── */

export type Pilar = {
  id: string;
  icono: IconKey;
  titulo: string;
  texto: string;
};

export const pilares: Pilar[] = [
  {
    id: "cultura",
    icono: "music",
    titulo: "Cultura y música",
    texto:
      "PENDIENTE: cómo la fundación produce, forma y abre escenario para artistas del territorio.",
  },
  {
    id: "formacion",
    icono: "book",
    titulo: "Formación",
    texto:
      "PENDIENTE: talleres, escuelas, acompañamiento técnico y transferencia de oficio.",
  },
  {
    id: "derechos",
    icono: "scale",
    titulo: "Derechos y ciudadanía",
    texto:
      "PENDIENTE: orientación, defensa de derechos y fortalecimiento de organizaciones de base.",
  },
  {
    id: "territorio",
    icono: "sprout",
    titulo: "Territorio",
    texto:
      "PENDIENTE: trabajo barrial y rural, cuidado del entorno y economía propia.",
  },
];

/* ── PROGRAMAS ──────────────────────────────────────────────────────────── */

export type Programa = {
  id: string;
  nombre: string;
  resumen: string;
  /** Etiqueta de estado: "Activo", "En formulación", "Permanente", etc. */
  estado: string;
  /** Ruta en /public o URL absoluta. Vacío → se muestra el patrón solar. */
  imagen?: string;
  /** Enlace a más información. Vacío → la tarjeta no es un enlace. */
  enlace?: string;
};

export const programas: Programa[] = [
  {
    id: "programa-1",
    nombre: "PENDIENTE: nombre del programa",
    resumen:
      "PENDIENTE: dos o tres líneas sobre qué hace el programa, con quién y dónde.",
    estado: "Activo",
  },
  {
    id: "programa-2",
    nombre: "PENDIENTE: nombre del programa",
    resumen: "PENDIENTE: descripción breve.",
    estado: "En formulación",
  },
  {
    id: "programa-3",
    nombre: "PENDIENTE: nombre del programa",
    resumen: "PENDIENTE: descripción breve.",
    estado: "Permanente",
  },
];

/* ── IMPACTO ────────────────────────────────────────────────────────────── */

export type Indicador = {
  id: string;
  /** Cifra. Se deja "—" hasta contar con el dato verificado. */
  valor: string;
  etiqueta: string;
  /** Fuente o periodo del dato. Opcional. */
  nota?: string;
};

export const impacto = {
  titulo: "Impacto",
  descripcion:
    "PENDIENTE: una línea que enmarque las cifras (periodo que cubren y cómo se miden).",
  indicadores: [
    { id: "i1", valor: "—", etiqueta: "PENDIENTE: beneficiarios directos" },
    { id: "i2", valor: "—", etiqueta: "PENDIENTE: procesos formativos" },
    { id: "i3", valor: "—", etiqueta: "PENDIENTE: artistas acompañados" },
    { id: "i4", valor: "—", etiqueta: "PENDIENTE: municipios" },
  ] as Indicador[],
};

/* ── PARTICIPA ──────────────────────────────────────────────────────────── */

export type VíaDeApoyo = {
  id: string;
  icono: IconKey;
  titulo: string;
  texto: string;
  accion?: { label: string; href: string };
};

export const participa = {
  titulo: "Cómo participar",
  descripcion:
    "PENDIENTE: una línea de invitación. La fundación se sostiene con trabajo, alianzas y aportes.",
  vias: [
    {
      id: "voluntariado",
      icono: "users",
      titulo: "Voluntariado",
      texto: "PENDIENTE: perfiles que se buscan y cómo es la vinculación.",
      accion: { label: "Postularme", href: "#contacto" },
    },
    {
      id: "donacion",
      icono: "heart",
      titulo: "Donaciones",
      texto:
        "PENDIENTE: destino de los aportes y medios habilitados para recibirlos.",
      accion: { label: "Quiero aportar", href: "#contacto" },
    },
    {
      id: "alianzas",
      icono: "globe",
      titulo: "Alianzas",
      texto:
        "PENDIENTE: qué ofrece la fundación a empresas, entidades públicas y cooperación.",
      accion: { label: "Proponer una alianza", href: "#contacto" },
    },
  ] as VíaDeApoyo[],
};

/* ── ALIADOS ────────────────────────────────────────────────────────────── */

export type Aliado = {
  id: string;
  nombre: string;
  /** Ruta del logo en /public. Vacío → se muestra el nombre en texto. */
  logo?: string;
  enlace?: string;
};

export const aliados: Aliado[] = [
  // PENDIENTE: cargar aliados. Ejemplo:
  // { id: "aliado-1", nombre: "Nombre del aliado", logo: "/ong/aliados/logo.png" },
];

/* ── CONTACTO ───────────────────────────────────────────────────────────── */

export const contacto = {
  titulo: "Contacto",
  descripcion:
    "PENDIENTE: una línea sobre el canal preferido de contacto y tiempos de respuesta.",
  correo: "avjuanvela@gmail.com",
  /** PENDIENTE: teléfono público de la fundación en formato internacional */
  telefono: "",
  /** PENDIENTE: dirección si se quiere publicar */
  direccion: "",
  redes: [
    // PENDIENTE: { id: "instagram", label: "Instagram", href: "https://instagram.com/..." },
  ] as { id: string; label: string; href: string }[],
};

/* ── LLAMADO PRINCIPAL ──────────────────────────────────────────────────── */

export const cta = {
  principal: { label: "Apoyar la fundación", href: "#participa" },
  secundario: { label: "Conocer los programas", href: "#programas" },
};
