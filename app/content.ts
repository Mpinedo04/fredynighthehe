/**
 * PREMIERE 22 · CONTENIDO
 * Todos los textos, listas y datos de la web viven aquí, separados del
 * diseño. Cambiar una frase no requiere tocar ningún componente.
 */

export const credits = [
  {
    name: "Dirección",
    detail: "Idea, tono y puesta en escena",
    image: "/archive/roles/direction.webp",
    alt: "Rig profesional de cámara",
  },
  {
    name: "Cámara",
    detail: "Encuadre, óptica y movimiento",
    image: "/archive/roles/camera.webp",
    alt: "Cámara cinematográfica Blackmagic",
  },
  {
    name: "Sonido",
    detail: "Captura, ambiente y pulso",
    image: "/archive/roles/sound.webp",
    alt: "Grabadora de sonido profesional",
  },
  {
    name: "Iluminación",
    detail: "Contraste, textura y atmósfera",
    image: "/archive/roles/light.webp",
    alt: "Estudio audiovisual con focos y cámaras",
  },
  {
    name: "Montaje",
    detail: "Ritmo, estructura y toma final",
    image: "/archive/roles/edit.webp",
    alt: "Monitor profesional de producción",
  },
  {
    name: "Color",
    detail: "DaVinci, intención y acabado",
    image: "/archive/roles/color.webp",
    alt: "Símbolo de DaVinci Resolve",
  },
  {
    name: "Producción",
    detail: "Equipo, logística y soluciones",
    image: "/archive/roles/production.webp",
    alt: "Cámara montada sobre estabilizador",
  },
  {
    name: "Interpretación",
    detail: "Presencia, personaje y escena",
    image: "/archive/roles/performance.webp",
    alt: "Raúl actuando sobre un escenario",
  },
  {
    name: "Música",
    detail: "Voz, escucha y diseño rítmico",
    image: "/archive/roles/music.webp",
    alt: "Micrófono de estudio",
  },
  {
    name: "Creatividad",
    detail: "La idea que conecta todo",
    image: "/archive/roles/creativity.webp",
    alt: "Raúl sosteniendo algodón de azúcar durante un rodaje",
  },
] as const;

/**
 * TESTIMONIOS DEL REPARTO · cómo rellenarlos
 * ------------------------------------------
 * Cambia `name` por el nombre real, escribe la frase en `quote` y pon
 * `pending: false`. Mientras `pending` sea true, la ficha se muestra como
 * «TOMA PENDIENTE» con una claqueta, sin frases de relleno a la vista.
 * Las fotos viven en /public/archive (puedes sustituirlas por otras).
 */
export type FriendTestimonial = {
  number: string;
  name: string;
  role: string;
  quote: string;
  image: string;
  alt: string;
  pending: boolean;
};

export const friendTestimonials: FriendTestimonial[] = [
  {
    number: "01",
    name: "NOMBRE DEL AMIGO 01",
    role: "AYUDANTE DE DIRECCIÓN EMOCIONAL",
    quote:
      "Aquí irá ese mensaje que consigue hacerte reír y emocionarte en la misma frase.",
    image: "/archive/friends-01.webp",
    alt: "Raúl conversando con su equipo durante un evento",
    pending: true,
  },
  {
    number: "02",
    name: "NOMBRE DEL AMIGO 02",
    role: "PRODUCTOR DE MOMENTOS ABSURDOS",
    quote:
      "Testigo oficial de ideas que empezaron como una broma y terminaron teniendo créditos.",
    image: "/archive/friends-02.webp",
    alt: "Raúl y su equipo en un festival de cortometrajes",
    pending: true,
  },
  {
    number: "03",
    name: "NOMBRE DEL AMIGO 03",
    role: "TÉCNICO DE RECUERDOS",
    quote: "Responsable de conservar las tomas que nunca deberían borrarse.",
    image: "/archive/friends-03.webp",
    alt: "Equipo de Raúl celebrando junto en un parque",
    pending: true,
  },
  {
    number: "04",
    name: "NOMBRE DEL AMIGO 04",
    role: "AMIGO RECURRENTE",
    quote: "Presente desde la primera temporada. Renovado indefinidamente.",
    image: "/archive/friends-04.webp",
    alt: "Rodaje de una escena en una cocina",
    pending: true,
  },
];

