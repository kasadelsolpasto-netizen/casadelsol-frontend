/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  FUNDACIÓN KASA DEL SOL — contenido de kasadelsol.co/ong
 * ═══════════════════════════════════════════════════════════════════════════
 *  Fuente institucional: Acta No. 3 del 27 de julio de 2026 — reforma integral
 *  de estatutos, inscrita en la Cámara de Comercio de Pasto.
 *
 *  Regla de este archivo: lo que aquí se afirma debe poder sostenerse ante un
 *  inversor, un cooperante o una entidad de control. Los datos tomados de los
 *  estatutos están verificados. Lo que aún no consta se marca «PENDIENTE» y no
 *  se publica: ninguna cifra, fecha ni resultado se presenta sin respaldo.
 * ═══════════════════════════════════════════════════════════════════════════
 */

export type IconKey =
  | "sol"
  | "agua"
  | "hoja"
  | "balanza"
  | "escudo"
  | "lupa"
  | "comunidad"
  | "formacion"
  | "cultura"
  | "laboratorio"
  | "convenio"
  | "globo";

/* ════════════════════════════════════════════════════════════════════════
   IDENTIDAD INSTITUCIONAL  —  Arts. 1, 2, 3, 27 y 28
   ════════════════════════════════════════════════════════════════════════ */

export const identidad = {
  nombre: "Fundación Kasa del Sol",
  nombreCorto: "Kasa del Sol",
  nit: "902.014.359-1",
  domicilio: "Pasto, Nariño — Colombia",
  ambito: "Ámbito nacional e internacional",
  correo: "ongkasadelsol@gmail.com",
  /** Art. 2 */
  naturaleza:
    "Entidad no gubernamental de carácter fundacional, sin ánimo de lucro y de utilidad común.",
  /** Arts. 16, 20 y 27 */
  representante: {
    nombre: "Juan Pablo Vela Ruiz",
    cargo: "Director Ejecutivo y Representante Legal",
  },
  /** Art. 3 */
  vigilancia: "Gobernación de Nariño",
  registro: "Cámara de Comercio de Pasto",
};

/**
 * Art. 28 — la Fundación tiene *vocación* de pertenecer al Régimen Tributario
 * Especial. Mientras la calificación no esté en firme, la página no afirma que
 * las donaciones dan derecho al descuento del art. 257 E.T.
 * Cambiar a true únicamente con el acto de calificación en la mano.
 */
export const rteCalificado = false;

/* ════════════════════════════════════════════════════════════════════════
   NAVEGACIÓN
   ════════════════════════════════════════════════════════════════════════ */

export const secciones = [
  { id: "tesis", label: "Planteamiento" },
  { id: "lineas", label: "Líneas misionales" },
  { id: "territorio", label: "Territorio" },
  { id: "programas", label: "Programas" },
  { id: "gobernanza", label: "Gobernanza" },
  { id: "vinculacion", label: "Vinculación" },
  { id: "contacto", label: "Contacto" },
] as const;

/* ════════════════════════════════════════════════════════════════════════
   HERO
   ════════════════════════════════════════════════════════════════════════ */

export const hero = {
  antetitulo: "Entidad sin ánimo de lucro · Pasto, Nariño",
  titular: "Sol y cuenca",
  /** Tesis en una frase. Es lo primero que lee un inversor. */
  entrada:
    "Trabajamos donde nace el agua del Amazonas y donde se forma la juventud: dos extremos de una misma cadena. Conservación de la alta cuenca amazónica, alternativas productivas, defensa del agua, control social a lo público y cultura como forma de organización.",
  sellos: [
    { id: "nit", etiqueta: "NIT", valor: "902.014.359-1" },
    { id: "ivc", etiqueta: "Vigilancia", valor: "Gobernación de Nariño" },
    { id: "obj", etiqueta: "Objeto", valor: "Actividades meritorias — art. 359 E.T." },
  ],
  acciones: {
    principal: { label: "Líneas misionales", href: "#lineas" },
    secundario: { label: "Gobernanza y cumplimiento", href: "#gobernanza" },
  },
};

