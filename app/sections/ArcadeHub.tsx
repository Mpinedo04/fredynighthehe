"use client";

import { memo } from "react";

type ArcadeHubProps = {
  materialRead: boolean;
  moonwalkBest: string | null;
  walkBest: string | null;
  onOpenTrailer: () => void;
  onOpenChase: () => void;
  onOpenRecovered: () => void;
  onOpenMicroLab: () => void;
};

/**
 * Scene 08 (Acto III): Sesión Golfa · Experiencias y Juegos.
 * Puts Corte 22, Huida en Moonwalk 3D, Lab 24 TET, and M00NW4LK.EXE in one
 * crystal-clear hub so Raúl never misses a game hidden inside a tab.
 */
function ArcadeHub({
  materialRead,
  moonwalkBest,
  walkBest,
  onOpenTrailer,
  onOpenChase,
  onOpenRecovered,
  onOpenMicroLab,
}: ArcadeHubProps) {
  return (
    <section className="arcade-hub section-pad" id="juegos">
      <div className="section-heading" data-reveal>
        <div>
          <p className="eyebrow red">
            <span className="scene-chip">ESC 08 · ACTO III</span> SESIÓN GOLFA · EXPERIENCIAS JUGABLES
          </p>
          <h2>No solo se mira.<br />Se juega.</h2>
        </div>
        <p>
          Aquí están reunidas las cuatro experiencias interactivas de la premiere
          para que no tengas que buscarlas a ciegas: el montaje, los dos juegos 3D
          y el lienzo microtonal.
        </p>
      </div>

      {/* Featured main attraction: M00NW4LK.EXE */}
      <article className="arcade-hero-game" data-reveal="gate">
        <div className="arcade-hero-copy">
          <div className="arcade-badges">
            <span className="arcade-badge hot">PLATO FUERTE · JUEGO 3D COMPLETO</span>
            <span className="arcade-badge">PRIMERA PERSONA · SIGILO Y TERROR</span>
            {walkBest && <span className="arcade-badge gold">RÉCORD · {walkBest}</span>}
          </div>
          <h3>M00NW4LK<span>.EXE</span></h3>
          <p>
            Laberinto procedural en 3D con cámaras CCTV, conductos y <strong>Sujeto M-22</strong>{" "}
            acechándote con memoria acústica y sigilo por linterna.
          </p>
          <ol className="arcade-mission-steps">
            <li>
              <b>01 · OBJETIVO</b>
              <span>Recupera 3 de las 5 cintas de Raúl (las 5 desbloquean el final Director&apos;s Cut) siguiendo el rastreador VHS y el mapa CCTV.</span>
            </li>
            <li>
              <b>02 · SIGILO</b>
              <span>Agáchate (CTRL) y apaga la linterna (F) para esconderte, o deslúmbralo con la linterna directa para inmovilizarlo 2 s.</span>
            </li>
            <li>
              <b>03 · SECRETO</b>
              <span>Hay un vinilo oculto de Ghost (1969) en los pasillos que recarga +25% de batería CCTV y te da un eco extra.</span>
            </li>
          </ol>

          <div className="arcade-hero-actions" data-hee-control>
            <button
              id="material-recuperado-hub"
              type="button"
              className="arcade-btn secondary"
              onClick={onOpenRecovered}
            >
              <span>{materialRead ? "✓ DOSSIER LEÍDO · RELEER" : "PASO 1 · LEER MATERIAL RECUPERADO"}</span>
              <b aria-hidden="true">↗</b>
            </button>
            <a
              href="/walk-exe"
              className={`arcade-btn primary ${materialRead ? "unlocked" : "direct"}`}
            >
              <span>
                {materialRead
                  ? "▶ JUGAR A M00NW4LK.EXE AHORA"
                  : "▶ ENTRAR DIRECTO A M00NW4LK.EXE"}
              </span>
              <b aria-hidden="true">→</b>
            </a>
          </div>
          {!materialRead && (
            <small className="arcade-hint">
              Consejo: leer «Material Recuperado» antes te da el lore y el primer susto, pero puedes entrar directo al juego si quieres.
            </small>
          )}
        </div>

        <div className="arcade-hero-visual" aria-hidden="true">
          <img src="/animatronics/ursus-9.webp" alt="" loading="lazy" decoding="async" />
          <div className="arcade-visual-overlay">
            <span>● REC · BODY-CAM 24 FPS</span>
            <strong>SUJETO M-22</strong>
            <small>5 CINTAS · 6 CÁMARAS CCTV · SALIDA DE EMERGENCIA</small>
          </div>
        </div>
      </article>

      {/* Secondary 3 interactive experiences */}
      <div className="arcade-grid">
        <article className="arcade-card" id="escena-22" data-secret-anchor="trailer" data-reveal="row">
          <figure>
            <img src="/archive/trailer-shoot.webp" alt="Equipo rodando una escena en una cocina" loading="lazy" decoding="async" />
            <span>MONTAJE INTERACTIVO</span>
          </figure>
          <div className="arcade-card-body">
            <small>00:22 · 4 CAPÍTULOS</small>
            <h4>CORTE 22</h4>
            <p>
              El puente interactivo que conecta el archivo real de Raúl con los
              referentes y el expediente de terror. Controla los cortes con ← →.
            </p>
            <button type="button" onClick={onOpenTrailer} data-hee-control>
              ✂ ABRIR MONTAJE <span>→</span>
            </button>
          </div>
        </article>

        <article className="arcade-card" data-reveal="row">
          <figure>
            <img src="/michael/michael-jackson-publicity-1984.jpg" alt="Pasadizo 3D de Huida en Moonwalk" loading="lazy" decoding="async" />
            <span>MINIJUEGO ARCADE 3D</span>
          </figure>
          <div className="arcade-card-body">
            <small>{moonwalkBest ? `RÉCORD PERSONAL · ${moonwalkBest} s` : "22 METROS · REFLEJOS"}</small>
            <h4>HUIDA EN MOONWALK</h4>
            <p>
              Alterna ← y → al ritmo para retroceder en moonwalk hacia la salida sin
              darle la espalda a Sujeto M-22. Rápido, frenético y adictivo.
            </p>
            <button type="button" onClick={onOpenChase} data-hee-control>
              🕺 JUGAR MINIJUEGO <span>▶</span>
            </button>
          </div>
        </article>

        <article className="arcade-card" data-reveal="row">
          <figure className="arcade-micro-figure">
            <div className="arcade-micro-art" aria-hidden="true">
              <b>24</b>
              <span>TET</span>
              <small>50¢ · CUARTOS DE TONO</small>
            </div>
            <span>LIENZO SONORO</span>
          </figure>
          <div className="arcade-card-body">
            <small>ANGINE DE POITRINE · 3 OCTAVAS</small>
            <h4>LABORATORIO 24 TET</h4>
            <p>
              Convierte toda la pantalla en un sintetizador microtonal de 24 notas:
              dibuja constelaciones, elige timbre/pulso y reproduce tu composición.
            </p>
            <button type="button" onClick={onOpenMicroLab} data-hee-control>
              🧪 ABRIR LABORATORIO <span>▶</span>
            </button>
          </div>
        </article>
      </div>
    </section>
  );
}

export default memo(ArcadeHub);