export const projects = [
  {
    title: "EL PAN TA’ DURO",
    code: "P01",
    kind: "Parodia de la parodia · InstaStories",
    year: "01 MAR 2021",
    duration: "02:22",
    videoId: "_XADAh8xvbw",
    thumbnail: "/youtube/el-pan-ta-duro.webp",
    role: "La prehistoria oficial: humor, móvil en vertical y la prueba de que una broma también merece montaje.",
    color: "red",
  },
  {
    title: "WTF EL DOCUMENTAL",
    code: "P02",
    kind: "Documental · trabajo de síntesis",
    year: "06 NOV 2022",
    duration: "14:33",
    videoId: "zBXT3ObzWbg",
    thumbnail: "/youtube/wtf-documental.webp",
    role: "Catorce minutos de proyecto final, entrevistas y realidad pasada por la mesa de montaje.",
    color: "blue",
  },
  {
    title: "CORAZÓN INTACTO",
    code: "P03",
    kind: "Cortometraje · Festival Metropolis XVII",
    year: "09 NOV 2022",
    duration: "05:05",
    videoId: "fRHjDz_n-bk",
    thumbnail: "/youtube/corazon-intacto.webp",
    role: "Cinco minutos para demostrar que la sensibilidad también se ilumina, se encuadra y se monta.",
    color: "violet",
  },
  {
    title: "CATARSIS",
    code: "P04",
    kind: "Cortometraje",
    year: "27 MAY 2023",
    duration: "09:29",
    videoId: "lBw1lPJprK4",
    thumbnail: "/youtube/catarsis.webp",
    role: "Cuando crear también sirve para decir lo que cuesta. Nueve minutos de atmósfera y verdad.",
    color: "amber",
  },
  {
    title: "Imágenes Ocultas",
    code: "48H",
    kind: "Selección oficial · Festival de Curtmetratges de L’Hospitalet",
    year: "17 DIC 2023",
    duration: "05:05",
    videoId: "0reV7bmrZts",
    thumbnail: "/youtube/imagenes-ocultas.webp",
    role: "Rodado en 48 horas y seleccionado oficialmente. Cero excusas, mucha intensidad y más de una mirada que lo dice todo.",
    color: "special",
  },
  {
    title: "DAVINCI",
    code: "P06",
    kind: "Parodia de Picky · videoclip",
    year: "21 DIC 2023",
    duration: "03:17",
    videoId: "DnFRuyQgcsE",
    thumbnail: "/youtube/davinci.webp",
    role: "Una parodia hecha videoclip: interpretación, música y precisión técnica con alma de experimento.",
    color: "blue",
  },
  {
    title: "QUE CALOREH",
    code: "P07",
    kind: "Parodia de Espresso Macchiato",
    year: "14 JUL 2025",
    duration: "02:51",
    videoId: "PBrqAnVZn78",
    thumbnail: "/youtube/que-caloreh.webp",
    role: "La prueba más reciente de que hasta una ola de calor puede tener estribillo, personaje y videoclip.",
    color: "red",
  },
];

export const dossier = [
  ["Creatividad", "100%"],
  ["Perfeccionismo", "97%"],
  ["Sentimentalismo oculto", "89%"],
  ["Capacidad para hacerlo todo", "96%"],
];

