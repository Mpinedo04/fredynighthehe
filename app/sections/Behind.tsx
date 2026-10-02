"use client";

import { memo, useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { behindFrames } from "../content";
import { useModal } from "../ui/useModal";

/** Scene 04: the contact sheet, now with a proper lightbox. */
function Behind() {
  const [open, setOpen] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const swipeRef = useRef<number | null>(null);
  const close = useCallback(() => setOpen(null), []);
  useModal(open !== null, close, dialogRef);

  const step = useCallback((delta: number) => {
    setOpen((current) =>
      current === null ? current : (current + delta + behindFrames.length) % behindFrames.length,
    );
  }, []);

  useEffect(() => {
    if (open === null) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") step(1);
      if (event.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, step]);

  const frame = open === null ? null : behindFrames[open];

  return (
    <section className="behind section-pad" id="detras">
      <div className="section-heading narrow" data-reveal>
        <div>
          <p className="eyebrow red">
            <span className="scene-chip">ESC 04</span> DETRÁS DE LAS CÁMARAS
          </p>
          <h2>Los amigos recuerdan lo que no sale en pantalla.</h2>
        </div>
        <p>
          Las películas enseñan el resultado. Esta mesa de montaje guarda
          todo lo demás. Pulsa cualquier fotograma para verlo en grande.
        </p>
      </div>
      <div className="contact-sheet">
        {behindFrames.map((item, index) => (
          <figure
            key={item.code}
            className={`photo-placeholder photo-${index + 1}`}
            data-reveal="drop"
            style={{ "--i": index } as CSSProperties}
          >
            <div className="production-frame">
              <img src={item.image} alt={`Fotograma de ${item.caption}`} loading="lazy" decoding="async" />
              <span>FOTOGRAMA {item.code}</span>
              <b>{item.title}</b>
              <em>PRODUCCIÓN REAL · ARCHIVO RAAULINHOO</em>
              <button
                type="button"
                className="photo-open"
                onClick={() => setOpen(index)}
                aria-label={`Ampliar fotograma ${item.code}: ${item.title}`}
                data-hee-control
              >
                <span aria-hidden="true">⤢ AMPLIAR</span>
              </button>
            </div>
            <figcaption>{item.caption}</figcaption>
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

      {frame && open !== null && createPortal(
        <div
          className="photo-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={`Fotograma ${frame.code}`}
          ref={dialogRef}
          tabIndex={-1}
          data-hee-control
          onClick={(event) => {
            if (event.target === event.currentTarget) close();
          }}
          onPointerDown={(event) => {
            swipeRef.current = event.clientX;
          }}
          onPointerUp={(event) => {
            if (swipeRef.current === null) return;
            const delta = event.clientX - swipeRef.current;
            swipeRef.current = null;
            if (Math.abs(delta) > 60) step(delta < 0 ? 1 : -1);
          }}
        >
          <figure key={open}>
            <img src={frame.image} alt={`Fotograma de ${frame.caption}`} />
            <figcaption>
              <span>FOTOGRAMA {frame.code} · {String(open + 1).padStart(2, "0")}/{String(behindFrames.length).padStart(2, "0")}</span>
              <strong>{frame.title}</strong>
              <em>{frame.caption}</em>
            </figcaption>
          </figure>
          <button type="button" className="lightbox-step prev" onClick={() => step(-1)} aria-label="Fotograma anterior">←</button>
          <button type="button" className="lightbox-step next" onClick={() => step(1)} aria-label="Fotograma siguiente">→</button>
          <button type="button" className="lightbox-close" onClick={close} data-autofocus>
            CERRAR ×
          </button>
        </div>,
        document.body,
      )}
    </section>
  );
}

export default memo(Behind);