/* ════════════════════════════════════════════════════════════════════════
   PLANTEAMIENTO  —  la tesis que unifica las líneas
   ════════════════════════════════════════════════════════════════════════ */

export const tesis = {
  antetitulo: "Planteamiento",
  titulo: "Una sola cadena",
  parrafos: [
    "En el sur de Colombia nace una de las cuencas de agua dulce más determinantes del planeta. Lo que ocurre en los páramos y humedales de Nariño y del piedemonte andino-amazónico se decide río abajo, en miles de kilómetros de selva. Y se decide también arriba: en quién compra la tierra, en qué se produce sobre ella, en qué contratos públicos se ejecutan y en qué comunidades quedan en pie para defenderla.",
    "La Fundación Kasa del Sol no separa esos planos. Conservar la alta cuenca exige alternativas productivas que no dependan del extractivismo; exige vigilancia sobre los recursos públicos destinados al ambiente; exige comunidades formadas y organizadas; y exige que las poblaciones que sostienen ese territorio —campesinas, indígenas, jóvenes— no sean desplazadas, criminalizadas ni exterminadas. Cada una de nuestras líneas es un tramo de esa misma cadena.",
    "Por eso una fundación que produce festivales también litiga por el agua, investiga bioplásticos y constituye veedurías ciudadanas. No son frentes dispersos: son los puntos donde una misma estructura de despojo puede romperse.",
  ],
  /** Frase de cierre, tipográficamente destacada. */
  destacado:
    "Defender el agua donde nace y defender a quienes la cuidan son el mismo trabajo.",
};

/* ════════════════════════════════════════════════════════════════════════
   LÍNEAS MISIONALES  —  Art. 5, con su numeral del art. 359 E.T.
   ════════════════════════════════════════════════════════════════════════ */

export type Linea = {
  id: string;
  icono: IconKey;
  titulo: string;
  sumario: string;
  /** Viñetas de actuación concreta. */
  acciones: string[];
  /** Anclaje estatutario — es lo que distingue a esta página de un folleto. */
  fundamento: { articulo: string; norma: string };
};

