"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const credits = [
  "Dirección",
  "Cámara",
  "Sonido",
  "Iluminación",
  "Montaje",
  "Color",
  "Producción",
  "Interpretación",
  "Música",
  "Creatividad",
];

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
  ["01", "TODO EMPEZÓ CON UNA IDEA"],
  ["02", "LUEGO LLEGARON LA CÁMARA, LAS LUCES Y EL SONIDO"],
  ["03", "Y UNA GENTE DISPUESTA A VIVIRLO A SU LADO"],
  ["22", "ESTO NO ES UN RESUMEN. ES UN TRÁILER."],
];

const cameraFeeds = [
  ["CAM 01", "ESCENARIO", "Tres siluetas en escena. Una ya no mira al público."],
  ["CAM 02", "COMEDOR", "Las mesas están vacías. Hay un plato recién movido."],
  ["CAM 03", "PASILLO OESTE", "Movimiento detectado a 4,2 metros de la oficina."],
  ["CAM 04", "SERVICIO", "Unidad animatrónica fuera de su punto de carga."],
  ["CAM 05", "CONDUCTOS", "Ruido metálico avanzando por la ventilación."],
  ["CAM 06", "OFICINA 22", "Energía estable. Puertas sin bloquear."],
];

const microSteps = Array.from({ length: 22 }, (_, index) => ({
  number: String(index + 1).padStart(2, "0"),
  cents: Math.round((1200 / 22) * index),
}));

const microtonalTracks = [
  {
    title: "RATTLESNAKE",
    subtitle: "Official Video · Flying Microtonal Banana",
    videoId: "Q-i1XZc8ZwA",
    tuning: "24-TET / MICROTONAL GUITARS",
  },
  {
    title: "NUCLEAR FUSION",
    subtitle: "Official Audio · Flying Microtonal Banana",
    videoId: "4MFVhqcRpN4",
    tuning: "CUSTOM MICROTONAL FRETS",
  },
  {
    title: "SLEEP DRIFTER",
    subtitle: "Official Audio · Flying Microtonal Banana",
    videoId: "8XW8yofuGao",
    tuning: "PSYCHEDELIC MICROTONAL",
  },
];