export const trailerScenes = [
  {
    number: "01",
    theme: "archive",
    eyebrow: "ARCHIVO REAL · 7 PRODUCCIONES",
    title: "DE LA CÁMARA AL CORTE",
    body:
      "Rodajes, parodias y cortometrajes pasan por la mesa de montaje. Cada imagen es una pieza real del recorrido de Raúl.",
    mainImage: "/youtube/imagenes-ocultas.webp",
    mainAlt: "Fotograma del cortometraje Imágenes Ocultas",
    cutImages: [
      {
        src: "/archive/dossier-camera.webp",
        alt: "Raúl trabajando detrás de una cámara",
        label: "RODAJE",
      },
      {
        src: "/youtube/davinci.webp",
        alt: "Miniatura del videoclip DaVinci",
        label: "MONTAJE",
      },
    ],
    timecode: "00:00:01:22",
    camera: "A-CAM · 35 MM",
    note: "SELECCIÓN OFICIAL · 48H",
  },
  {
    number: "02",
    theme: "rhythm",
    eyebrow: "RITMO · CINE · MICROTONAL · TERROR",
    title: "LAS OBSESIONES CAMBIAN EL MONTAJE",
    body:
      "Michael Jackson marca el pulso; Spielberg convierte el asombro en puesta en escena; la música microtonal abre notas nuevas y los animatrónicos invaden el fuera de campo.",
    mainImage: "/michael/michael-jackson-1988.jpg",
    mainAlt: "Michael Jackson actuando en directo en 1988",
    cutImages: [
      {
        src: "/michael/michael-jackson-publicity-1984.jpg",
        alt: "Retrato promocional de Michael Jackson",
        label: "RITMO",
      },
      {
        src: "/archive/hero-stage.webp",
        alt: "Raúl actuando sobre un escenario",
        label: "ESCENA",
      },
    ],
    timecode: "00:00:08:08",
    camera: "B-CAM · 50 MM",
    note: "CORTE AL COMPÁS · 24 TET",
  },
  {
    number: "03",
    theme: "signal",
    eyebrow: "SEÑAL RECUPERADA · CÁMARA 05",
    title: "EL ARCHIVO DEVUELVE LA MIRADA",
    body:
      "La imagen se degrada, aparecen cuatro unidades fuera de su zona y el montaje deja de documentar la historia: ahora intenta advertirte.",
    mainImage: "/animatronics/ursus-9.webp",
    mainAlt: "Animatrónico Ursus 9 observado por una cámara de seguridad",
    cutImages: [
      {
        src: "/animatronics/vulpes-x.webp",
        alt: "Animatrónico Vulpes X",
        label: "CAM 03",
      },
      {
        src: "/animatronics/avis-3.webp",
        alt: "Animatrónico Avis 3",
        label: "CAM 05",
      },
    ],
    timecode: "00:00:15:05",
    camera: "CCTV · IR NIGHT",
    note: "MOVIMIENTO DETECTADO",
  },
  {
    number: "22",
    theme: "executable",
    eyebrow: "ÚLTIMO CORTE · ACCESO RESTRINGIDO",
    title: "M00NW4LK.EXE ESPERA AL OTRO LADO",
    body:
      "El sombrero cae. El cuerpo sigue de espaldas. La cabeza gira demasiado. Lee el material recuperado antes de abrir el pasadizo.",
    mainImage: "/animatronics/velvet-r.webp",
    mainAlt: "Animatrónico Velvet R emergiendo de la oscuridad",
    cutImages: [
      {
        src: "/models/subject-m22-materials/high/face-basecolor.png",
        alt: "Archivo facial de la unidad M22",
        label: "SUJETO M22",
      },
      {
        src: "/archive/trailer-shoot.webp",
        alt: "Equipo rodando una escena",
        label: "ÚLTIMA TOMA",
      },
    ],
    timecode: "00:00:22:00",
    camera: "SIN SEÑAL · ?? MM",
    note: "NO EJECUTAR SIN LEER",
  },
] as const;

