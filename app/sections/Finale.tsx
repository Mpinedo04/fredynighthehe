"use client";

import { memo, useEffect, useRef, useState } from "react";
import { FINAL_TAKE } from "../prank-system.mjs";

type FinaleProps = {
  clapped: boolean;
  take: number;
  takeCallout: { take: number; reason: string } | null;
  birthdayNote: { index: number; detune: number } | null;
  onClap: () => void;
  onBirthday: () => void;
  onCredits: () => void;
};

const FINAL_LINES = [
  "Esta página no intenta resumir todo lo que eres, porque necesitaríamos demasiadas escenas.",
  "Solo quería recordarte que ya has creado cosas increíbles, que tienes personas que creen en ti y que esto no es el final de ninguna historia.",
  "Es solamente el comienzo de la escena 22.",
];

/** Scene 09: the clapperboard, the birthday message and the post-credits. */
function Finale({
  clapped,
  take,
  takeCallout,
  birthdayNote,
  onClap,
  onBirthday,
  onCredits,
}: FinaleProps) {
  const [postCredits, setPostCredits] = useState(false);
  const messageRef = useRef<HTMLElement | null>(null);

  // When the clapper finally closes, the camera moves to the message.
  useEffect(() => {
    if (!clapped) return;
    const timer = window.setTimeout(() => {
      messageRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 900);
    return () => window.clearTimeout(timer);
  }, [clapped]);

  return (
    <>
      <section className={clapped ? "clapper clapped" : "clapper"} id="final">
        <div className="clapper-copy" data-reveal>
          <p className="eyebrow">
            <span className="scene-chip">ESC 09</span> ÚLTIMA ESCENA / PRIMERA TOMA
          </p>
          <h2>Todo preparado.<br />Solo falta cerrar la claqueta.</h2>
          <p>
            Un gesto para terminar esta proyección y desbloquear el comienzo de
            la escena 22. Bueno, un gesto… o los que hagan falta.
          </p>
          {!clapped && take > 1 && (
            <div className="take-meter" aria-hidden="true">
              <span>TOMA {String(take).padStart(2, "0")} / {FINAL_TAKE}</span>
              <i><b style={{ width: `${((take - 1) / (FINAL_TAKE - 1)) * 100}%` }} /></i>
            </div>
          )}
        </div>
        <button
          className="clapboard"
          type="button"
          onClick={onClap}
          aria-label={clapped ? "Claqueta cerrada" : `Cerrar la claqueta. Toma ${take} de ${FINAL_TAKE}`}
          data-hee-control
        >
          <span className="clap-top">
            <i /><i /><i /><i /><i />
          </span>
          <span className="clap-body">
            <span><small>PRODUCCIÓN</small><b>LA HISTORIA CONTINÚA</b></span>
            <span><small>DIRECTOR</small><b>RAÚL GARCÍA</b></span>
            <span className="clap-row">
              <span><small>ESCENA</small><b>22</b></span>
              <span><small>TOMA</small><b>{clapped ? "∞" : String(take).padStart(2, "0")}</b></span>
              <span><small>SONIDO</small><b>ON</b></span>
            </span>
            <strong>{clapped ? "CORTE PERFECTO" : take === 1 ? "PULSA PARA CERRAR" : "¡OTRA!"}</strong>
          </span>
          {takeCallout && (
            <span
              className={`take-callout ${takeCallout.take === FINAL_TAKE ? "final" : ""}`}
              key={takeCallout.take}
              role="status"
            >
              <small>TOMA {String(takeCallout.take).padStart(2, "0")} · DIRECTOR</small>
              <b>{takeCallout.take === FINAL_TAKE ? "" : "¡OTRA! · "}{takeCallout.reason}</b>
            </span>
          )}
        </button>
      </section>

      <section ref={messageRef} className={clapped ? "final-message revealed" : "final-message"}>
        <div className="letterbox top" aria-hidden="true" />
        <div className="letterbox bottom" aria-hidden="true" />
        <div className="final-frame">
          <img
            className="final-photo"
            src="/archive/final-festival.webp"
            alt="Raúl y su equipo en un festival de cortometrajes"
            loading="lazy"
            decoding="async"
          />
          <p className="eyebrow red">RAÚL GARCÍA · ESCENA 22 · TOMA ∞</p>
          <h2>Feliz cumpleaños,<br /><span>Raúl.</span></h2>
          <div className="final-copy">
            {FINAL_LINES.map((line, index) => (
              <p key={line} style={{ animationDelay: `${0.9 + index * 0.9}s` }}>
                {line}
              </p>
            ))}
          </div>
          <strong className="final-line">LO MEJOR TODAVÍA ESTÁ POR RODARSE.</strong>
          <div className="birthday-24tet" data-hee-control>
            <button type="button" onClick={onBirthday}>
              ▶ CUMPLEAÑOS FELIZ · VERSIÓN 24 TET
            </button>
            <span aria-live="polite">
              {birthdayNote
                ? `NOTA ${String(birthdayNote.index + 1).padStart(2, "0")}/25 · ${
                    birthdayNote.detune === 0
                      ? "AFINADA (DE MILAGRO)"
                      : `${birthdayNote.detune > 0 ? "+" : "−"}50¢ DESAFINADO`
                  }`
                : "DESAFINADO A PROPÓSITO · CUARTOS DE TONO INCLUIDOS"}
            </span>
          </div>
          <div className="final-actions">
            <button type="button" className="credits-launch" onClick={onCredits} data-hee-control>
              VER CRÉDITOS FINALES <small>(NO SE PUEDEN SALTAR)</small>
            </button>
            <button type="button" className="ghost" onClick={() => setPostCredits(!postCredits)}>
              {postCredits ? "OCULTAR POSTCRÉDITOS" : "VER ESCENA POSTCRÉDITOS"}
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>
        <div className={postCredits ? "post-credits visible" : "post-credits"}>
          <img
            className="post-credits-photo"
            src="/archive/postcredits-team.webp"
            alt="Raúl y sus amigos celebrando juntos"
            loading="lazy"
            decoding="async"
          />
          <span>ESCENA POSTCRÉDITOS</span>
          <p>
            Sí, hay secuela. Se titula <strong>“Todo lo demás”</strong> y ya
            está en producción.
          </p>
          <small>FUNDIDO A NEGRO · 2026</small>
        </div>
      </section>
    </>
  );
}

export default memo(Finale);
