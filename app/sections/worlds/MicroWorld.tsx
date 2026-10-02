"use client";

import { memo, useEffect, useRef, useState, type CSSProperties } from "react";
import { playTone } from "../../audio/engine";
import { microSteps, microtonalTracks } from "../../content";
import { MICRO_KEYS, microKeyStep } from "../../prank-system.mjs";
import { announceMicroNote } from "../../pranks/bus";

type MicroWorldProps = {
  active: boolean;
};

/** World 04: Angine de Poitrine's 24-TET lab, playable with the mouse or the keyboard. */
function MicroWorld({ active }: MicroWorldProps) {
  const [microActive, setMicroActive] = useState<number | null>(null);
  const [microTrack, setMicroTrack] = useState(0);
  const [keyboardOn, setKeyboardOn] = useState(false);
  const releaseRef = useRef<number | null>(null);
  const cardRef = useRef<HTMLElement | null>(null);

  const playMicrotone = (index: number) => {
    playTone(110 * 2 ** (index / 24), {
      type: index % 2 === 0 ? "sine" : "triangle",
      duration: 0.7,
      volume: 0.12,
    });
    announceMicroNote(index);
    setMicroActive(index);
    if (releaseRef.current !== null) window.clearTimeout(releaseRef.current);
    releaseRef.current = window.setTimeout(() => setMicroActive(null), 720);
  };
  const playRef = useRef(playMicrotone);
  useEffect(() => {
    playRef.current = playMicrotone;
  });

  // The computer keyboard becomes the 24-step instrument while the card is on screen.
  useEffect(() => {
    if (!active || !keyboardOn) return;
    const handleKey = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        event.repeat || event.ctrlKey || event.metaKey || event.altKey ||
        (target instanceof HTMLElement && (target.isContentEditable || target.closest("input,textarea,select")))
      ) {
        return;
      }
      const step = microKeyStep(event.key);
      if (step < 0) return;
      const card = cardRef.current?.getBoundingClientRect();
      if (!card || card.bottom < 0 || card.top > window.innerHeight) return;
      playRef.current(step);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [active, keyboardOn]);

  useEffect(
    () => () => {
      if (releaseRef.current !== null) window.clearTimeout(releaseRef.current);
    },
    [],
  );

  const track = microtonalTracks[microTrack];

  return (
    <article className="idol-card micro-world" ref={cardRef}>
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
        <div className="poitrine-tet-mark"><b>24</b><span>TET</span><small>50¢ / PASO</small></div>
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
            <span>EXPERIMENTO INTERACTIVO</span>
            <strong>24 TET</strong>
            <em>PULSA 3 VECES PARA ABRIR EL LABORATORIO →</em>
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
              {keyboardOn && <kbd aria-hidden="true">{MICRO_KEYS[index].toUpperCase()}</kbd>}
            </button>
          ))}
        </div>
        <div className="micro-keyboard-toggle">
          <p>LABORATORIO · PULSA LOS 24 CUARTOS DE TONO</p>
          <button
            type="button"
            aria-pressed={keyboardOn}
            onClick={() => setKeyboardOn((value) => !value)}
            data-hee-control
          >
            ⌨ {keyboardOn ? "TECLADO ACTIVO · 1-0 · Q-P · A-F" : "TOCAR CON EL TECLADO"}
          </button>
        </div>
        <small className="close-encounters-hint">
          SI ALGUIEN TOCA RE · MI · DO · DO · SOL (11 · 15 · 07 · 07 · 21
          {keyboardOn ? " · TECLAS Q · T · 7 · 7 · A" : ""}), ALGO RESPONDE DESDE EL CIELO
        </small>
      </div>
      <div className="microtonal-jukebox">
        <div className="micro-player">
          {active ? (
            <iframe
              key={track.videoId}
              src={`https://www.youtube-nocookie.com/embed/${track.videoId}?rel=0`}
              title={`${track.title} de Angine de Poitrine`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              loading="lazy"
            />
          ) : (
            <div className="iframe-standby" aria-hidden="true">SEÑAL EN ESPERA</div>
          )}
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
          {microtonalTracks.map((item, index) => (
            <button
              type="button"
              key={item.videoId}
              className={microTrack === index ? "active" : ""}
              onClick={() => setMicroTrack(index)}
              aria-pressed={microTrack === index}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              <span>
                <strong>{item.title}</strong>
                <small>{item.subtitle}</small>
              </span>
              <em>{item.tuning}</em>
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
          <a href="https://anginedepoitrine.bandcamp.com/album/vol-ii" target="_blank" rel="noreferrer">
            ABRIR BANDCAMP OFICIAL ↗
          </a>
        </div>
        {active ? (
          <iframe
            title="Vol.II de Angine de Poitrine en Bandcamp"
            src="https://bandcamp.com/EmbeddedPlayer/album=1828228714/size=large/bgcol=ffffff/linkcol=111111/artwork=small/transparent=true/"
            loading="lazy"
          />
        ) : (
          <div className="iframe-standby" aria-hidden="true">BANDCAMP EN ESPERA</div>
        )}
      </div>
    </article>
  );
}

export default memo(MicroWorld);