export const lineas: { antetitulo: string; titulo: string; lead: string; items: Linea[] } = {
  antetitulo: "Objeto social",
  titulo: "Siete líneas, un objeto",
  lead: "El objeto de la Fundación es exclusivamente el desarrollo de actividades meritorias de interés general y de libre acceso a la comunidad. Cada línea responde a un numeral del artículo 359 del Estatuto Tributario.",
  items: [
    {
      id: "ambiente",
      icono: "agua",
      titulo: "Agua, ecosistemas y alta cuenca amazónica",
      sumario:
        "Conservación, recuperación y manejo sostenible de los ecosistemas y la biodiversidad del territorio nariñense y andino-amazónico, con el agua como eje.",
      acciones: [
        "Protección de humedales, páramos y nacimientos de agua de la alta cuenca",
        "Defensa jurídica y comunitaria del agua como bien común",
        "Educación ambiental y ciencia comunitaria en el territorio",
        "Articulación con autoridades ambientales y con comunidades del área de influencia",
      ],
      fundamento: { articulo: "Art. 5.7", norma: "nums. 1, 3, 4 y 6 · art. 359 E.T." },
    },
    {
      id: "productivas",
      icono: "laboratorio",
      titulo: "Alternativas productivas y agroecología",
      sumario:
        "Investigación y desarrollo de alternativas materiales y alimentarias que permitan habitar el territorio sin destruirlo, incluida la producción de bioplásticos a partir de biomasa local.",
      acciones: [
        "Investigación aplicada y pilotos de bioplástico con materia prima de la región",
        "Huertas y granjas agroecológicas comunitarias de acceso abierto",
        "Protección de semillas nativas y criollas y de los saberes campesinos e indígenas",
        "Soberanía alimentaria y derecho humano a la alimentación adecuada",
      ],
      fundamento: { articulo: "Art. 5.7 · Art. 6", norma: "nums. 1, 3, 4 y 6 · art. 359 E.T." },
    },
    {
      id: "control-social",
      icono: "lupa",
      titulo: "Control social a la gestión pública",
      sumario:
        "Constitución y acompañamiento de veedurías ciudadanas sobre los recursos de origen público, como ejercicio del derecho a la participación y del control social.",
      acciones: [
        "Constitución, integración y apoyo de veedurías y redes de veedurías",
        "Formación ciudadana en control social y acceso a la información pública",
        "Seguimiento a contratación y a recursos públicos del sector ambiental y cultural",
        "Independencia garantizada: el control social no recae sobre entidades o contratos en los que la Fundación o sus dignatarios tengan interés",
      ],
      fundamento: { articulo: "Art. 5.3", norma: "Ley 850 de 2003 · arts. 40 y 270 C.P." },
    },
    {
      id: "ddhh",
      icono: "escudo",
      titulo: "Derechos humanos y prevención del genocidio",
      sumario:
        "Investigación, documentación y denuncia de violencias policiales, estatales y sociales, y pedagogía de prevención frente a actos constitutivos de genocidio y graves violaciones de derechos humanos.",
      acciones: [
        "Documentación y litigio estratégico en protección de derechos individuales y colectivos",
        "Protección de minorías culturales, étnicas, religiosas, políticas y de orientaciones diversas",
        "Acompañamiento jurídico comunitario y formación en derechos",
        "Énfasis en poblaciones vulnerables, víctimas del conflicto armado y personas en reincorporación",
      ],
      fundamento: { articulo: "Art. 5.3", norma: "num. 10 · art. 359 E.T." },
    },
    {
      id: "cultura",
      icono: "cultura",
      titulo: "Cultura, arte y tecnología",
      sumario:
        "Creación, producción y difusión cultural con acceso libre a la comunidad, incluidas las expresiones contemporáneas —músicas electrónicas y culturas urbanas— como formas legítimas de fomento de la cultura.",
      acciones: [
        "Festivales, residencias artísticas y laboratorios de creación",
        "Diseño, construcción y operación de sistemas de sonido y plataformas creativas",
        "Proyectos de arte y tecnología y experiencias inmersivas",
        "Alineación con los planes de desarrollo cultural municipal, departamental y nacional",
      ],
      fundamento: { articulo: "Art. 5.2", norma: "num. 3 · art. 359 E.T. · Ley 397 de 1997" },
    },
    {
      id: "salud",
      icono: "comunidad",
      titulo: "Salud comunitaria y reducción de riesgos",
      sumario:
        "Programas gratuitos de reducción de riesgos y daños en contextos culturales y urbanos, y acompañamiento a personas en consumo problemático o en condición de calle.",
      acciones: [
        "Reducción de riesgos y daños en escenarios culturales y comunitarios",
        "Escucha, orientación y remisión; salud mental comunitaria",
        "Articulación con medicina tradicional mediante convenio con autoridades étnicas",
        "Sin prestación de servicios clínicos: el tratamiento se canaliza a instituciones habilitadas",
      ],
      fundamento: { articulo: "Art. 5.4", norma: "nums. 2 y 7 · art. 359 E.T." },
    },
    {
      id: "formacion",
      icono: "formacion",
      titulo: "Educación, interculturalidad y saberes ancestrales",
      sumario:
        "Formación abierta en las áreas del objeto social y reconocimiento de las culturas ancestrales como patrimonio cultural inmaterial.",
      acciones: [
        "Talleres, seminarios y laboratorios pedagógicos de acceso abierto",
        "Formación en derechos, educación ambiental y educación artística",
        "Interculturalidad y bienestar espiritual de carácter cultural y comunitario",
        "Sin proselitismo partidista ni religioso: la Fundación no es una confesión religiosa",
      ],
      fundamento: { articulo: "Arts. 5.5 y 5.6", norma: "nums. 1 y 3 · art. 359 E.T." },
    },
  ],
};