export const cameraFeeds = [
  {
    camera: "CAM 01",
    room: "ESCENARIO",
    description: "Tres siluetas en escena. Una ya no mira al público.",
    evidence: "FOTOGRAMA 001 · SOMBRERO DETECTADO",
    threat: "BAJA",
  },
  {
    camera: "CAM 02",
    room: "COMEDOR",
    description: "Las mesas están vacías. Hay un plato recién movido.",
    evidence: "FOTOGRAMA 017 · OBJETO DESPLAZADO",
    threat: "MEDIA",
  },
  {
    camera: "CAM 03",
    room: "PASILLO OESTE",
    description: "Movimiento detectado a 4,2 metros de la oficina.",
    evidence: "FOTOGRAMA 022 · ROSTRO SIN CLASIFICAR",
    threat: "CRÍTICA",
  },
  {
    camera: "CAM 04",
    room: "SERVICIO",
    description: "Unidad animatrónica fuera de su punto de carga.",
    evidence: "FOTOGRAMA 031 · CARGADOR VACÍO",
    threat: "ALTA",
  },
  {
    camera: "CAM 05",
    room: "CONDUCTOS",
    description: "Ruido metálico avanzando por la ventilación.",
    evidence: "AUDIO 05-B · 148 PULSOS/MIN",
    threat: "CRÍTICA",
  },
  {
    camera: "CAM 06",
    room: "OFICINA 22",
    description: "Energía estable. Puertas sin bloquear.",
    evidence: "SEÑAL LOCAL · NO ESTÁS SOLO",
    threat: "DENTRO",
  },
];

export const microSteps = Array.from({ length: 24 }, (_, index) => ({
  number: String(index + 1).padStart(2, "0"),
  cents: Math.round((1200 / 24) * index),
}));

export const microtonalTracks = [
  {
    title: "FULL PERFORMANCE",
    subtitle: "Live on KEXP · Trans Musicales 2025",
    videoId: "0Ssi-9wS1so",
    tuning: "27:53 · SESIÓN COMPLETA",
  },
  {
    title: "SARNIEZZ",
    subtitle: "Live on KEXP · vídeo individual",
    videoId: "t7OIc-DBRXM",
    tuning: "MICROTONAL · LIVE",
  },
  {
    title: "MATA ZYKLEK",
    subtitle: "Live on KEXP · vídeo individual",
    videoId: "Te1HkBx7rDw",
    tuning: "MICROTONAL · LIVE",
  },
];

export const behindFrames = [
  {
    code: "01A",
    title: "GRABANDO",
    caption: "Rodaje real · cámara y actores en localización",
    image: "/archive/trailer-shoot.webp",
  },
  {
    code: "02B",
    title: "EN CABINA",
    caption: "Raaulinhoo · control, referencias y montaje",
    image: "/archive/dossier-studio.webp",
  },
  {
    code: "03C",
    title: "CON SU GENTE",
    caption: "Festival · equipo y selección oficial",
    image: "/archive/friends-02.webp",
  },
  {
    code: "04D",
    title: "TOMA FALSA",
    caption: "Que Caloreh · utilería con azúcar",
    image: "/archive/channel-avatar.webp",
  },
  {
    code: "05E",
    title: "MONTANDO",
    caption: "Monitorización · cámara, rig y precisión",
    image: "/archive/dossier-camera.webp",
  },
];

export const recoveredFragments = [
  {
    code: "REC-00",
    title: "INFORME DE INCIDENCIA",
    body: "A las 02:22 la cámara del conducto registró pasos que no coincidían con ningún empleado.",
  },
  {
    code: "REC-01",
    title: "FOTOGRAMA CORRUPTO",
    body: "La figura avanza de espaldas. El reflejo, sin embargo, está mirando directamente al objetivo.",
  },
  {
    code: "REC-02",
    title: "TRANSCRIPCIÓN DE AUDIO",
    body: "Tres golpes, un arrastre metálico y una respiración que se sincroniza con el operador de cámara.",
  },
  {
    code: "REC-03",
    title: "RUTA NO AUTORIZADA",
    body: "El plano conduce a M00NW4LK.EXE. Los pasillos cambian cada vez que alguien abre el archivo.",
  },
  {
    code: "REC-04",
    title: "ADVERTENCIA FINAL",
    body: "Si el sombrero cae al suelo, no esperes a que la cabeza termine de girar. Corre.",
  },
] as const;

