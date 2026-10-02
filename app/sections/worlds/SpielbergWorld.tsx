"use client";

import { memo, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { spielbergFilms, spielbergMethod } from "../../content";

/** World 02: the complete Spielberg filmography as a projector carousel. */
function SpielbergWorld() {
  const [film, setFilm] = useState(spielbergFilms.length - 1);
  const stripRef = useRef<HTMLDivElement | null>(null);
  const buttonsRef = useRef<Array<HTMLButtonElement | null>>([]);
  const firstRender = useRef(true);
  const current = spielbergFilms[film];

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    buttonsRef.current[film]?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [film]);

  const move = (delta: number) =>
    setFilm((value) => Math.max(0, Math.min(spielbergFilms.length - 1, value + delta)));

  const handleKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      move(1);
      buttonsRef.current[Math.min(spielbergFilms.length - 1, film + 1)]?.focus();
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      move(-1);
      buttonsRef.current[Math.max(0, film - 1)]?.focus();
    }
  };

  const decades = Array.from(new Set(spielbergFilms.map((item) => `${item.year.slice(0, 3)}0`)));

  return (
    <article className="idol-card spielberg-world">
      <div className="idol-label">
        <span>REFERENTE 02</span>
        <strong>{spielbergFilms.length} DIRECCIONES · 1964—2026</strong>
      </div>
      <div className="spielberg-projector" aria-live="polite">
        <div className="spielberg-reel reel-one" />
        <div className="spielberg-reel reel-two" />
        <div className="spielberg-beam" aria-hidden="true" />
        <div className="spielberg-stars" aria-hidden="true"><i /><i /><i /><i /><i /></div>
        <span key={`y${film}`}>{current.year}</span>
        <strong key={`t${film}`}>{current.title}</strong>
        <small>
          PELÍCULA {String(film + 1).padStart(2, "0")} / {spielbergFilms.length} · {current.craft}
        </small>
      </div>
      <div className="idol-copy">
        <p className="eyebrow">ASOMBRO · AVENTURA · HUMANIDAD</p>
        <h3>STEVEN<br />SPIELBERG</h3>
        <p>
          El espectáculo empieza en una mirada. Spielberg convierte una
          familia, un niño o una decisión moral en el centro de tiburones,
          dinosaurios, guerras, encuentros y mundos imposibles.
        </p>
        <div className="spielberg-decades" aria-label="Saltar a una década">
          {decades.map((decade) => (
            <button
              type="button"
              key={decade}
              className={current.year.startsWith(decade.slice(0, 3)) ? "active" : ""}
              onClick={() => setFilm(spielbergFilms.findIndex((item) => item.year.startsWith(decade.slice(0, 3))))}
            >
              {decade.slice(2)}s
            </button>
          ))}
        </div>
        <div className="spielberg-carousel">
          <button type="button" className="spielberg-nav" onClick={() => move(-1)} aria-label="Película anterior" disabled={film === 0}>←</button>
          <div
            className="spielberg-film-strip"
            ref={stripRef}
            aria-label="Filmografía completa dirigida por Steven Spielberg. Usa las flechas."
            onKeyDown={handleKey}
          >
            {spielbergFilms.map((item, index) => (
              <button
                type="button"
                ref={(element) => {
                  buttonsRef.current[index] = element;
                }}
                aria-current={film === index ? "true" : undefined}
                tabIndex={film === index ? 0 : -1}
                className={film === index ? "active" : ""}
                onClick={() => setFilm(index)}
                key={item.title}
              >
                <span>{item.year}</span>
                <strong>{item.title}</strong>
              </button>
            ))}
          </div>
          <button type="button" className="spielberg-nav" onClick={() => move(1)} aria-label="Película siguiente" disabled={film === spielbergFilms.length - 1}>→</button>
        </div>
        <div className="spielberg-film-readout" aria-live="polite">
          <span>CENTRO EMOCIONAL</span>
          <strong>{current.motif}</strong>
          <small>{current.craft}</small>
          {current.title === "CLOSE ENCOUNTERS" && (
            <em className="spielberg-hint">
              Pista: en el laboratorio 24 TET, RE · MI · DO · DO · SOL hace que algo responda.
            </em>
          )}
          {current.title === "JURASSIC PARK" && (
            <em className="spielberg-hint">Cuando el vaso de agua de la esquina tiemble, algo se acerca.</em>
          )}
          {current.title === "E.T." && (
            <em className="spielberg-hint">Pasa el cursor por las fotos de los amigos.</em>
          )}
        </div>
        <ol className="spielberg-method" aria-label="Método cinematográfico de Steven Spielberg">
          {spielbergMethod.map(([number, label, detail]) => (
            <li key={number}>
              <span>{number}</span>
              <strong>{label}</strong>
              <p>{detail}</p>
            </li>
          ))}
        </ol>
      </div>
    </article>
  );
}

export default memo(SpielbergWorld);