/* ════════════════════════════════════════════════════════════════════════
   TERRITORIO  —  alta cuenca amazónica
   ════════════════════════════════════════════════════════════════════════ */

export const territorio = {
  antetitulo: "Territorio",
  titulo: "Donde nace el Amazonas",
  parrafos: [
    "El trabajo de conservación de la Fundación se concentra en la alta cuenca amazónica, en el departamento de Nariño: el tramo donde el agua andina inicia el recorrido que alimenta el sistema fluvial más extenso del planeta. Es un territorio de humedales de importancia internacional, de economía campesina e indígena, y de una presión creciente sobre el suelo y el agua.",
    "PENDIENTE: párrafo sobre el predio de operación — extensión, ecosistema, vocación de conservación y qué se proyecta instalar allí (vivero, laboratorio de bioplástico, estación de monitoreo, centro de formación).",
  ],
  /**
   * Sitio Ramsar de operación.
   * PENDIENTE: confirmar denominación oficial y decidir si se publica la
   * ubicación precisa. Mientras `publicarUbicacion` sea false, la página habla
   * del humedal y de la cuenca sin señalar el predio.
   */
  sitio: {
    denominacion: "PENDIENTE: nombre oficial del sitio Ramsar",
    publicarUbicacion: false,
  },
  /** Datos del territorio. Solo se publican los verificables. */
  marcadores: [
    { id: "m1", valor: "—", etiqueta: "PENDIENTE: hectáreas bajo manejo o conservación" },
    { id: "m2", valor: "—", etiqueta: "PENDIENTE: comunidades del área de influencia" },
    { id: "m3", valor: "—", etiqueta: "PENDIENTE: nacimientos o fuentes hídricas protegidas" },
  ],
  nota: "Los indicadores se publican una vez verificados y con indicación del periodo y de la fuente.",
};

/* ════════════════════════════════════════════════════════════════════════
   PROGRAMAS Y PROYECTOS
   ════════════════════════════════════════════════════════════════════════ */

export type Programa = {
  id: string;
  nombre: string;
  resumen: string;
  /** "En formulación" | "Piloto" | "En ejecución" | "Permanente" */
  estado: string;
  /** Línea misional a la que pertenece (id de `lineas.items`). */
  linea: string;
  /** Qué se busca de un aliado o inversor en este proyecto. */
  requerimiento?: string;
  imagen?: string;
  enlace?: string;
};

export const programas: { antetitulo: string; titulo: string; lead: string; items: Programa[] } = {
  antetitulo: "Portafolio",
  titulo: "Proyectos abiertos a inversión y cooperación",
  lead: "Cada proyecto indica su estado real de avance y lo que requiere para ejecutarse. No presentamos como ejecutado lo que está en formulación.",
  items: [
    {
      id: "bioplastico",
      nombre: "Laboratorio de bioplástico de biomasa local",
      resumen:
        "PENDIENTE: materia prima seleccionada, ruta técnica, aliado científico y escala proyectada del piloto.",
      estado: "En formulación",
      linea: "productivas",
      requerimiento: "PENDIENTE: monto, contrapartida técnica y plazo",
    },
    {
      id: "cuenca",
      nombre: "Conservación y restauración de la alta cuenca",
      resumen:
        "PENDIENTE: alcance del predio, metas de restauración, vivero y esquema de monitoreo.",
      estado: "En formulación",
      linea: "ambiente",
      requerimiento: "PENDIENTE",
    },
    {
      id: "veedurias",
      nombre: "Red de veedurías por el agua",
      resumen:
        "PENDIENTE: alcance territorial, número de veedurías proyectadas y contratos u objetos de seguimiento.",
      estado: "En formulación",
      linea: "control-social",
      requerimiento: "PENDIENTE",
    },
  ],
};