export const animatronicArchive = [
  {
    name: "FREDDY",
    code: "FZ-01",
    source: "SPECIAL DELIVERY",
    audio: "/audio/fnaf-authentic/freddy.ogg",
  },
  {
    name: "BONNIE",
    code: "BN-02",
    source: "SPECIAL DELIVERY",
    audio: "/audio/fnaf-authentic/bonnie.ogg",
  },
  {
    name: "CHICA",
    code: "CH-03",
    source: "SPECIAL DELIVERY",
    audio: "/audio/fnaf-authentic/chica.ogg",
  },
  {
    name: "FOXY",
    code: "FX-04",
    source: "SPECIAL DELIVERY",
    audio: "/audio/fnaf-authentic/foxy.ogg",
  },
  {
    name: "GOLDEN FREDDY",
    code: "GF-05",
    source: "FNAF 1",
    audio: "/audio/fnaf-authentic/golden-freddy.ogg",
  },
  {
    name: "SPRINGTRAP",
    code: "ST-06",
    source: "FNAF 3",
    audio: "/audio/fnaf-authentic/springtrap.ogg",
  },
  {
    name: "PUPPET",
    code: "PP-07",
    source: "FNAF 2 · MUSIC BOX",
    audio: "/audio/fnaf-authentic/fnaf2-scream.ogg",
    intro: "/audio/fnaf-authentic/puppet-music-box.ogg",
    introDelayMs: 620,
  },
  {
    name: "MANGLE",
    code: "MG-08",
    source: "FNAF 2 · RADIO",
    audio: "/audio/fnaf-authentic/fnaf2-scream.ogg",
    intro: "/audio/fnaf-authentic/mangle-static.ogg",
    introDelayMs: 760,
  },
] as const;

export const michaelEras = [
  {
    name: "OFF THE WALL",
    year: "1979",
    cue: "GROOVE",
    detail:
      "El cuerpo manda: bajo, síncopa y una puesta en escena que parece espontánea porque está medida al milímetro.",
  },
  {
    name: "THRILLER",
    year: "1982",
    cue: "CORTOMETRAJE",
    detail:
      "La canción se convierte en cine. Personaje, coreografía, maquillaje y montaje trabajan como una sola máquina.",
  },
  {
    name: "BAD",
    year: "1987",
    cue: "SILUETA",
    detail:
      "Negro, metal y contraluz: una identidad visual reconocible incluso cuando el artista es apenas una sombra.",
  },
  {
    name: "DANGEROUS",
    year: "1991",
    cue: "PRECISIÓN",
    detail:
      "Ritmos más duros, escenarios monumentales y coreografías que usan cada golpe como un corte de edición.",
  },
  {
    name: "HIStory",
    year: "1995",
    cue: "ESCALA",
    detail:
      "El videoclip como manifiesto: iconografía gigantesca, tensión industrial y espectáculo pensado para una pantalla enorme.",
  },
] as const;

