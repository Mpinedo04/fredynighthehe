"use client";

import { useEffect, useRef, useState } from "react";
import { recoveredFragments } from "../content";
import { fireScare, warnScare } from "../pranks/bus";
import { useModal } from "../ui/useModal";

type RecoveredModalProps = {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
};

/** The "material recuperado" card: five fragments that unlock M00NW4LK.EXE. */
export default function RecoveredModal({ open, onClose, onComplete }: RecoveredModalProps) {
  const [step, setStep] = useState(0);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const screamRef = useRef<HTMLAudioElement | null>(null);
  useModal(open, onClose, dialogRef);

  useEffect(() => {
    if (!open) return;
    const sample = new Audio("/audio/fnaf-jumpscare-scream.mp3");
    sample.volume = 0.5;
    sample.playbackRate = 0.78;
    screamRef.current = sample;
    void sample.play().catch(() => undefined);
    warnScare(700);
    fireScare();
    return () => {
      sample.pause();
      screamRef.current = null;
      setStep(0);
    };
  }, [open]);

  const reveal = () => {
    const next = Math.min(recoveredFragments.length, step + 1);
    setStep(next);
    if (next === recoveredFragments.length) {
      onComplete();
    } else if (next === 3) {
      const warning = new Audio("/audio/fnaf-jumpscare-scream.mp3");
      warning.volume = 0.18;
      warning.playbackRate = 1.32;
      void warning.play().catch(() => undefined);
    }
  };

  if (!open) return null;

  return (
    <div
      className={`recovered-overlay recovered-step-${step}`}
      role="dialog"
      aria-modal="true"
      aria-label="Tarjeta de material recuperado"
      ref={dialogRef}
      tabIndex={-1}
    >
      <button className="recovered-close" type="button" onClick={onClose} aria-label="Cerrar material recuperado">
        CERRAR EXPEDIENTE ×
      </button>
      <div className="recovered-static" aria-hidden="true" />
      <div className="recovered-dossier">
        <div className="recovered-header">
          <span>FAZBEAR ARCHIVE · INCIDENTE RG-22</span>
          <strong>MATERIAL<br />RECUPERADO</strong>
          <small>ARCHIVO: AHORA_SI_FINAL.mov · INTEGRIDAD 22%</small>
        </div>
        <div className="recovered-eye-feed" aria-hidden="true">
          <div className="animatronic-eye">22</div>
          <span>CAM 05 · CONDUCTOS · 02:22:17</span>
        </div>
        <div className="recovered-fragments" aria-live="polite">
          <div
            className={step === 0 ? "recovered-empty-state visible" : "recovered-empty-state"}
            aria-hidden={step !== 0}
          >
            <span>CANAL 02 · SEÑAL BLOQUEADA</span>
            <div aria-hidden="true"><i /><i /><i /><i /><i /></div>
            <strong>0 / 5</strong>
            <p>
              El archivo no está vacío. Los fragmentos permanecen ocultos
              hasta que interceptes la primera transmisión.
            </p>
            <small>ESPERANDO AUTORIZACIÓN DEL OPERADOR_</small>
          </div>
          {recoveredFragments.map((fragment, index) => (
            <article key={fragment.code} className={index < step ? "visible" : ""}>
              <span>{fragment.code}</span>
              <strong>{fragment.title}</strong>
              <p>{fragment.body}</p>
            </article>
          ))}
        </div>
        {step < recoveredFragments.length ? (
          <button className={`recovered-catch catch-${step}`} type="button" onClick={reveal} data-autofocus>
            <small>FRAGMENTO {String(step + 1).padStart(2, "0")} / 05</small>
            {step === 0 ? "INTERCEPTAR ARCHIVO" : "LA VENTANA HA ESCAPADO · ATRÁPALA"}
          </button>
        ) : (
          <div className="recovered-authorized">
            <span>✓ LOS CINCO FRAGMENTOS HAN SIDO LEÍDOS</span>
            <strong>ACCESO AUTORIZADO</strong>
            <a href="/walk-exe">
              EJECUTAR M00NW4LK.EXE <span>→</span>
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