/* ════════════════════════════════════════════════════════════════════════
   GOBERNANZA Y CUMPLIMIENTO
   ════════════════════════════════════════════════════════════════════════ */

export type Garantia = {
  id: string;
  titulo: string;
  texto: string;
  fundamento: string;
};

export const gobernanza = {
  antetitulo: "Gobernanza",
  titulo: "Cómo respondemos por los recursos",
  lead: "La Fundación opera bajo reglas estatutarias de destinación, control y transparencia que pueden verificarse en su texto inscrito.",
  garantias: [
    {
      id: "excedentes",
      titulo: "Los excedentes no se distribuyen",
      texto:
        "Ningún excedente —incluidos los de actividades complementarias— se distribuye al fundador, a los dignatarios ni a terceros, bajo ninguna modalidad. La totalidad se reinvierte en el objeto social al año fiscal siguiente.",
      fundamento: "Art. 6, par. 2 · art. 362 E.T.",
    },
    {
      id: "aportes",
      titulo: "Los aportes no son reembolsables",
      texto:
        "El patrimonio se destina exclusivamente al objeto social. Los aportes no confieren capital, cuota, acción ni derecho de reembolso o de distribución.",
      fundamento: "Arts. 7 y 8 · arts. 356 y ss. E.T.",
    },
    {
      id: "vinculados",
      titulo: "Operaciones con vinculados autorizadas y a precio de mercado",
      texto:
        "Todo acto o contrato entre la Fundación y el fundador, el Director Ejecutivo o sus vinculados requiere autorización previa del máximo órgano, se celebra a precios de mercado y con soporte documental.",
      fundamento: "Art. 10 lit. e) · art. 21 par. · art. 356-1 E.T.",
    },
    {
      id: "rendicion",
      titulo: "Rendición de cuentas anual",
      texto:
        "Informes de gestión y estados financieros certificados por contador público, presentados ante el máximo órgano, ante la Gobernación de Nariño y ante la DIAN.",
      fundamento: "Art. 19 · art. 364-5 E.T.",
    },
    {
      id: "revisor",
      titulo: "Revisoría fiscal al alcanzar los topes legales",
      texto:
        "La Fundación designa revisor fiscal cuando la ley lo exige —5.000 SMMLV en activos o 3.000 SMMLV en ingresos— o cuando el máximo órgano lo estime conveniente.",
      fundamento: "Art. 22 · art. 13 par. 2, Ley 43 de 1990",
    },
    {
      id: "prohibidas",
      titulo: "Actividades prohibidas",
      texto:
        "No se desarrollan juegos de suerte y azar ni loterías, ni servicios de vigilancia y seguridad privada, ni actividad alguna ajena a las actividades meritorias.",
      fundamento: "Art. 18",
    },
    {
      id: "apolitica",
      titulo: "Sin proselitismo partidista ni religioso",
      texto:
        "La Fundación es apolítica en el sentido de no realizar proselitismo partidista, y no constituye iglesia ni confesión religiosa. Su actuación pública se ejerce como control social y defensa de derechos, no como actividad electoral.",
      fundamento: "Arts. 2, 5.6 y 5.3",
    },
    {
      id: "remanente",
      titulo: "Destino del remanente en caso de disolución",
      texto:
        "El remanente se transfiere obligatoriamente a entidades sin ánimo de lucro del Régimen Tributario Especial o a una entidad de derecho público con objeto afín, preferentemente en Nariño.",
      fundamento: "Art. 24",
    },
  ] as Garantia[],
  /** Documentos descargables. Se publican cuando el archivo esté en /public. */
  documentos: [
    { id: "estatutos", nombre: "Estatutos vigentes (Acta No. 3 de 2026)", archivo: "" },
    { id: "existencia", nombre: "Certificado de existencia y representación legal", archivo: "" },
    { id: "rut", nombre: "RUT", archivo: "" },
    { id: "informe", nombre: "Informe anual de gestión", archivo: "" },
  ],
};