export const spielbergFilms = [
  { year: "1964", title: "FIRELIGHT", motif: "PRIMER CONTACTO", craft: "CIENCIA FICCIÓN ARTESANAL" },
  { year: "1971", title: "DUEL", motif: "AMENAZA SIN ROSTRO", craft: "SUSPENSE EN CARRETERA" },
  { year: "1974", title: "THE SUGARLAND EXPRESS", motif: "HUIDA Y FAMILIA", craft: "ROAD MOVIE" },
  { year: "1975", title: "JAWS", motif: "LO QUE NO SE VE", craft: "SUSPENSE Y PUNTO DE VISTA" },
  { year: "1977", title: "CLOSE ENCOUNTERS", motif: "ASOMBRO CÓSMICO", craft: "LUZ, SONIDO Y SILUETA" },
  { year: "1979", title: "1941", motif: "CAOS COREOGRAFIADO", craft: "COMEDIA BÉLICA" },
  { year: "1981", title: "RAIDERS OF THE LOST ARK", motif: "AVENTURA PURA", craft: "SERIAL CLÁSICO" },
  { year: "1982", title: "E.T.", motif: "INFANCIA Y ASOMBRO", craft: "CÁMARA A LA ALTURA DEL NIÑO" },
  { year: "1983", title: "TWILIGHT ZONE", motif: "SEGUNDA INFANCIA", craft: "CUENTO FANTÁSTICO" },
  { year: "1984", title: "TEMPLE OF DOOM", motif: "AVENTURA OSCURA", craft: "SET PIECES ENCADENADAS" },
  { year: "1985", title: "THE COLOR PURPLE", motif: "INTIMIDAD Y RESISTENCIA", craft: "DRAMA HUMANO" },
  { year: "1987", title: "EMPIRE OF THE SUN", motif: "INFANCIA EN LA GUERRA", craft: "ÉPICA ÍNTIMA" },
  { year: "1989", title: "THE LAST CRUSADE", motif: "PADRE E HIJO", craft: "COMEDIA DE AVENTURAS" },
  { year: "1989", title: "ALWAYS", motif: "AMOR Y MEMORIA", craft: "ROMANCE FANTÁSTICO" },
  { year: "1991", title: "HOOK", motif: "CRECER SIN OLVIDAR", craft: "FANTASÍA ESCÉNICA" },
  { year: "1993", title: "JURASSIC PARK", motif: "ASOMBRO Y PELIGRO", craft: "EFECTOS FÍSICOS + DIGITALES" },
  { year: "1993", title: "SCHINDLER'S LIST", motif: "MEMORIA HISTÓRICA", craft: "BLANCO Y NEGRO DOCUMENTAL" },
  { year: "1997", title: "THE LOST WORLD", motif: "NATURALEZA DESATADA", craft: "PERSECUCIÓN Y ESCALA" },
  { year: "1997", title: "AMISTAD", motif: "JUSTICIA Y TESTIMONIO", craft: "DRAMA HISTÓRICO" },
  { year: "1998", title: "SAVING PRIVATE RYAN", motif: "INMERSIÓN BÉLICA", craft: "CÁMARA EN EL FRENTE" },
  { year: "2001", title: "A.I.", motif: "INFANCIA ARTIFICIAL", craft: "CUENTO FUTURISTA" },
  { year: "2002", title: "MINORITY REPORT", motif: "FUTURO TÁCTIL", craft: "THRILLER DE VIGILANCIA" },
  { year: "2002", title: "CATCH ME IF YOU CAN", motif: "JUEGO Y SOLEDAD", craft: "MONTAJE ÁGIL" },
  { year: "2004", title: "THE TERMINAL", motif: "HUMANIDAD EN TRÁNSITO", craft: "FÁBULA CORAL" },
  { year: "2005", title: "WAR OF THE WORLDS", motif: "FAMILIA BAJO ATAQUE", craft: "CAOS SUBJETIVO" },
  { year: "2005", title: "MUNICH", motif: "VIOLENCIA Y CONSECUENCIA", craft: "THRILLER MORAL" },
  { year: "2008", title: "KINGDOM OF THE CRYSTAL SKULL", motif: "AVENTURA ATÓMICA", craft: "SERIAL PULP" },
  { year: "2011", title: "THE ADVENTURES OF TINTIN", motif: "CÁMARA IMPOSIBLE", craft: "PERFORMANCE CAPTURE" },
  { year: "2011", title: "WAR HORSE", motif: "ÉPICA CLÁSICA", craft: "PAISAJE Y EMOCIÓN" },
  { year: "2012", title: "LINCOLN", motif: "EL PODER DE LA PALABRA", craft: "DRAMA POLÍTICO" },
  { year: "2015", title: "BRIDGE OF SPIES", motif: "HOMBRES EN LA FRONTERA", craft: "CLASICISMO DE ESPÍAS" },
  { year: "2016", title: "THE BFG", motif: "ASOMBRO GIGANTE", craft: "FANTASÍA DIGITAL" },
  { year: "2017", title: "THE POST", motif: "PRENSA CONTRA PODER", craft: "URGENCIA PERIODÍSTICA" },
  { year: "2018", title: "READY PLAYER ONE", motif: "MUNDO DENTRO DEL MUNDO", craft: "PRODUCCIÓN VIRTUAL" },
  { year: "2021", title: "WEST SIDE STORY", motif: "MOVIMIENTO Y COLOR", craft: "MUSICAL CINÉTICO" },
  { year: "2022", title: "THE FABELMANS", motif: "CINE COMO MEMORIA", craft: "AUTOBIOGRAFÍA FILMADA" },
  { year: "2026", title: "DISCLOSURE DAY", motif: "LA VERDAD EN EL CIELO", craft: "CONTACTO CONTEMPORÁNEO" },
] as const;

