"use client";

import { memo, useEffect, useRef } from "react";

/** Opening frame of the premiere: title, still and the symbolic ticket. */
function Hero() {
  const sectionRef = useRef<HTMLElement | null>(null);

  // Gentle parallax while the hero is on screen (skipped for reduced motion).
  useEffect(() => {
    const section = sectionRef.current;
    if (!section || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const progress = Math.min(1, window.scrollY / Math.max(1, section.offsetHeight));
      section.style.setProperty("--hero-shift", progress.toFixed(3));
    };
    const handleScroll = () => {
      if (frame === 0 && window.scrollY < section.offsetHeight * 1.2) {
        frame = window.requestAnimationFrame(update);
      }
    };
    update();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <section className="hero" id="premiere" ref={sectionRef}>
      <div className="hero-beam" aria-hidden="true" />
      <figure className="hero-still" data-secret-anchor="hero">
        <img
          src="/archive/hero-stage.webp"
          alt="Raúl García actuando sobre un escenario"
          fetchPriority="high"
          decoding="async"
        />
        <figcaption>
          <span>ARCHIVO PERSONAL · ESCENARIO</span>
          <strong>EL PROTAGONISTA ENTRA EN CUADRO</strong>
        </figcaption>
      </figure>
      <div className="hero-copy">
        <p className="eyebrow">
          <span className="scene-chip">ESC 01</span> UNA PRODUCCIÓN DE TODA SU GENTE
        </p>
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
  );
}

export default memo(Hero);