/* ════════════════════════════════════════════════════════════════════════
   VINCULACIÓN
   ════════════════════════════════════════════════════════════════════════ */

export type Via = {
  id: string;
  icono: IconKey;
  titulo: string;
  texto: string;
  /** Qué recibe la contraparte. */
  contrapartida?: string;
  accion?: { label: string; href: string };
};

export const vinculacion = {
  antetitulo: "Vinculación",
  titulo: "Formas de trabajar con nosotros",
  lead: "La Fundación está facultada para suscribir convenios, contratos y acuerdos de cooperación con entidades públicas, privadas, nacionales y extranjeras.",
  vias: [
    {
      id: "cooperacion",
      icono: "globo",
      titulo: "Cooperación internacional",
      texto:
        "Formulación y ejecución conjunta de proyectos de conservación, derechos humanos, cultura y desarrollo comunitario, con ejecución local y rendición documentada.",
      contrapartida: "Ejecución en territorio, informes y verificación en sitio",
      accion: { label: "Abrir conversación", href: "#contacto" },
    },
    {
      id: "empresa",
      icono: "convenio",
      titulo: "Empresa y donantes",
      texto:
        "Donaciones y convenios de inversión social destinados a programas determinados, con destinación verificable e informe de aplicación de los recursos.",
      contrapartida: "PENDIENTE: definir reporte e interlocución al donante",
      accion: { label: "Solicitar portafolio", href: "#contacto" },
    },
    {
      id: "publico",
      icono: "balanza",
      titulo: "Entidades públicas",
      texto:
        "Convenios y contratos en cultura, ambiente, educación, salud comunitaria y derechos humanos, dentro del ámbito del objeto social.",
      contrapartida:
        "El control social de la Fundación no recae sobre entidades o contratos en los que tenga interés",
      accion: { label: "Ver líneas", href: "#lineas" },
    },
    {
      id: "tecnico",
      icono: "laboratorio",
      titulo: "Aliados técnicos y académicos",
      texto:
        "Universidades, centros de investigación y laboratorios interesados en bioplásticos, restauración ecológica, monitoreo hídrico y sistemas alimentarios.",
      contrapartida: "Acceso a territorio, datos de campo y coautoría",
      accion: { label: "Proponer colaboración", href: "#contacto" },
    },
  ] as Via[],
  /**
   * Texto que solo aparece cuando `rteCalificado` sea true. No se publica
   * antes: afirmar el beneficio tributario sin la calificación en firme
   * expondría a la Fundación y al donante.
   */
  beneficioTributario:
    "Las donaciones a entidades calificadas en el Régimen Tributario Especial dan derecho al descuento tributario previsto en el artículo 257 del Estatuto Tributario.",
};

/* ════════════════════════════════════════════════════════════════════════
   ALIADOS
   ════════════════════════════════════════════════════════════════════════ */

export type Aliado = { id: string; nombre: string; logo?: string; enlace?: string };

export const aliados: Aliado[] = [
  // PENDIENTE: { id: "a1", nombre: "Nombre", logo: "/ong/aliados/logo.png" },
];

/* ════════════════════════════════════════════════════════════════════════
   CONTACTO
   ════════════════════════════════════════════════════════════════════════ */

export const contacto = {
  antetitulo: "Contacto institucional",
  titulo: "Hablemos",
  lead: "Para propuestas de cooperación, convenios o solicitudes de información institucional.",
  correo: identidad.correo,
  telefono: "", // PENDIENTE: teléfono institucional en formato internacional
  direccion: "", // PENDIENTE: dirección de notificación judicial, si se publica
  redes: [] as { id: string; label: string; href: string }[],
};
