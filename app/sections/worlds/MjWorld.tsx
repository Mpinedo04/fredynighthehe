"use client";

import { memo, useEffect, useRef, useState } from "react";
import { michaelEras } from "../../content";

type MjWorldProps = {
  onMoonwalk: () => void;
};

/** World 01: Michael Jackson's show control, lit in time with the soundtrack. */
function MjWorld({ onMoonwalk }: MjWorldProps) {
  const [era, setEra] = useState(2);
  const [performing, setPerforming] = useState(false);
  const cardRef = useRef<HTMLElement | null>(null);

  // While the sequence runs, every soundtrack beat flashes the rig.
  useEffect(() => {
    if (!performing) return;
    const card = cardRef.current;
    let timer = 0;
    const handleBeat = () => {
      card?.classList.add("on-beat");
      window.clearTimeout(timer);
      timer = window.setTimeout(() => card?.classList.remove("on-beat"), 140);
    };
    window.addEventListener("premiere22:beat", handleBeat);
    return () => {
      window.clearTimeout(timer);
      card?.classList.remove("on-beat");
      window.removeEventListener("premiere22:beat", handleBeat);
    };
  }, [performing]);

  return (
    <article ref={cardRef} className={`idol-card mj-world ${performing ? "performance-on" : ""}`}>
      <div className="idol-label">
        <span>REFERENTE 01</span>
        <strong>SHOW CONTROL · MODO ESCENARIO</strong>
      </div>
      <figure className="mj-stage">
        <img
          src="/michael/michael-jackson-publicity-1984.jpg"
          alt="Retrato promocional de cuerpo entero de Michael Jackson en 1984"
          loading="lazy"
          decoding="async"
        />
        <i className="spotlight left" />
        <i className="spotlight right" />
        <div className="mj-stage-pulse" aria-hidden="true">
          {Array.from({ length: 16 }, (_, index) => <i key={index} />)}
        </div>
        <button
          type="button"
          className="mj-moonwalk-track"
          onClick={onMoonwalk}
          aria-label="Abrir el pasadizo M00NW4LK"
        >
          <span>01</span><span>02</span><span>03</span><span>04</span>
          <b>MOONWALK</b>
          <em>▶ ABRIR PASADIZO</em>
        </button>
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
          {michaelEras.map((item, index) => (
            <button
              type="button"
              role="tab"
              aria-selected={era === index}
              className={era === index ? "active" : ""}
              key={item.name}
              onClick={() => setEra(index)}
            >
              <span>{item.year}</span>
              <strong>{item.name}</strong>
            </button>
          ))}
        </div>
        <div className="mj-era-console" role="tabpanel" aria-live="polite">
          <span>SECUENCIA {String(era + 1).padStart(2, "0")} / 05</span>
          <strong>{michaelEras[era].cue}</strong>
          <p>{michaelEras[era].detail}</p>
          <div aria-hidden="true">
            {Array.from({ length: 8 }, (_, index) => <i key={index} />)}
          </div>
        </div>
        <button className="mj-sequence-trigger" type="button" onClick={() => setPerforming(!performing)}>
          {performing ? "DETENER SECUENCIA" : "RAÚL, ARE YOU OK?"}
          <span>{performing ? "■" : "▶"}</span>
        </button>
        <p className={performing ? "room-answer visible" : "room-answer"}>
          LUCES 100% · BEAT 118 BPM · MOONWALK AUTORIZADO · ESCENA 22
          <small> · Activa la banda sonora y las luces irán al compás</small>
        </p>
      </div>
    </article>
  );
}

export default memo(MjWorld);
