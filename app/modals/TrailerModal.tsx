"use client";

import { useEffect, useRef, useState } from "react";
import { trailerScenes } from "../content";
import { useModal } from "../ui/useModal";

type TrailerModalProps = {
  open: boolean;
  onClose: () => void;
  onGoToRecovered: () => void;
};

/** "Corte 22": the interactive edit suite that bridges archive and horror. */
export default function TrailerModal({ open, onClose, onGoToRecovered }: TrailerModalProps) {
  const [trailerScene, setTrailerScene] = useState(0);
  const [trailerPaused, setTrailerPaused] = useState(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  useModal(open, onClose, dialogRef);

  useEffect(() => {
    if (!open || trailerPaused) return;
    const timer = window.setTimeout(() => {
      setTrailerScene((value) => (value >= trailerScenes.length - 1 ? 0 : value + 1));
    }, 5600);
    return () => window.clearTimeout(timer);
  }, [open, trailerPaused, trailerScene]);

  useEffect(() => {
    if (!open) return;
    const handleKeys = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") {
        setTrailerScene((value) => (value + 1) % trailerScenes.length);
      } else if (event.key === "ArrowLeft") {
        setTrailerScene((value) => (value - 1 + trailerScenes.length) % trailerScenes.length);
      } else if (event.key === " " && !(event.target instanceof HTMLButtonElement)) {
        event.preventDefault();
        setTrailerPaused((value) => !value);
      }
    };
    window.addEventListener("keydown", handleKeys);
    return () => window.removeEventListener("keydown", handleKeys);
  }, [open]);

  if (!open) return null;
  const activeTrailerScene = trailerScenes[trailerScene];

  return (
    <div
      className={`trailer-modal trailer-theme-${activeTrailerScene.theme} ${trailerPaused ? "is-paused" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label="Montaje interactivo de la escena 22"
      ref={dialogRef}
      tabIndex={-1}
    >
      <button className="modal-close" type="button" onClick={onClose} aria-label="Cerrar tráiler" data-autofocus>
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

        <div
          className="trailer-master-progress"
          aria-label={`Capítulo ${trailerScene + 1} de ${trailerScenes.length}`}
        >
          {trailerScenes.map((scene, index) => (
            <i
              key={scene.number}
              className={index < trailerScene ? "complete" : index === trailerScene ? "active" : ""}
            >
              {index === trailerScene && <b key={trailerScene} />}
            </i>
          ))}
        </div>

        <div className="trailer-screen">
          <div className="trailer-film-frame" key={trailerScene}>
            <img className="trailer-main-image" src={activeTrailerScene.mainImage} alt={activeTrailerScene.mainAlt} />
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
            onClick={() => setTrailerScene((value) => (value - 1 + trailerScenes.length) % trailerScenes.length)}
            aria-label="Ver corte anterior"
          >
            ←
          </button>
          <button
            className="trailer-step trailer-step-next"
            type="button"
            onClick={() => setTrailerScene((value) => (value + 1) % trailerScenes.length)}
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
            <span> Usa ← → para montar a mano y la barra espaciadora para pausar.</span>
          </p>
          <button className="trailer-route-button" type="button" onClick={onGoToRecovered}>
            IR AL MATERIAL RECUPERADO <span>→</span>
          </button>
        </footer>
      </div>
    </div>
  );
}