export const spielbergMethod = [
  ["01", "MIRADA", "La cámara descubre la maravilla a través de los ojos del personaje."],
  ["02", "BLOQUEO", "Actores y cámara se mueven juntos; el plano explica antes que el diálogo."],
  ["03", "LUZ", "Contraluces, haces y siluetas convierten lo cotidiano en un acontecimiento."],
  ["04", "EFECTOS", "Lo físico da una reacción real; lo digital amplía aquello que ya está en el set."],
  ["05", "MÚSICA", "La melodía conduce la emoción y transforma el montaje en recuerdo."],
  ["06", "CORAZÓN", "La escala siempre descansa sobre una familia, una amistad o una decisión moral."],
] as const;

export const heeButtonLabels = [
  "SILENCIAR EL HEE-HEE",
  "CASI. PRUEBA OTRA VEZ",
  "¿DE VERDAD QUIERES PARARLO?",
  "NO PUEDES HUIR DEL RITMO",
  "ÚLTIMO INTENTO… CREEMOS",
  "AHORA SÍ: SILENCIAR",
];

export const heeDelayForDepth = (depth: number) => {
  const normalized = Math.max(0, Math.min(1, depth));
  if (normalized <= 0.5) {
    // At 50% this already reaches the old end-of-page maximum: 650 ms.
    return Math.round(4200 - (normalized / 0.5) * 3550);
  }
  // The second half keeps accelerating until it becomes deliberately absurd.
  return Math.round(650 - ((normalized - 0.5) / 0.5) * 470);
};

export const heeMultiplierForDepth = (depth: number) => {
  if (depth >= 0.92) return 8;
  if (depth >= 0.76) return 4;
  if (depth >= 0.58) return 2;
  return 1;
};

/** The film strip in the topbar: one frame per scene of the premiere. */
export const scenes = [
  { id: "premiere", number: "01", label: "PREMIERE" },
  { id: "reparto", number: "02", label: "REPARTO" },
  { id: "filmografia", number: "03", label: "VIDEOTECA" },
  { id: "detras", number: "04", label: "DETRÁS" },
  { id: "expediente", number: "05", label: "EXPEDIENTE" },
  { id: "referentes", number: "06", label: "REFERENTES" },
  { id: "amigos", number: "07", label: "AMIGOS" },
  { id: "escena-22", number: "08", label: "CORTE 22" },
  { id: "final", number: "09", label: "FINAL" },
] as const;

export type WorldId = "mj" | "spielberg" | "fnaf" | "micro";

export const worlds: ReadonlyArray<{
  id: WorldId;
  number: string;
  title: string;
  subtitle: string;
  image?: string;
}> = [
  { id: "mj", number: "01", title: "MICHAEL JACKSON", subtitle: "RITMO · ESPECTÁCULO", image: "/michael/michael-jackson-publicity-1984.jpg" },
  { id: "spielberg", number: "02", title: "STEVEN SPIELBERG", subtitle: "ASOMBRO · 37 PELÍCULAS" },
  { id: "fnaf", number: "03", title: "FIVE NIGHTS", subtitle: "TERROR · TURNO DE NOCHE", image: "/animatronics/ursus-9.webp" },
  { id: "micro", number: "04", title: "24 TET", subtitle: "ANGINE DE POITRINE" },
];

/** Redacted lines of the dossier: click the black bar to declassify. */
export const dossierRedactions = [
  { label: "TOMAS NECESARIAS PARA DARLA POR BUENA", secret: "Una más. Siempre una más." },
  { label: "HORAS DE SUEÑO EN SEMANA DE RODAJE", secret: "Dato no recuperable." },
  { label: "PELÍCULA QUE LE HACE LLORAR", secret: "Todas las de Spielberg. Lo niega." },
  { label: "CONTRASEÑA DEL DISCO DURO", secret: "hee-hee (no se lo digas)." },
] as const;
