"use client";

import { useEffect, useRef, useState } from "react";

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
    kind: "Videoclip / comedia",
    year: "ARCHIVO 01",
    role: "Una idea pequeña convertida en universo propio.",
    color: "red",
  },
  {
    title: "WTF EL DOCUMENTAL",
    code: "P02",
    kind: "Documental",
    year: "ARCHIVO 02",
    role: "Porque la realidad también necesita montaje.",
    color: "blue",
  },
  {
    title: "CORAZÓN INTACTO",
    code: "P03",
    kind: "Pieza musical",
    year: "ARCHIVO 03",
    role: "Sensibilidad, ritmo y una toma más por si acaso.",
    color: "violet",
  },
  {
    title: "CATARSIS",
    code: "P04",
    kind: "Cortometraje",
    year: "ARCHIVO 04",
    role: "Cuando crear también sirve para decir lo que cuesta.",
    color: "amber",
  },
  {
    title: "Imágenes Ocultas",
    code: "48H",
    kind: "Proyección especial · selección oficial",
    year: "RODADO EN 48 HORAS",
    role: "Cuarenta y ocho horas. Cero excusas. Mucho cine.",
    color: "special",
  },
  {
    title: "DAVINCI",
    code: "P06",
    kind: "Proyecto audiovisual",
    year: "ARCHIVO 06",
    role: "Precisión técnica con alma de experimento.",
    color: "blue",
  },
  {
    title: "QUE CALOREH",
    code: "P07",
    kind: "Parodia musical",
    year: "ARCHIVO 07",
    role: "La prueba de que hasta el calor puede tener videoclip.",
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

export default function Home() {
  const [started, setStarted] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const [selectedProject, setSelectedProject] = useState(4);
  const [mjAnswer, setMjAnswer] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const [recovered, setRecovered] = useState(false);
  const [trailerOpen, setTrailerOpen] = useState(false);
  const [trailerScene, setTrailerScene] = useState(0);
  const [clapped, setClapped] = useState(false);
  const [postCredits, setPostCredits] = useState(false);
  const audioRef = useRef<{
    context: AudioContext;
    oscillators: OscillatorNode[];
    gain: GainNode;
  } | null>(null);

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
            <p className="eyebrow">ARCHIVO / PRODUCCIONES ANTERIORES</p>
            <h2>Siete historias.<br />Ninguna última toma.</h2>
          </div>
          <p>
            Una filmografía sentimental en forma de cinta. Selecciona un
            fotograma para revisar su ficha.
          </p>
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
                <small>{project.code}</small>
                <b>{project.title}</b>
                {project.color === "special" && <em>SELECCIÓN OFICIAL</em>}
              </span>
              <span className="film-meta">
                <small>{project.year}</small>
                <strong>{project.kind}</strong>
              </span>
            </button>
          ))}
        </div>

        <article className="project-focus" aria-live="polite">
          <div className="focus-index">{projects[selectedProject].code}</div>
          <div>
            <p className="eyebrow red">{projects[selectedProject].kind}</p>
            <h3>{projects[selectedProject].title}</h3>
            <p>{projects[selectedProject].role}</p>
          </div>
          <button
            type="button"
            onClick={() => setTrailerOpen(true)}
            className="text-action"
          >
            VER EN EL TRÁILER <span aria-hidden="true">↗</span>
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

      <section className="reference-room section-pad">
        <div className="section-heading">
          <div>
            <p className="eyebrow">03 / SALA DE REFERENTES</p>
            <h2>Entrar bajo<br />tu propia responsabilidad.</h2>
          </div>
          <p>
            Tres obsesiones, una habitación y demasiados cables sin etiquetar.
          </p>
        </div>
        <div className="room-grid">
          <article className="reference-card jackson">
            <span className="room-number">A / 01</span>
            <div className="mj-silhouette" aria-hidden="true">♬</div>
            <p className="eyebrow red">SMOOTH REFERENCE</p>
            <h3>Raúl,<br />are you OK?</h3>
            <button type="button" onClick={() => setMjAnswer(!mjAnswer)}>
              {mjAnswer ? "OCULTAR RESPUESTA" : "COMPROBAR ESTADO"}
            </button>
            <p className={mjAnswer ? "room-answer visible" : "room-answer"}>
              Está más que OK. Acaba de comenzar la escena 22.
            </p>
          </article>

          <article className="reference-card nolan">
            <span className="room-number">B / 02</span>
            <div className="countdown" aria-live="polite">
              <span>00</span>:<span>{String(countdown).padStart(2, "0")}</span>
            </div>
            <p className="eyebrow">CRONOLOGÍA NO LINEAL</p>
            <h3>El tiempo<br />es relativo.</h3>
            <p className="room-quote">
              “No intentes entender la cronología. Es una producción de Raúl.”
            </p>
          </article>

          <article className="reference-card horror">
            <span className="room-number">CAM 03</span>
            <div className="cctv">
              <span>● REC</span>
              <div className="secret-door" aria-hidden="true">
                <i />
              </div>
              <small>NO SIGNAL</small>
            </div>
            <p className="eyebrow red">MATERIAL RECUPERADO</p>
            <h3>No abras<br />esa puerta.</h3>
            <button type="button" onClick={() => setRecovered(true)}>
              LEER TARJETA SD
            </button>
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
