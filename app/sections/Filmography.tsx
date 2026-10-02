"use client";

import { memo, useRef, useState, type KeyboardEvent } from "react";
import { projects } from "../content";

type FilmographyProps = {
  onPlay: (index: number) => void;
  breadSlotRef: (element: HTMLElement | null) => void;
};

/** Scene 03: Raúl's real videotheque. Arrow keys browse the tapes. */
function Filmography({ onPlay, breadSlotRef }: FilmographyProps) {
  const [selected, setSelected] = useState(4);
  const tapesRef = useRef<Array<HTMLButtonElement | null>>([]);
  const project = projects[selected];

  const select = (index: number, focus = false) => {
    const next = (index + projects.length) % projects.length;
    setSelected(next);
    if (focus) {
      tapesRef.current[next]?.focus();
      tapesRef.current[next]?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
    }
  };

  const handleKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      select(selected + 1, true);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      select(selected - 1, true);
    } else if (event.key === "Home") {
      event.preventDefault();
      select(0, true);
    } else if (event.key === "End") {
      event.preventDefault();
      select(projects.length - 1, true);
    }
  };

  return (
    <section className="filmography section-pad" id="filmografia">
      <div className="section-heading" data-reveal>
        <div>
          <p className="eyebrow">
            <span className="scene-chip">ESC 03</span> ARCHIVO REAL / CANAL RAAULINHOO
          </p>
          <h2>La videoteca<br />de Raúl.</h2>
        </div>
        <p>
          Siete producciones reales, con sus miniaturas y fechas originales.
          Elige una cinta (también con las flechas ← →) y reprodúcela sin salir
          de la premiere.
        </p>
      </div>

      <div className="channel-marquee" data-reveal>
        <span className="bread-slot" ref={breadSlotRef} />
        <div className="channel-avatar">
          <img src="/archive/channel-avatar.webp" alt="Retrato de Raúl" loading="lazy" decoding="async" />
        </div>
        <div>
          <small>CANAL OFICIAL EN YOUTUBE</small>
          <strong>@Raaulinhoo</strong>
        </div>
        <span>{projects.length} PRODUCCIONES EN ESTE ARCHIVO</span>
        <a href="https://www.youtube.com/@Raaulinhoo" target="_blank" rel="noreferrer">
          ABRIR CANAL ↗
        </a>
      </div>

      <div
        className="film-strip"
        aria-label="Proyectos de Raúl. Usa las flechas para cambiar de cinta."
        onKeyDown={handleKey}
      >
        {projects.map((item, index) => (
          <button
            type="button"
            key={item.title}
            ref={(element) => {
              tapesRef.current[index] = element;
            }}
            className={`film-card ${item.color} ${selected === index ? "selected" : ""}`}
            onClick={() => select(index)}
            onDoubleClick={() => onPlay(index)}
            aria-current={selected === index ? "true" : undefined}
            tabIndex={selected === index ? 0 : -1}
          >
            <span className="sprockets" aria-hidden="true" />
            <span className="film-visual">
              <img
                src={item.thumbnail}
                alt={`Miniatura oficial de ${item.title}`}
                loading="lazy"
                decoding="async"
              />
              <span className="film-shade" aria-hidden="true" />
              <small className="reel-code">{item.code}</small>
              <b>{item.title}</b>
              {item.color === "special" && <em>SELECCIÓN OFICIAL</em>}
              <span className="duration-badge">▶ {item.duration}</span>
              {selected === index && <span className="now-showing">EN SALA</span>}
            </span>
            <span className="film-meta">
              <small>{item.year}</small>
              <strong>{item.kind}</strong>
            </span>
          </button>
        ))}
      </div>

      <article className="project-focus" aria-live="polite" data-secret-anchor="project">
        <button
          type="button"
          className="focus-still"
          onClick={() => onPlay(selected)}
          aria-label={`Reproducir ${project.title}`}
        >
          <img src={project.thumbnail} alt="" decoding="async" />
          <span>▶</span>
        </button>
        <div className="focus-copy" key={selected}>
          <p className="eyebrow red">
            {project.year} · {project.duration} · CINTA {String(selected + 1).padStart(2, "0")}/
            {String(projects.length).padStart(2, "0")}
          </p>
          <h3>{project.title}</h3>
          <p>{project.role}</p>
          <small className="focus-kind">{project.kind}</small>
        </div>
        <div className="focus-actions">
          <button type="button" onClick={() => onPlay(selected)} className="text-action">
            REPRODUCIR EN SALA <span aria-hidden="true">▶</span>
          </button>
          <div className="focus-stepper">
            <button type="button" onClick={() => select(selected - 1)} aria-label="Cinta anterior">←</button>
            <button type="button" onClick={() => select(selected + 1)} aria-label="Cinta siguiente">→</button>
          </div>
        </div>
      </article>
    </section>
  );
}

export default memo(Filmography);