const animatronicArchive = [
  ["FREDDY", "FZ-01", 0.82],
  ["BONNIE", "BN-02", 0.92],
  ["CHICA", "CH-03", 1],
  ["FOXY", "FX-04", 1.12],
  ["GOLDEN FREDDY", "GF-05", 0.68],
  ["SPRINGTRAP", "ST-06", 0.76],
  ["PUPPET", "PP-07", 1.24],
  ["MANGLE", "MG-08", 1.35],
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
  const [countdown, setCountdown] = useState(10);
  const [recovered, setRecovered] = useState(false);
  const [trailerOpen, setTrailerOpen] = useState(false);
  const [trailerScene, setTrailerScene] = useState(0);
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
  const scrollDepthRef = useRef(0);
  const heeAudioRef = useRef<Set<HTMLAudioElement>>(new Set());
  const heeBurstTimersRef = useRef<Set<number>>(new Set());
  const jumpscareAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioRef = useRef<{
    context: AudioContext;
    oscillators: OscillatorNode[];
    gain: GainNode;
  } | null>(null);

  const playHee = useCallback(() => {
    if (heeMuted || typeof window === "undefined") return;

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
  }, [heeMuted]);

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
    if (!heeReady || heeMuted || scrollBand < 3) return;
    const delay = heeDelayForDepth(scrollBand / 20);
    const timer = window.setInterval(playHee, delay);
    return () => window.clearInterval(timer);
  }, [heeReady, heeMuted, playHee, scrollBand]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCountdown((value) => (value <= 0 ? 10 : value - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!trailerOpen) return;
    setTrailerScene(0);
    const timer = window.setInterval(() => {
      setTrailerScene((value) =>
        value >= trailerScenes.length - 1 ? 0 : value + 1,
      );
    }, 2300);
    return () => window.clearInterval(timer);
  }, [trailerOpen]);

  useEffect(() => {
    if (!recovered) return;
    const timer = window.setTimeout(() => setRecovered(false), 1700);
    return () => window.clearTimeout(timer);
  }, [recovered]);

  useEffect(() => {
    if (!chaseOpen) return;
    setChasePhase(0);
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
      audioRef.current.gain.gain.exponentialRampToValueAtTime(
        0.0001,
        audioRef.current.context.currentTime + 0.25,
      );
      window.setTimeout(() => {
        audioRef.current?.oscillators.forEach((osc) => osc.stop());
        void audioRef.current?.context.close();
        audioRef.current = null;
      }, 280);
      setSoundOn(false);
      return;
    }

    const context = new AudioContext();
    const gain = context.createGain();
    gain.gain.value = 0.018;
    gain.connect(context.destination);
    const oscillators = [48, 52].map((frequency) => {
      const osc = context.createOscillator();
      osc.type = "sine";
      osc.frequency.value = frequency;
      osc.connect(gain);
      osc.start();
      return osc;
    });
    audioRef.current = { context, oscillators, gain };
    setSoundOn(true);
  };

  const begin = () => {
    setStarted(true);
    window.setTimeout(() => {
      document.getElementById("premiere")?.scrollIntoView({ behavior: "smooth" });
    }, 350);
  };

  const playMicrotone = (index: number) => {
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const frequency = 110 * Math.pow(2, index / 22);

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
    const sample = new Audio("/audio/fnaf-jumpscare-scream.mp3");
    sample.volume = 0.42;
    sample.playbackRate = animatronicArchive[index][2];
    jumpscareAudioRef.current = sample;
    setScreamActive(index);
    sample.addEventListener(
      "ended",
      () => {
        setScreamActive(null);
        jumpscareAudioRef.current = null;
      },
      { once: true },
    );
    void sample.play().catch(() => setScreamActive(null));
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
          SONIDO {soundOn ? "ON" : "OFF"}
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
        <div className="portrait-frame" aria-label="Fotograma reservado para una foto de Raúl">
          <div className="camera-reticle" aria-hidden="true">
            <span>REC</span>
            <b>RAÚL</b>
            <small>FOTOGRAMA PERSONAL</small>
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
            <div key={credit}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <b>{credit}</b>
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
          <div className="channel-avatar">R</div>
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

        <article className="project-focus" aria-live="polite">
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
          {[
            ["01A", "GRABANDO", "La mirada detrás del objetivo"],
            ["02B", "EN CABINA", "Donde cada detalle cuenta"],
            ["03C", "CON SU GENTE", "El reparto que nunca falla"],
            ["04D", "TOMA FALSA", "La mejor parte del rodaje"],
            ["05E", "MONTANDO", "FINAL_v7_ahora_si"],
          ].map(([code, title, caption], index) => (
            <figure key={code} className={`photo-placeholder photo-${index + 1}`}>
              <div>
                <span>FOTO {code}</span>
                <b>{title}</b>
              </div>
              <figcaption>{caption}</figcaption>
            </figure>
          ))}
          <div className="tape-note">
            <span>NOTA DE MONTAJE</span>
            <p>
              Sustituir estos fotogramas por las fotos que solo su gente puede
              explicar.
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
          <article className="idol-card mj-world">
            <div className="idol-label">
              <span>REFERENTE 01</span>
              <strong>THE KING OF POP</strong>
            </div>
            <figure className="mj-stage">
              <img
                src="/michael/michael-jackson-1988.jpg"
                alt="Michael Jackson actuando durante la gira Bad en 1988"
              />
              <i className="spotlight left" />
              <i className="spotlight right" />
              <div className="mj-photo-scan" aria-hidden="true" />
              <figcaption>
                <span>BAD WORLD TOUR · 1988</span>
                <a
                  href="https://commons.wikimedia.org/wiki/File:Michael_Jackson_in_1988.jpg"
                  target="_blank"
                  rel="noreferrer"
                >
                  FOTO REAL · ZORAN VESELINOVIC · CC BY-SA 2.0 ↗
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
              <div className="era-tapes" aria-label="Eras musicales">
                <span>THRILLER</span><span>BAD</span><span>DANGEROUS</span><span>HISTORY</span>
              </div>
              <button type="button" onClick={() => setMjAnswer(!mjAnswer)}>
                RAÚL, ARE YOU OK? <span>→</span>
              </button>
              <p className={mjAnswer ? "room-answer visible" : "room-answer"}>
                Está más que OK. Acaba de empezar la escena 22.
              </p>
            </div>
          </article>

          <article className="idol-card nolan-world">
            <div className="idol-label">
              <span>REFERENTE 02</span>
              <strong>TIEMPO / ESCALA / CINE</strong>
            </div>
            <div className="nolan-clock" aria-live="polite">
              <div className="clock-ring ring-one" />
              <div className="clock-ring ring-two" />
              <div className="clock-ring ring-three" />
              <span>00:{String(countdown).padStart(2, "0")}</span>
              <small>T– ESCENA 22</small>
            </div>
            <div className="idol-copy">
              <p className="eyebrow">CRONOLOGÍA NO LINEAL</p>
              <h3>CHRISTOPHER<br />NOLAN</h3>
              <p>
                Relojes, estructuras dentro de estructuras, espectáculo a gran
                escala y la sospecha permanente de que falta una capa más.
              </p>
              <blockquote>
                “No intentes entender la cronología. Es una producción de Raúl.”
              </blockquote>
              <div className="time-layers">
                <span>REALIDAD</span><span>RODAJE</span><span>MONTAJE</span>
              </div>
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
                  <strong>{cameraFeeds[cameraFeed][0]} · {cameraFeeds[cameraFeed][1]}</strong>
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
                </div>
                <div className="animatronic-silhouette" aria-hidden="true">
                  <i className="ear left" /><i className="ear right" />
                  <i className="head" /><i className="eye left" /><i className="eye right" />
                  <i className="jaw" />
                  <i className="torso" /><i className="arm left" /><i className="arm right" />
                  <i className="hand left" /><i className="hand right" />
                </div>
                <p>{cameraFeeds[cameraFeed][2]}</p>
              </div>
              <div className="camera-console">
                <div className="camera-map">
                  <span className="map-you">YOU</span>
                  <i className="map-wire wire-one" />
                  <i className="map-wire wire-two" />
                  {cameraFeeds.map(([camera, room], index) => (
                    <button
                      type="button"
                      key={camera}
                      className={cameraFeed === index ? "active" : ""}
                      onClick={() => setCameraFeed(index)}
                    >
                      <span>{camera}</span>
                      <small>{room}</small>
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
                {animatronicArchive.map(([name, code], index) => (
                  <button
                    type="button"
                    key={name}
                    className={screamActive === index ? "active" : ""}
                    onClick={() => playJumpscare(index)}
                    aria-label={`Reproducir grito de ${name}`}
                  >
                    <span className="scream-face" aria-hidden="true">
                      <i /><i /><b>{name.slice(0, 1)}</b>
                    </span>
                    <span>
                      <small>{code}</small>
                      <strong>{name}</strong>
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
              <a className="fnaf-game-link" href="/walk-exe">
                ENTRAR AL PASADIZO M00NW4LK.EXE <span>→</span>
              </a>
              <button type="button" onClick={() => setRecovered(true)}>
                LEER TARJETA “MATERIAL RECUPERADO” <span>↗</span>
              </button>
            </div>
          </article>

          <article className="idol-card micro-world">
            <div className="idol-label">
              <span>OBSESIÓN SONORA 04</span>
              <strong>SISTEMA DE AFINACIÓN 22-EDO</strong>
            </div>
            <div className="micro-copy">
              <p className="eyebrow">MÚSICA MICROTONAL</p>
              <h3>ENTRE DOS NOTAS<br />HAY OTRO UNIVERSO.</h3>
              <p>
                La octava no tiene por qué dividirse en doce. Aquí se reparte
                en veintidós pasos: pulsa cualquiera para escuchar los matices
                que viven entre las teclas conocidas.
              </p>
              <div className="tuning-readout">
                <span>BASE</span><b>110.00 Hz</b>
                <span>DIVISIÓN</span><b>22 EDO</b>
                <span>PASO</span><b>54.55 ¢</b>
              </div>
            </div>
            <div className="micro-sequencer" aria-label="Teclado microtonal de veintidós pasos">
              <div className="waveform" aria-hidden="true">
                {Array.from({ length: 44 }, (_, index) => (
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
              <p>PULSA LOS PASOS · EL SONIDO SOLO SE ACTIVA AL INTERACTUAR</p>
            </div>
            <div className="microtonal-jukebox">
              <div className="micro-player">
                <iframe
                  key={microtonalTracks[microTrack].videoId}
                  src={`https://www.youtube-nocookie.com/embed/${microtonalTracks[microTrack].videoId}?rel=0`}
                  title={`${microtonalTracks[microTrack].title} de King Gizzard & the Lizard Wizard`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
              <div className="micro-tracklist">
                <div>
                  <span>FLYING MICROTONAL BANANA</span>
                  <strong>KING GIZZARD &amp; THE LIZARD WIZARD</strong>
                  <p>
                    Tres puertas de entrada a su etapa microtonal. Selecciona
                    una pista y pulsa play en el reproductor oficial.
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
          </article>
        </div>
      </section>

      <section className="friends section-pad">
        <div className="friends-heading">
          <p className="eyebrow red">04 / TESTIMONIOS DEL REPARTO</p>
          <h2>Gente que volvería<br />para la segunda temporada.</h2>
        </div>
        <div className="testimonials">
          {[
            ["01", "AYUDANTE DE DIRECCIÓN EMOCIONAL", "Aquí irá ese mensaje que consigue hacerte reír y emocionarte en la misma frase."],
            ["02", "PRODUCTOR DE MOMENTOS ABSURDOS", "Testigo oficial de ideas que empezaron como una broma y terminaron teniendo créditos."],
            ["03", "TÉCNICO DE RECUERDOS", "Responsable de conservar las tomas que nunca deberían borrarse."],
            ["04", "AMIGO RECURRENTE", "Presente desde la primera temporada. Renovado indefinidamente."],
          ].map(([number, role, quote]) => (
            <article key={number}>
              <div className="avatar-placeholder">{number}</div>
              <div>
                <p>{role}</p>
                <blockquote>“{quote}”</blockquote>
                <span>NOMBRE DEL AMIGO · CAST PENDIENTE</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="trailer-section section-pad">
        <div className="trailer-poster">
          <div className="trailer-topline">
            <span>TRÁILER OFICIAL</span>
            <span>01:42</span>
          </div>
          <div className="trailer-title">
            <small>UNA VIDA EN PRODUCCIÓN</small>
            <h2>ESCENA<br /><strong>22</strong></h2>
            <button type="button" onClick={() => setTrailerOpen(true)}>
              <span aria-hidden="true">▶</span>
              REPRODUCIR EXPERIENCIA
            </button>
          </div>
          <div className="trailer-caption">
            <p>
              No es una película sobre lo que ya ha hecho. Es el tráiler de
              todo lo que todavía está por venir.
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

      {heeReady && scrollDepth >= 50 && !heeMuted && (
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

      {heeReady && scrollDepth >= 50 && !heeMuted && (
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
        <div className="trailer-modal" role="dialog" aria-modal="true" aria-label="Tráiler de la escena 22">
          <button
            className="modal-close"
            type="button"
            onClick={() => setTrailerOpen(false)}
            aria-label="Cerrar tráiler"
          >
            CERRAR ×
          </button>
          <div className="trailer-screen">
            <span className="trailer-scene-number">
              {trailerScenes[trailerScene][0]}
            </span>
            <p>{trailerScenes[trailerScene][1]}</p>
            <div className="trailer-progress">
              {trailerScenes.map((_, index) => (
                <i key={index} className={index === trailerScene ? "active" : ""} />
              ))}
            </div>
          </div>
          <p className="trailer-note">
            Esta secuencia está lista para recibir el vídeo final de 90–120
            segundos cuando estén disponibles las fotos y clips.
          </p>
        </div>
      )}

      {recovered && (
        <div className="recovered-overlay" role="alert">
          <div className="animatronic-eye">22</div>
          <p>MATERIAL RECUPERADO</p>
          <small>ARCHIVO: AHORA_SI_FINAL.mov</small>
        </div>
      )}
    </main>
  );
}
