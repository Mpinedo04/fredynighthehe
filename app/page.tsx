"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import SecretExtras from "./SecretExtras";

const credits = [
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

const friendTestimonials = [
  {
    number: "01",
    role: "AYUDANTE DE DIRECCIÓN EMOCIONAL",
    quote:
      "Aquí irá ese mensaje que consigue hacerte reír y emocionarte en la misma frase.",
    image: "/archive/friends-01.webp",
    alt: "Raúl conversando con su equipo durante un evento",
  },
  {
    number: "02",
    role: "PRODUCTOR DE MOMENTOS ABSURDOS",
    quote:
      "Testigo oficial de ideas que empezaron como una broma y terminaron teniendo créditos.",
    image: "/archive/friends-02.webp",
    alt: "Raúl y su equipo en un festival de cortometrajes",
  },
  {
    number: "03",
    role: "TÉCNICO DE RECUERDOS",
    quote:
      "Responsable de conservar las tomas que nunca deberían borrarse.",
    image: "/archive/friends-03.webp",
    alt: "Equipo de Raúl celebrando junto en un parque",
  },
  {
    number: "04",
    role: "AMIGO RECURRENTE",
    quote:
      "Presente desde la primera temporada. Renovado indefinidamente.",
    image: "/archive/friends-04.webp",
    alt: "Rodaje de una escena en una cocina",
  },
] as const;

const projects = [
  {
    title: "EL PAN TA’ DURO",
    code: "P01",
    kind: "Parodia de la parodia · InstaStories",
    year: "01 MAR 2021",
    duration: "02:22",
    videoId: "_XADAh8xvbw",
    thumbnail: "/youtube/el-pan-ta-duro.jpg",
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
    thumbnail: "/youtube/wtf-documental.jpg",
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
    thumbnail: "/youtube/corazon-intacto.jpg",
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
    thumbnail: "/youtube/catarsis.jpg",
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
    thumbnail: "/youtube/imagenes-ocultas.jpg",
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
    thumbnail: "/youtube/davinci.jpg",
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
    thumbnail: "/youtube/que-caloreh.jpg",
    role: "La prueba más reciente de que hasta una ola de calor puede tener estribillo, personaje y videoclip.",
    color: "red",
  },
];

const dossier = [
  ["Creatividad", "100%"],
  ["Perfeccionismo", "97%"],
  ["Sentimentalismo oculto", "89%"],
  ["Capacidad para hacerlo todo", "96%"],
];

const trailerScenes = [
  {
    number: "01",
    theme: "archive",
    eyebrow: "ARCHIVO REAL · 7 PRODUCCIONES",
    title: "DE LA CÁMARA AL CORTE",
    body:
      "Rodajes, parodias y cortometrajes pasan por la mesa de montaje. Cada imagen es una pieza real del recorrido de Raúl.",
    mainImage: "/youtube/imagenes-ocultas.jpg",
    mainAlt: "Fotograma del cortometraje Imágenes Ocultas",
    cutImages: [
      {
        src: "/archive/dossier-camera.webp",
        alt: "Raúl trabajando detrás de una cámara",
        label: "RODAJE",
      },
      {
        src: "/youtube/davinci.jpg",
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
      "Michael Jackson marca el pulso; Nolan rompe el tiempo; la música microtonal abre notas nuevas y los animatrónicos invaden el fuera de campo.",
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
        src: "/models/subject-m22-face-v2.png",
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

const cameraFeeds = [
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

const microSteps = Array.from({ length: 24 }, (_, index) => ({
  number: String(index + 1).padStart(2, "0"),
  cents: Math.round((1200 / 24) * index),
}));

const microtonalTracks = [
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

const behindFrames = [
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

const recoveredFragments = [
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

const animatronicArchive = [
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

const michaelEras = [
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

const nolanFilms = [
  { year: "1998", title: "FOLLOWING", device: "ORDEN FRAGMENTADO", format: "16 MM" },
  { year: "2000", title: "MEMENTO", device: "MEMORIA INVERSA", format: "35 MM" },
  { year: "2002", title: "INSOMNIA", device: "TIEMPO SUBJETIVO", format: "35 MM" },
  { year: "2005", title: "BATMAN BEGINS", device: "ORIGEN Y MIEDO", format: "35 MM" },
  { year: "2006", title: "THE PRESTIGE", device: "TRES ACTOS / TRUCO", format: "35 MM" },
  { year: "2008", title: "THE DARK KNIGHT", device: "ESCALADA PARALELA", format: "IMAX + 35 MM" },
  { year: "2010", title: "INCEPTION", device: "CAPAS DE SUEÑO", format: "65 + 35 MM" },
  { year: "2012", title: "THE DARK KNIGHT RISES", device: "ESCALA CRUZADA", format: "IMAX + 35 MM" },
  { year: "2014", title: "INTERSTELLAR", device: "RELATIVIDAD", format: "IMAX 65 MM" },
  { year: "2017", title: "DUNKIRK", device: "SEMANA / DÍA / HORA", format: "IMAX 65 MM" },
  { year: "2020", title: "TENET", device: "INVERSIÓN", format: "IMAX 65 MM" },
  { year: "2023", title: "OPPENHEIMER", device: "FISIÓN / FUSIÓN", format: "IMAX B&N + COLOR" },
  { year: "2026", title: "THE ODYSSEY", device: "REGRESO ÉPICO", format: "100% IMAX FILM" },
] as const;

const nolanMethod = [
  ["01", "REGLA", "Una idea temporal clara gobierna la película."],
  ["02", "PELÍCULA", "Gran formato fotoquímico para conservar textura y escala."],
  ["03", "REALIDAD", "Localizaciones, vehículos y efectos prácticos siempre que es posible."],
  ["04", "MONTAJE", "Líneas simultáneas se tensan mediante montaje paralelo."],
  ["05", "SALA", "Imagen y sonido se diseñan para sentirse físicamente."],
] as const;

const heeButtonLabels = [
  "SILENCIAR EL HEE-HEE",
  "CASI. PRUEBA OTRA VEZ",
  "¿DE VERDAD QUIERES PARARLO?",
  "NO PUEDES HUIR DEL RITMO",
  "ÚLTIMO INTENTO… CREEMOS",
  "AHORA SÍ: SILENCIAR",
];

const heeDelayForDepth = (depth: number) => {
  const normalized = Math.max(0, Math.min(1, depth));
  if (normalized <= 0.5) {
    // At 50% this already reaches the old end-of-page maximum: 650 ms.
    return Math.round(4200 - (normalized / 0.5) * 3550);
  }
  // The second half keeps accelerating until it becomes deliberately absurd.
  return Math.round(650 - ((normalized - 0.5) / 0.5) * 470);
};

const heeMultiplierForDepth = (depth: number) => {
  if (depth >= 0.92) return 8;
  if (depth >= 0.76) return 4;
  if (depth >= 0.58) return 2;
  return 1;
};

export default function Home() {
  const [started, setStarted] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const [selectedProject, setSelectedProject] = useState(4);
  const [mjAnswer, setMjAnswer] = useState(false);
  const [mjEra, setMjEra] = useState(2);
  const [countdown, setCountdown] = useState(10);
  const [nolanFilm, setNolanFilm] = useState(nolanFilms.length - 1);
  const [recovered, setRecovered] = useState(false);
  const [recoveredStep, setRecoveredStep] = useState(0);
  const [materialRead, setMaterialRead] = useState(false);
  const [trailerOpen, setTrailerOpen] = useState(false);
  const [trailerScene, setTrailerScene] = useState(0);
  const [trailerPaused, setTrailerPaused] = useState(false);
  const [activeVideo, setActiveVideo] = useState<number | null>(null);
  const [cameraFeed, setCameraFeed] = useState(0);
  const [microActive, setMicroActive] = useState<number | null>(null);
  const [microTrack, setMicroTrack] = useState(0);
  const [screamActive, setScreamActive] = useState<number | null>(null);
  const [chaseOpen, setChaseOpen] = useState(false);
  const [chasePhase, setChasePhase] = useState(0);
  const [scrollDepth, setScrollDepth] = useState(0);
  const [scrollBand, setScrollBand] = useState(0);
  const [heeReady, setHeeReady] = useState(false);
  const [heeMuted, setHeeMuted] = useState(false);
  const [muteAttempts, setMuteAttempts] = useState(0);
  const [clapped, setClapped] = useState(false);
  const [postCredits, setPostCredits] = useState(false);
  const [secretExclusive, setSecretExclusive] = useState(false);
  const scrollDepthRef = useRef(0);
  const heeAudioRef = useRef<Set<HTMLAudioElement>>(new Set());
  const heeBurstTimersRef = useRef<Set<number>>(new Set());
  const jumpscareAudioRef = useRef<HTMLAudioElement | null>(null);
  const signatureAudioRef = useRef<HTMLAudioElement | null>(null);
  const jumpscareTimerRef = useRef<number | null>(null);
  const audioRef = useRef<{
    context: AudioContext;
    gain: GainNode;
    timer: number;
    sources: Set<AudioScheduledSourceNode>;
  } | null>(null);

  const playHee = useCallback(() => {
    if (heeMuted || secretExclusive || typeof window === "undefined") return;

    const depth = scrollDepthRef.current;
    const multiplier = heeMultiplierForDepth(depth);
    const baseVolume = Math.min(0.18 + depth * 0.72, 0.9);
    const stagger = Math.max(28, Math.round(105 - depth * 70));

    Array.from({ length: multiplier }, (_, index) => {
      const playLayer = () => {
        // A hard ceiling keeps the prank intense without exhausting the tab.
        if (heeAudioRef.current.size >= 48) return;
        const sample = new Audio("/audio/michael-jackson-hee-hee.mp3");
        sample.preload = "auto";
        sample.volume = Math.min(
          0.9,
          baseVolume * (multiplier >= 4 ? 0.82 : 1),
        );
        sample.playbackRate =
          0.96 + ((index % 5) - 2) * 0.025 + depth * 0.035;
        heeAudioRef.current.add(sample);

        const releaseSample = () => {
          heeAudioRef.current.delete(sample);
        };

        sample.addEventListener("ended", releaseSample, { once: true });
        sample.addEventListener("error", releaseSample, { once: true });
        void sample.play().catch(releaseSample);
      };

      if (index === 0) {
        playLayer();
        return;
      }

      const timer = window.setTimeout(() => {
        heeBurstTimersRef.current.delete(timer);
        playLayer();
      }, index * stagger);
      heeBurstTimersRef.current.add(timer);
    });
  }, [heeMuted, secretExclusive]);

  useEffect(() => {
    if (!secretExclusive) return;
    heeBurstTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    heeBurstTimersRef.current.clear();
    heeAudioRef.current.forEach((sample) => {
      sample.pause();
      sample.currentTime = 0;
    });
    heeAudioRef.current.clear();
  }, [secretExclusive]);

  useEffect(() => {
    const preload = new Audio("/audio/michael-jackson-hee-hee.mp3");
    preload.preload = "auto";
    preload.load();
    return () => {
      heeAudioRef.current.forEach((sample) => {
        sample.pause();
        sample.currentTime = 0;
      });
      heeAudioRef.current.clear();
      heeBurstTimersRef.current.forEach((timer) => window.clearTimeout(timer));
      heeBurstTimersRef.current.clear();
      jumpscareAudioRef.current?.pause();
      jumpscareAudioRef.current = null;
      signatureAudioRef.current?.pause();
      signatureAudioRef.current = null;
      if (jumpscareTimerRef.current !== null) {
        window.clearTimeout(jumpscareTimerRef.current);
        jumpscareTimerRef.current = null;
      }
      const soundtrack = audioRef.current;
      if (soundtrack) {
        window.clearInterval(soundtrack.timer);
        soundtrack.sources.forEach((source) => {
          try {
            source.stop();
          } catch {
            // The source has already finished.
          }
        });
        void soundtrack.context.close();
        audioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const updateScrollDepth = () => {
      const available =
        document.documentElement.scrollHeight - window.innerHeight;
      const depth = available > 0 ? Math.min(window.scrollY / available, 1) : 0;
      scrollDepthRef.current = depth;
      setScrollDepth(Math.round(depth * 100));
      setScrollBand(Math.min(20, Math.floor(depth * 20)));
    };

    updateScrollDepth();
    window.addEventListener("scroll", updateScrollDepth, { passive: true });
    window.addEventListener("resize", updateScrollDepth);
    return () => {
      window.removeEventListener("scroll", updateScrollDepth);
      window.removeEventListener("resize", updateScrollDepth);
    };
  }, []);

  useEffect(() => {
    const handleEveryClick = (event: MouseEvent) => {
      const target = event.target;
      if (
        target instanceof Element &&
        target.closest("[data-hee-control]")
      ) {
        return;
      }
      setHeeReady(true);
      playHee();
    };

    document.addEventListener("click", handleEveryClick, true);
    return () => document.removeEventListener("click", handleEveryClick, true);
  }, [playHee]);

  useEffect(() => {
    if (!heeReady || heeMuted || secretExclusive || scrollBand < 3) return;
    const delay = heeDelayForDepth(scrollBand / 20);
    const timer = window.setInterval(playHee, delay);
    return () => window.clearInterval(timer);
  }, [heeReady, heeMuted, playHee, scrollBand, secretExclusive]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCountdown((value) => (value <= 0 ? 10 : value - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!trailerOpen || trailerPaused) return;
    const timer = window.setTimeout(() => {
      setTrailerScene((value) =>
        value >= trailerScenes.length - 1 ? 0 : value + 1,
      );
    }, 5600);
    return () => window.clearTimeout(timer);
  }, [trailerOpen, trailerPaused, trailerScene]);

  useEffect(() => {
    if (!trailerOpen) return;
    const previousOverflow = document.body.style.overflow;
    const handleTrailerKeys = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setTrailerOpen(false);
      } else if (event.key === "ArrowRight") {
        setTrailerScene((value) => (value + 1) % trailerScenes.length);
      } else if (event.key === "ArrowLeft") {
        setTrailerScene(
          (value) => (value - 1 + trailerScenes.length) % trailerScenes.length,
        );
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleTrailerKeys);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleTrailerKeys);
    };
  }, [trailerOpen]);

  useEffect(() => {
    if (!chaseOpen) return;
    const timers = [
      window.setTimeout(() => setChasePhase(1), 700),
      window.setTimeout(() => setChasePhase(2), 3300),
      window.setTimeout(() => setChasePhase(3), 5000),
      window.setTimeout(() => {
        setChasePhase(4);
        jumpscareAudioRef.current?.pause();
        const scream = new Audio("/audio/fnaf-jumpscare-scream.mp3");
        scream.volume = 0.5;
        scream.playbackRate = 0.72;
        jumpscareAudioRef.current = scream;
        void scream.play();
      }, 6900),
    ];
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [chaseOpen]);

  const toggleSound = () => {
    if (soundOn && audioRef.current) {
      const soundtrack = audioRef.current;
      audioRef.current = null;
      window.clearInterval(soundtrack.timer);
      soundtrack.gain.gain.exponentialRampToValueAtTime(
        0.0001,
        soundtrack.context.currentTime + 0.25,
      );
      window.setTimeout(() => {
        soundtrack.sources.forEach((source) => {
          try {
            source.stop();
          } catch {
            // The source has already finished.
          }
        });
        void soundtrack.context.close();
      }, 280);
      setSoundOn(false);
      return;
    }

    const context = new AudioContext();
    const gain = context.createGain();
    const compressor = context.createDynamicsCompressor();
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.075, context.currentTime + 0.18);
    compressor.threshold.value = -18;
    compressor.knee.value = 16;
    compressor.ratio.value = 5;
    compressor.attack.value = 0.004;
    compressor.release.value = 0.16;
    gain.connect(compressor);
    compressor.connect(context.destination);

    const sources = new Set<AudioScheduledSourceNode>();
    const remember = <T extends AudioScheduledSourceNode>(source: T) => {
      sources.add(source);
      source.addEventListener("ended", () => sources.delete(source), {
        once: true,
      });
      return source;
    };

    const noiseBuffer = context.createBuffer(
      1,
      Math.round(context.sampleRate * 0.18),
      context.sampleRate,
    );
    const noise = noiseBuffer.getChannelData(0);
    for (let index = 0; index < noise.length; index += 1) {
      noise[index] = Math.random() * 2 - 1;
    }

    const kick = (time: number) => {
      const osc = context.createOscillator();
      const envelope = context.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(118, time);
      osc.frequency.exponentialRampToValueAtTime(42, time + 0.12);
      envelope.gain.setValueAtTime(0.72, time);
      envelope.gain.exponentialRampToValueAtTime(0.0001, time + 0.19);
      osc.connect(envelope);
      envelope.connect(gain);
      remember(osc);
      osc.start(time);
      osc.stop(time + 0.2);
    };

    const snare = (time: number) => {
      const source = remember(context.createBufferSource());
      const filter = context.createBiquadFilter();
      const envelope = context.createGain();
      source.buffer = noiseBuffer;
      filter.type = "highpass";
      filter.frequency.value = 1450;
      envelope.gain.setValueAtTime(0.24, time);
      envelope.gain.exponentialRampToValueAtTime(0.0001, time + 0.11);
      source.connect(filter);
      filter.connect(envelope);
      envelope.connect(gain);
      source.start(time);
      source.stop(time + 0.12);

      // A second, tiny burst gives the backbeat a dry hand-clap character.
      const clap = remember(context.createBufferSource());
      const clapFilter = context.createBiquadFilter();
      const clapEnvelope = context.createGain();
      clap.buffer = noiseBuffer;
      clapFilter.type = "bandpass";
      clapFilter.frequency.value = 2300;
      clapFilter.Q.value = 0.65;
      clapEnvelope.gain.setValueAtTime(0.11, time + 0.012);
      clapEnvelope.gain.exponentialRampToValueAtTime(
        0.0001,
        time + 0.095,
      );
      clap.connect(clapFilter);
      clapFilter.connect(clapEnvelope);
      clapEnvelope.connect(gain);
      clap.start(time + 0.012);
      clap.stop(time + 0.1);
    };

    const hat = (time: number, open = false, accent = 1) => {
      const source = remember(context.createBufferSource());
      const filter = context.createBiquadFilter();
      const envelope = context.createGain();
      source.buffer = noiseBuffer;
      filter.type = "highpass";
      filter.frequency.value = open ? 6100 : 7600;
      envelope.gain.setValueAtTime((open ? 0.095 : 0.045) * accent, time);
      envelope.gain.exponentialRampToValueAtTime(
        0.0001,
        time + (open ? 0.16 : 0.028),
      );
      source.connect(filter);
      filter.connect(envelope);
      envelope.connect(gain);
      source.start(time);
      source.stop(time + (open ? 0.17 : 0.035));
    };

    const bass = (time: number, frequency: number, duration = 0.1) => {
      const filter = context.createBiquadFilter();
      const envelope = context.createGain();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(430, time);
      filter.frequency.exponentialRampToValueAtTime(170, time + duration);
      filter.Q.value = 3.4;
      envelope.gain.setValueAtTime(0.2, time);
      envelope.gain.exponentialRampToValueAtTime(0.0001, time + duration);

      const body = remember(context.createOscillator());
      const edge = remember(context.createOscillator());
      body.type = "triangle";
      edge.type = "sawtooth";
      body.frequency.setValueAtTime(frequency, time);
      edge.frequency.setValueAtTime(frequency * 2, time);
      edge.detune.value = -7;
      const edgeGain = context.createGain();
      edgeGain.gain.value = 0.24;
      body.connect(filter);
      edge.connect(edgeGain);
      edgeGain.connect(filter);
      filter.connect(envelope);
      envelope.connect(gain);
      body.start(time);
      edge.start(time);
      body.stop(time + duration + 0.018);
      edge.stop(time + duration + 0.018);
    };

    const guitarChank = (time: number, root: number) => {
      [1, 1.5, 2].forEach((ratio, voice) => {
        const osc = remember(context.createOscillator());
        const filter = context.createBiquadFilter();
        const envelope = context.createGain();
        osc.type = voice === 0 ? "sawtooth" : "square";
        osc.frequency.value = root * ratio;
        filter.type = "bandpass";
        filter.frequency.value = 1250;
        filter.Q.value = 1.25;
        envelope.gain.setValueAtTime(voice === 0 ? 0.025 : 0.013, time);
        envelope.gain.exponentialRampToValueAtTime(0.0001, time + 0.052);
        osc.connect(filter);
        filter.connect(envelope);
        envelope.connect(gain);
        osc.start(time);
        osc.stop(time + 0.06);
      });
    };

    const brassHit = (time: number) => {
      [146.83, 174.61, 220].forEach((frequency, voice) => {
        const osc = remember(context.createOscillator());
        const filter = context.createBiquadFilter();
        const envelope = context.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(frequency, time);
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(1200, time);
        filter.frequency.exponentialRampToValueAtTime(460, time + 0.12);
        envelope.gain.setValueAtTime(0.025 - voice * 0.004, time);
        envelope.gain.exponentialRampToValueAtTime(0.0001, time + 0.14);
        osc.connect(filter);
        filter.connect(envelope);
        envelope.connect(gain);
        osc.start(time);
        osc.stop(time + 0.15);
      });
    };

    // Original 16-step funk-noir cue: 118 BPM, syncopated bass,
    // dry backbeat, muted guitar and brass. It evokes the era without
    // reproducing the melody or master recording of a copyrighted song.
    const kickSteps = new Set([0, 3, 6, 8, 11, 14]);
    const snareSteps = new Set([4, 12]);
    const openHatSteps = new Set([7, 15]);
    const bassNotes: Record<number, number> = {
      0: 55,
      2: 55,
      5: 65.41,
      7: 61.74,
      8: 55,
      11: 73.42,
      13: 65.41,
      15: 51.91,
    };
    const guitarSteps = new Set([1, 3, 6, 9, 11, 14]);
    const brassSteps = new Set([6, 15]);
    const secondsPerStep = 60 / 118 / 4;
    let step = 0;
    let nextStepAt = context.currentTime + 0.06;

    const schedule = () => {
      while (nextStepAt < context.currentTime + 0.12) {
        if (kickSteps.has(step)) kick(nextStepAt);
        if (snareSteps.has(step)) snare(nextStepAt);
        hat(nextStepAt, openHatSteps.has(step), step % 4 === 0 ? 1.22 : 0.78);
        const bassFrequency = bassNotes[step];
        if (bassFrequency) {
          bass(
            nextStepAt,
            bassFrequency,
            step === 7 || step === 15 ? 0.16 : 0.095,
          );
        }
        if (guitarSteps.has(step)) {
          guitarChank(nextStepAt + secondsPerStep * 0.08, step < 8 ? 220 : 196);
        }
        if (brassSteps.has(step)) brassHit(nextStepAt);
        step = (step + 1) % 16;
        nextStepAt += secondsPerStep;
      }
    };

    schedule();
    const timer = window.setInterval(schedule, 25);
    audioRef.current = { context, gain, timer, sources };
    void context.resume();
    setSoundOn(true);
  };

  const begin = () => {
    if (!soundOn) toggleSound();
    setStarted(true);
    window.setTimeout(() => {
      document.getElementById("premiere")?.scrollIntoView({ behavior: "smooth" });
    }, 350);
  };

  const playMicrotone = (index: number) => {
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const frequency = 110 * Math.pow(2, index / 24);

    oscillator.type = index % 2 === 0 ? "sine" : "triangle";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.12, context.currentTime + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.7);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.72);
    oscillator.addEventListener("ended", () => void context.close());
    setMicroActive(index);
    window.setTimeout(() => setMicroActive(null), 720);
  };

  const playJumpscare = (index: number) => {
    jumpscareAudioRef.current?.pause();
    signatureAudioRef.current?.pause();
    if (jumpscareTimerRef.current !== null) {
      window.clearTimeout(jumpscareTimerRef.current);
      jumpscareTimerRef.current = null;
    }

    const profile = animatronicArchive[index];
    const sample = new Audio(profile.audio);
    sample.preload = "auto";
    sample.volume = 0.42;
    jumpscareAudioRef.current = sample;
    setScreamActive(index);

    const playPrimary = () => {
      jumpscareTimerRef.current = null;
      if (profile.name === "MANGLE") {
        signatureAudioRef.current?.pause();
        signatureAudioRef.current = null;
      }
      void sample.play().catch(() => {
        setScreamActive(null);
        jumpscareAudioRef.current = null;
      });
    };

    sample.addEventListener(
      "ended",
      () => {
        setScreamActive(null);
        jumpscareAudioRef.current = null;
      },
      { once: true },
    );

    if ("intro" in profile) {
      const signature = new Audio(profile.intro);
      signature.preload = "auto";
      signature.volume = profile.name === "MANGLE" ? 0.34 : 0.26;
      signatureAudioRef.current = signature;
      signature.addEventListener(
        "ended",
        () => {
          signatureAudioRef.current = null;
        },
        { once: true },
      );
      void signature.play().catch(() => undefined);
      jumpscareTimerRef.current = window.setTimeout(
        playPrimary,
        profile.introDelayMs,
      );
      return;
    }

    playPrimary();
  };

  const openRecoveredMaterial = () => {
    jumpscareAudioRef.current?.pause();
    const sample = new Audio("/audio/fnaf-jumpscare-scream.mp3");
    sample.volume = 0.5;
    sample.playbackRate = 0.78;
    jumpscareAudioRef.current = sample;
    setRecoveredStep(0);
    setRecovered(true);
    void sample.play().catch(() => undefined);
  };

  const revealRecoveredFragment = () => {
    setRecoveredStep((current) => {
      const next = Math.min(recoveredFragments.length, current + 1);
      if (next === recoveredFragments.length) {
        setMaterialRead(true);
      } else if (next === 3) {
        const warning = new Audio("/audio/fnaf-jumpscare-scream.mp3");
        warning.volume = 0.18;
        warning.playbackRate = 1.32;
        void warning.play().catch(() => undefined);
      }
      return next;
    });
  };

  const focusRecoveredMaterial = () => {
    setTrailerOpen(false);
    window.setTimeout(() => {
      document
        .getElementById("material-recuperado")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 120);
  };

  const closeChase = () => {
    jumpscareAudioRef.current?.pause();
    jumpscareAudioRef.current = null;
    setChaseOpen(false);
    setChasePhase(0);
  };

  const silenceHee = () => {
    heeBurstTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    heeBurstTimersRef.current.clear();
    heeAudioRef.current.forEach((sample) => {
      sample.pause();
      sample.currentTime = 0;
    });
    heeAudioRef.current.clear();
    setHeeMuted(true);
  };

  const handleMuteAttempt = () => {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (muteAttempts >= 5 || reduceMotion) {
      silenceHee();
      return;
    }

    playHee();
    setMuteAttempts((attempt) => attempt + 1);
  };

  const activeTrailerScene = trailerScenes[trailerScene];

  return (
    <main className={started ? "experience started" : "experience"}>
      <div className="grain" aria-hidden="true" />
      <div className="cursor-light" aria-hidden="true" />

      <header className="topbar">
        <a className="brand" href="#premiere" aria-label="Ir al inicio">
          <span className="brand-mark">22</span>
          <span>
            PREMIERE
            <small>LA HISTORIA CONTINÚA</small>
          </span>
        </a>
        <nav aria-label="Navegación principal">
          <a href="#filmografia">Filmografía</a>
          <a href="#expediente">Expediente</a>
          <a href="#referentes">Referentes</a>
          <a href="#final">Escena final</a>
        </nav>
        <button
          className="sound-button"
          type="button"
          onClick={toggleSound}
          aria-pressed={soundOn}
        >
          <span className={soundOn ? "sound-dot live" : "sound-dot"} />
          BANDA SONORA {soundOn ? "ON" : "OFF"}
        </button>
      </header>

      <section className="cold-open" aria-label="Introducción cinematográfica">
        <div className="leader-count" aria-hidden="true">22</div>
        <div className="opening-lines">
          <p>TODA HISTORIA TIENE UN COMIENZO</p>
          <p>TODA PRODUCCIÓN TIENE UNA PRIMERA TOMA</p>
          <p>PERO ALGUNAS PERSONAS NECESITAN 22 ESCENAS</p>
          <p>PARA EMPEZAR SU VERDADERA PELÍCULA</p>
        </div>
        <button className="start-button" type="button" onClick={begin}>
          <span>COMENZAR PROYECCIÓN</span>
          <span aria-hidden="true">▶</span>
        </button>
        <p className="opening-hint">El sonido es opcional. La emoción, no.</p>
      </section>

      <section className="hero" id="premiere">
        <div className="hero-beam" aria-hidden="true" />
        <figure className="hero-still" data-secret-anchor="hero">
          <img
            src="/archive/hero-stage.webp"
            alt="Raúl García actuando sobre un escenario"
            fetchPriority="high"
          />
          <figcaption>
            <span>ARCHIVO PERSONAL · ESCENARIO</span>
            <strong>EL PROTAGONISTA ENTRA EN CUADRO</strong>
          </figcaption>
        </figure>
        <div className="hero-copy">
          <p className="eyebrow">UNA PRODUCCIÓN DE TODA SU GENTE</p>
          <h1>
            <span>PREMIERE</span>
            <strong>22</strong>
          </h1>
          <div className="title-card">
            <p>RAÚL GARCÍA</p>
            <p>LA HISTORIA CONTINÚA</p>
          </div>
          <p className="hero-intro">
            El estreno de una nueva etapa. Una película sobre amistad,
            creatividad y todo lo que todavía está por rodarse.
          </p>
        </div>
        <div className="hero-ticket" aria-label="Entrada simbólica a la premiere">
          <div className="ticket-stub">
            <span>ADMITE</span>
            <b>∞</b>
          </div>
          <div className="ticket-main">
            <span>ESTRENO EXCLUSIVO</span>
            <b>ESCENA 22</b>
            <p>RAAULINHOO · FILA A · BUTACA 22</p>
          </div>
        </div>
        <a className="scroll-cue" href="#reparto">
          <span>BAJAR A PLATÓ</span>
          <i aria-hidden="true">↓</i>
        </a>
      </section>

      <section className="portrait-section" id="reparto">
        <div className="section-number">01</div>
        <div className="portrait-frame">
          <img
            className="portrait-photo"
            src="/archive/portrait-set.webp"
            alt="Raúl junto a una cámara durante un rodaje"
          />
          <div className="camera-reticle" aria-hidden="true">
            <span>REC</span>
            <b>RAÚL</b>
            <small>FOTOGRAMA REAL · EN RODAJE</small>
          </div>
        </div>
        <div className="portrait-copy">
          <p className="eyebrow red">PERSONAJE PRINCIPAL / CREADOR / AMIGO</p>
          <h2>Una sola persona.<br />Demasiados créditos.</h2>
          <p>
            Raúl es de esas personas que no se limitan a imaginar una idea.
            Necesita grabarla, iluminarla, sonorizarla, editarla y,
            probablemente, aparecer también delante de la cámara.
          </p>
          <p>
            Es técnico y artista. Perfeccionista y humorista. Creativo,
            sentimental, gracioso y capaz de dejarse la piel en aquello que le
            importa.
          </p>
        </div>
        <div className="credit-roll" aria-label="Créditos de Raúl">
          {credits.map((credit, index) => (
            <div key={credit.name}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <img src={credit.image} alt={credit.alt} loading="lazy" />
              <b>{credit.name}</b>
              <em>{credit.detail}</em>
              <i aria-hidden="true" />
              <small>RAÚL GARCÍA</small>
            </div>
          ))}
        </div>
      </section>

      <section className="filmography section-pad" id="filmografia">
        <div className="section-heading">
          <div>
            <p className="eyebrow">ARCHIVO REAL / CANAL RAAULINHOO</p>
            <h2>La videoteca<br />de Raúl.</h2>
          </div>
          <p>
            Siete producciones reales, con sus miniaturas y fechas originales.
            Selecciona una cinta y reprodúcela sin salir de la premiere.
          </p>
        </div>

        <div className="channel-marquee">
          <div className="channel-avatar">
            <img
              src="/archive/channel-avatar.webp"
              alt="Retrato de Raúl"
              loading="lazy"
            />
          </div>
          <div>
            <small>CANAL OFICIAL EN YOUTUBE</small>
            <strong>@Raaulinhoo</strong>
          </div>
          <span>7 PRODUCCIONES EN ESTE ARCHIVO</span>
          <a href="https://www.youtube.com/@Raaulinhoo" target="_blank" rel="noreferrer">
            ABRIR CANAL ↗
          </a>
        </div>

        <div className="film-strip" role="list" aria-label="Proyectos de Raúl">
          {projects.map((project, index) => (
            <button
              type="button"
              role="listitem"
              key={project.title}
              className={`film-card ${project.color} ${
                selectedProject === index ? "selected" : ""
              }`}
              onClick={() => setSelectedProject(index)}
              aria-pressed={selectedProject === index}
            >
              <span className="sprockets" aria-hidden="true" />
              <span className="film-visual">
                <img
                  src={project.thumbnail}
                  alt={`Miniatura oficial de ${project.title}`}
                />
                <span className="film-shade" aria-hidden="true" />
                <small className="reel-code">{project.code}</small>
                <b>{project.title}</b>
                {project.color === "special" && <em>SELECCIÓN OFICIAL</em>}
                <span className="duration-badge">▶ {project.duration}</span>
              </span>
              <span className="film-meta">
                <small>{project.year}</small>
                <strong>{project.kind}</strong>
              </span>
            </button>
          ))}
        </div>

        <article className="project-focus" aria-live="polite" data-secret-anchor="project">
          <button
            type="button"
            className="focus-still"
            onClick={() => setActiveVideo(selectedProject)}
            aria-label={`Reproducir ${projects[selectedProject].title}`}
          >
            <img
              src={projects[selectedProject].thumbnail}
              alt=""
            />
            <span>▶</span>
          </button>
          <div>
            <p className="eyebrow red">
              {projects[selectedProject].year} · {projects[selectedProject].duration}
            </p>
            <h3>{projects[selectedProject].title}</h3>
            <p>{projects[selectedProject].role}</p>
            <small className="focus-kind">{projects[selectedProject].kind}</small>
          </div>
          <button
            type="button"
            onClick={() => setActiveVideo(selectedProject)}
            className="text-action"
          >
            REPRODUCIR EN SALA <span aria-hidden="true">▶</span>
          </button>
        </article>
      </section>

      <section className="behind section-pad">
        <div className="section-heading narrow">
          <div>
            <p className="eyebrow red">02 / DETRÁS DE LAS CÁMARAS</p>
            <h2>Los amigos recuerdan lo que no sale en pantalla.</h2>
          </div>
          <p>
            Las películas enseñan el resultado. Esta mesa de montaje guarda
            todo lo demás.
          </p>
        </div>
        <div className="contact-sheet">
          {behindFrames.map((frame, index) => (
            <figure
              key={frame.code}
              className={`photo-placeholder photo-${index + 1}`}
            >
              <div className="production-frame">
                <img src={frame.image} alt={`Fotograma de ${frame.caption}`} />
                <span>FOTOGRAMA {frame.code}</span>
                <b>{frame.title}</b>
                <em>PRODUCCIÓN REAL · ARCHIVO RAAULINHOO</em>
              </div>
              <figcaption>{frame.caption}</figcaption>
            </figure>
          ))}
          <div className="tape-note">
            <span>NOTA DE MONTAJE</span>
            <p>
              Fotografías reales recuperadas de su portfolio: rodajes, cabina,
              festival, equipo y esos momentos que nunca caben en los créditos.
            </p>
          </div>
        </div>
      </section>

      <section className="dossier section-pad" id="expediente">
        <div className="file-tab">CONFIDENCIAL · RG-22</div>
        <div className="dossier-header">
          <div>
            <p>MINISTERIO DE IDEAS IMPOSIBLES</p>
            <h2>EL EXPEDIENTE<br />DE RAÚL</h2>
          </div>
          <div className="stamp">CLASIFICADO</div>
        </div>
        <div className="dossier-evidence" aria-label="Pruebas visuales del expediente">
          <figure>
            <img
              src="/archive/dossier-camera.webp"
              alt="Raúl trabajando con una cámara sobre un rig"
              loading="lazy"
            />
            <figcaption><span>PRUEBA A</span> OPERADOR EN PLATÓ</figcaption>
          </figure>
          <figure>
            <img
              src="/archive/dossier-studio.webp"
              alt="Raúl en una mesa de trabajo audiovisual"
              loading="lazy"
            />
            <figcaption><span>PRUEBA B</span> CABINA RAAULINHOO</figcaption>
          </figure>
          <figure>
            <img
              src="/archive/dossier-location.webp"
              alt="Raúl durante un rodaje en exteriores"
              loading="lazy"
            />
            <figcaption><span>PRUEBA C</span> LOCALIZACIÓN EXTERIOR</figcaption>
          </figure>
        </div>
        <div className="dossier-grid">
          <dl className="identity-file">
            <div><dt>SUJETO</dt><dd>Raúl García</dd></div>
            <div><dt>EDAD</dt><dd>22</dd></div>
            <div><dt>ALIAS</dt><dd>Raaulinhoo</dd></div>
            <div><dt>CLASIFICACIÓN</dt><dd>Creatividad audiovisual incontrolable</dd></div>
            <div><dt>HABILIDADES</dt><dd>Sonido, luz, cámara, edición y ocurrencias inesperadas</dd></div>
            <div><dt>DEBILIDADES</dt><dd>Michael Jackson, cine, terror y animatrónicos</dd></div>
            <div><dt>ESTADO ACTUAL</dt><dd><span className="status-pulse" /> Rodando la siguiente escena</dd></div>
          </dl>
          <div className="meters">
            {dossier.map(([label, value]) => (
              <div className="meter" key={label}>
                <div><span>{label}</span><b>{value}</b></div>
                <div className="meter-track">
                  <i style={{ width: value }} />
                </div>
              </div>
            ))}
            <div className="not-found">
              <span>PROYECTOS TERMINADOS A LA PRIMERA</span>
              <b>INFORMACIÓN NO ENCONTRADA</b>
            </div>
            <div className="not-found">
              <span>ARCHIVOS “FINAL_FINAL_AHORA_SÍ”</span>
              <b>DEMASIADOS</b>
            </div>
          </div>
        </div>
      </section>

      <section className="reference-room section-pad" id="referentes">
        <div className="section-heading">
          <div>
            <p className="eyebrow">03 / EL MULTIVERSO DE RAÚL</p>
            <h2>Cuatro obsesiones.<br />Cuatro mundos.</h2>
          </div>
          <p>
            Aquí no hay tarjetas genéricas: cada referente cambia las reglas,
            la estética y hasta la forma de interactuar.
          </p>
        </div>

        <div className="idol-worlds">
          <article className={`idol-card mj-world ${mjAnswer ? "performance-on" : ""}`}>
            <div className="idol-label">
              <span>REFERENTE 01</span>
              <strong>SHOW CONTROL · MODO ESCENARIO</strong>
            </div>
            <figure className="mj-stage">
              <img
                src="/michael/michael-jackson-publicity-1984.jpg"
                alt="Retrato promocional de cuerpo entero de Michael Jackson en 1984"
              />
              <i className="spotlight left" />
              <i className="spotlight right" />
              <div className="mj-stage-pulse" aria-hidden="true">
                {Array.from({ length: 16 }, (_, index) => <i key={index} />)}
              </div>
              <div className="mj-moonwalk-track" aria-hidden="true">
                <span>01</span><span>02</span><span>03</span><span>04</span>
                <b>MOONWALK</b>
              </div>
              <div className="mj-photo-scan" aria-hidden="true" />
              <figcaption>
                <span>STUDIO PORTRAIT · 1984</span>
                <a
                  href="https://commons.wikimedia.org/wiki/File:Michael_Jackson_publicity_photo_1984.jpg"
                  target="_blank"
                  rel="noreferrer"
                >
                  FOTO REAL · MATTHEW ROLSTON / EPIC · DOMINIO PÚBLICO ↗
                </a>
              </figcaption>
            </figure>
            <div className="idol-copy">
              <p className="eyebrow red">RITMO · ESPECTÁCULO · PRECISIÓN</p>
              <h3>MICHAEL<br />JACKSON</h3>
              <p>
                El gusto por hacer que una canción no solo suene: que tenga
                concepto, personaje, coreografía, luz y una silueta imposible
                de confundir.
              </p>
              <div className="mj-era-selector" role="tablist" aria-label="Eras creativas de Michael Jackson">
                {michaelEras.map((era, index) => (
                  <button
                    type="button"
                    role="tab"
                    aria-selected={mjEra === index}
                    className={mjEra === index ? "active" : ""}
                    key={era.name}
                    onClick={() => setMjEra(index)}
                  >
                    <span>{era.year}</span>
                    <strong>{era.name}</strong>
                  </button>
                ))}
              </div>
              <div className="mj-era-console" role="tabpanel" aria-live="polite">
                <span>SECUENCIA {String(mjEra + 1).padStart(2, "0")} / 05</span>
                <strong>{michaelEras[mjEra].cue}</strong>
                <p>{michaelEras[mjEra].detail}</p>
                <div aria-hidden="true">
                  {Array.from({ length: 8 }, (_, index) => <i key={index} />)}
                </div>
              </div>
              <button
                className="mj-sequence-trigger"
                type="button"
                onClick={() => setMjAnswer(!mjAnswer)}
              >
                {mjAnswer ? "DETENER SECUENCIA" : "RAÚL, ARE YOU OK?"}
                <span>{mjAnswer ? "■" : "▶"}</span>
              </button>
              <p className={mjAnswer ? "room-answer visible" : "room-answer"}>
                LUCES 100% · BEAT 118 BPM · MOONWALK AUTORIZADO · ESCENA 22
              </p>
            </div>
          </article>

          <article className="idol-card nolan-world">
            <div className="idol-label">
              <span>REFERENTE 02</span>
              <strong>13 LARGOMETRAJES · 1998—2026</strong>
            </div>
            <div className="nolan-clock" aria-live="polite">
              <div className="clock-ring ring-one" />
              <div className="clock-ring ring-two" />
              <div className="clock-ring ring-three" />
              <span>{nolanFilms[nolanFilm].year}</span>
              <strong>{nolanFilms[nolanFilm].title}</strong>
              <small>
                T–00:{String(countdown).padStart(2, "0")} · {nolanFilms[nolanFilm].format}
              </small>
            </div>
            <div className="idol-copy">
              <p className="eyebrow">TIEMPO · REALIDAD FÍSICA · GRAN FORMATO</p>
              <h3>CHRISTOPHER<br />NOLAN</h3>
              <p>
                Cada película parte de una regla formal y la convierte en
                espectáculo tangible: relojes, estructuras anidadas, película
                fotoquímica, efectos reales y montaje paralelo.
              </p>
              <div className="nolan-film-strip" role="list" aria-label="Filmografía completa de Christopher Nolan">
                {nolanFilms.map((film, index) => (
                  <button
                    type="button"
                    role="listitem"
                    aria-pressed={nolanFilm === index}
                    className={nolanFilm === index ? "active" : ""}
                    onClick={() => setNolanFilm(index)}
                    key={film.title}
                  >
                    <span>{film.year}</span>
                    <strong>{film.title}</strong>
                  </button>
                ))}
              </div>
              <div className="nolan-film-readout" aria-live="polite">
                <span>DISPOSITIVO NARRATIVO</span>
                <strong>{nolanFilms[nolanFilm].device}</strong>
                <small>{nolanFilms[nolanFilm].format}</small>
              </div>
              <ol className="nolan-method" aria-label="Método de trabajo de Christopher Nolan">
                {nolanMethod.map(([number, label, detail]) => (
                  <li key={number}>
                    <span>{number}</span>
                    <strong>{label}</strong>
                    <p>{detail}</p>
                  </li>
                ))}
              </ol>
            </div>
          </article>

          <article className="idol-card fnaf-world">
            <div className="idol-label">
              <span>REFERENTE 03</span>
              <strong>TURNO DE NOCHE · 12 AM</strong>
            </div>
            <div className="security-office">
              <div className={`security-monitor feed-${cameraFeed}`}>
                <div className="monitor-noise" aria-hidden="true" />
                <div className="camera-lens-data" aria-hidden="true">
                  <span>ISO 12800</span>
                  <span>IR AUTO</span>
                  <span>3.6 MM</span>
                </div>
                <div className="monitor-topline">
                  <span>● REC</span>
                  <strong>
                    {cameraFeeds[cameraFeed].camera} · {cameraFeeds[cameraFeed].room}
                  </strong>
                  <span>12:0{cameraFeed + 1} AM</span>
                </div>
                <div className="camera-room" aria-hidden="true">
                  <div className="room-ceiling">
                    <i /><i /><i />
                  </div>
                  <div className="room-backwall">
                    <span className="room-poster poster-one">CELEBRATE!</span>
                    <span className="room-poster poster-two">22</span>
                    <i className="room-pipe pipe-one" />
                    <i className="room-pipe pipe-two" />
                    <b className="room-door">EMPLOYEES ONLY</b>
                  </div>
                  <div className="party-table table-one"><i /><i /><i /></div>
                  <div className="party-table table-two"><i /><i /><i /></div>
                  <div className="office-desk">
                    <i className="desk-fan" />
                    <i className="desk-monitor" />
                    <i className="desk-cup" />
                  </div>
                  <div className="vent-grille">
                    {Array.from({ length: 6 }, (_, index) => <i key={index} />)}
                  </div>
                  <div className="stage-curtain curtain-left" />
                  <div className="stage-curtain curtain-right" />
                  <div className="party-pennants">
                    {Array.from({ length: 7 }, (_, index) => <i key={index} />)}
                  </div>
                  <div className="service-lockers"><i /><i /><i /></div>
                  <div className="floor-cable" />
                  <span className="room-sign">CELEBRATE · STAY IN YOUR SEAT</span>
                </div>
                <div className="animatronic-silhouette" aria-hidden="true">
                  <i className="ear left" /><i className="ear right" />
                  <i className="head" /><i className="eye left" /><i className="eye right" />
                  <i className="jaw" />
                  <i className="torso" /><i className="arm left" /><i className="arm right" />
                  <i className="hand left" /><i className="hand right" />
                </div>
                <div className="camera-evidence-strip">
                  <span>{cameraFeeds[cameraFeed].evidence}</span>
                  <b>RIESGO · {cameraFeeds[cameraFeed].threat}</b>
                </div>
                <p>{cameraFeeds[cameraFeed].description}</p>
              </div>
              <div className="camera-console">
                <div className="camera-map">
                  <span className="map-you">YOU</span>
                  <i className="map-wire wire-one" />
                  <i className="map-wire wire-two" />
                  {cameraFeeds.map((feed, index) => (
                    <button
                      type="button"
                      key={feed.camera}
                      className={cameraFeed === index ? "active" : ""}
                      onClick={() => setCameraFeed(index)}
                    >
                      <span>{feed.camera}</span>
                      <small>{feed.room}</small>
                    </button>
                  ))}
                </div>
                <div className="power-readout">
                  <span>ENERGÍA</span>
                  <div><i style={{ width: `${88 - cameraFeed * 9}%` }} /></div>
                  <b>{88 - cameraFeed * 9}%</b>
                </div>
              </div>
            </div>
            <div className="scream-archive">
              <div className="scream-heading">
                <div>
                  <span>ARCHIVO DE GRITOS</span>
                  <strong>ANIMATRÓNICOS PRINCIPALES</strong>
                </div>
                <small>VOLUMEN DE SEGURIDAD · 42%</small>
              </div>
              <div className="scream-grid">
                {animatronicArchive.map((profile, index) => (
                  <button
                    type="button"
                    key={profile.name}
                    className={screamActive === index ? "active" : ""}
                    onClick={() => playJumpscare(index)}
                    aria-label={`Reproducir sonido auténtico de ${profile.name}`}
                  >
                    <span className="scream-face" aria-hidden="true">
                      <i /><i /><b>{profile.name.slice(0, 1)}</b>
                    </span>
                    <span>
                      <small>{profile.code}</small>
                      <strong>{profile.name}</strong>
                      <em className="scream-source">{profile.source}</em>
                    </span>
                    <em>{screamActive === index ? "SONANDO" : "▶ GRITO"}</em>
                  </button>
                ))}
              </div>
            </div>
            <div className="idol-copy fnaf-copy">
              <p className="eyebrow red">FIVE NIGHTS AT FREDDY’S / HORROR</p>
              <h3>NO MIRES<br />LA PUERTA.</h3>
              <p>
                Cámaras, estática, diseño sonoro, pistas escondidas y el tipo de
                tensión que convierte un pasillo vacío en una historia entera.
              </p>
              <button
                id="material-recuperado"
                className="material-card-primary"
                type="button"
                onClick={openRecoveredMaterial}
              >
                <small>PASO 01 · OBLIGATORIO</small>
                LEER TARJETA “MATERIAL RECUPERADO”
                <span>↗</span>
              </button>
              {materialRead ? (
                <a className="fnaf-game-link unlocked" href="/walk-exe">
                  <small>PASO 02 · ACCESO AUTORIZADO</small>
                  ENTRAR AL PASADIZO M00NW4LK.EXE <span>→</span>
                </a>
              ) : (
                <button className="fnaf-game-locked" type="button" disabled>
                  <small>PASO 02 · BLOQUEADO</small>
                  LEE PRIMERO EL MATERIAL RECUPERADO <span>⌁</span>
                </button>
              )}
            </div>
          </article>

          <article className="idol-card micro-world">
            <div className="idol-label">
              <span>OBSESIÓN SONORA 04</span>
              <strong>ANGINE DE POITRINE · 24 DIVISIONES</strong>
            </div>
            <div className="poitrine-constellation" aria-hidden="true">
              {Array.from({ length: 36 }, (_, index) => (
                <i key={index} style={{ "--dot": index } as CSSProperties} />
              ))}
              <span className="poitrine-head head-khn"><b /></span>
              <span className="poitrine-head head-klek"><b /></span>
              <strong>MICRO<br /><em>TONAL</em></strong>
            </div>
            <div className="micro-copy">
              <p className="eyebrow">ANGINE DE POITRINE / DADA MICROTONAL</p>
              <h3>ENTRE DOS NOTAS<br />VIVEN MÁS NOTAS.</h3>
              <p>
                Su guitarra divide la octava en veinticuatro pasos. Los lunares,
                las máscaras y la geometría no decoran esta sala: se comportan
                como otra capa del ritmo.
              </p>
              <div className="tuning-readout">
                <span>BASE</span><b>110.00 Hz</b>
                <span>DIVISIÓN</span>
                <button
                  type="button"
                  className="micro-secret-switch"
                  data-hee-control
                  onClick={() => window.dispatchEvent(new Event("premiere22:micro-unlock"))}
                  aria-label="Calibrar el laboratorio secreto de 24 divisiones"
                >
                  24 TET
                </button>
                <span>PASO</span><b>50.00 ¢</b>
              </div>
            </div>
            <div className="micro-sequencer" aria-label="Teclado microtonal de veinticuatro pasos">
              <div className="waveform" aria-hidden="true">
                {Array.from({ length: 48 }, (_, index) => (
                  <i key={index} style={{ height: `${18 + ((index * 17) % 72)}%` }} />
                ))}
              </div>
              <div className="micro-keys">
                {microSteps.map((step, index) => (
                  <button
                    type="button"
                    key={step.number}
                    className={microActive === index ? "active" : ""}
                    onClick={() => playMicrotone(index)}
                    aria-label={`Reproducir paso microtonal ${step.number}, ${step.cents} cents`}
                  >
                    <span>{step.number}</span>
                    <small>{step.cents}¢</small>
                  </button>
                ))}
              </div>
              <p>LABORATORIO · PULSA LOS 24 CUARTOS DE TONO</p>
            </div>
            <div className="microtonal-jukebox">
              <div className="micro-player">
                <iframe
                  key={microtonalTracks[microTrack].videoId}
                  src={`https://www.youtube-nocookie.com/embed/${microtonalTracks[microTrack].videoId}?rel=0`}
                  title={`${microtonalTracks[microTrack].title} de Angine de Poitrine`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
              <div className="micro-tracklist">
                <div>
                  <span>SEÑAL DE VÍDEO · KEXP</span>
                  <strong>ANGINE DE POITRINE</strong>
                  <p>
                    Sesión completa y dos piezas independientes. Cambia de toma
                    aquí; las canciones del álbum viven en el reproductor de abajo.
                  </p>
                </div>
                {microtonalTracks.map((track, index) => (
                  <button
                    type="button"
                    key={track.videoId}
                    className={microTrack === index ? "active" : ""}
                    onClick={() => setMicroTrack(index)}
                    aria-pressed={microTrack === index}
                  >
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <span>
                      <strong>{track.title}</strong>
                      <small>{track.subtitle}</small>
                    </span>
                    <em>{track.tuning}</em>
                  </button>
                ))}
              </div>
            </div>
            <div className="micro-audio-vault">
              <div>
                <span>ARCHIVO DE AUDIO OFICIAL · SEPARADO DEL VÍDEO</span>
                <h4>VOL.II — ESCUCHA LAS CANCIONES</h4>
                <p>
                  Fabienk, Mata Zyklek, Sarniezz, Utzp, Yor Zarad y Angor se
                  reproducen por separado desde el álbum oficial del grupo.
                </p>
                <a
                  href="https://anginedepoitrine.bandcamp.com/album/vol-ii"
                  target="_blank"
                  rel="noreferrer"
                >
                  ABRIR BANDCAMP OFICIAL ↗
                </a>
              </div>
              <iframe
                title="Vol.II de Angine de Poitrine en Bandcamp"
                src="https://bandcamp.com/EmbeddedPlayer/album=1828228714/size=large/bgcol=ffffff/linkcol=111111/artwork=small/transparent=true/"
              />
            </div>
          </article>
        </div>
      </section>

      <section className="friends section-pad">
        <div className="friends-heading">
          <p className="eyebrow red">04 / TESTIMONIOS DEL REPARTO</p>
          <h2>Gente que volvería<br />para la segunda temporada.</h2>
        </div>
        <div className="testimonials">
          {friendTestimonials.map((testimonial) => (
            <article
              key={testimonial.number}
              data-secret-anchor={testimonial.number === "03" ? "friends" : undefined}
            >
              <div className="avatar-placeholder">
                <img
                  src={testimonial.image}
                  alt={testimonial.alt}
                  loading="lazy"
                />
                <span>{testimonial.number}</span>
              </div>
              <div>
                <p>{testimonial.role}</p>
                <blockquote>“{testimonial.quote}”</blockquote>
                <span>NOMBRE DEL AMIGO · CAST PENDIENTE</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="trailer-section section-pad" id="escena-22">
        <div className="trailer-poster" data-secret-anchor="trailer">
          <img
            className="trailer-photo"
            src="/archive/trailer-shoot.webp"
            alt="Equipo rodando una escena en una cocina"
            loading="lazy"
          />
          <div className="trailer-topline">
            <span>PUENTE DE MONTAJE · NO ES UN VÍDEO VACÍO</span>
            <span>00:22 · INTERACTIVO</span>
          </div>
          <div className="trailer-title">
            <small>DEL ARCHIVO REAL AL EXPEDIENTE IMPOSIBLE</small>
            <h2>CORTE<br /><strong>22</strong></h2>
            <button
              type="button"
              onClick={() => {
                setTrailerScene(0);
                setTrailerPaused(false);
                setTrailerOpen(true);
              }}
            >
              <span aria-hidden="true">✂</span>
              ABRIR MONTAJE INTERACTIVO
            </button>
          </div>
          <div className="trailer-caption">
            <p>
              Esta pieza ya no finge ser un “tráiler oficial” pendiente. Es el
              corte que conecta las producciones, los referentes y el archivo
              de terror que debe leerse antes de entrar en M00NW4LK.EXE.
            </p>
          </div>
        </div>
      </section>

      <section className={clapped ? "clapper clapped" : "clapper"} id="final">
        <div className="clapper-copy">
          <p className="eyebrow">ÚLTIMA ESCENA / PRIMERA TOMA</p>
          <h2>Todo preparado.<br />Solo falta cerrar la claqueta.</h2>
          <p>
            Un gesto para terminar esta proyección y desbloquear el comienzo de
            la escena 22.
          </p>
        </div>
        <button
          className="clapboard"
          type="button"
          onClick={() => setClapped(true)}
          aria-label="Cerrar la claqueta y desbloquear el mensaje final"
        >
          <span className="clap-top">
            <i /><i /><i /><i /><i />
          </span>
          <span className="clap-body">
            <span><small>PRODUCCIÓN</small><b>LA HISTORIA CONTINÚA</b></span>
            <span><small>DIRECTOR</small><b>RAÚL GARCÍA</b></span>
            <span className="clap-row">
              <span><small>ESCENA</small><b>22</b></span>
              <span><small>TOMA</small><b>∞</b></span>
              <span><small>SONIDO</small><b>ON</b></span>
            </span>
            <strong>{clapped ? "CORTE PERFECTO" : "PULSA PARA CERRAR"}</strong>
          </span>
        </button>
      </section>

      <section className={clapped ? "final-message revealed" : "final-message"}>
        <div className="final-frame">
          <img
            className="final-photo"
            src="/archive/final-festival.webp"
            alt="Raúl y su equipo en un festival de cortometrajes"
            loading="lazy"
          />
          <p className="eyebrow red">RAÚL GARCÍA · ESCENA 22 · TOMA ∞</p>
          <h2>Feliz cumpleaños,<br /><span>Raúl.</span></h2>
          <div className="final-copy">
            <p>
              Esta página no intenta resumir todo lo que eres, porque
              necesitaríamos demasiadas escenas.
            </p>
            <p>
              Solo quería recordarte que ya has creado cosas increíbles, que
              tienes personas que creen en ti y que esto no es el final de
              ninguna historia.
            </p>
            <p>Es solamente el comienzo de la escena 22.</p>
          </div>
          <strong className="final-line">LO MEJOR TODAVÍA ESTÁ POR RODARSE.</strong>
          <button type="button" onClick={() => setPostCredits(!postCredits)}>
            {postCredits ? "OCULTAR POSTCRÉDITOS" : "VER ESCENA POSTCRÉDITOS"}
            <span aria-hidden="true">→</span>
          </button>
        </div>
        <div className={postCredits ? "post-credits visible" : "post-credits"}>
          <img
            className="post-credits-photo"
            src="/archive/postcredits-team.webp"
            alt="Raúl y sus amigos celebrando juntos"
            loading="lazy"
          />
          <span>ESCENA POSTCRÉDITOS</span>
          <p>
            Sí, hay secuela. Se titula <strong>“Todo lo demás”</strong> y ya
            está en producción.
          </p>
          <small>FUNDIDO A NEGRO · 2026</small>
        </div>
      </section>

      <footer>
        <span>PREMIERE 22</span>
        <p>Hecho con recuerdos, cariño y alguna toma de más.</p>
        <span>RAAULINHOO © ESCENA 22</span>
      </footer>

      <SecretExtras
        started={started}
        scrollDepth={scrollDepth}
        soundOn={soundOn}
        blocked={
          activeVideo !== null || trailerOpen || recovered || chaseOpen
        }
        onExclusiveChange={setSecretExclusive}
      />

      {chaseOpen && (
        <div
          className={`moonwalk-chase phase-${chasePhase}`}
          role="dialog"
          aria-modal="true"
          aria-label="Pasadizo animatrónico M00NW4LK"
        >
          <div className="chase-corridor" aria-hidden="true">
            <div className="corridor-ceiling" />
            <div className="corridor-floor" />
            <div className="corridor-door door-one">CAM 01</div>
            <div className="corridor-door door-two">CAM 02</div>
            <div className="corridor-door door-three">CAM 03</div>
            <i className="corridor-light light-one" />
            <i className="corridor-light light-two" />
            <i className="corridor-light light-three" />
          </div>
          <div className="chase-hud">
            <span>● REC · PASADIZO 22</span>
            <strong>
              {
                [
                  "MOVIMIENTO DETECTADO",
                  "SUJETO APROXIMÁNDOSE EN MOONWALK",
                  "SOMBRERO RETIRADO · ERROR CERVICAL",
                  "CABEZA DESACOPLADA · CORRE",
                  "NO MIRES ATRÁS",
                ][chasePhase]
              }
            </strong>
            <span>FASE 0{chasePhase + 1}/05</span>
          </div>
          <div className="hybrid-performer" aria-hidden="true">
            <span className="hybrid-hat" />
            <span className="hybrid-head">
              <i className="hybrid-eye left" />
              <i className="hybrid-eye right" />
              <i className="hybrid-jaw" />
            </span>
            <span className="hybrid-neck" />
            <span className="hybrid-torso">
              <i /><i /><i />
            </span>
            <span className="hybrid-arm arm-left">
              <i className="white-glove" />
            </span>
            <span className="hybrid-arm arm-right" />
            <span className="hybrid-leg leg-left" />
            <span className="hybrid-leg leg-right" />
          </div>
          <div className="detached-hybrid-head" aria-hidden="true">
            <i className="head-ear left" />
            <i className="head-ear right" />
            <span>
              <i className="eye left" /><i className="eye right" />
              <b>22</b>
            </span>
            <i className="head-jaw" />
          </div>
          <div className="chase-jumpscare" aria-hidden="true">
            <span>22</span>
          </div>
          <div className="chase-instruction">
            <small>M00NW4LK.EXE</small>
            <p>
              {chasePhase < 4
                ? "El protocolo no recomienda quedarse quieto."
                : "Te ha encontrado. Feliz escena 22."}
            </p>
          </div>
          <button
            type="button"
            className="chase-close"
            onClick={closeChase}
          >
            {chasePhase < 4 ? "ABORTAR PASADIZO ×" : "SALIR CON VIDA →"}
          </button>
        </div>
      )}

      {heeReady && scrollDepth >= 50 && !heeMuted && !secretExclusive && (
        <div
          className={`hee-chaos-visual chaos-x${heeMultiplierForDepth(scrollDepth / 100)}`}
          aria-hidden="true"
        >
          {Array.from(
            { length: heeMultiplierForDepth(scrollDepth / 100) },
            (_, index) => (
              <span key={index} style={{ animationDelay: `${index * -0.11}s` }}>
                {index % 2 ? "HI-HI" : "HEE-HEE"}
              </span>
            ),
          )}
        </div>
      )}

      {heeReady && scrollDepth >= 50 && !heeMuted && !secretExclusive && (
        <aside
          className={`hee-control-panel evade-${muteAttempts}`}
          data-hee-control
          aria-live="polite"
        >
          <div className="hee-alert-line">
            <span className="hee-alert-dot" />
            <small>CLIP REAL · SATURACIÓN VOCAL</small>
            <b>{String(muteAttempts).padStart(2, "0")}/05</b>
          </div>
          <div className="hee-control-copy">
            <span aria-hidden="true">HEE</span>
            <div>
              <strong>HEE-HEE EN REACCIÓN EN CADENA</strong>
              <p>
                La frecuencia ya ha superado el límite anterior. Ahora también
                se multiplica.
              </p>
            </div>
          </div>
          <div className="hee-readouts">
            <div>
              <span>PROFUNDIDAD</span>
              <b>{scrollDepth}%</b>
            </div>
            <div>
              <span>VOLUMEN</span>
              <b>{Math.min(90, Math.round(18 + scrollDepth * 0.72))}%</b>
            </div>
            <div>
              <span>FRECUENCIA</span>
              <b>{(1000 / heeDelayForDepth(scrollDepth / 100)).toFixed(1)}/s</b>
            </div>
            <div>
              <span>MULTIPLICADOR</span>
              <b>×{heeMultiplierForDepth(scrollDepth / 100)}</b>
            </div>
          </div>
          <div className="hee-intensity-track" aria-hidden="true">
            <i style={{ width: `${scrollDepth}%` }} />
          </div>
          <button
            type="button"
            onClick={handleMuteAttempt}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                event.stopPropagation();
                silenceHee();
              }
            }}
            aria-label={
              muteAttempts < 5
                ? `Intentar silenciar el hee-hee. Intento ${muteAttempts + 1} de 6`
                : "Silenciar definitivamente el hee-hee"
            }
          >
            {heeButtonLabels[muteAttempts]}
            <span aria-hidden="true">{muteAttempts < 5 ? "↗" : "■"}</span>
          </button>
          <p className="hee-footnote">
            {muteAttempts < 5
              ? "El botón presenta una resistencia coreográfica inesperada."
              : "Ya se ha cansado. Ahora sí puedes atraparlo."}
          </p>
        </aside>
      )}

      {heeMuted && (
        <div className="hee-silenced" role="status" data-hee-control>
          <span>■</span>
          HEE-HEE SILENCIADO · MISCHIEF MANAGED
        </div>
      )}

      {activeVideo !== null && (
        <div
          className="youtube-modal"
          role="dialog"
          aria-modal="true"
          aria-label={`Reproduciendo ${projects[activeVideo].title}`}
        >
          <button
            className="modal-close"
            type="button"
            onClick={() => setActiveVideo(null)}
            aria-label="Cerrar vídeo"
          >
            CERRAR SALA ×
          </button>
          <div className="youtube-player">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${projects[activeVideo].videoId}?autoplay=1&rel=0`}
              title={projects[activeVideo].title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
          <div className="player-caption">
            <span>{projects[activeVideo].code} · {projects[activeVideo].year}</span>
            <strong>{projects[activeVideo].title}</strong>
            <a
              href={`https://www.youtube.com/watch?v=${projects[activeVideo].videoId}`}
              target="_blank"
              rel="noreferrer"
            >
              VER EN YOUTUBE ↗
            </a>
          </div>
        </div>
      )}

      {trailerOpen && (
        <div
          className={`trailer-modal trailer-theme-${activeTrailerScene.theme} ${trailerPaused ? "is-paused" : ""}`}
          role="dialog"
          aria-modal="true"
          aria-label="Montaje interactivo de la escena 22"
        >
          <button
            className="modal-close"
            type="button"
            onClick={() => setTrailerOpen(false)}
            aria-label="Cerrar tráiler"
          >
            CERRAR ×
          </button>

          <div className="trailer-edit-suite">
            <header className="trailer-suite-header">
              <div>
                <i aria-hidden="true" />
                <span>REC · MONTAJE EN DIRECTO</span>
              </div>
              <strong>CORTE 22 / RAÚL GARCÍA</strong>
              <span>{activeTrailerScene.timecode}</span>
            </header>

            <div className="trailer-master-progress" aria-label={`Capítulo ${trailerScene + 1} de ${trailerScenes.length}`}>
              {trailerScenes.map((scene, index) => (
                <i
                  key={scene.number}
                  className={
                    index < trailerScene
                      ? "complete"
                      : index === trailerScene
                        ? "active"
                        : ""
                  }
                >
                  {index === trailerScene && <b key={trailerScene} />}
                </i>
              ))}
            </div>

            <div className="trailer-screen">
              <div className="trailer-film-frame" key={trailerScene}>
                <img
                  className="trailer-main-image"
                  src={activeTrailerScene.mainImage}
                  alt={activeTrailerScene.mainAlt}
                />
                <div className="trailer-image-wash" aria-hidden="true" />
                <div className="trailer-film-noise" aria-hidden="true" />
                <div className="trailer-gate-flash" aria-hidden="true" />
                <span className="trailer-scene-number" aria-hidden="true">
                  {activeTrailerScene.number}
                </span>

                <div className="trailer-frame-meta trailer-frame-meta-top">
                  <span>{activeTrailerScene.camera}</span>
                  <span>ISO 800 · 24 FPS</span>
                </div>

                <div className="trailer-cut-stack">
                  {activeTrailerScene.cutImages.map((image, index) => (
                    <figure key={image.src}>
                      <img src={image.src} alt={image.alt} />
                      <figcaption>
                        <span>0{trailerScene + 1}{String.fromCharCode(65 + index)}</span>
                        {image.label}
                      </figcaption>
                    </figure>
                  ))}
                </div>

                <div className="trailer-scene-copy" aria-live="polite">
                  <p>{activeTrailerScene.eyebrow}</p>
                  <h2>{activeTrailerScene.title}</h2>
                  <div>
                    <span />
                    <p>{activeTrailerScene.body}</p>
                  </div>
                </div>

                <div className="trailer-frame-meta trailer-frame-meta-bottom">
                  <span>{activeTrailerScene.note}</span>
                  <span>{activeTrailerScene.timecode}</span>
                </div>
              </div>

              <button
                className="trailer-step trailer-step-prev"
                type="button"
                onClick={() =>
                  setTrailerScene(
                    (value) =>
                      (value - 1 + trailerScenes.length) % trailerScenes.length,
                  )
                }
                aria-label="Ver corte anterior"
              >
                ←
              </button>
              <button
                className="trailer-step trailer-step-next"
                type="button"
                onClick={() =>
                  setTrailerScene((value) => (value + 1) % trailerScenes.length)
                }
                aria-label="Ver corte siguiente"
              >
                →
              </button>
            </div>

            <div className="trailer-control-deck">
              <button
                className="trailer-play-control"
                type="button"
                onClick={() => setTrailerPaused((value) => !value)}
                aria-pressed={trailerPaused}
              >
                <span aria-hidden="true">{trailerPaused ? "▶" : "Ⅱ"}</span>
                {trailerPaused ? "REANUDAR MONTAJE" : "PAUSAR MONTAJE"}
              </button>

              <nav className="trailer-chapters" aria-label="Capítulos del montaje">
                {trailerScenes.map((scene, index) => (
                  <button
                    type="button"
                    key={scene.number}
                    className={index === trailerScene ? "active" : ""}
                    onClick={() => setTrailerScene(index)}
                    aria-current={index === trailerScene ? "step" : undefined}
                  >
                    <span className="trailer-chapter-image">
                      <img src={scene.mainImage} alt="" />
                      <b>{scene.number}</b>
                    </span>
                    <span>
                      <small>CORTE 0{index + 1}</small>
                      <strong>{scene.title}</strong>
                    </span>
                  </button>
                ))}
              </nav>
            </div>

            <footer className="trailer-suite-footer">
              <p>
                CUATRO CAPAS, ARCHIVO REAL Y UNA SEÑAL QUE NO DEBERÍA ESTAR AQUÍ.
                <span> Usa ← → para montar a mano.</span>
              </p>
              <button
                className="trailer-route-button"
                type="button"
                onClick={focusRecoveredMaterial}
              >
                IR AL MATERIAL RECUPERADO <span>→</span>
              </button>
            </footer>
          </div>
        </div>
      )}

      {recovered && (
        <div
          className={`recovered-overlay recovered-step-${recoveredStep}`}
          role="dialog"
          aria-modal="true"
          aria-label="Tarjeta de material recuperado"
        >
          <button
            className="recovered-close"
            type="button"
            onClick={() => setRecovered(false)}
            aria-label="Cerrar material recuperado"
          >
            CERRAR EXPEDIENTE ×
          </button>
          <div className="recovered-static" aria-hidden="true" />
          <div className="recovered-dossier">
            <div className="recovered-header">
              <span>FAZBEAR ARCHIVE · INCIDENTE RG-22</span>
              <strong>MATERIAL<br />RECUPERADO</strong>
              <small>ARCHIVO: AHORA_SI_FINAL.mov · INTEGRIDAD 22%</small>
            </div>
            <div className="recovered-eye-feed" aria-hidden="true">
              <div className="animatronic-eye">22</div>
              <span>CAM 05 · CONDUCTOS · 02:22:17</span>
            </div>
            <div className="recovered-fragments" aria-live="polite">
              <div
                className={recoveredStep === 0 ? "recovered-empty-state visible" : "recovered-empty-state"}
                aria-hidden={recoveredStep !== 0}
              >
                <span>CANAL 02 · SEÑAL BLOQUEADA</span>
                <div aria-hidden="true"><i /><i /><i /><i /><i /></div>
                <strong>0 / 5</strong>
                <p>
                  El archivo no está vacío. Los fragmentos permanecen ocultos
                  hasta que interceptes la primera transmisión.
                </p>
                <small>ESPERANDO AUTORIZACIÓN DEL OPERADOR_</small>
              </div>
              {recoveredFragments.map((fragment, index) => (
                <article
                  key={fragment.code}
                  className={index < recoveredStep ? "visible" : ""}
                >
                  <span>{fragment.code}</span>
                  <strong>{fragment.title}</strong>
                  <p>{fragment.body}</p>
                </article>
              ))}
            </div>
            {recoveredStep < recoveredFragments.length ? (
              <button
                className={`recovered-catch catch-${recoveredStep}`}
                type="button"
                onClick={revealRecoveredFragment}
              >
                <small>
                  FRAGMENTO {String(recoveredStep + 1).padStart(2, "0")} / 05
                </small>
                {recoveredStep === 0
                  ? "INTERCEPTAR ARCHIVO"
                  : "LA VENTANA HA ESCAPADO · ATRÁPALA"}
              </button>
            ) : (
              <div className="recovered-authorized">
                <span>✓ LOS CINCO FRAGMENTOS HAN SIDO LEÍDOS</span>
                <strong>ACCESO AUTORIZADO</strong>
                <a href="/walk-exe">
                  EJECUTAR M00NW4LK.EXE <span>→</span>
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
